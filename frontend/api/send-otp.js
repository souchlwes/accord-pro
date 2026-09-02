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
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 550px; margin: 0 auto; background-color: #ffffff; padding: 40px 30px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <!-- INSERT YOUR TRANSPARENT LOGO IMG TAG FROM WELCOME.JS HERE -->
            <h2 style="color: #0f172a; font-size: 22px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: 2px;">ACCORD PRO</h2>
          </div>
          
          <h3 style="color: #1e293b; font-size: 20px; margin-top: 0; text-align: center; font-weight: 800;">Security Verification</h3>
          
          <p style="color: #64748b; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
            You requested to change your password. Please use the secure verification code below to authorize this update.
          </p>
          
          <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 30px; border-radius: 12px; text-align: center; margin: 0 auto;">
            <p style="margin: 0 0 12px 0; font-size: 11px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 2px;">YOUR ONE-TIME CODE</p>
            <h1 style="letter-spacing: 14px; color: #4f46e5; margin: 0; font-family: 'Courier New', monospace; font-size: 46px; font-weight: 900; padding-left: 14px;">${otp}</h1>
          </div>
          
          <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            <p style="font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6; margin: 0;">
              This code will expire shortly.<br>
              If you did not request a password change, please ignore this email and your password will remain secure.
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
