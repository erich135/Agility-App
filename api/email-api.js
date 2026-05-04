// ============================================================
// Email API - IMAP/SMTP Mail Operations (cPanel compatible)
// ============================================================
// POST /api/email-api  (body: { action, ...params })
//   action: inbox, message, send, reply, forward, move,
//           delete, search, folders, mark-read, link-job,
//           unlink-job, job-emails, status
// ============================================================

// Lazy-loaded modules (resolved on first call)
let ImapFlow, simpleParser, nodemailer, supabase;

async function loadDeps() {
  if (!ImapFlow) {
    const imap = await import('imapflow');
    ImapFlow = imap.ImapFlow;
  }
  if (!simpleParser) {
    const mp = await import('mailparser');
    simpleParser = mp.simpleParser;
  }
  if (!nodemailer) {
    const nm = await import('nodemailer');
    nodemailer = nm.default;
  }
  if (!supabase) {
    const { createClient } = await import('@supabase/supabase-js');
    supabase = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );
  }
}

// ── IMAP/SMTP Config from env ─────────────────────────────
const IMAP_HOST = process.env.EMAIL_HOST;
const IMAP_PORT = Number(process.env.IMAP_PORT || 993);
const SMTP_HOST = process.env.EMAIL_HOST;
const SMTP_PORT = Number(process.env.EMAIL_PORT || 465);
const SMTP_SECURE = String(process.env.EMAIL_SECURE || 'true').toLowerCase() === 'true';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASSWORD;
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'LMW Financial Solutions';
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || EMAIL_USER;
const APP_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://agility.lmwfinance.app');

// ── Email Signature ───────────────────────────────────────
function getSignatureHtml() {
  return `
<br/>
<div style="margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px;">
  <img src="${APP_URL}/Signature.png" alt="LMW Financial Solutions" style="max-width: 600px; height: auto;" />
</div>`;
}

// ── IMAP Client Factory ───────────────────────────────────
function createImapClient() {
  return new ImapFlow({
    host: IMAP_HOST,
    port: IMAP_PORT,
    secure: true,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    logger: false,
  });
}

// ── SMTP Transporter ──────────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
}

// ── Main Handler ──────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET routing: status check, inline image, attachment download ──────────
  if (req.method === 'GET') {
    const { action, attachment, inline, uid, index, cid, folder = 'INBOX' } = req.query;

    // Auth status / disconnect (replaces /api/email-auth)
    if (action === 'status' || action === 'disconnect') {
      if (action === 'disconnect') return res.status(200).json({ success: true });
      const configured = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
      return res.status(200).json({ connected: configured, email: configured ? process.env.EMAIL_USER : null });
    }

    // Inline image (replaces /api/email-inline)
    if (inline === '1') {
      if (!uid || !cid) return res.status(400).json({ error: 'uid and cid query params required' });
      await loadDeps();
      const client = createImapClient();
      try {
        await client.connect();
        const lock = await client.getMailboxLock(folder);
        try {
          const raw = await client.fetchOne(uid, { source: true }, { uid: true });
          const parsed = await simpleParser(raw.source);
          const att = (parsed.attachments || []).find(a => {
            const attCid = a.contentId ? a.contentId.replace(/[<>]/g, '') : '';
            return attCid === cid;
          });
          lock.release();
          await client.logout();
          if (!att || !att.content) return res.status(404).json({ error: 'Inline image not found' });
          res.setHeader('Content-Type', att.contentType || 'application/octet-stream');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.status(200).send(att.content);
        } catch (err) { lock.release(); throw err; }
      } catch (err) {
        try { await client.logout(); } catch {}
        return res.status(500).json({ error: 'Failed to serve inline image' });
      }
    }

    // Attachment download (replaces /api/email-attachment)
    if (attachment === '1') {
      if (!uid || index === undefined) return res.status(400).json({ error: 'uid and index query params required' });
      const attIndex = parseInt(index, 10);
      if (isNaN(attIndex) || attIndex < 0) return res.status(400).json({ error: 'index must be a non-negative integer' });
      await loadDeps();
      const client = createImapClient();
      try {
        await client.connect();
        const lock = await client.getMailboxLock(folder);
        try {
          const raw = await client.fetchOne(uid, { source: true }, { uid: true });
          const parsed = await simpleParser(raw.source);
          const attachments = parsed.attachments || [];
          if (attIndex >= attachments.length) {
            lock.release();
            await client.logout();
            return res.status(404).json({ error: 'Attachment not found' });
          }
          const att = attachments[attIndex];
          lock.release();
          await client.logout();
          if (!att || !att.content) return res.status(404).json({ error: 'Attachment content not available' });
          const filename = att.filename || `attachment-${attIndex}`;
          const contentType = att.contentType || 'application/octet-stream';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '\\"')}"`);
          res.setHeader('Content-Length', att.content.length);
          res.setHeader('Cache-Control', 'private, max-age=300');
          return res.status(200).send(att.content);
        } catch (err) { lock.release(); throw err; }
      } catch (err) {
        try { await client.logout(); } catch {}
        return res.status(500).json({ error: 'Failed to download attachment' });
      }
    }

    return res.status(400).json({ error: 'Unknown GET action' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Load dependencies on first invocation
  await loadDeps();

  const { action, user_id, ...params } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id required' });
  }

  try {
    switch (action) {
      case 'status':
        return handleStatus(res);
      case 'inbox':
        return await handleInbox(res, params);
      case 'message':
        return await handleMessage(res, params);
      case 'send':
        return await handleSend(res, params);
      case 'reply':
        return await handleReply(res, params);
      case 'forward':
        return await handleForward(res, params);
      case 'move':
        return await handleMove(res, params);
      case 'delete':
        return await handleDelete(res, params);
      case 'search':
        return await handleSearch(res, params);
      case 'folders':
        return await handleFolders(res);
      case 'mark-read':
        return await handleMarkRead(res, params);
      case 'link-job':
        return await handleLinkJob(res, params, user_id);
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

// ── Status: check if IMAP is configured ───────────────────
function handleStatus(res) {
  const configured = !!(IMAP_HOST && EMAIL_USER && EMAIL_PASS);
  return res.status(200).json({
    connected: configured,
    email: configured ? EMAIL_USER : null,
  });
}

// ── Folders: list all mail folders (recursive) ────────────
async function handleFolders(res) {
  const client = createImapClient();
  try {
    await client.connect();
    const tree = await client.listTree();

    const folders = [];
    function walkTree(nodes, parentPath) {
      for (const node of nodes) {
        const path = node.path;
        const name = node.name;
        // Still walk children even for Noselect folders
        if (node.flags && node.flags.has('\\Noselect')) {
          if (node.folders?.length) walkTree(node.folders, path);
          continue;
        }
        folders.push({
          id: path,
          path: path,
          displayName: name,
          delimiter: node.delimiter || '.',
          parentPath: parentPath || null,
          specialUse: node.specialUse || null,
        });
        if (node.folders?.length) {
          walkTree(node.folders, path);
        }
      }
    }
    if (tree.folders) walkTree(tree.folders, null);

    // Get status counts per folder
    const foldersWithCounts = [];
    for (const folder of folders) {
      try {
        const status = await client.status(folder.path, { messages: true, unseen: true });
        foldersWithCounts.push({
          ...folder,
          totalItemCount: status.messages || 0,
          unreadItemCount: status.unseen || 0,
        });
      } catch {
        foldersWithCounts.push({ ...folder, totalItemCount: 0, unreadItemCount: 0 });
      }
    }

    await client.logout();
    return res.status(200).json({ folders: foldersWithCounts });
  } catch (err) {
    try { await client.logout(); } catch {}
    throw err;
  }
}

// ── Inbox: list messages in a folder ──────────────────────
async function handleInbox(res, { folder = 'INBOX', page = 1, pageSize = 25 }) {
  const client = createImapClient();
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);

    try {
      const mailbox = client.mailbox;
      const total = mailbox.exists || 0;

      if (total === 0) {
        lock.release();
        await client.logout();
        return res.status(200).json({ messages: [], total: 0, page, pageSize, hasMore: false });
      }

      // Calculate sequence range (newest first)
      const end = total - (page - 1) * pageSize;
      const start = Math.max(1, end - pageSize + 1);

      if (end < 1) {
        lock.release();
        await client.logout();
        return res.status(200).json({ messages: [], total, page, pageSize, hasMore: false });
      }

      const messages = [];
      for await (const msg of client.fetch(`${start}:${end}`, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
      })) {
        const env = msg.envelope || {};
        messages.push({
          id: String(msg.uid),
          uid: msg.uid,
          seq: msg.seq,
          subject: env.subject || '(no subject)',
          from: formatAddress(env.from?.[0]),
          toRecipients: (env.to || []).map(formatAddress),
          receivedDateTime: env.date ? new Date(env.date).toISOString() : null,
          isRead: msg.flags?.has('\\Seen') || false,
          hasAttachments: hasAttachmentParts(msg.bodyStructure),
          bodyPreview: '',
          importance: msg.flags?.has('\\Flagged') ? 'high' : 'normal',
          folder: folder,
        });
      }

      // Reverse so newest is first
      messages.reverse();

      lock.release();
      await client.logout();

      return res.status(200).json({
        messages,
        total,
        page,
        pageSize,
        hasMore: start > 1,
      });
    } catch (err) {
      lock.release();
      throw err;
    }
  } catch (err) {
    try { await client.logout(); } catch {}
    throw err;
  }
}

// ── Message: get full message by UID ──────────────────────
async function handleMessage(res, { messageId, folder = 'INBOX' }) {
  if (!messageId) return res.status(400).json({ error: 'messageId required' });

  const client = createImapClient();
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);

    try {
      // Fetch full raw message by UID
      const raw = await client.fetchOne(messageId, { source: true }, { uid: true });
      const parsed = await simpleParser(raw.source);

      // Build attachment list
      const attachments = (parsed.attachments || []).map((att, idx) => ({
        id: String(idx),
        name: att.filename || `attachment-${idx}`,
        contentType: att.contentType || 'application/octet-stream',
        size: att.size || 0,
        isInline: att.contentDisposition === 'inline',
        contentId: att.contentId ? att.contentId.replace(/[<>]/g, '') : null,
      }));

      // Replace CID references with proxy URLs to /api/email-inline
      let htmlContent = parsed.html || parsed.textAsHtml || parsed.text || '';
      for (const att of (parsed.attachments || [])) {
        if (att.contentId) {
          const cid = att.contentId.replace(/[<>]/g, '');
          const proxyUrl = `/api/email-api?inline=1&uid=${messageId}&cid=${encodeURIComponent(cid)}&folder=${encodeURIComponent(folder)}`;
          htmlContent = htmlContent.replace(
            new RegExp(`cid:${cid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'),
            proxyUrl
          );
        }
      }

      const message = {
        id: String(messageId),
        subject: parsed.subject || '(no subject)',
        from: {
          emailAddress: {
            name: parsed.from?.value?.[0]?.name || '',
            address: parsed.from?.value?.[0]?.address || '',
          },
        },
        toRecipients: (parsed.to?.value || []).map(a => ({
          emailAddress: { name: a.name || '', address: a.address || '' },
        })),
        ccRecipients: (parsed.cc?.value || []).map(a => ({
          emailAddress: { name: a.name || '', address: a.address || '' },
        })),
        receivedDateTime: parsed.date ? parsed.date.toISOString() : null,
        sentDateTime: parsed.date ? parsed.date.toISOString() : null,
        body: {
          contentType: parsed.html ? 'html' : 'text',
          content: htmlContent,
        },
        hasAttachments: attachments.length > 0,
        internetMessageId: parsed.messageId || null,
        conversationId: null,
        importance: 'normal',
      };

      // Check if email linked to any jobs
      const { data: jobLinks } = await supabase
        .from('job_emails')
        .select('job_id, notes')
        .eq('message_id', String(messageId));

      lock.release();
      await client.logout();

      return res.status(200).json({
        message,
        attachments,
        linkedJobs: jobLinks || [],
      });
    } catch (err) {
      lock.release();
      throw err;
    }
  } catch (err) {
    try { await client.logout(); } catch {}
    throw err;
  }
}

// ── Send: compose new email ──────────────────────────────
async function handleSend(res, { to, cc, bcc, subject, body, contentType = 'HTML' }) {
  if (!to || !subject) {
    return res.status(400).json({ error: 'to and subject required' });
  }

  const transporter = createTransporter();
  const toList = Array.isArray(to) ? to.join(', ') : to;
  const ccList = cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined;
  const bccList = bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined;

  await transporter.sendMail({
    from: { name: FROM_NAME, address: FROM_ADDRESS },
    to: toList,
    cc: ccList,
    bcc: bccList,
    subject,
    ...(contentType === 'HTML'
      ? { html: (body || '') + getSignatureHtml() }
      : { text: body || '' }),
  });

  return res.status(200).json({ success: true });
}

// ── Reply: reply to a message ─────────────────────────────
async function handleReply(res, { messageId, folder = 'INBOX', body, replyAll = false }) {
  if (!messageId || !body) {
    return res.status(400).json({ error: 'messageId and body required' });
  }

  // Fetch original message to get headers
  const client = createImapClient();
  let originalParsed;
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      const raw = await client.fetchOne(messageId, { source: true }, { uid: true });
      originalParsed = await simpleParser(raw.source);
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    try { await client.logout(); } catch {}
    throw err;
  }

  // Build reply recipients
  const fromAddr = originalParsed.from?.value?.[0]?.address || '';
  let toAddrs = fromAddr;

  if (replyAll) {
    const allTo = [
      ...(originalParsed.to?.value || []),
      ...(originalParsed.cc?.value || []),
    ]
      .map(a => a.address)
      .filter(a => a && a.toLowerCase() !== EMAIL_USER.toLowerCase() && a.toLowerCase() !== fromAddr.toLowerCase());

    if (allTo.length > 0) {
      toAddrs = [fromAddr, ...allTo].join(', ');
    }
  }

  const replySubject = originalParsed.subject?.startsWith('Re:')
    ? originalParsed.subject
    : `Re: ${originalParsed.subject || ''}`;

  // Build quoted body
  const originalDate = originalParsed.date ? originalParsed.date.toLocaleString() : '';
  const originalFrom = originalParsed.from?.text || '';
  const quotedHtml = `
    <div>${body}</div>
    ${getSignatureHtml()}
    <br/>
    <div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 5px; color: #666;">
      <p>On ${originalDate}, ${originalFrom} wrote:</p>
      ${originalParsed.html || `<pre>${originalParsed.text || ''}</pre>`}
    </div>
  `;

  const transporter = createTransporter();
  await transporter.sendMail({
    from: { name: FROM_NAME, address: FROM_ADDRESS },
    to: toAddrs,
    subject: replySubject,
    html: quotedHtml,
    inReplyTo: originalParsed.messageId || undefined,
    references: originalParsed.messageId || undefined,
  });

  return res.status(200).json({ success: true });
}

// ── Forward: forward a message ────────────────────────────
async function handleForward(res, { messageId, folder = 'INBOX', to, comment }) {
  if (!messageId || !to) {
    return res.status(400).json({ error: 'messageId and to required' });
  }

  // Fetch original message
  const client = createImapClient();
  let originalParsed;
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      const raw = await client.fetchOne(messageId, { source: true }, { uid: true });
      originalParsed = await simpleParser(raw.source);
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    try { await client.logout(); } catch {}
    throw err;
  }

  const toList = Array.isArray(to) ? to.join(', ') : to;
  const fwdSubject = originalParsed.subject?.startsWith('Fwd:')
    ? originalParsed.subject
    : `Fwd: ${originalParsed.subject || ''}`;

  const originalFrom = originalParsed.from?.text || '';
  const originalTo = originalParsed.to?.text || '';
  const originalDate = originalParsed.date ? originalParsed.date.toLocaleString() : '';

  const forwardHtml = `
    ${comment ? `<div>${comment}</div>` : ''}
    ${getSignatureHtml()}
    <div style="border-top: 1px solid #ccc; padding-top: 10px;">
      <p><b>---------- Forwarded message ----------</b></p>
      <p><b>From:</b> ${originalFrom}</p>
      <p><b>Date:</b> ${originalDate}</p>
      <p><b>Subject:</b> ${originalParsed.subject || ''}</p>
      <p><b>To:</b> ${originalTo}</p>
      <br/>
      ${originalParsed.html || `<pre>${originalParsed.text || ''}</pre>`}
    </div>
  `;

  // Include original attachments
  const attachments = (originalParsed.attachments || []).map(att => ({
    filename: att.filename,
    content: att.content,
    contentType: att.contentType,
  }));

  const transporter = createTransporter();
  await transporter.sendMail({
    from: { name: FROM_NAME, address: FROM_ADDRESS },
    to: toList,
    subject: fwdSubject,
    html: forwardHtml,
    attachments,
  });

  return res.status(200).json({ success: true });
}

// ── Move: move message to another folder ──────────────────
async function handleMove(res, { messageId, folder = 'INBOX', destinationFolder }) {
  if (!messageId || !destinationFolder) {
    return res.status(400).json({ error: 'messageId and destinationFolder required' });
  }

  const client = createImapClient();
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      await client.messageMove(messageId, destinationFolder, { uid: true });
    } finally {
      lock.release();
    }
    await client.logout();
    return res.status(200).json({ success: true });
  } catch (err) {
    try { await client.logout(); } catch {}
    throw err;
  }
}

// ── Delete: move to Trash or flag deleted ─────────────────
async function handleDelete(res, { messageId, folder = 'INBOX' }) {
  if (!messageId) return res.status(400).json({ error: 'messageId required' });

  const client = createImapClient();
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      // Try to move to Trash first
      try {
        await client.messageMove(messageId, 'Trash', { uid: true });
      } catch {
        // If Trash doesn't exist, flag as deleted
        await client.messageFlagsAdd(messageId, ['\\Deleted'], { uid: true });
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return res.status(200).json({ success: true });
  } catch (err) {
    try { await client.logout(); } catch {}
    throw err;
  }
}

// ── Search: search messages ───────────────────────────────
async function handleSearch(res, { query, folder = 'INBOX', pageSize = 25 }) {
  if (!query) return res.status(400).json({ error: 'query required' });

  const client = createImapClient();
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);

    try {
      // IMAP search across subject, from, to, body
      const results = await client.search({
        or: [
          { subject: query },
          { from: query },
          { to: query },
          { body: query },
        ],
      });

      if (!results?.length) {
        lock.release();
        await client.logout();
        return res.status(200).json({ messages: [], total: 0 });
      }

      // Take only the latest pageSize results
      const uids = results.slice(-pageSize).reverse();
      const uidRange = uids.join(',');

      const messages = [];
      for await (const msg of client.fetch(uidRange, {
        uid: true,
        envelope: true,
        flags: true,
        bodyStructure: true,
      }, { uid: true })) {
        const env = msg.envelope || {};
        messages.push({
          id: String(msg.uid),
          uid: msg.uid,
          subject: env.subject || '(no subject)',
          from: formatAddress(env.from?.[0]),
          toRecipients: (env.to || []).map(formatAddress),
          receivedDateTime: env.date ? new Date(env.date).toISOString() : null,
          isRead: msg.flags?.has('\\Seen') || false,
          hasAttachments: hasAttachmentParts(msg.bodyStructure),
          bodyPreview: '',
          importance: msg.flags?.has('\\Flagged') ? 'high' : 'normal',
          folder: folder,
        });
      }

      // Sort newest first
      messages.sort((a, b) => new Date(b.receivedDateTime) - new Date(a.receivedDateTime));

      lock.release();
      await client.logout();

      return res.status(200).json({
        messages,
        total: results.length,
      });
    } catch (err) {
      lock.release();
      throw err;
    }
  } catch (err) {
    try { await client.logout(); } catch {}
    throw err;
  }
}

// ── Mark Read/Unread ─────────────────────────────────────
async function handleMarkRead(res, { messageId, folder = 'INBOX', isRead = true }) {
  if (!messageId) return res.status(400).json({ error: 'messageId required' });

  const client = createImapClient();
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      if (isRead) {
        await client.messageFlagsAdd(messageId, ['\\Seen'], { uid: true });
      } else {
        await client.messageFlagsRemove(messageId, ['\\Seen'], { uid: true });
      }
    } finally {
      lock.release();
    }
    await client.logout();
    return res.status(200).json({ success: true });
  } catch (err) {
    try { await client.logout(); } catch {}
    throw err;
  }
}

// ── Link email to job ────────────────────────────────────
async function handleLinkJob(res, { messageId, jobId, folder = 'INBOX', notes }, userId) {
  if (!messageId || !jobId) {
    return res.status(400).json({ error: 'messageId and jobId required' });
  }

  // Fetch message envelope for metadata (best-effort; link still succeeds if IMAP fails)
  const client = createImapClient();
  let msgData;
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      for await (const msg of client.fetch(messageId, {
        uid: true,
        envelope: true,
        bodyStructure: true,
      }, { uid: true })) {
        msgData = msg;
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    try { await client.logout(); } catch {}
    console.warn('handleLinkJob: IMAP metadata fetch failed (non-fatal):', err.message);
    // Continue without envelope metadata
  }

  const env = msgData?.envelope || {};

  const linkData = {
    job_id: jobId,
    message_id: String(messageId),
    internet_message_id: env.messageId || null,
    conversation_id: null,
    subject: env.subject || null,
    sender_name: env.from?.[0]?.name || null,
    sender_email: env.from?.[0]?.address || null,
    received_at: env.date ? new Date(env.date).toISOString() : null,
    snippet: '',
    has_attachments: msgData ? hasAttachmentParts(msgData.bodyStructure) : false,
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
    .eq('message_id', String(messageId))
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

// ── Helpers ──────────────────────────────────────────────
function formatAddress(addr) {
  if (!addr) return { emailAddress: { name: '', address: '' } };
  return {
    emailAddress: {
      name: addr.name || '',
      address: addr.address || '',
    },
  };
}

function hasAttachmentParts(structure) {
  if (!structure) return false;
  if (structure.disposition === 'attachment') return true;
  if (structure.childNodes) {
    return structure.childNodes.some(hasAttachmentParts);
  }
  return false;
}
