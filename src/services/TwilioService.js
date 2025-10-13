// TwilioService.js - SMS service using Vercel API endpoint
class TwilioService {
  constructor() {
    // Use Vercel serverless function for SMS sending
    this.apiEndpoint = '/api/send-sms';
    console.log('TwilioService initialized with API endpoint');
  }

  formatPhoneNumber(phone) {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If starts with 27, it's already in international format
    if (cleaned.startsWith('27')) {
      return '+' + cleaned;
    }
    
    // If starts with 0, replace with +27
    if (cleaned.startsWith('0')) {
      return '+27' + cleaned.substring(1);
    }
    
    // If it's just 9 digits, assume it's a SA number without leading 0
    if (cleaned.length === 9) {
      return '+27' + cleaned;
    }
    
    // Default: add +27 if no country code
    return '+27' + cleaned;
  }

  async sendOTP(phoneNumber, otp) {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      console.log('Sending SMS to:', formattedPhone);

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          otp: otp
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send SMS');
      }

      console.log('SMS sent successfully:', result.messageSid);
      return {
        success: true,
        messageSid: result.messageSid
      };

    } catch (error) {
      console.error('Failed to send SMS:', error);
      
      // Fallback: log the OTP for development
      console.log('FALLBACK - Your OTP is:', otp);
      
      return {
        success: false,
        error: error.message,
        fallback: true,
        otp: otp // Include OTP for development debugging
      };
    }
  }

  async sendSMS(phoneNumber, message) {
    // Legacy method - redirect to sendOTP for compatibility
    return await this.sendOTP(phoneNumber, message);
  }

  async testSMS(phoneNumber) {
    const testOTP = '123456';
    return await this.sendOTP(phoneNumber, testOTP);
  }
}

// Create singleton instance
const twilioService = new TwilioService();

export default twilioService;