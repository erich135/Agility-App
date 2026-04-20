// ============================================================
// Email Inline Image API - Serves CID-referenced attachments
// ============================================================
// GET /api/email-inline?uid=123&cid=image001&folder=INBOX
// Returns raw image binary with correct Content-Type
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

  const { uid, cid, folder = 'INBOX' } = req.query;
  if (!uid || !cid) {
    return res.status(400).json({ error: 'uid and cid query params required' });
  }

  await loadDeps();

  const client = createImapClient();
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);

    try {
      const raw = await client.fetchOne(uid, { source: true }, { uid: true });
      const parsed = await simpleParser(raw.source);

      // Find the attachment matching this CID
      const att = (parsed.attachments || []).find(a => {
        const attCid = a.contentId ? a.contentId.replace(/[<>]/g, '') : '';
        return attCid === cid;
      });

      lock.release();
      await client.logout();

      if (!att || !att.content) {
        return res.status(404).json({ error: 'Inline image not found' });
      }

      // Serve raw binary with correct content type and cache headers
      res.setHeader('Content-Type', att.contentType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.status(200).send(att.content);
    } catch (err) {
      lock.release();
      throw err;
    }
  } catch (err) {
    try { await client.logout(); } catch {}
    console.error('Inline image error:', err);
    return res.status(500).json({ error: 'Failed to load inline image' });
  }
}
