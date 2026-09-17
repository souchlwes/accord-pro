import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, ShieldCheck, Send, Image as ImageIcon, ChevronRight, Loader2 } from 'lucide-react';
import Groq from 'groq-sdk';
import Tesseract from 'tesseract.js';
import accordLogo from './accord.png';

const groq = new Groq({
  apiKey: process.env.REACT_APP_GROQ_API_KEY,
  dangerouslyAllowBrowser: true 
});

export default function GlobalAIAssistant({ session, profile, authMode, activeTab, isOpen, onClose }) {
  const [chatInput, setChatInput] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
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
    return `User is logged in as ${profile?.role} in the ${profile?.assigned_dept || 'Global'} department. They are currently actively working inside the '${activeTab}' tab.`;
  };

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
      reader.onloadend = async () => {
        setAttachment(reader.result);
        setIsScanning(true);
        setExtractedText('');
        
        try {
          const { data: { text } } = await Tesseract.recognize(reader.result, 'eng');
          setExtractedText(text);
        } catch (error) {
          console.error('OCR Extraction Error:', error);
          setExtractedText('[Optical scan failed to read the text in this image.]');
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const submitMessage = async (text) => {
    if (!text.trim() && !attachment) return;
    
    const userDisplayMessage = text.trim() ? text : "Uploaded a screenshot for analysis.";
    
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'user', text: userDisplayMessage, image: attachment }]);
    setChatInput('');
    setAttachment(null);
    const scannedTextBackup = extractedText; 
    setExtractedText('');
    setIsTyping(true);

    try {
      const currentTime = new Date().toLocaleTimeString();
      const systemPrompt = `You are the Accord Pro Assistant, an intelligent, reliable AI for an institutional examination operations platform. 
      
      CURRENT LIVE CONTEXT:
      Time: ${currentTime}
      ${getUserContext()}

      CORE PLATFORM BOUNDARIES (CRITICAL):
      - Accord Pro is STRICTLY for Room/Proctor scheduling, conflict resolution, and dispatch.
      - Accord Pro DOES NOT handle student registrations, grading, test results, or student portals. NEVER mention these features.

      CRITICAL RULES:
      1. Be highly reliable, concise, and professional.
      2. ABSOLUTELY NO MARKDOWN. Do NOT use asterisks (*), hash symbols (#), or bullet points. Respond in pure, clean, plain text paragraphs.
      3. DO NOT promise to open support tickets. Instruct the user to message their Head Admin directly via the internal Accord Chat.`;

      let apiUserContent = userDisplayMessage;
      if (scannedTextBackup) {
        apiUserContent += `\n\n[SYSTEM ALERT TO AI: The user attached a screenshot. We ran optical character recognition (OCR) on their screen and extracted the following raw text:\n"""\n${scannedTextBackup}\n"""\nRead this extracted text carefully to deduce what error they are seeing or what page they are on, and help them solve the issue.]`;
      }

      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: 'user', content: apiUserContent }
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
      {isOpen && (
        <div className="fixed top-10 right-4 md:right-16 w-[calc(100vw-2rem)] md:w-[400px] h-[36rem] max-h-[85vh] bg-slate-900/70 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_0_60px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col overflow-hidden z-[9998] animate-in slide-in-from-top-6 fade-in duration-300 font-sans antialiased">
          
          {/* iOS-Style Glass Header */}
          <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 px-6 py-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 border border-blue-400/20">
                <img src={accordLogo} alt="Accord Logo" className="w-6 h-6 object-contain brightness-0 invert drop-shadow-sm" />
              </div>
              <div>
                <h3 className="text-[13px] font-black uppercase tracking-tight text-white leading-tight">Accord Support</h3>
                <p className="text-[10px] text-emerald-400 font-semibold tracking-wider flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white bg-black/20 hover:bg-black/40 p-2.5 rounded-full transition-all border border-white/5">
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-gradient-to-b from-transparent to-black/20">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                
                {msg.image && (
                  <div className="mb-2 max-w-[80%] rounded-[1.5rem] overflow-hidden shadow-xl bg-black/40 border border-white/10">
                    <img src={msg.image} alt="Uploaded screenshot" className="w-full h-auto object-cover max-h-48" />
                  </div>
                )}
                
                {msg.text && (
                  <div className={`max-w-[85%] px-5 py-3.5 rounded-[1.5rem] text-[13px] leading-relaxed tracking-wide shadow-lg whitespace-pre-wrap ${
                    msg.sender === 'user' 
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-br-sm border border-blue-400/30' 
                      : 'bg-white/10 backdrop-blur-md text-slate-100 rounded-bl-sm border border-white/10'
                  }`}>
                    {msg.text}
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-[1.5rem] rounded-bl-sm px-5 py-4 flex items-center gap-1.5 w-max shadow-sm">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {messages[messages.length - 1].sender === 'bot' && !isTyping && (
              <div className="flex flex-col gap-2.5 pt-2 items-end">
                {dynamicQuestions.map((q, i) => (
                  <button 
                    key={i}
                    onClick={() => submitMessage(q)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 text-[11px] font-bold tracking-wide transition-all shadow-sm active:scale-95"
                  >
                    <span>{q}</span>
                    <ChevronRight size={14} strokeWidth={2.5} className="opacity-70" />
                  </button>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attachment Preview Pillar */}
          {attachment && (
            <div className="px-5 py-4 bg-black/40 backdrop-blur-xl border-t border-white/5 flex items-start gap-4">
              <div className="relative group">
                <img src={attachment} alt="Preview" className={`w-14 h-14 object-cover rounded-2xl shadow-lg border border-white/10 transition-opacity ${isScanning ? 'opacity-50' : 'opacity-100'}`} />
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={16} className="text-white animate-spin drop-shadow-md" />
                  </div>
                )}
                <button 
                  onClick={() => setAttachment(null)}
                  disabled={isScanning}
                  className="absolute -top-2 -right-2 bg-slate-800 text-slate-300 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-xl hover:bg-rose-500 hover:text-white disabled:hidden border border-white/10"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
              <div className="flex-1 mt-1">
                <p className="text-[11px] font-black text-blue-400 tracking-wide mb-0.5">
                  {isScanning ? 'Scanning Text...' : 'Image Attached'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {isScanning ? 'Extracting data for analysis.' : 'Context attached to next prompt.'}
                </p>
              </div>
            </div>
          )}

          {/* Premium Input Console */}
          <form onSubmit={(e) => { e.preventDefault(); submitMessage(chatInput); }} className="p-4 bg-black/20 backdrop-blur-2xl border-t border-white/10 flex items-end gap-2 shrink-0">
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
              disabled={isScanning || isTyping}
              className="w-10 h-10 mb-0.5 shrink-0 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-blue-400 disabled:opacity-50 rounded-full flex items-center justify-center transition-all border border-transparent shadow-sm"
              title="Attach screenshot"
            >
              <ImageIcon size={18} strokeWidth={2} />
            </button>

            <div className="flex-1 relative">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isScanning ? "Scanning image..." : "Ask Accord Support..."} 
                disabled={isScanning}
                className="w-full bg-black/40 border border-white/10 focus:border-blue-500/50 rounded-3xl pl-5 pr-12 py-3.5 text-[13px] tracking-wide text-white placeholder:text-slate-500 focus:outline-none transition-all shadow-inner disabled:opacity-50 font-medium"
              />
              <button 
                type="submit" 
                disabled={(!chatInput.trim() && !attachment) || isTyping || isScanning} 
                className="absolute right-1.5 top-1.5 bottom-1.5 w-9 shrink-0 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-slate-600 text-white rounded-full flex items-center justify-center transition-all shadow-md active:scale-95"
              >
                <Send size={14} strokeWidth={2.5} className="ml-0.5" />
              </button>
            </div>
          </form>

        </div>
      )}
    </>
  );
}
