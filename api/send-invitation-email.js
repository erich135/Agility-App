import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, inviteLink } = req.body;

  if (!email || !name || !inviteLink) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Create Supabase admin client with service role key
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
    // Debug: log environment setup
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set');
      return res.status(500).json({ 
        error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY missing'
      });
    }
    
    console.log('✅ Supabase URL:', process.env.VITE_SUPABASE_URL?.substring(0, 20) + '...');
    console.log('✅ Using Supabase Admin API');

    // Use Supabase Auth to send invitation email
    // This uses the SMTP configured in Supabase Dashboard
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: inviteLink,
      data: {
        full_name: name,
        invited: true
      }
    });

    if (error) {
      console.error('❌ Supabase invite error:', error);
      return res.status(500).json({ 
        error: 'Failed to send invitation',
        details: error.message,
        code: error.code
      });
    }

    console.log(`✅ Invitation email sent to ${email} via Supabase`);
    return res.status(200).json({ success: true, message: 'Invitation sent', data });
  } catch (error) {
    console.error('❌ Email send error:', error);
    console.error('Stack:', error.stack);
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message,
      stack: error.stack
    });
  }
}
