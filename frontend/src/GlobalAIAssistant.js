import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, ShieldCheck, Send, Image as ImageIcon, ChevronRight, Loader2 } from 'lucide-react';
import Groq from 'groq-sdk';
import Tesseract from 'tesseract.js';

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

  // The OCR Magic: Scans the image the moment it is uploaded
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        setAttachment(reader.result);
        setIsScanning(true);
        setExtractedText('');
        
        try {
          // Read the text out of the image instantly in the browser
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
    const scannedTextBackup = extractedText; // Save it for the API call
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

      // The Secret Injection: We pass the OCR text to the AI invisibly
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
        <div className="fixed top-10 right-4 md:right-16 w-[calc(100vw-2rem)] md:w-96 h-[32rem] max-h-[80vh] bg-slate-900/95 backdrop-blur-2xl rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden z-[9998] animate-in slide-in-from-top-6 fade-in duration-300">
          <div className="bg-gradient-to-r from-blue-900/40 to-slate-900/60 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} className="text-blue-400" strokeWidth={1.5} />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Accord Assistant</h3>
                <p className="text-[10px] text-emerald-400 font-mono tracking-widest">System Online</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all">
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
                <img src={attachment} alt="Preview" className={`w-16 h-16 object-cover rounded-xl shadow-md transition-opacity ${isScanning ? 'opacity-50' : 'opacity-100'}`} />
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={16} className="text-white animate-spin drop-shadow-md" />
                  </div>
                )}
                <button 
                  onClick={() => setAttachment(null)}
                  disabled={isScanning}
                  className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:scale-110 disabled:hidden"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              </div>
              <div className="flex-1 mt-1">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                  {isScanning ? 'Scanning Text...' : 'Image Attached'}
                </p>
                <p className="text-[9px] text-slate-500">
                  {isScanning ? 'Extracting data for the AI.' : 'Memory will be wiped after chat.'}
                </p>
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
              disabled={isScanning || isTyping}
              className="w-10 h-10 shrink-0 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-blue-400 disabled:opacity-50 rounded-xl flex items-center justify-center transition-all shadow-sm"
              title="Attach temporary screenshot"
            >
              <ImageIcon size={18} strokeWidth={1.5} />
            </button>

            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={isScanning ? "Scanning image..." : "Ask anything..."} 
              disabled={isScanning}
              className="flex-1 bg-slate-900/80 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-inner disabled:opacity-50"
            />
            
            <button 
              type="submit" 
              disabled={(!chatInput.trim() && !attachment) || isTyping || isScanning} 
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
