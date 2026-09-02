import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { email, name, mode, role, dept } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
  });

  // Convert database roles to warm, readable titles
  const readableRole = role === 'HEAD_ADMIN' ? 'Global Head Admin' : role === 'DEPT_ADMIN' ? 'Department Head' : 'Proctor';
  const deptContext = dept && dept !== 'GLOBAL' && dept !== 'N/A' ? ` for the <strong>${dept}</strong> department` : '';

  const humanMessage = mode === 'invited' 
    ? `Welcome to the team! You have been officially added to the system by your Administrator as a <strong>${readableRole}</strong>${deptContext}. Your account is fully verified, properly routed, and ready for action.`
    : `Great news! Your registration request has been reviewed and approved. You are now officially verified and have full access to your workspace as a <strong>${readableRole}</strong>${deptContext}. We are thrilled to have you on board!`;

  const htmlTemplate = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px; color: #0f172a;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="https://raw.githubusercontent.com/souchlwes/accord-pro/main/frontend/src/accord.png" alt="Accord Logo" style="width: 50px; height: 50px; margin-bottom: 15px; border: 0 !important; outline: none !important; background-color: transparent !important; box-shadow: none !important; display: block; margin-left: auto; margin-right: auto;" />
        <h1 style="font-size: 28px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; font-style: italic; letter-spacing: -1px;">
          ACCORD <span style="color: #2563eb;">PRO</span>
        </h1>
      </div>
      
      <div style="background-color: #ffffff; padding: 40px; border-radius: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.05); margin-top: 30px; border: 2px solid #f1f5f9;">
        <h2 style="color: #10b981; margin-top: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">
          You're In, ${name.split(' ')[0]}!
        </h2>
        
        <p style="font-size: 14px; line-height: 1.8; color: #475569; margin-bottom: 30px; font-weight: 500;">
          ${humanMessage}
        </p>
        
        <a href="https://your-vercel-deployment-url.vercel.app" style="display: block; width: 100%; text-align: center; background-color: #2563eb; color: #ffffff; padding: 18px 0; border-radius: 16px; text-decoration: none; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">
          Log In To Dashboard
        </a>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Accord Pro System" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: mode === 'invited' ? "Welcome to Accord Pro - Account Created" : "Accord Pro - Access Approved",
      html: htmlTemplate
    });
    res.status(200).json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
}