import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, resetLink } = req.body;

  if (!email || !name || !resetLink) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Create Supabase admin client
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    // Send password reset email using Supabase's email service
    const { error } = await supabaseAdmin.auth.admin.generateLink(
      'magiclink',
      email,
      {
        redirectTo: resetLink,
        data: {
          full_name: name,
          password_reset: true
        }
      }
    );

    if (error) {
      console.error('❌ Password reset email error:', error);
      return res.status(500).json({ 
        error: 'Failed to send password reset email',
        details: error.message 
      });
    }

    console.log(`✅ Password reset email sent to ${email}`);
    return res.status(200).json({ 
      success: true, 
      message: 'Password reset email sent' 
    });
  } catch (error) {
    console.error('❌ Email send error:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
}
