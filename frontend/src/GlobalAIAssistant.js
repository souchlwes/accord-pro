import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, ShieldCheck, Send, Image as ImageIcon, ChevronRight } from 'lucide-react';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.REACT_APP_GROQ_API_KEY,
  dangerouslyAllowBrowser: true 
});

export default function GlobalAIAssistant({ session, profile, authMode, activeTab }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'System Online. I am the Accord Pro Assistant. How can I help you navigate the platform today?' }
  ]);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // SMART FEATURE 1: Deep Context Injection
  const getUserContext = () => {
    if (!session) return `User is currently on the authentication screen. Auth Mode: ${authMode}. They may need help logging in, resetting a password, or finding an invite code.`;
    if (profile?.status === 'BLOCKED') return `User's account is currently BLOCKED by an admin.`;
    if (profile?.status === 'PENDING') return `User's account is PENDING. They are waiting for a Head Admin to approve their access.`;
    return `User is logged in as ${profile?.role} in the ${profile?.assigned_dept || 'Global'} department. They are currently actively working inside the '${activeTab}' tab.`;
  };

  // SMART FEATURE 2: Context-Aware Quick Questions
  const getDynamicQuestions = () => {
    if (!session) return ["Where do I get an invite code?", "Why is my account pending?"];
    if (activeTab === 'users') return ["How do I approve a pending user?", "How do I edit staff roles?"];
    if (activeTab === 'dashboard') return ["How do I resolve a double-booking?", "How do I export the schedule?"];
    return ["How do I use this section?", "How do I log availability?"];
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const submitMessage = async (text) => {
    if (!text.trim() && !attachment) return;
    
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text, image: attachment }]);
    setChatInput('');
    setAttachment(null);
    setIsTyping(true);

    try {
      const currentTime = new Date().toLocaleTimeString();
      const systemPrompt = `You are the Accord Pro Assistant, an intelligent, reliable AI for an institutional examination operations platform. 
      
      CURRENT LIVE CONTEXT:
      Time: ${currentTime}
      ${getUserContext()}

      CRITICAL RULES:
      1. Be highly reliable, concise, and professional.
      2. ABSOLUTELY NO MARKDOWN. Do NOT use asterisks (*), hash symbols (#), or bullet points. Respond in pure, clean, plain text paragraphs.
      3. If the user is on the login/register screen, proactively guide them on obtaining 6-character invite codes from their admin.
      4. DO NOT ask the user to upload screenshots, images, or files.
      5. DO NOT promise to open support tickets. If you cannot resolve an issue, instruct the user to message their Head Admin directly via the internal Accord Chat.`;

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: 'user', content: text }
      ];

      const chatCompletion = await groq.chat.completions.create({
        messages: apiMessages,
        model: 'openai/gpt-oss-20b', 
        temperature: 0.5,
        max_tokens: 1024,
      });

      let reply = chatCompletion.choices[0]?.message?.content || "System offline.";
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
  }, [messages, isTyping, isOpen, attachment]);

  const dynamicQuestions = getDynamicQuestions();

  return (
    <>
      {/* Ultra-Subtle Top Edge Tab (No borders, low opacity, ceiling drop) */}
      {!isOpen && (
        <div className="fixed top-0 right-10 md:right-24 z-[9999] animate-in slide-in-from-top-6 duration-500">
          <button 
            onClick={() => setIsOpen(true)}
            className="bg-slate-900/40 hover:bg-slate-900/80 text-slate-500 hover:text-blue-400 px-5 py-1.5 rounded-b-xl flex items-center gap-2 transition-all backdrop-blur-md shadow-sm"
          >
            <MessageCircle size={14} className="opacity-70" strokeWidth={2} />
            <span className="text-[9px] font-black uppercase tracking-widest mt-0.5 opacity-80">Need Help?</span>
          </button>
        </div>
      )}

      {/* Embedded Chat Window (Sliding down from the top) */}
      {isOpen && (
        <div className="fixed top-10 right-4 md:right-16 w-[calc(100vw-2rem)] md:w-96 h-[32rem] max-h-[80vh] bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden z-[9998] animate-in slide-in-from-top-6 fade-in duration-300">
          <div className="bg-gradient-to-r from-blue-900/40 to-slate-900/60 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="text-blue-400" strokeWidth={1.5} />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Accord Assistant</h3>
                <p className="text-[10px] text-emerald-400 font-mono tracking-widest">System Online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                
                {msg.image && (
                  <div className="mb-2 max-w-[85%] rounded-2xl overflow-hidden shadow-lg bg-black/20">
                    <img src={msg.image} alt="Uploaded screenshot" className="w-full h-auto object-cover max-h-48" />
                  </div>
                )}
                
                {msg.text && (
                  <div className={`max-w-[85%] p-3.5 rounded-2xl text-[11px] leading-relaxed shadow-lg whitespace-pre-wrap ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-slate-800/90 text-slate-200 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-800/90 rounded-2xl rounded-tl-sm p-3.5 flex items-center gap-1.5 w-16">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {/* Smart Feature: Context-Aware Quick Action Chips */}
            {messages[messages.length - 1].sender === 'bot' && !isTyping && (
              <div className="flex flex-col gap-2 pt-2 items-end">
                {dynamicQuestions.map((q, i) => (
                  <button 
                    key={i}
                    onClick={() => submitMessage(q)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-500/10 hover:bg-blue-500/30 text-blue-300 text-[10px] font-bold tracking-wide transition-all shadow-md"
                  >
                    <span>{q}</span>
                    <ChevronRight size={12} className="text-blue-500" strokeWidth={2} />
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {attachment && (
            <div className="px-4 py-3 bg-slate-900/80 flex items-start gap-3">
              <div className="relative group">
                <img src={attachment} alt="Preview" className="w-16 h-16 object-cover rounded-xl shadow-md" />
                <button 
                  onClick={() => setAttachment(null)}
                  className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
              <div className="flex-1 mt-1">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Image Attached</p>
                <p className="text-[9px] text-slate-500">Will be wiped from memory after chat.</p>
              </div>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); submitMessage(chatInput); }} className="p-4 bg-slate-950/50 flex items-center gap-3">
            
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
            />
            
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 shrink-0 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-xl flex items-center justify-center transition-all shadow-sm"
              title="Attach temporary screenshot"
            >
              <ImageIcon size={18} strokeWidth={1.5} />
            </button>

            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask anything..." 
              className="flex-1 bg-slate-900/80 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
            />
            
            <button 
              type="submit" 
              disabled={(!chatInput.trim() && !attachment) || isTyping} 
              className="w-10 h-10 shrink-0 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl flex items-center justify-center transition-all shadow-md"
            >
              <Send size={16} strokeWidth={1.5} className="ml-0.5" />
            </button>
          </form>

        </div>
      )}
    </>
  );
}
