export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, inviteLink } = req.body;

  if (!email || !name || !inviteLink) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const nodemailer = require('nodemailer');

    const host = process.env.EMAIL_HOST;
    const port = Number(process.env.EMAIL_PORT || 465);
    const secure = String(process.env.EMAIL_SECURE || 'true').toLowerCase() === 'true';
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD;
    const fromName = process.env.EMAIL_FROM_NAME || 'Agility';
    const fromAddress = process.env.EMAIL_FROM_ADDRESS || user;

    if (!host || !user || !pass) {
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'Missing EMAIL_HOST / EMAIL_USER / EMAIL_PASSWORD'
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });

    await transporter.verify();

    const safeName = String(name || '').trim() || 'there';
    const safeEmail = String(email || '').trim();
    const safeInviteLink = String(inviteLink || '').trim();

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2>You’ve been invited to Agility</h2>
        <p>Hi ${safeName},</p>
        <p>Click the button below to set your password and activate your account:</p>
        <p style="margin: 24px 0;">
          <a href="${safeInviteLink}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 16px;border-radius:8px;text-decoration:none;font-weight:700;">
            Set up your account
          </a>
        </p>
        <p style="color:#6b7280;font-size:12px;">If the button doesn’t work, copy/paste this link:</p>
        <p style="color:#2563eb;font-size:12px;word-break:break-all;">${safeInviteLink}</p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: { name: fromName, address: fromAddress },
      to: safeEmail,
      subject: 'You’re invited to Agility',
      html,
      text: `You’ve been invited to Agility.\n\nSet up your account: ${safeInviteLink}`
    });

    return res.status(200).json({
      success: true,
      message: 'Invitation sent',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('❌ Email send error:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message
    });
  }
}
