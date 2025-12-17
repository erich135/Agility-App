import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, inviteLink } = req.body;

  if (!email || !name || !inviteLink) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Configure email transport
  // Using environment variables for security
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Agility</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Welcome to Agility</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Your Account Invitation</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 40px 30px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          Hello <strong>${name}</strong>,
        </p>
        
        <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
          You've been invited to join the Agility Management System. Click the button below to set up your password and access your account.
        </p>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" 
             style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
            Set Up Your Password
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
          Or copy and paste this link into your browser:
        </p>
        <p style="color: #3b82f6; font-size: 14px; word-break: break-all; margin: 10px 0 0;">
          ${inviteLink}
        </p>
        
        <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
          <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 0;">
            This invitation link will expire in 7 days. If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center;">
        <p style="color: #6b7280; font-size: 13px; margin: 0;">
          © ${new Date().getFullYear()} Agility Management System. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Agility System" <noreply@agility.app>',
      to: email,
      subject: 'Welcome to Agility - Set Up Your Account',
      html: emailContent,
    });

    console.log(`✅ Invitation email sent to ${email}`);
    return res.status(200).json({ success: true, message: 'Invitation sent' });
  } catch (error) {
    console.error('❌ Email send error:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
}
