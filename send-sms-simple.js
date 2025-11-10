// Alternative SMS API using Twilio REST API directly (no npm package needed)
// File: /api/send-sms-simple.js

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
    // Get Twilio credentials from environment
    const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.VITE_TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.VITE_TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.VITE_TWILIO_PHONE_NUMBER;

    console.log('🔍 Simple SMS - Environment Check:', {
      accountSid: accountSid ? `✅ Set (${accountSid.substring(0, 8)}...)` : '❌ Missing',
      authToken: authToken ? `✅ Set (${authToken.substring(0, 8)}...)` : '❌ Missing',
      fromNumber: fromNumber ? `✅ Set (${fromNumber})` : '❌ Missing'
    });

    if (!accountSid || !authToken || !fromNumber) {
      console.log('⚠️ Twilio credentials missing in environment');
      throw new Error('SMS service not configured. Please use the console OTP to login.');
    }

    // Create Basic Auth header
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    // Prepare SMS data
    const message = `Your Agility login code: ${otp}. Valid for 10 minutes.`;
    const smsData = new URLSearchParams({
      'From': fromNumber,
      'To': phoneNumber,
      'Body': message
    });

    console.log('📱 Sending SMS via Twilio REST API:', {
      from: fromNumber,
      to: phoneNumber,
      messageLength: message.length
    });

    // Send SMS via Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: smsData.toString()
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Twilio API Error:', result);
      throw new Error(result.message || `Twilio API error: ${response.status}`);
    }

    console.log('✅ SMS sent successfully via REST API:', result.sid);
    
    return res.status(200).json({ 
      success: true, 
      messageSid: result.sid,
      method: 'REST API'
    });

  } catch (error) {
    console.error('❌ SMS Sending Error:', {
      message: error.message,
      stack: error.stack
    });
    
    return res.status(500).json({ 
      error: 'Failed to send SMS',
      details: error.message,
      fallbackMessage: 'Use the console OTP to login'
    });
  }
}