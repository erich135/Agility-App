// Simple email API for sending OTP without external dependencies
// File: /api/send-email-simple.js

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, otp, subject } = req.body;

    console.log('📧 Email OTP Request:', {
      email: email,
      otp: otp,
      subject: subject,
      timestamp: new Date().toISOString()
    });

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Email and OTP are required'
      });
    }

    // For development - just return success and log OTP
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    if (isDevelopment) {
      console.log(`🔐 DEV MODE - LOGIN OTP for ${email}: ${otp}`);
      
      return res.status(200).json({
        success: true,
        messageId: 'dev-' + Date.now(),
        message: 'Development mode - check server logs for OTP',
        development: true
      });
    }

    // For production, implement actual email sending
    const nodemailer = require('nodemailer');

    const host = process.env.EMAIL_HOST;
    const port = Number(process.env.EMAIL_PORT || 465);
    const secure = String(process.env.EMAIL_SECURE || 'true').toLowerCase() === 'true';
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD;
    const fromName = process.env.EMAIL_FROM_NAME || 'Agility';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || user;

    if (!host || !user || !pass) {
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'Missing EMAIL_HOST / EMAIL_USER / EMAIL_PASSWORD'
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Login Verification</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: #2563eb; color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .otp-box { background: #f8fafc; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 36px; font-weight: bold; color: #2563eb; letter-spacing: 6px; }
          .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Login Verification</h1>
            <p>LMW Finance</p>
          </div>
          <div class="content">
            <h2>Your verification code:</h2>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <p><strong>⏰ This code expires in 10 minutes</strong></p>
            <p>🔒 Never share this code with anyone</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} LMW Finance. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: {
        name: fromName,
        address: fromAddress
      },
      to: email,
      subject: subject || 'Your Login Verification Code',
      html: emailHtml,
      text: `Your login verification code is: ${otp}\n\nThis code expires in 10 minutes.\nNever share this code with anyone.\n\n© ${new Date().getFullYear()} LMW Finance`
    });
    
    console.log('✅ Email sent:', info.messageId);

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: 'OTP email sent successfully'
    });

  } catch (error) {
    console.error('❌ Email error:', error);
    
    return res.status(500).json({
      error: 'Failed to send email',
      details: error.message
    });
  }
}