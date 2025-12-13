import React, { useState } from 'react';
import supabase from '../lib/SupabaseClient';
import emailOTPService from '../services/EmailOTPService';
import ActivityLogger from '../lib/ActivityLogger';

const LoginPage = ({ onLoginSuccess }) => {
  const [step, setStep] = useState('email'); // 'email' or 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Step 1: Request OTP
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔍 Looking up user:', email);
      
      // Check if user exists in database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role, is_active, full_name')
        .eq('email', email.toLowerCase().trim())
        .single();

      console.log('👤 User lookup result:', { userData, userError });

      if (userError) {
        console.error('Database error:', userError);
        if (userError.code === 'PGRST116') {
          throw new Error('User not found. Please contact your administrator.');
        }
        throw new Error(`Database error: ${userError.message}`);
      }

      if (!userData) {
        throw new Error('User not found. Please contact your administrator.');
      }

      if (!userData.is_active) {
        throw new Error('Your account is inactive. Please contact your administrator.');
      }

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log('🔐 Generated OTP:', otpCode);
      
      // Store OTP in database with expiration (10 minutes)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      console.log('💾 Storing OTP in database...');
      const { error: otpError } = await supabase
        .from('user_otps')
        .upsert({
          user_id: userData.id,
          otp_code: otpCode,
          expires_at: expiresAt.toISOString(),
          used: false
        });

      if (otpError) {
        console.error('OTP storage error:', otpError);
        throw new Error(`Failed to generate OTP: ${otpError.message}`);
      }

      console.log('✅ OTP stored successfully');

      // Log OTP generation
      await ActivityLogger.logOTPGenerated(
        userData.id,
        userData.full_name || userData.email,
        userData.email,
        { email: userData.email, otp_length: otpCode.length }
      );

      // Always show OTP in console for development/testing
      console.log(`🔐 LOGIN OTP for ${userData.email}: ${otpCode}`);

      // Try to send Email
      try {
        console.log('📧 Attempting to send email OTP...');
        const emailResult = await emailOTPService.sendOTP(userData.email, otpCode);
        
        if (emailResult.success) {
          console.log('✅ Email sent successfully');
          const maskedEmail = userData.email.replace(/(.)(.*)(@.*)/, '$1***$3');
          setError(`OTP sent to ${maskedEmail}. Check console for development OTP.`);
        } else {
          console.log('❌ Email failed, using fallback');
          console.log(`🚨 IMPORTANT: Your OTP is ${otpCode} - Use this to login!`);
          setError(`Email delivery failed. Your OTP is: ${otpCode}`);
        }
      } catch (emailError) {
        console.error('Email service error:', emailError);
        console.log(`🚨 IMPORTANT: Your OTP is ${otpCode} - Use this to login!`);
        setError(`Email service unavailable. Your OTP is: ${otpCode}`);
      }
      
      setStep('otp');
      setOtpSent(true);

    } catch (err) {
      // Log failed login attempt
      await ActivityLogger.logLogin(
        email, // Use email as identifier when user lookup fails
        email,
        false,
        { 
          error_message: err.message,
          attempted_email: email,
          step: 'user_lookup'
        }
      );
      
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔍 Verifying OTP:', otp);

      // Verify OTP
      const { data: otpData, error: otpError } = await supabase
        .from('user_otps')
        .select(`
          id,
          otp_code,
          expires_at,
          used,
          users (id, email, phone, role, full_name)
        `)
        .eq('otp_code', otp)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .single();

      console.log('🔐 OTP verification result:', { otpData, otpError });

      if (otpError) {
        console.error('OTP verification error:', otpError);
        if (otpError.code === 'PGRST116') {
          throw new Error('Invalid or expired OTP. Please try again or request a new one.');
        }
        throw new Error(`OTP verification failed: ${otpError.message}`);
      }

      if (!otpData) {
        throw new Error('Invalid or expired OTP. Please try again.');
      }

      console.log('✅ OTP verified successfully');

      // Log successful OTP verification
      await ActivityLogger.logOTPVerification(
        otpData.users.id,
        otpData.users.full_name || otpData.users.email,
        true,
        { email: otpData.users.email, phone: otpData.users.phone }
      );

      // Mark OTP as used
      const { error: updateError } = await supabase
        .from('user_otps')
        .update({ used: true })
        .eq('id', otpData.id);

      if (updateError) {
        console.error('Failed to mark OTP as used:', updateError);
        // Don't fail login for this, just log it
      }

      // Update last_login timestamp
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', otpData.users.id);

      // Create session/login
      const userData = {
        id: otpData.users.id,
        email: otpData.users.email,
        phone: otpData.users.phone,
        role: otpData.users.role,
        full_name: otpData.users.full_name
      };

      console.log('👤 Login successful for user:', userData.email);

      // Log successful login
      await ActivityLogger.logLogin(
        userData.id,
        userData.full_name || userData.email,
        true,
        { 
          email: userData.email, 
          phone: userData.phone, 
          role: userData.role,
          login_timestamp: new Date().toISOString()
        }
      );

      // Store in localStorage for session management
      localStorage.setItem('agility_user', JSON.stringify(userData));
      localStorage.setItem('agility_login_time', Date.now().toString());

      onLoginSuccess(userData);

    } catch (err) {
      console.error('Login error:', err);
      
      // Log failed OTP verification
      if (otp && phone) {
        await ActivityLogger.logOTPVerification(
          phone, // Use phone as identifier when user ID not available
          email,
          false,
          { 
            error_message: err.message,
            attempted_otp: otp.length,
            email: email
          }
        );
      }
      
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = () => {
    setStep('email');
    setOtp('');
    setOtpSent(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-white">A</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Agility</h1>
          <p className="text-gray-600 mt-2">Client Management System</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {step === 'email' ? (
            <>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Welcome Back</h2>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L3.046 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleEmailSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email address"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white py-2 px-4 rounded-lg hover:from-green-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending OTP...
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Enter OTP</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  We've sent a 6-digit code to your phone number ending in {phone.slice(-3)}
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.768 0L3.046 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span className="text-sm text-red-700">{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleOtpSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    6-Digit Code
                  </label>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
                    placeholder="000000"
                    maxLength="6"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white py-2 px-4 rounded-lg hover:from-green-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center mb-4"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Verifying...
                    </>
                  ) : (
                    'Verify & Login'
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="w-full text-blue-600 hover:text-blue-800 py-2 text-sm"
                  disabled={loading}
                >
                  Didn't receive the code? Try again
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Need help? Contact your administrator
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;