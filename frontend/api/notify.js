import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { emails, title, message } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
  });

  const htmlTemplate = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px; color: #0f172a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="https://raw.githubusercontent.com/souchlwes/accord-pro/main/frontend/src/accord.png" alt="Accord Logo" style="width: 50px; height: 50px; margin-bottom: 15px; border: 0 !important; outline: none !important; background-color: transparent !important; box-shadow: none !important; display: block; margin-left: auto; margin-right: auto;" />
        <h1 style="font-size: 28px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; font-style: italic; letter-spacing: -1px;">
          ACCORD <span style="color: #2563eb;">PRO</span>
        </h1>
      </div>
      
      <div style="background-color: #ffffff; padding: 40px; border-radius: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); margin-top: 30px; border: 2px solid #f1f5f9;">
        <p style="font-size: 10px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
          System Alert
        </p>
        <h2 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px;">
          ${title}
        </h2>
        
        <div style="background-color: #f1f5f9; border-left: 6px solid #2563eb; padding: 24px; border-radius: 12px; margin-top: 24px;">
          <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0; font-weight: 700;">
            ${message}
          </p>
        </div>
        
        <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin-top: 30px;">
          Just a quick heads-up from the system. You can review the full details and take action by logging into your workspace.
        </p>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"ACCORD PRO ALERTS" <${process.env.GMAIL_USER}>`,
      to: emails,
      subject: `Accord Pro: ${title}`,
      html: htmlTemplate
    });
    res.status(200).json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
}
