// TwilioService.js - SMS service using Vercel API endpoint
class TwilioService {
  constructor() {
    // Use simple REST API endpoint (no npm dependencies)
    this.apiEndpoint = '/api/send-sms-simple';
    console.log('TwilioService initialized with simple REST API endpoint');
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
      console.log('📱 Attempting SMS to:', formattedPhone, 'OTP:', otp);

      // First check if we're in development mode
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname.includes('127.0.0.1');

      if (isDevelopment) {
        console.log('🚧 Development Mode - OTP:', otp);
        console.log('🔐 LOGIN OTP for', formattedPhone + ':', otp);
        
        // Show OTP in alert for easier access in development
        alert(`DEVELOPMENT MODE: Your OTP is ${otp}\n\nCheck console for details.`);
        
        // Return success in development mode
        return {
          success: true,
          messageSid: 'dev-mode-' + Date.now(),
          developmentMode: true
        };
      }

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

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.details || 'Failed to send SMS';
        } catch {
          errorMessage = `HTTP ${response.status}: ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ SMS sent successfully:', result.messageSid);
      
      return {
        success: true,
        messageSid: result.messageSid
      };

    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      
      // Always log OTP for development/testing
      console.log('🔐 FALLBACK OTP (use this to login):', otp);
      
      return {
        success: false,
        error: error.message,
        fallback: true,
        otp: otp
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