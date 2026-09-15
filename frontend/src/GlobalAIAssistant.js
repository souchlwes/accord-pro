import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, ShieldCheck, Send } from 'lucide-react';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.REACT_APP_GROQ_API_KEY,
  dangerouslyAllowBrowser: true 
});

export default function GlobalAIAssistant({ session, profile, authMode, activeTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'System Online. I am the Accord Pro Assistant. How can I help you navigate the platform today?' }
  ]);
  const messagesEndRef = useRef(null);

  const getUserContext = () => {
    if (!session) return `User is currently on the authentication screen. Auth Mode: ${authMode}.`;
    if (profile?.status === 'BLOCKED') return `User's account is currently BLOCKED by an admin.`;
    if (profile?.status === 'PENDING') return `User's account is PENDING. They are waiting for a Head Admin to approve their access.`;
    return `User is logged in as ${profile?.role} in the ${profile?.assigned_dept || 'Global'} department. They are currently viewing the '${activeTab}' tab.`;
  };

  const submitMessage = async (text) => {
    if (!text.trim()) return;
    
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const systemPrompt = `You are the Accord Pro Assistant, an intelligent, reliable AI for an institutional examination operations platform. 
      
      CURRENT LIVE CONTEXT:
      ${getUserContext()}

      CRITICAL RULES:
      1. Be highly reliable, concise, and professional.
      2. ABSOLUTELY NO MARKDOWN. Do NOT use asterisks (*), hash symbols (#), or bullet points. Respond in pure, clean, plain text paragraphs.
      3. If the user is on the login/register screen, proactively guide them on obtaining 6-character invite codes from their admin.`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: 'user', content: text }
      ];

      const chatCompletion = await groq.chat.completions.create({
        messages: apiMessages,
        model: 'openai/gpt-oss-20b', 
        temperature: 0.5,
        max_tokens: 1024, // Expanded to prevent message cut-offs
      });

      let reply = chatCompletion.choices[0]?.message?.content || "System offline.";
      
      // The Scrubber: Strips out any stubborn markdown characters the AI tries to sneak in
      reply = reply.replace(/[*#_`]/g, '');

      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'bot', text: reply.trim() }]);
    } catch (error) {
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'bot', text: "Connection error. Neural link offline." }]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isOpen]);

  return (
    <>
      {/* Floating Toggle Button: Adjusted to clear mobile nav (bottom-28) and sit beautifully on desktop (md:bottom-10) */}
      <div className="fixed bottom-28 md:bottom-10 right-6 md:right-10 z-[9999]">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`p-4 rounded-full shadow-[0_10px_40px_rgba(37,99,235,0.4)] transition-all hover:scale-110 border ${
            isOpen ? 'bg-slate-800 text-white border-slate-700' : 'bg-blue-600 text-white border-blue-500'
          }`}
        >
          {isOpen ? <X size={24} strokeWidth={1.5} /> : <MessageCircle size={24} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Glassmorphic Chat Window */}
      {isOpen && (
        <div className="fixed bottom-48 md:bottom-28 right-6 md:right-10 w-[calc(100vw-3rem)] md:w-96 h-[32rem] max-h-[65vh] bg-slate-900/90 backdrop-blur-2xl border border-blue-500/20 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden z-[9998] animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-gradient-to-r from-blue-900/60 to-slate-900/60 px-5 py-4 flex items-center gap-3 border-b border-white/5">
            <ShieldCheck size={20} className="text-blue-400" strokeWidth={1.5} />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Accord Assistant</h3>
              <p className="text-[10px] text-emerald-400 font-mono tracking-widest">System Online</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {/* whitespace-pre-wrap ensures paragraphs separate nicely instead of mashing into one block */}
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-[11px] leading-relaxed shadow-lg whitespace-pre-wrap ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                    : 'bg-slate-800/90 text-slate-200 rounded-tl-sm border border-white/5'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-800/90 rounded-2xl rounded-tl-sm p-3.5 flex items-center gap-1.5 w-16 border border-white/5">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={(e) => { e.preventDefault(); submitMessage(chatInput); }} className="p-4 bg-slate-900 border-t border-white/10 flex items-center gap-3">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask anything..." 
              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
            />
            <button type="submit" disabled={!chatInput.trim() || isTyping} className="w-10 h-10 shrink-0 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl flex items-center justify-center transition-all shadow-md">
              <Send size={16} strokeWidth={1.5} className="ml-0.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
