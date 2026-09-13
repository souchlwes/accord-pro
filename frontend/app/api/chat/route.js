import Groq from 'groq-sdk';
import { NextResponse } from 'next/server';

const groq = new Groq();

export async function POST(request) {
  try {
    const body = await request.json();
    const userMessage = body.message;

    const systemPrompt = `You are the Accord Pro Assistant, an intelligent, professional AI helper for an institutional examination operations platform. 
    Keep your answers concise, professional, and directly helpful. Do not use markdown formatting.
    
    Here is your core knowledge base:
    - Onboarding: Users need a 6-character 'Invite Code' from their Department Head or IT Admin to register. New accounts remain strictly in a PENDING state until an Admin approves them.
    - Security: The system uses OTP-verified email authentication.
    - Roles: Head Admins get a Global Master View. Dept Admins manage local rooms. Proctors get a personal dynamic itinerary dashboard.
    - Conflict Detection: A live Re-Validation Engine continuously scans the database. When Admins generate schedules from the Availability Log Book, it instantly flags double-booked rooms or proctors.
    - Emergencies: If a proctor declines a shift, an emergency 'Reliever Request' is instantly routed to available backups.
    - Tech Stack: The platform is built using React, Next.js, Supabase, and Cloudflare R2.
    
    Answer the user's question accurately based ONLY on the rules above.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      model: 'llama3-8b-8192', 
      temperature: 0.5,
      max_tokens: 150,
    });

    const reply = chatCompletion.choices[0]?.message?.content || "I am currently rebooting. Please try again in a moment.";
    return NextResponse.json({ reply }, { status: 200 });

  } catch (error) {
    console.error('Groq API Error:', error);
    return NextResponse.json(
      { reply: "System connection error. My neural link to Accord Pro is temporarily offline." },
      { status: 500 }
    );
  }
}
