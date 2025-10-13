// Twilio SMS Service
import twilio from 'twilio';

class TwilioService {
  constructor() {
    // These will be set from environment variables
    this.accountSid = import.meta.env.VITE_TWILIO_ACCOUNT_SID;
    this.authToken = import.meta.env.VITE_TWILIO_AUTH_TOKEN;
    this.fromNumber = import.meta.env.VITE_TWILIO_PHONE_NUMBER;

    // Initialize Twilio client only if credentials are provided
    if (this.accountSid && this.authToken) {
      this.client = twilio(this.accountSid, this.authToken);
    } else {
      console.warn('Twilio credentials not configured. SMS will be logged to console.');
      this.client = null;
    }
  }

  async sendSMS(to, message) {
    try {
      // If Twilio is not configured, just log to console (for development)
      if (!this.client) {
        console.log(`📱 SMS would be sent to ${to}: ${message}`);
        return { success: true, mock: true };
      }

      // Send actual SMS via Twilio
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to
      });

      console.log(`✅ SMS sent successfully to ${to}. SID: ${result.sid}`);
      return { 
        success: true, 
        sid: result.sid,
        mock: false 
      };

    } catch (error) {
      console.error('❌ Failed to send SMS:', error);
      
      // Fallback to console logging if SMS fails
      console.log(`📱 SMS fallback to ${to}: ${message}`);
      
      return { 
        success: false, 
        error: error.message,
        fallback: true 
      };
    }
  }

  async sendOTP(phoneNumber, otpCode) {
    const message = `Your Agility verification code is: ${otpCode}\n\nThis code expires in 5 minutes.\n\nIf you didn't request this, please ignore this message.`;
    
    return await this.sendSMS(phoneNumber, message);
  }

  // Format phone number to international format if needed
  formatPhoneNumber(phone) {
    // Remove any spaces, dashes, or parentheses
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // If it starts with 0, replace with +27 (South African format)
    if (cleaned.startsWith('0')) {
      cleaned = '+27' + cleaned.substring(1);
    }
    
    // If it doesn't start with +, assume it needs +27
    if (!cleaned.startsWith('+')) {
      cleaned = '+27' + cleaned;
    }
    
    return cleaned;
  }

  // Test SMS functionality
  async testSMS(phoneNumber) {
    const testMessage = "Test message from Agility system. SMS integration is working!";
    return await this.sendSMS(this.formatPhoneNumber(phoneNumber), testMessage);
  }
}

// Create singleton instance
const twilioService = new TwilioService();

export default twilioService;