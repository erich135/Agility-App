// ============================================================
// Email API - Microsoft Graph Mail Operations
// ============================================================
// POST /api/email-api  (body: { action, ...params })
//   action: inbox, message, send, reply, forward, move,
//           delete, search, folders, link-job, unlink-job,
//           job-emails
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
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// ── Token Management ──────────────────────────────────────
async function getAccessToken(userId) {
  const { data: tokenRow, error } = await supabase
    .from('email_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !tokenRow) {
    throw new Error('Email not connected. Please connect your Microsoft account first.');
  }

  // Check if token is still valid (with 5-min buffer)
  const expiresAt = new Date(tokenRow.token_expires_at);
  if (expiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return tokenRow.access_token;
  }

  // Token expired - refresh it
  if (!tokenRow.refresh_token) {
    throw new Error('No refresh token available. Please reconnect your Microsoft account.');
  }

  const msalClient = new ConfidentialClientApplication({
    auth: {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    },
  });

  const refreshResult = await msalClient.acquireTokenByRefreshToken({
    refreshToken: tokenRow.refresh_token,
    scopes: ['Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'User.Read'],
  });

  // Extract new refresh token from MSAL cache
  const cache = msalClient.getTokenCache().serialize();
  const cacheData = JSON.parse(cache);
  const refreshTokens = cacheData.RefreshToken || {};
  const newRefreshToken = Object.values(refreshTokens)[0]?.secret || tokenRow.refresh_token;

  // Update stored tokens
  await supabase
    .from('email_tokens')
    .update({
      access_token: refreshResult.accessToken,
      refresh_token: newRefreshToken,
      token_expires_at: refreshResult.expiresOn?.toISOString() || new Date(Date.now() + 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return refreshResult.accessToken;
}

// ── Graph API Helper ──────────────────────────────────────
async function graphRequest(accessToken, path, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  const url = path.startsWith('http') ? path : `${GRAPH_BASE}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`Graph API error [${res.status}]:`, errorBody);
    throw new Error(`Graph API error: ${res.status} - ${res.statusText}`);
  }

  if (res.status === 204) return null; // No content (delete, move)

  return res.json();
}

// ── Main Handler ──────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST required' });
  }

  const { action, user_id, ...params } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id required' });
  }

  try {
    let accessToken;
    // Some actions don't need Graph API
    if (!['job-emails', 'unlink-job'].includes(action)) {
      accessToken = await getAccessToken(user_id);
    }

    switch (action) {
      case 'inbox':
        return await handleInbox(res, accessToken, params);
      case 'message':
        return await handleMessage(res, accessToken, params);
      case 'send':
        return await handleSend(res, accessToken, params);
      case 'reply':
        return await handleReply(res, accessToken, params);
      case 'forward':
        return await handleForward(res, accessToken, params);
      case 'move':
        return await handleMove(res, accessToken, params);
      case 'delete':
        return await handleDelete(res, accessToken, params);
      case 'search':
        return await handleSearch(res, accessToken, params);
      case 'folders':
        return await handleFolders(res, accessToken);
      case 'mark-read':
        return await handleMarkRead(res, accessToken, params);
      case 'link-job':
        return await handleLinkJob(res, accessToken, params, user_id);
      case 'unlink-job':
        return await handleUnlinkJob(res, params);
      case 'job-emails':
        return await handleJobEmails(res, params);
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('Email API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

// ── Inbox: list messages ──────────────────────────────────
async function handleInbox(res, token, { folder = 'inbox', page = 1, pageSize = 25, filter }) {
  const skip = (page - 1) * pageSize;
  const select = 'id,subject,from,toRecipients,receivedDateTime,isRead,hasAttachments,bodyPreview,conversationId,importance,flag';

  let path = `/me/mailFolders/${folder}/messages?$select=${select}&$orderby=receivedDateTime desc&$top=${pageSize}&$skip=${skip}&$count=true`;

  if (filter) {
    path += `&$filter=${encodeURIComponent(filter)}`;
  }

  const data = await graphRequest(token, path);

  return res.status(200).json({
    messages: data.value || [],
    total: data['@odata.count'] || 0,
    page,
    pageSize,
    hasMore: (data['@odata.nextLink'] || null) !== null,
  });
}

// ── Message: get full message ─────────────────────────────
async function handleMessage(res, token, { messageId }) {
  if (!messageId) return res.status(400).json({ error: 'messageId required' });

  const data = await graphRequest(token,
    `/me/messages/${messageId}?$select=id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,body,hasAttachments,conversationId,importance,internetMessageId,replyTo,flag`
  );

  // Fetch attachments list if present
  let attachments = [];
  if (data.hasAttachments) {
    const attData = await graphRequest(token,
      `/me/messages/${messageId}/attachments?$select=id,name,contentType,size,isInline`
    );
    attachments = attData.value || [];
  }

  // Check if this email is linked to any jobs
  const { data: jobLinks } = await supabase
    .from('job_emails')
    .select('job_id, notes')
    .eq('message_id', messageId);

  return res.status(200).json({
    message: data,
    attachments,
    linkedJobs: jobLinks || [],
  });
}

// ── Send: compose new email ──────────────────────────────
async function handleSend(res, token, { to, cc, bcc, subject, body, contentType = 'HTML', attachments }) {
  if (!to || !subject) {
    return res.status(400).json({ error: 'to and subject required' });
  }

  const toRecipients = (Array.isArray(to) ? to : [to]).map(email => ({
    emailAddress: { address: email },
  }));

  const message = {
    message: {
      subject,
      body: { contentType, content: body || '' },
      toRecipients,
    },
  };

  if (cc) {
    message.message.ccRecipients = (Array.isArray(cc) ? cc : [cc]).map(email => ({
      emailAddress: { address: email },
    }));
  }

  if (bcc) {
    message.message.bccRecipients = (Array.isArray(bcc) ? bcc : [bcc]).map(email => ({
      emailAddress: { address: email },
    }));
  }

  await graphRequest(token, '/me/sendMail', { method: 'POST', body: message });

  return res.status(200).json({ success: true });
}

// ── Reply: reply to message ──────────────────────────────
async function handleReply(res, token, { messageId, body, replyAll = false }) {
  if (!messageId || !body) {
    return res.status(400).json({ error: 'messageId and body required' });
  }

  const endpoint = replyAll ? 'replyAll' : 'reply';
  await graphRequest(token, `/me/messages/${messageId}/${endpoint}`, {
    method: 'POST',
    body: { comment: body },
  });

  return res.status(200).json({ success: true });
}

// ── Forward: forward message ─────────────────────────────
async function handleForward(res, token, { messageId, to, comment }) {
  if (!messageId || !to) {
    return res.status(400).json({ error: 'messageId and to required' });
  }

  const toRecipients = (Array.isArray(to) ? to : [to]).map(email => ({
    emailAddress: { address: email },
  }));

  await graphRequest(token, `/me/messages/${messageId}/forward`, {
    method: 'POST',
    body: { comment: comment || '', toRecipients },
  });

  return res.status(200).json({ success: true });
}

// ── Move: move to folder ─────────────────────────────────
async function handleMove(res, token, { messageId, destinationFolder }) {
  if (!messageId || !destinationFolder) {
    return res.status(400).json({ error: 'messageId and destinationFolder required' });
  }

  await graphRequest(token, `/me/messages/${messageId}/move`, {
    method: 'POST',
    body: { destinationId: destinationFolder },
  });

  return res.status(200).json({ success: true });
}

// ── Delete: delete message ───────────────────────────────
async function handleDelete(res, token, { messageId }) {
  if (!messageId) return res.status(400).json({ error: 'messageId required' });

  await graphRequest(token, `/me/messages/${messageId}`, { method: 'DELETE' });

  return res.status(200).json({ success: true });
}

// ── Search: search messages ──────────────────────────────
async function handleSearch(res, token, { query, pageSize = 25 }) {
  if (!query) return res.status(400).json({ error: 'query required' });

  const select = 'id,subject,from,toRecipients,receivedDateTime,isRead,hasAttachments,bodyPreview,conversationId';
  const path = `/me/messages?$search="${encodeURIComponent(query)}"&$select=${select}&$top=${pageSize}`;

  const data = await graphRequest(token, path);

  return res.status(200).json({
    messages: data.value || [],
    total: data['@odata.count'] || 0,
  });
}

// ── Folders: list mail folders ───────────────────────────
async function handleFolders(res, token) {
  const data = await graphRequest(token,
    '/me/mailFolders?$select=id,displayName,totalItemCount,unreadItemCount&$top=50'
  );

  return res.status(200).json({ folders: data.value || [] });
}

// ── Mark Read/Unread ─────────────────────────────────────
async function handleMarkRead(res, token, { messageId, isRead = true }) {
  if (!messageId) return res.status(400).json({ error: 'messageId required' });

  await graphRequest(token, `/me/messages/${messageId}`, {
    method: 'PATCH',
    body: { isRead },
  });

  return res.status(200).json({ success: true });
}

// ── Link email to job ────────────────────────────────────
async function handleLinkJob(res, token, { messageId, jobId, notes }, userId) {
  if (!messageId || !jobId) {
    return res.status(400).json({ error: 'messageId and jobId required' });
  }

  // Fetch message details from Graph to store metadata
  const msg = await graphRequest(token,
    `/me/messages/${messageId}?$select=id,subject,from,receivedDateTime,bodyPreview,hasAttachments,conversationId,internetMessageId`
  );

  const linkData = {
    job_id: jobId,
    message_id: messageId,
    internet_message_id: msg.internetMessageId || null,
    conversation_id: msg.conversationId || null,
    subject: msg.subject,
    sender_name: msg.from?.emailAddress?.name || null,
    sender_email: msg.from?.emailAddress?.address || null,
    received_at: msg.receivedDateTime,
    snippet: (msg.bodyPreview || '').substring(0, 200),
    has_attachments: msg.hasAttachments || false,
    linked_by: userId,
    notes: notes || null,
  };

  const { data, error } = await supabase
    .from('job_emails')
    .upsert(linkData, { onConflict: 'job_id,message_id' })
    .select()
    .single();

  if (error) {
    console.error('Link job error:', error);
    return res.status(500).json({ error: 'Failed to link email to job' });
  }

  return res.status(200).json({ success: true, link: data });
}

// ── Unlink email from job ────────────────────────────────
async function handleUnlinkJob(res, { messageId, jobId }) {
  if (!messageId || !jobId) {
    return res.status(400).json({ error: 'messageId and jobId required' });
  }

  const { error } = await supabase
    .from('job_emails')
    .delete()
    .eq('message_id', messageId)
    .eq('job_id', jobId);

  if (error) {
    return res.status(500).json({ error: 'Failed to unlink email' });
  }

  return res.status(200).json({ success: true });
}

// ── Get emails linked to a job ───────────────────────────
async function handleJobEmails(res, { jobId }) {
  if (!jobId) return res.status(400).json({ error: 'jobId required' });

  const { data, error } = await supabase
    .from('job_emails')
    .select('*')
    .eq('job_id', jobId)
    .order('received_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'Failed to fetch job emails' });
  }

  return res.status(200).json({ emails: data || [] });
}
