// Vercel Serverless Function for SMS sending
// File: /api/send-sms.js

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    return res.status(400).json({ error: 'Phone number and OTP are required' });
  }

  try {
    // Import Twilio only on the server side
    const twilio = require('twilio');
    
    // Try both prefixed and non-prefixed environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.VITE_TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.VITE_TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.VITE_TWILIO_PHONE_NUMBER;

    console.log('🔍 Twilio Environment Check:', {
      accountSid: accountSid ? '✅ Set' : '❌ Missing',
      authToken: authToken ? '✅ Set' : '❌ Missing', 
      fromNumber: fromNumber ? '✅ Set' : '❌ Missing'
    });

    if (!accountSid || !authToken || !fromNumber) {
      console.log('⚠️ Twilio credentials not configured in Vercel - SMS will fail gracefully');
      throw new Error('SMS service not configured. Please use the console OTP to login.');
    }

    console.log('🚀 Initializing Twilio client...');
    const client = twilio(accountSid, authToken);

    console.log('📱 Sending SMS:', {
      from: fromNumber,
      to: phoneNumber,
      bodyLength: `Your Agility login code: ${otp}. Valid for 10 minutes.`.length
    });

    const message = await client.messages.create({
      body: `Your Agility login code: ${otp}. Valid for 10 minutes.`,
      from: fromNumber,
      to: phoneNumber,
    });

    console.log('✅ SMS sent successfully:', message.sid);
    
    return res.status(200).json({ 
      success: true, 
      messageSid: message.sid 
    });

  } catch (error) {
    console.error('❌ Twilio SMS Error Details:', {
      message: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
      status: error.status,
      details: error.details
    });
    
    // Return more specific error information
    return res.status(500).json({ 
      error: 'Failed to send SMS',
      details: error.message,
      twilioCode: error.code,
      moreInfo: error.moreInfo
    });
  }
}