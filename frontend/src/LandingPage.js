import React, { useState, Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Center, PerspectiveCamera, Sparkles, Html, Float } from '@react-three/drei';
import { 
  HelpCircle, ArrowRight, ShieldCheck, CalendarCheck2, Users, X, Loader2, Terminal
} from 'lucide-react';
import * as THREE from 'three';
import accordLogo from './accord.png';

// Cinematic Camera Glide
function CameraController({ isEntering }) {
  useFrame((state, delta) => {
    if (isEntering) {
      state.camera.position.lerp(new THREE.Vector3(0, 0.8, -1.0), delta * 2.5);
      state.camera.lookAt(0, 0.8, -4.5);
    }
  });
  return null;
}

// Live Terminal Clock Feature
function SystemClock() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mt-12 flex items-center gap-2 font-mono text-[10px] text-blue-400/80 tracking-[0.2em] uppercase drop-shadow-md">
      <span className="w-2 h-3 bg-blue-400/80 animate-pulse" />
      <span>SYS_TIME // {time}</span>
    </div>
  );
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
              isOpen ? 'bg-blue-500 border-white scale-125' : 'bg-blue-500/40 border-blue-400 hover:scale-125 hover:bg-blue-500/80'
            }`}
          >
            <div className={`w-1.5 h-1.5 bg-white rounded-full ${isOpen ? '' : 'animate-pulse'}`} />
          </button>

          <div 
            className={`absolute top-8 left-1/2 -translate-x-1/2 w-52 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 transition-all duration-400 origin-top shadow-[0_10px_40px_rgba(0,0,0,0.8)] ${
              isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'
            }`}
          >
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white"
            >
              <X size={12} />
            </button>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-white mb-2 flex items-center gap-2 pr-4">
              <Icon size={14} className="text-blue-400" /> {title}
            </h4>
            <p className="text-[9px] text-slate-300 leading-relaxed font-medium">
              {description}
            </p>
          </div>
        </div>
      </Html>
    </Float>
  );
}

// Clean, Immersive Written UI (Icon-Only Buttons)
function BoardUI({ onEnter, onAbout, isEntering }) {
  return (
    <Float speed={1.2} rotationIntensity={0.03} floatIntensity={0.15} floatingRange={[-0.02, 0.02]}>
      <Html transform position={[0, 0.3, -3.5]} rotation={[0, 0, 0]} distanceFactor={4} zIndexRange={[100, 0]}>
        <div className={`flex flex-col items-center justify-center transition-all duration-1000 select-none ${isEntering ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <img 
            src={accordLogo} 
            alt="Accord Pro" 
            className="w-16 h-16 md:w-20 md:h-20 object-contain brightness-0 invert opacity-95 mb-4 drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]" 
          />
          
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-2 italic drop-shadow-[0_4px_15px_rgba(0,0,0,0.8)]">
            Accord <span className="text-blue-400">Pro</span>
          </h2>
          <p className="text-[10px] md:text-xs font-bold text-slate-200 uppercase tracking-[0.5em] mb-10 md:mb-12 text-center drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
            Secure Terminal Access
          </p>

          {/* Horizontal Icon Buttons with Tooltips */}
          <div className="flex flex-row items-center justify-center gap-6 w-full pointer-events-auto">
            
            {/* Access Terminal Button */}
            <div className="relative group">
              <button
                onClick={onEnter}
                disabled={isEntering}
                className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-blue-500/10 border border-blue-400/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-blue-500/20 hover:border-blue-400/60 hover:scale-110 transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.2)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]"
              >
                {isEntering ? <Loader2 size={24} className="animate-spin text-blue-500" /> : <Terminal size={24} className="text-blue-400 group-hover:text-blue-300" />}
              </button>
              {/* Tooltip */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                <span className="bg-slate-900/90 border border-white/10 text-white text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-sm">
                  Access Terminal
                </span>
              </div>
            </div>

            {/* About Button */}
            <div className="relative group">
              <button
                onClick={onAbout}
                className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-slate-900/60 border border-slate-700/50 backdrop-blur-md flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800/80 hover:border-slate-500/50 hover:scale-110 transition-all duration-300 shadow-xl"
              >
                <HelpCircle size={24} className="text-blue-400 group-hover:text-blue-300" />
              </button>
              {/* Tooltip */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
                <span className="bg-slate-900/90 border border-white/10 text-white text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-xl backdrop-blur-sm">
                  What is Accord Pro?
                </span>
              </div>
            </div>

          </div>
          
          {/* Live System Clock Feature */}
          <SystemClock />
          
        </div>
      </Html>
    </Float>
  );
}

// The Classroom Model
function ClassroomModel() {
  const { scene } = useGLTF(process.env.PUBLIC_URL + '/classroom2.glb');
  
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) child.material.side = THREE.DoubleSide;
        }
      });
    }
  }, [scene]);

  return <primitive object={scene} scale={7.5} rotation={[0, Math.PI, 0]} />;
}

// The Main Interactive Landing Page
export default function LandingPage({ onAuthenticate }) {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  const handleEnterClassroom = () => {
    setIsEntering(true);
    setTimeout(() => {
      onAuthenticate();
    }, 1200);
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-white relative overflow-hidden font-sans select-none">
      
      <div className="w-full h-full cursor-grab active:cursor-grabbing absolute inset-0 z-0">
        <Canvas shadows gl={{ antialias: false }} dpr={[1, 1.5]} performance={{ min: 0.5 }}>
          <color attach="background" args={['#030712']} />
          <PerspectiveCamera makeDefault position={[0, 1.5, 5.5]} fov={45} />
          
          <Suspense fallback={
            <Html center style={{ position: 'absolute', top: '-35vh' }}>
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin opacity-80" />
            </Html>
          }>
            <ambientLight intensity={1.2} />
            <directionalLight position={[6, 12, 6]} intensity={1.8} castShadow shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[-6, -4, -6]} intensity={0.6} color="#60a5fa" />
            
            <group>
              <Center>
                <ClassroomModel />
              </Center>
              <BoardUI onEnter={handleEnterClassroom} onAbout={() => setIsAboutOpen(true)} isEntering={isEntering} />
              
              {!isEntering && !isAboutOpen && (
                <>
                  <SpatialTooltip position={[-2.5, 0.6, 1]} icon={CalendarCheck2} title="Smart Room Allocation" description="Zero double-booking. The system dynamically maps out available exam rooms across campus in real time." delay={500} />
                  <SpatialTooltip position={[2, 0.5, -2]} icon={Users} title="Live Proctor Routing" description="Instantly reassign invigilators across departments when schedule conflicts or emergencies arise." delay={1000} />
                  <SpatialTooltip position={[-3.5, 1.8, -3.5]} icon={ShieldCheck} title="Master Timeline" description="A unified, role-restricted dashboard providing a bird's-eye view of every ongoing exam." delay={1500} />
                </>
              )}

              <Sparkles count={250} scale={14} size={1.2} speed={0.1} opacity={0.2} color="#60a5fa" />
            </group>
            
            <CameraController isEntering={isEntering} />
            <OrbitControls
              enabled={!isEntering && !isAboutOpen}
              enableZoom={true}
              minDistance={1.8} 
              maxDistance={6.5} 
              maxPolarAngle={Math.PI / 2 + 0.05}
              minPolarAngle={Math.PI / 6}
              enablePan={false}
              enableDamping={true}
              dampingFactor={0.06}
            />
          </Suspense>
        </Canvas>
      </div>

      {!isEntering && !isAboutOpen && (
        <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-2 md:gap-3 opacity-60">
          <div className="w-6 h-10 md:w-8 md:h-12 border-2 border-white/20 rounded-full flex justify-center p-1.5 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <div className="w-1 h-2 bg-blue-500 rounded-full animate-bounce" />
          </div>
        </div>
      )}

      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-300 pointer-events-auto">
          <div className="bg-slate-900 border border-slate-700/70 w-full max-w-2xl rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6 pb-6 border-b border-white/10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 block mb-1">System Overview</span>
                <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white italic">About Accord <span className="text-blue-500">Pro</span></h2>
              </div>
              <button onClick={() => setIsAboutOpen(false)} className="bg-white/10 hover:bg-rose-500 text-slate-300 hover:text-white p-2 md:p-2.5 rounded-xl transition-all"><X size={18} /></button>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 font-medium">Accord Pro is an institutional examination operations platform designed to eliminate scheduling friction, resolve room and proctor conflicts, and orchestrate university-wide exam sessions in real time.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-8">
              <div className="bg-slate-800/60 p-4 md:p-5 rounded-2xl border border-white/5 shadow-inner"><CalendarCheck2 className="text-blue-400 mb-2 md:mb-3" size={20} /><h4 className="text-[10px] md:text-xs font-black uppercase tracking-wider text-white mb-1.5">Conflict-Free</h4><p className="text-[9px] md:text-[10px] text-slate-400 leading-normal">Guarantees no double-booked rooms or proctors across departments.</p></div>
              <div className="bg-slate-800/60 p-4 md:p-5 rounded-2xl border border-white/5 shadow-inner"><Users className="text-indigo-400 mb-2 md:mb-3" size={20} /><h4 className="text-[10px] md:text-xs font-black uppercase tracking-wider text-white mb-1.5">Proctor Dispatch</h4><p className="text-[9px] md:text-[10px] text-slate-400 leading-normal">Real-time availability logs and emergency substitution routing.</p></div>
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

useGLTF.preload(process.env.PUBLIC_URL + '/classroom2.glb');
