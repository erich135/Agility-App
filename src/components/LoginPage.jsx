import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import supabase from '../lib/SupabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Look up user
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (userError || !userData) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      // Check if user has set password
      if (!userData.password_hash) {
        setError('Please complete your account setup using the invitation link');
        setLoading(false);
        return;
      }

      // Check if user is active
      if (!userData.is_active) {
        setError('Your account has been deactivated. Contact your administrator.');
        setLoading(false);
        return;
      }

      // Verify password (in production, use proper backend verification)
      const storedHash = userData.password_hash;
      const enteredHash = btoa(password); // Simple encoding - use bcrypt in production

      if (storedHash !== enteredHash) {
        setError('Invalid email or password');
        setLoading(false);
        return;
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userData.id);

      // Load user permissions
      const { data: permissions } = await supabase
        .from('user_permissions')
        .select('permission_key')
        .eq('user_id', userData.id)
        .eq('enabled', true);

      const userWithPermissions = {
        ...userData,
        permissions: (permissions || []).map(p => p.permission_key)
      };

      // Call login from context
      await login(userWithPermissions);

      // Navigate to home
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <img 
            src="/agility-logo.png" 
            alt="Agility Logo" 
            className="h-20 w-auto mx-auto mb-4"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your Agility account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <span className="text-blue-600">Contact your administrator</span>
          </p>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h2>
              <p className="text-gray-600 text-sm mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              
              <ForgotPasswordForm 
                onClose={() => setShowForgotPassword(false)}
                onSuccess={() => {
                  setShowForgotPassword(false);
                  setError('');
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Forgot Password Form Component
function ForgotPasswordForm({ onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (userError || !user) {
        setError('No account found with this email address');
        setLoading(false);
        return;
      }

      // Generate password reset token
      const token = crypto.randomUUID();

      // Create password reset record
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          password_reset_token: token,
          password_reset_sent_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Send reset email via API
      const resetLink = `${window.location.origin}/reset-password?token=${token}`;
      
      const emailResponse = await fetch('/api/send-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.full_name,
          resetLink
        })
      });

      if (!emailResponse.ok) {
        throw new Error('Failed to send reset email');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <p className="text-green-600 font-medium mb-2">Email Sent Successfully</p>
        <p className="text-sm text-gray-600">
          Check your email for a link to reset your password.
        </p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
              placeholder="your@email.com"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </div>
      </form>
    </>
  );
}

