// Test Twilio Configuration
// File: /api/test-twilio.js

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Import Twilio
    const twilio = require('twilio');
    
    // Check environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID || process.env.VITE_TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN || process.env.VITE_TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.VITE_TWILIO_PHONE_NUMBER;

    console.log('🔍 Twilio Test - Environment Check:', {
      accountSid: accountSid ? `✅ Set (${accountSid.substring(0, 8)}...)` : '❌ Missing',
      authToken: authToken ? `✅ Set (${authToken.substring(0, 8)}...)` : '❌ Missing',
      fromNumber: fromNumber ? `✅ Set (${fromNumber})` : '❌ Missing',
      nodeEnv: process.env.NODE_ENV,
      allTwilioVars: Object.keys(process.env).filter(key => key.includes('TWILIO'))
    });

    if (!accountSid || !authToken || !fromNumber) {
      return res.status(400).json({
        error: 'Missing Twilio credentials',
        missing: {
          accountSid: !accountSid,
          authToken: !authToken, 
          fromNumber: !fromNumber
        }
      });
    }

    // Test Twilio client initialization
    const client = twilio(accountSid, authToken);
    
    // Test account lookup (this validates credentials without sending SMS)
    console.log('🧪 Testing Twilio account lookup...');
    const account = await client.api.accounts(accountSid).fetch();
    
    console.log('✅ Twilio account validated:', {
      sid: account.sid,
      friendlyName: account.friendlyName,
      status: account.status
    });

    return res.status(200).json({
      success: true,
      message: 'Twilio credentials are valid',
      account: {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status
      },
      fromNumber: fromNumber
    });

  } catch (error) {
    console.error('❌ Twilio Test Error:', {
      message: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
      status: error.status
    });

    return res.status(500).json({
      error: 'Twilio test failed',
      details: error.message,
      code: error.code,
      moreInfo: error.moreInfo
    });
  }
}