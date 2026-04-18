// ============================================================
// Email OAuth2 - Microsoft Graph Authentication
// ============================================================
// GET  /api/email-auth?action=login     → Redirect to Microsoft login
// GET  /api/email-auth?action=callback  → Handle OAuth callback
// GET  /api/email-auth?action=status    → Check connection status
// POST /api/email-auth?action=disconnect → Remove stored tokens
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { ConfidentialClientApplication } from '@azure/msal-node';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TENANT_ID = process.env.MS_TENANT_ID || 'common';
const CLIENT_ID = process.env.MS_CLIENT_ID;
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET;
const REDIRECT_URI = process.env.MS_REDIRECT_URI; // e.g. https://your-app.vercel.app/api/email-auth?action=callback

const SCOPES = [
  'Mail.Read',
  'Mail.ReadWrite',
  'Mail.Send',
  'User.Read',
  'offline_access',
];

function getMsalClient() {
  return new ConfidentialClientApplication({
    auth: {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    },
  });
}

export default async function handler(req, res) {
  const action = req.query.action || req.body?.action;

  try {
    switch (action) {
      case 'login':
        return handleLogin(req, res);
      case 'callback':
        return handleCallback(req, res);
      case 'status':
        return handleStatus(req, res);
      case 'disconnect':
        return handleDisconnect(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action. Use: login, callback, status, disconnect' });
    }
  } catch (err) {
    console.error('Email auth error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Login: redirect to Microsoft ──────────────────────────
async function handleLogin(req, res) {
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    return res.status(500).json({ error: 'Microsoft OAuth not configured. Set MS_CLIENT_ID, MS_CLIENT_SECRET, MS_REDIRECT_URI env vars.' });
  }

  const msalClient = getMsalClient();
  const userId = req.query.user_id;

  const authUrl = await msalClient.getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: REDIRECT_URI,
    state: userId || '', // pass user_id through OAuth flow
    prompt: 'consent',
  });

  return res.redirect(authUrl);
}

// ── Callback: exchange code for tokens ────────────────────
async function handleCallback(req, res) {
  const { code, state: userId, error: oauthError, error_description } = req.query;

  if (oauthError) {
    console.error('OAuth error:', oauthError, error_description);
    return res.redirect('/?emailAuth=error&message=' + encodeURIComponent(error_description || oauthError));
  }

  if (!code) {
    return res.redirect('/?emailAuth=error&message=No+authorization+code+received');
  }

  const msalClient = getMsalClient();

  const tokenResponse = await msalClient.acquireTokenByCode({
    code,
    scopes: SCOPES,
    redirectUri: REDIRECT_URI,
  });

  // Get user profile from Graph to store email address
  const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${tokenResponse.accessToken}` },
  });
  const profile = await profileRes.json();

  // Upsert token into email_tokens table
  const tokenData = {
    user_id: userId,
    access_token: tokenResponse.accessToken,
    refresh_token: tokenResponse.account?.idTokenClaims
      ? '' // MSAL handles token cache internally, but we store for API routes
      : '',
    token_expires_at: tokenResponse.expiresOn?.toISOString() || new Date(Date.now() + 3600000).toISOString(),
    email_address: profile.mail || profile.userPrincipalName,
    display_name: profile.displayName,
    updated_at: new Date().toISOString(),
  };

  // We need the actual refresh token - MSAL v2 stores it in the cache
  // For Vercel serverless, we need to extract it manually from the token response
  // The refresh token is in the serialized cache
  const cache = msalClient.getTokenCache().serialize();
  const cacheData = JSON.parse(cache);
  const refreshTokens = cacheData.RefreshToken || {};
  const firstRefreshToken = Object.values(refreshTokens)[0];
  tokenData.refresh_token = firstRefreshToken?.secret || '';

  const { error: dbError } = await supabase
    .from('email_tokens')
    .upsert(tokenData, { onConflict: 'user_id' });

  if (dbError) {
    console.error('DB error storing token:', dbError);
    return res.redirect('/?emailAuth=error&message=Failed+to+store+credentials');
  }

  return res.redirect('/?emailAuth=success');
}

// ── Status: check if email is connected ───────────────────
async function handleStatus(req, res) {
  const userId = req.query.user_id;
  if (!userId) {
    return res.status(400).json({ error: 'user_id required' });
  }

  const { data, error } = await supabase
    .from('email_tokens')
    .select('email_address, display_name, updated_at')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return res.status(200).json({ connected: false });
  }

  return res.status(200).json({
    connected: true,
    email: data.email_address,
    name: data.display_name,
    lastSync: data.updated_at,
  });
}

// ── Disconnect: remove stored tokens ──────────────────────
async function handleDisconnect(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST required' });
  }

  const userId = req.body?.user_id;
  if (!userId) {
    return res.status(400).json({ error: 'user_id required' });
  }

  const { error } = await supabase
    .from('email_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    return res.status(500).json({ error: 'Failed to disconnect' });
  }

  return res.status(200).json({ success: true });
}
