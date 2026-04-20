// ============================================================
// Email Attachment Download API
// ============================================================
// GET /api/email-attachment?uid=123&index=0&folder=INBOX
// Returns raw attachment binary with correct Content-Type
// and Content-Disposition for browser download
// ============================================================

let ImapFlow, simpleParser;

async function loadDeps() {
  if (!ImapFlow) {
    const imap = await import('imapflow');
    ImapFlow = imap.ImapFlow;
  }
  if (!simpleParser) {
    const mp = await import('mailparser');
    simpleParser = mp.simpleParser;
  }
}

function createImapClient() {
  return new ImapFlow({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.IMAP_PORT || 993),
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    logger: false,
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET required' });
  }

  const { uid, index, folder = 'INBOX' } = req.query;
  if (!uid || index === undefined) {
    return res.status(400).json({ error: 'uid and index query params required' });
  }

  const attIndex = parseInt(index, 10);
  if (isNaN(attIndex) || attIndex < 0) {
    return res.status(400).json({ error: 'index must be a non-negative integer' });
  }

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

      if (!att || !att.content) {
        return res.status(404).json({ error: 'Attachment content not available' });
      }

      const filename = att.filename || `attachment-${attIndex}`;
      const contentType = att.contentType || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '\\"')}"`);
      res.setHeader('Content-Length', att.content.length);
      res.setHeader('Cache-Control', 'private, max-age=300');
      return res.status(200).send(att.content);
    } catch (err) {
      lock.release();
      throw err;
    }
  } catch (err) {
    try { await client.logout(); } catch {}
    console.error('Attachment download error:', err);
    return res.status(500).json({ error: 'Failed to download attachment' });
  }
}
