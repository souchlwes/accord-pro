import React, { useState, Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Center, PerspectiveCamera, Sparkles, Html, Float } from '@react-three/drei';
import { 
  HelpCircle, ArrowRight, ShieldCheck, CalendarCheck2, Users, X, Loader2, MessageCircle, Send, ChevronRight, Terminal, Image as ImageIcon
} from 'lucide-react';
import * as THREE from 'three';
import Groq from 'groq-sdk';
import accordLogo from './accord.png';

// Initialize Groq directly in the browser
const groq = new Groq({
  apiKey: process.env.REACT_APP_GROQ_API_KEY,
  dangerouslyAllowBrowser: true 
});

// Cinematic Camera Glide
function CameraController({ isEntering }) {
  useFrame((state, delta) => {
    if (isEntering) {
      state.camera.position.lerp(new THREE.Vector3(0, 1.2, 1.0), delta * 2.5);
      state.camera.lookAt(0, 1.2, 4.5);
    }
  });
  return null;
}

// Feature-Based Interactive Tooltips
function SpatialTooltip({ position, title, description, icon: Icon, delay = 0 }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Float floatIntensity={0.5} floatingRange={[-0.05, 0.05]} speed={2}>
      <Html position={position} center zIndexRange={[50, 0]}>
        <div className="relative flex items-center justify-center animate-in fade-in duration-1000" style={{ animationDelay: `${delay}ms` }}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.5)] border ${
              isOpen ? 'bg-blue-600 border-white scale-125' : 'bg-blue-600/40 border-blue-400 hover:scale-125 hover:bg-blue-600'
            }`}
          >
            <div className={`w-1.5 h-1.5 bg-white rounded-full ${isOpen ? '' : 'animate-pulse'}`} />
          </button>

          <div 
            className={`absolute top-8 left-1/2 -translate-x-1/2 w-52 bg-slate-900/95 backdrop-blur-xl border border-white/5 rounded-2xl p-4 transition-all duration-400 origin-top shadow-[0_10px_40px_rgba(0,0,0,0.8)] ${
              isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'
            }`}
          >
            <button onClick={() => setIsOpen(false)} className="absolute top-3 right-3 text-slate-500 hover:text-white"><X size={12} /></button>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-white mb-2 flex items-center gap-2 pr-4">
              <Icon size={14} className="text-blue-400" /> {title}
            </h4>
            <p className="text-[9px] text-slate-300 leading-relaxed font-medium">{description}</p>
          </div>
        </div>
      </Html>
    </Float>
  );
}

// Immersive UI
function BoardUI({ onEnter, onAbout, onChatToggle, isChatOpen, isEntering }) {
  return (
    <Float speed={1.2} rotationIntensity={0.02} floatIntensity={0.05} floatingRange={[-0.01, 0.01]}>
      <Html transform position={[0, 1.6, 3.85]} rotation={[0, Math.PI, 0]} distanceFactor={4} zIndexRange={[100, 0]}>
        <div className={`flex flex-col items-center justify-center transition-all duration-1000 select-none ${isEntering ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          
          <img 
            src={accordLogo} 
            alt="Accord Pro" 
            className="w-16 h-16 md:w-20 md:h-20 object-contain brightness-0 invert opacity-100 mb-4 drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]" 
          />
          
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-2 italic drop-shadow-[0_4px_15px_rgba(0,0,0,0.8)]">
            Accord <span className="text-blue-500">Pro</span>
          </h2>
          <p className="text-[10px] md:text-xs font-bold text-slate-200 uppercase tracking-[0.5em] mb-10 md:mb-12 text-center drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
            Secure Access Portal
          </p>

          <div className="flex flex-row items-center justify-center gap-10 md:gap-14 w-full pointer-events-auto">
            
            <div className="relative group">
              <button
                onClick={onEnter}
                disabled={isEntering}
                className="text-white hover:text-blue-400 transition-all duration-300 hover:scale-125 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] hover:drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]"
              >
                {isEntering ? <Loader2 size={36} className="animate-spin text-blue-500" /> : <Terminal size={36} strokeWidth={1.5} />}
              </button>
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                <span className="bg-slate-900/90 border border-white/10 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-xl">Launch Platform</span>
              </div>
            </div>

            <div className="relative group">
              <button
                onClick={onAbout}
                className="text-slate-200 hover:text-white transition-all duration-300 hover:scale-125 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]"
              >
                <HelpCircle size={36} strokeWidth={1.5} />
              </button>
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                <span className="bg-slate-900/90 border border-white/10 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-xl">What is Accord Pro?</span>
              </div>
            </div>

            <div className="relative group">
              <button
                onClick={onChatToggle}
                className={`transition-all duration-300 hover:scale-125 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] ${
                  isChatOpen 
                    ? 'text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]' 
                    : 'text-slate-200 hover:text-blue-400 hover:drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]'
                }`}
              >
                {isChatOpen ? <X size={36} strokeWidth={1.5} /> : <MessageCircle size={36} strokeWidth={1.5} />}
              </button>
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                <span className="bg-slate-900/90 border border-white/10 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-xl">
                  {isChatOpen ? 'Close Assistant' : 'Ask Assistant'}
                </span>
              </div>
            </div>

          </div>
        </div>
      </Html>
    </Float>
  );
}

function ClassroomModel() {
  const { scene } = useGLTF(process.env.PUBLIC_URL + '/classroom22.glb');

  useEffect(() => {
    if (scene) {
      const boardBlue = new THREE.Color('#2563eb'); 
      const warmBrown = new THREE.Color('#8b5a2b'); 

      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          if (child.material) {
            child.material.side = THREE.DoubleSide;

            if ((child.material.name && child.material.name.includes('StingrayPBS7')) || child.name.includes('VERDE')) {
              child.material.color = boardBlue;
            } 
            else if (child.material.name && (
              child.material.name.includes('StingrayPBS4') || 
              child.material.name.includes('StingrayPBS5') || 
              child.material.name.includes('StingrayPBS10') 
            )) {
              child.material.color.lerp(warmBrown, 0.25);
            }
          }
        }
      });
    }
  }, [scene]);

  return <primitive object={scene} scale={7.5} rotation={[0, -Math.PI / 2, 0]} position={[0, -1.5, 0]} />;
}

export default function LandingPage({ onAuthenticate }) {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  
  // Smart Chat States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'System Online. I am the Accord Pro intelligent assistant. I can help you with invite codes, account statuses, and system operations.' }
  ]);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const quickQuestions = [
    "How do I join the platform?",
    "Why is my account pending?",
    "Where do I get an invite code?",
    "Launch the application"
  ];

  const handleEnterClassroom = () => {
    setIsEntering(true);
    setIsChatOpen(false);
    setTimeout(() => {
      onAuthenticate();
    }, 1200);
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
          // THE MAGIC TRICK: This downloads Tesseract instantly in the background 
          // ONLY when a user uploads a file!
          const Tesseract = (await import('tesseract.js')).default;
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
      const systemPrompt = `You are the Accord Pro Assistant, a highly intelligent, reliable, and functional AI for an institutional examination operations platform. 
      Tone: Professional, helpful, concise. 
      Current System Time: ${currentTime}
      User Device/Platform: ${navigator.platform || 'Unknown Web Client'}
      
      CORE PLATFORM BOUNDARIES (CRITICAL):
      - Accord Pro is STRICTLY for Room/Proctor scheduling, conflict resolution, and dispatch.
      - Accord Pro DOES NOT handle student registrations, grading, test results, or student portals. NEVER mention these features.

      CRITICAL RULES:
      1. ABSOLUTELY NO MARKDOWN FORMATTING. Do NOT use asterisks (*), hash symbols (#), or bullet points. Respond in pure, clean, plain text paragraphs.
      2. If the user explicitly asks to log in, launch the app, enter the terminal, or start the platform, you MUST include the exact phrase "[ACTION: LAUNCH_TERMINAL]" in your response.
      3. DO NOT promise to open support tickets. Instruct the user to message their Head Admin directly.
      
      Core Knowledge Base:
      - Accord Pro: Streamlines university-wide exam management, eliminating scheduling friction by resolving room/proctor conflicts in real time.
      - Core Features: Automated scheduling engine, real-time proctor dispatch, institutional omni-sight dashboard.
      - Onboarding/Access: Users MUST have a 6-character 'Invite Code' to join. Accounts remain strictly in a PENDING or BLOCKED state until a Head Admin approves them.`;

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

      let reply = chatCompletion.choices[0]?.message?.content || "I am currently rebooting. Please try again in a moment.";
      reply = reply.replace(/[*#_`]/g, ''); 
      
      if (reply.includes('[ACTION: LAUNCH_TERMINAL]')) {
        reply = reply.replace('[ACTION: LAUNCH_TERMINAL]', 'Initializing secure terminal access now...');
        setTimeout(() => {
          handleEnterClassroom();
        }, 1500);
      }

      const botMsg = { id: Date.now() + 1, sender: 'bot', text: reply.trim() };
      setMessages((prev) => [...prev, botMsg]);

    } catch (error) {
      console.error('Groq API Error:', error);
      const errorMsg = { 
        id: Date.now() + 1, 
        sender: 'bot', 
        text: "System connection error. My neural link is temporarily offline." 
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    submitMessage(chatInput);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isChatOpen, attachment]);

  return (
    <div className="w-screen h-screen bg-slate-950 text-white relative overflow-hidden font-sans select-none">

      <div className="w-full h-full cursor-grab active:cursor-grabbing absolute inset-0 z-0">
        <Canvas shadows gl={{ antialias: false, powerPreference: "high-performance" }} dpr={[1, 1.5]} performance={{ min: 0.5 }}>
          <color attach="background" args={['#0f172a']} />
          <PerspectiveCamera makeDefault position={[0, 1.6, -5.5]} fov={45} />
          
          <Suspense fallback={
            <Html center>
              <div className="flex flex-col items-center justify-center gap-3 bg-slate-900/80 px-8 py-6 rounded-2xl backdrop-blur-md border border-white/5">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <span className="text-[10px] font-bold tracking-widest text-slate-300 uppercase whitespace-nowrap">Loading Environment...</span>
              </div>
            </Html>
          }>
            <ambientLight intensity={1.2} color="#fff0de" />
            <hemisphereLight skyColor="#ffffff" groundColor="#4a3b2c" intensity={1.0} />
            
            <pointLight position={[0, 3, -2]} intensity={50} distance={30} color="#ffedd6" />
            <pointLight position={[0, 3, 2]} intensity={50} distance={30} color="#ffffff" />
            <pointLight position={[-3, 3, 0]} intensity={70} distance={30} color="#ffecd1" />
            
            <directionalLight position={[6, 12, 6]} intensity={1.5} color="#fff5e6" castShadow shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[-6, -4, -6]} intensity={1.0} color="#1e293b" />
            
            <group>
              <Center><ClassroomModel /></Center>
              <BoardUI 
                onEnter={handleEnterClassroom} 
                onAbout={() => setIsAboutOpen(true)} 
                onChatToggle={() => setIsChatOpen(!isChatOpen)}
                isChatOpen={isChatOpen}
                isEntering={isEntering} 
              />
              
              {!isEntering && !isAboutOpen && (
                <>
                  <SpatialTooltip position={[2.5, 0.6, -1]} icon={CalendarCheck2} title="Smart Room Allocation" description="Zero double-booking. The system dynamically maps out available exam rooms across campus in real time." delay={500} />
                  <SpatialTooltip position={[-2, 0.5, 2]} icon={Users} title="Live Proctor Routing" description="Instantly reassign invigilators across departments when schedule conflicts or emergencies arise." delay={1000} />
                  <SpatialTooltip position={[3.5, 1.8, 3.5]} icon={ShieldCheck} title="Master Timeline" description="A unified, role-restricted dashboard providing a bird's-eye view of every ongoing exam." delay={1500} />
                </>
              )}
              <Sparkles count={200} scale={14} size={1.2} speed={0.1} opacity={0.4} color="#60a5fa" />
            </group>
            
            <CameraController isEntering={isEntering} />
            <OrbitControls
              enabled={!isEntering && !isAboutOpen && !isChatOpen}
              enableZoom={true}
              minDistance={1.8} maxDistance={6.5} 
              maxPolarAngle={Math.PI / 2 + 0.05} minPolarAngle={Math.PI / 6}
              enablePan={false} enableDamping={true} dampingFactor={0.06}
            />
          </Suspense>
        </Canvas>
      </div>

     {/* Smart Chat Window */}
      {isChatOpen && (
        <div className="absolute top-[10%] md:top-auto md:bottom-24 right-4 md:right-10 w-[calc(100vw-2rem)] md:w-[400px] h-[80vh] md:h-[36rem] bg-slate-900/70 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_0_60px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden z-30 animate-in slide-in-from-bottom-10 fade-in duration-500 pointer-events-auto font-sans antialiased">
          
          {/* iOS-Style Glass Header */}
          <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 px-6 py-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 border border-blue-400/20">
                <img src={accordLogo} alt="Accord Logo" className="w-6 h-6 object-contain brightness-0 invert drop-shadow-sm" />
              </div>
              <div>
                <h3 className="text-[13px] font-black uppercase tracking-tight text-white leading-tight">Accord Assistant</h3>
                <p className="text-[10px] text-emerald-400 font-semibold tracking-wider flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> System Online
                </p>
              </div>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="text-slate-400 hover:text-white bg-black/20 hover:bg-black/40 p-2.5 rounded-full transition-all border border-white/5">
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* Messages Area */}
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
                {quickQuestions.map((q, i) => (
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
          <form onSubmit={handleSendMessage} className="p-4 bg-black/20 backdrop-blur-2xl border-t border-white/10 flex items-end gap-2 shrink-0">
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
                placeholder={isScanning ? "Scanning image..." : "Ask Accord Assistant..."} 
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

      {/* Bouncing Interaction Indicator */}
      {!isEntering && !isAboutOpen && !isChatOpen && (
        <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-2 md:gap-3 opacity-60 transition-opacity duration-1000">
          <div className="w-6 h-10 md:w-8 md:h-12 border-2 border-white/20 rounded-full flex justify-center p-1.5 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <div className="w-1 h-2 bg-blue-500 rounded-full animate-bounce" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 drop-shadow-md">Drag to explore</span>
        </div>
      )}

      {/* "WHAT IS ACCORD PRO?" MODAL */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-300 pointer-events-auto">
          <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6 pb-6 border-b border-white/10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 block mb-1">System Overview</span>
                <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white italic">About Accord <span className="text-blue-500">Pro</span></h2>
              </div>
              <button onClick={() => setIsAboutOpen(false)} className="bg-white/5 hover:bg-rose-500 text-slate-400 hover:text-white p-2 md:p-2.5 rounded-xl transition-all"><X size={18} /></button>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 font-medium">Accord Pro is an institutional examination operations platform designed to eliminate scheduling friction, resolve room and proctor conflicts, and orchestrate university-wide exam sessions in real time.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-8">
              <div className="bg-slate-800/60 p-4 md:p-5 rounded-2xl border border-white/5 shadow-inner"><CalendarCheck2 className="text-blue-400 mb-2 md:mb-3" size={20} /><h4 className="text-[10px] md:text-xs font-black uppercase tracking-wider text-white mb-1.5">Conflict-Free</h4><p className="text-[9px] md:text-[10px] text-slate-400 leading-normal">Guarantees no double-booked rooms or proctors across departments.</p></div>
              <div className="bg-slate-800/60 p-4 md:p-5 rounded-2xl border border-white/5 shadow-inner"><Users className="text-blue-400 mb-2 md:mb-3" size={20} /><h4 className="text-[10px] md:text-xs font-black uppercase tracking-wider text-white mb-1.5">Proctor Dispatch</h4><p className="text-[9px] md:text-[10px] text-slate-400 leading-normal">Real-time availability logs and emergency substitution routing.</p></div>
              <div className="bg-slate-800/60 p-4 md:p-5 rounded-2xl border border-white/5 shadow-inner"><ShieldCheck className="text-emerald-400 mb-2 md:mb-3" size={20} /><h4 className="text-[10px] md:text-xs font-black uppercase tracking-wider text-white mb-1.5">Omni-Sight</h4><p className="text-[9px] md:text-[10px] text-slate-400 leading-normal">Master university timelines with role-restricted audit trails.</p></div>
            </div>
            <div className="mt-auto flex items-center justify-end gap-2 md:gap-3 pt-4 border-t border-white/10">
              <button onClick={() => setIsAboutOpen(false)} className="px-4 py-2 md:px-6 md:py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-black text-[10px] md:text-xs uppercase tracking-widest transition-all">Close</button>
              <button onClick={() => { setIsAboutOpen(false); handleEnterClassroom(); }} className="px-4 py-2 md:px-6 md:py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] md:text-xs uppercase tracking-widest shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"><span>Launch App</span><ArrowRight size={14} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

useGLTF.preload(process.env.PUBLIC_URL + '/classroom22.glb');
