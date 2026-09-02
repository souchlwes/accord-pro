import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { email, otp } = req.body;
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
    });

    await transporter.sendMail({
      from: `"Accord Pro Security" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Your Password Change OTP',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; max-width: 500px;">
          <h2 style="color: #4f46e5; margin-top: 0;">Security Verification</h2>
          <p>You requested to change your password. Your one-time verification code is:</p>
          <div style="background: #f4f6f8; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="letter-spacing: 8px; color: #111827; margin: 0; font-family: monospace;">${otp}</h1>
          </div>
          <p style="font-size: 12px; color: #6b7280;">If you did not request this change, please ignore this email.</p>
        </div>
      `
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
