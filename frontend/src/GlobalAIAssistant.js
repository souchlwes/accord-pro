import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, ShieldCheck, Send, Image as ImageIcon } from 'lucide-react';
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

  const getUserContext = () => {
    if (!session) return `User is currently on the authentication screen. Auth Mode: ${authMode}. They may need help logging in, resetting a password, or finding an invite code.`;
    if (profile?.status === 'BLOCKED') return `User's account is currently BLOCKED by an admin.`;
    if (profile?.status === 'PENDING') return `User's account is PENDING. They are waiting for a Head Admin to approve their access.`;
    return `User is logged in as ${profile?.role} in the ${profile?.assigned_dept || 'Global'} department. They are currently viewing the '${activeTab}' tab.`;
  };

  // Converts the selected file into an ephemeral Base64 string in the browser memory
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so the user can select the same file again if they delete it
    e.target.value = '';
  };

  const submitMessage = async (text) => {
    if (!text.trim() && !attachment) return;
    
    // Save the user's message and the temporary image locally so they can see it
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text, image: attachment }]);
    setChatInput('');
    setAttachment(null);
    setIsTyping(true);

    try {
      const systemPrompt = `You are the Accord Pro Assistant, an intelligent, reliable AI for an institutional examination operations platform. 
      
      CURRENT LIVE CONTEXT:
      ${getUserContext()}

      CRITICAL RULES:
      1. Be highly reliable, concise, and professional.
      2. ABSOLUTELY NO MARKDOWN. Do NOT use asterisks (*), hash symbols (#), or bullet points. Respond in pure, clean, plain text paragraphs.
      3. If the user is on the login/register screen, proactively guide them on obtaining 6-character invite codes from their admin.
      4. DO NOT promise to open support tickets, create cases, or contact customer service. If you cannot resolve an issue, instruct the user to message their Head Admin directly via the internal Accord Chat.`;

      // IMPORTANT: We ONLY send the text to the API. 
      // The current model is text-only. If we send the base64 image, the API will crash.
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

  return (
    <>
      {/* Professional, Subtle Edge Tab */}
      {!isOpen && (
        <div className="fixed bottom-0 right-8 md:right-16 z-[9999] animate-in slide-in-from-bottom-6 duration-500">
          <button 
            onClick={() => setIsOpen(true)}
            className="bg-slate-900 hover:bg-blue-600 text-slate-400 hover:text-white border-t border-x border-slate-700/50 hover:border-blue-500 px-6 py-2.5 rounded-t-xl flex items-center gap-2.5 transition-all shadow-2xl group"
          >
            <MessageCircle size={16} className="text-blue-500 group-hover:text-white transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-widest mt-0.5">Need Help?</span>
          </button>
        </div>
      )}

      {/* Embedded Chat Window */}
      {isOpen && (
        <div className="fixed bottom-0 right-4 md:right-16 w-[calc(100vw-2rem)] md:w-96 h-[32rem] max-h-[80vh] bg-slate-900/95 backdrop-blur-2xl border-t border-x border-blue-500/30 rounded-t-[2rem] shadow-[0_30px_80px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden z-[9998] animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          <div className="bg-gradient-to-r from-blue-900/80 to-slate-900/80 px-5 py-4 flex items-center justify-between border-b border-white/5">
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
                
                {/* Ephemeral Image Display in Chat Bubble */}
                {msg.image && (
                  <div className="mb-2 max-w-[85%] rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                    <img src={msg.image} alt="Uploaded screenshot" className="w-full h-auto object-cover max-h-48" />
                  </div>
                )}
                
                {msg.text && (
                  <div className={`max-w-[85%] p-3.5 rounded-2xl text-[11px] leading-relaxed shadow-lg whitespace-pre-wrap ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-sm border border-blue-500' 
                      : 'bg-slate-800/90 text-slate-200 border border-white/5 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                )}
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

          {/* Ephemeral Image Preview Area (Before Sending) */}
          {attachment && (
            <div className="px-4 py-3 bg-slate-900 border-t border-white/5 flex items-start gap-3">
              <div className="relative group">
                <img src={attachment} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-blue-500/50 shadow-md" />
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

          <form onSubmit={(e) => { e.preventDefault(); submitMessage(chatInput); }} className="p-4 bg-slate-950 border-t border-white/10 flex items-center gap-3">
            
            {/* Hidden File Input */}
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
            />
            
            {/* Upload Button */}
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 shrink-0 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-xl flex items-center justify-center transition-all border border-white/5"
              title="Attach temporary screenshot"
            >
              <ImageIcon size={18} strokeWidth={1.5} />
            </button>

            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask anything..." 
              className="flex-1 bg-slate-900 border border-white/5 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-all shadow-inner"
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
