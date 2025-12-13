// EmailOTPService.js - Email OTP service replacing Twilio SMS
class EmailOTPService {
  constructor() {
    this.apiEndpoint = '/api/send-email-simple';
    console.log('EmailOTPService initialized with simple email endpoint');
  }

  formatEmail(email) {
    return email.toLowerCase().trim();
  }

  async sendOTP(email, otp) {
    try {
      const formattedEmail = this.formatEmail(email);
      console.log('📧 Attempting email OTP to:', formattedEmail, 'OTP:', otp);

      // Check if we're in development mode
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname.includes('127.0.0.1');

      if (isDevelopment) {
        console.log('🚧 Development Mode - OTP:', otp);
        console.log('🔐 LOGIN OTP for', formattedEmail + ':', otp);
        
        // Show OTP in alert for easier access in development
        alert(`DEVELOPMENT MODE: Your OTP is ${otp}\n\nCheck console for details.`);
        
        return {
          success: true,
          messageId: 'dev-mode-' + Date.now(),
          developmentMode: true
        };
      }

      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formattedEmail,
          otp: otp,
          subject: 'Your Login Verification Code'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.details || 'Failed to send email';
        } catch {
          errorMessage = `HTTP ${response.status}: ${errorText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Email sent successfully:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      console.error('❌ Email sending failed:', error);
      
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

  async sendEmail(email, subject, message) {
    try {
      const formattedEmail = this.formatEmail(email);
      
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formattedEmail,
          subject: subject,
          message: message
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw error;
    }
  }

  async testEmail(email) {
    const testOTP = '123456';
    return await this.sendOTP(email, testOTP);
  }
}

// Create singleton instance
const emailOTPService = new EmailOTPService();

export default emailOTPService;