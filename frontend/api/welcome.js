import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { email, name, mode, role, dept, password } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
  });

  const readableRole = role === 'HEAD_ADMIN' ? 'Global Head Admin' : role === 'DEPT_ADMIN' ? 'Department Head' : 'Proctor';
  const deptContext = dept && dept !== 'GLOBAL' && dept !== 'N/A' ? ` for the <strong>${dept}</strong> department` : '';

  const humanMessage = mode === 'invited' 
    ? `You have been officially added to the system by your Administrator as a <strong>${readableRole}</strong>${deptContext}. Your account is fully verified, properly routed, and ready for action.`
    : `Your registration request has been reviewed and approved. You are now officially verified and have full access to your workspace as a <strong>${readableRole}</strong>${deptContext}.`;

  const passwordSection = password ? `
    <div style="background-color: #f1f5f9; padding: 20px; border-radius: 16px; border: 2px dashed #cbd5e1; margin-bottom: 30px;">
      <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b;">Temporary Password</p>
      <p style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 0.15em; color: #2563eb;">${password}</p>
      <p style="margin: 15px 0 0 0; font-size: 11px; color: #ef4444; font-weight: bold;">⚠️ Change this via Settings upon login.</p>
    </div>
  ` : '';

  const htmlTemplate = `
  <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px; border-radius: 20px; color: #0f172a;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://raw.githubusercontent.com/souchlwes/accord-pro/main/frontend/src/accord.png" alt="Accord Pro Logo" style="width: 60px; height: 60px; border: 0 !important; outline: none !important; background-color: transparent !important; box-shadow: none !important; display: block; margin-left: auto; margin-right: auto;" />
      <h1 style="margin: 15px 0 0 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em; color: #0f172a;">
        ACCORD <span style="color: #2563eb; font-style: italic;">PRO</span>
      </h1>
    </div>

    <div style="background-color: #ffffff; padding: 40px; border-radius: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center;">
      <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #10b981;">You're In, ${name.split(' ')[0]}!</h2>
      <p style="margin: 0 0 30px 0; font-size: 14px; line-height: 1.6; color: #475569;">
        ${humanMessage}
      </p>

      ${passwordSection}

      <a href="https://accord-pro.vercel.app/" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em;">
        Log In To Dashboard
      </a>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8;">
        System Communication • Accord Proctor Hub
      </p>
    </div>
  </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Accord Pro Team" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: mode === 'invited' ? "Welcome to Accord Pro - Account Created" : "Accord Pro - Access Approved",
      html: htmlTemplate
    });
    res.status(200).json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
}
