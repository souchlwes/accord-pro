import Groq from 'groq-sdk';

const groq = new Groq();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { message } = req.body;

    const systemPrompt = `You are the Accord Pro Assistant, an institutional examination operations platform AI.
    Keep answers concise, professional, and without markdown.
    - Onboarding: 6-character Invite Code required; new accounts stay PENDING until admin approves.
    - Security: OTP-verified email authentication.
    - Roles: Head Admin (Global Master View), Dept Admin (local rooms/proctor pool), Proctor (personal itinerary).
    - Conflicts: Live Re-Validation Engine flags double-booked rooms or proctors.
    - Emergencies: Reliever Requests route shifts to available backup proctors.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.5,
      max_tokens: 150,
    });

    const reply = chatCompletion.choices[0]?.message?.content || "System offline. Please try again.";
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Groq API Error:', error);
    return res.status(500).json({ reply: "Connection error with AI assistant." });
  }
}
