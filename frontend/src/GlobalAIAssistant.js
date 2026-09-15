import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, ShieldCheck, Send, ChevronRight } from 'lucide-react';
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

  // Dynamic context generation
  const getUserContext = () => {
    if (!session) return `User is currently on the authentication screen. Auth Mode: ${authMode}. They may need help logging in, resetting a password, or finding an invite code.`;
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
      const systemPrompt = `You are the Accord Pro Assistant, an intelligent AI for an institutional examination operations platform. 
      Core features include an automated scheduling engine for conflict-free room allocation, a real-time proctor dispatch system, and an institutional omni-sight dashboard.
      
      CURRENT LIVE CONTEXT:
      ${getUserContext()}

      RULES:
      - Be highly reliable, concise, and professional. Do not use markdown.
      - If the user is on the login/register screen, proactively guide them on obtaining 6-character invite codes from their admin.
      - If their account is PENDING, reassure them that a Head Admin must manually approve their dashboard access.`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: 'user', content: text }
      ];

      const chatCompletion = await groq.chat.completions.create({
        messages: apiMessages,
        model: 'openai/gpt-oss-20b', 
        temperature: 0.5,
        max_tokens: 150,
      });

      const reply = chatCompletion.choices[0]?.message?.content || "System offline.";
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'bot', text: reply }]);
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
      {/* Floating Toggle Button */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`p-4 rounded-full shadow-2xl transition-all hover:scale-110 ${isOpen ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'}`}
        >
          {isOpen ? <X size={24} strokeWidth={1.5} /> : <MessageCircle size={24} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Glassmorphic Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[32rem] bg-slate-900/80 backdrop-blur-2xl border border-blue-500/20 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden z-[9998] animate-in slide-in-from-bottom-10 fade-in duration-300">
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
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-[11px] leading-relaxed shadow-lg ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-800/80 text-slate-200 rounded-tl-sm backdrop-blur-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-800/80 rounded-2xl rounded-tl-sm p-3.5 flex items-center gap-1.5 w-16">
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
            <button type="submit" disabled={!chatInput.trim() || isTyping} className="w-10 h-10 shrink-0 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl flex items-center justify-center transition-all">
              <Send size={16} strokeWidth={1.5} className="ml-0.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
