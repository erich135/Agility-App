// ============================================================
// Email Auth - Simple status endpoint (IMAP/SMTP mode)
// ============================================================
// GET /api/email-auth?action=status  → Check if email is configured
// No OAuth needed — uses server-side IMAP/SMTP credentials
// ============================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action || req.body?.action;

  if (action === 'status') {
    const configured = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
    return res.status(200).json({
      connected: configured,
      email: configured ? process.env.EMAIL_USER : null,
    });
  }

  if (action === 'disconnect') {
    // No-op for IMAP mode — credentials are server-side
    return res.status(200).json({ success: true });
  }

  return res.status(200).json({
    connected: !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
    email: process.env.EMAIL_USER || null,
  });
}
