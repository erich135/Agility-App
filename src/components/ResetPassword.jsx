import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import supabase from '../lib/SupabaseClient';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [userData, setUserData] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const resetToken = searchParams.get('token');
    if (!resetToken) {
      setError('Invalid password reset link');
      setLoading(false);
      return;
    }

    setToken(resetToken);
    verifyToken(resetToken);
  }, [searchParams]);

  const verifyToken = async (resetToken) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('password_reset_token', resetToken)
        .single();

      if (error || !data) {
        setError('Invalid or expired password reset link');
      } else {
        // Check if token is still valid (within 1 hour)
        const sentAt = new Date(data.password_reset_sent_at);
        const now = new Date();
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        if (sentAt < hourAgo) {
          setError('Password reset link has expired. Please request a new one.');
        } else {
          setUserData(data);
        }
      }
    } catch (err) {
      console.error('Error verifying token:', err);
      setError('Failed to verify password reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Validate passwords
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        setSubmitting(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setSubmitting(false);
        return;
      }

      // Update password
      const passwordHash = btoa(password); // Simple encoding - use bcrypt in production

      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          password_set_at: new Date().toISOString(),
          password_reset_token: null,
          password_reset_sent_at: null
        })
        .eq('id', userData.id);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError('An error occurred while resetting your password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Link Invalid</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <a 
            href="/login" 
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful</h1>
          <p className="text-gray-600 mb-6">Your password has been reset. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Lock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
          <p className="text-gray-600">Enter a new password for your account</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Reset Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="At least 8 characters"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Resetting...
              </div>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <a href="/login" className="text-sm text-blue-600 hover:underline">
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
}
