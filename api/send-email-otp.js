// API endpoint for sending email OTP
// File: /api/send-email-otp.js

const nodemailer = require('nodemailer');

// Email configuration
const EMAIL_CONFIG = {
  host: 'mail.lmwfinance.co.za',
  port: 465,
  secure: true, // SSL
  auth: {
    user: 'info@lmwfinance.co.za',
    pass: '@8644Erich'
  }
};

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

    // Create transporter
    const transporter = nodemailer.createTransporter(EMAIL_CONFIG);

    // Verify connection
    await transporter.verify();
    console.log('✅ Email server connection verified');

    // Create email HTML template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Verification Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px 20px; border-radius: 0 0 8px 8px; }
          .otp-box { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 10px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Login Verification</h1>
            <p>LMW Finance - Secure Access Code</p>
          </div>
          <div class="content">
            <h2>Your verification code is:</h2>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <p>Enter this code to complete your login</p>
            </div>
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul style="margin: 10px 0; text-align: left;">
                <li>This code expires in 10 minutes</li>
                <li>Never share this code with anyone</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>
            </div>
            <p>If you're having trouble logging in, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} LMW Finance. All rights reserved.</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    const mailOptions = {
      from: {
        name: 'LMW Finance',
        address: 'info@lmwfinance.co.za'
      },
      to: email,
      subject: subject || 'Your Login Verification Code',
      html: emailHtml,
      text: `Your login verification code is: ${otp}\\n\\nThis code expires in 10 minutes.\\n\\nNever share this code with anyone.\\n\\nIf you didn't request this, please ignore this email.\\n\\n© ${new Date().getFullYear()} LMW Finance`
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully:', {
      messageId: info.messageId,
      email: email,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: 'OTP email sent successfully'
    });

  } catch (error) {
    console.error('❌ Email sending failed:', error);
    
    return res.status(500).json({
      error: 'Failed to send email',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}