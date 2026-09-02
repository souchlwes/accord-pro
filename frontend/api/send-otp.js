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
      subject: 'Accord Pro - Password Change Verification Code',
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px; border-radius: 20px; color: #0f172a;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://raw.githubusercontent.com/souchlwes/accord-pro/main/frontend/src/accord.png" alt="Accord Pro Logo" style="width: 60px; height: 60px; border: 0 !important; outline: none !important; background-color: transparent !important; box-shadow: none !important; display: block; margin-left: auto; margin-right: auto;" />
            <h1 style="margin: 15px 0 0 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em; color: #0f172a;">
              ACCORD <span style="color: #2563eb; font-style: italic;">PRO</span>
            </h1>
          </div>

          <div style="background-color: #ffffff; padding: 40px; border-radius: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center;">
            <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b;">Security Verification</h2>
            <p style="margin: 0 0 30px 0; font-size: 14px; line-height: 1.6; color: #475569;">
              You requested to change your password. Please use the secure verification code below to authorize this update.
            </p>

            <div style="background-color: #f1f5f9; padding: 20px; border-radius: 16px; border: 2px dashed #cbd5e1; margin-bottom: 30px;">
              <p style="margin: 0; font-size: 36px; font-weight: 900; letter-spacing: 0.3em; color: #2563eb;">${otp}</p>
            </div>

            <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: bold;">
              This code will expire shortly. If you did not request a password change, please securely ignore this email.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8;">
              System Communication • Accord Proctor Hub
            </p>
          </div>
        </div>
      `
    });

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
