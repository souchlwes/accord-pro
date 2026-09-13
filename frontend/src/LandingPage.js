import React, { useState, Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Center, PerspectiveCamera, Sparkles, Html, Float } from '@react-three/drei';
import { 
  HelpCircle, ArrowRight, ShieldCheck, CalendarCheck2, Users, X, Loader2, MessageCircle
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

// Clean Outline UI
function BoardUI({ onEnter, onAbout, isEntering }) {
  return (
    <Float speed={1.2} rotationIntensity={0.03} floatIntensity={0.15} floatingRange={[-0.02, 0.02]}>
      <Html transform position={[0, 0.3, -3.5]} rotation={[0, 0, 0]} distanceFactor={4} zIndexRange={[100, 0]}>
        <div className={`flex flex-col items-center justify-center transition-all duration-1000 select-none ${isEntering ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <img 
            src={accordLogo} 
            alt="Accord Pro" 
            className="w-16 h-16 md:w-20 md:h-20 object-contain brightness-0 invert opacity-100 mb-4 drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]" 
          />
          
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-2 italic drop-shadow-[0_4px_15px_rgba(0,0,0,0.8)]">
            Accord <span className="text-blue-400">Pro</span>
          </h2>
          <p className="text-[10px] md:text-xs font-bold text-slate-200 uppercase tracking-[0.5em] mb-10 md:mb-12 text-center drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
            Secure Access Portal
          </p>

          {/* Highly Visible Outline Buttons */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full pointer-events-auto">
            
            <button
              onClick={onEnter}
              disabled={isEntering}
              className="px-8 py-3.5 rounded-full bg-transparent border-2 border-white text-white font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-white hover:text-slate-950 transition-all duration-300 flex items-center justify-center gap-3 drop-shadow-lg"
            >
              {isEntering ? (
                <><Loader2 size={16} className="animate-spin" /> Initializing...</>
              ) : (
                <>
                  <span>Launch Platform</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <button
              onClick={onAbout}
              className="px-8 py-3.5 rounded-full bg-transparent border-2 border-blue-400/60 text-blue-100 font-bold text-[10px] md:text-xs uppercase tracking-widest hover:border-blue-400 hover:bg-blue-400/20 transition-all duration-300 flex items-center justify-center gap-2 drop-shadow-lg"
            >
              <HelpCircle size={16} className="text-blue-400" />
              <span>What is Accord Pro?</span>
            </button>

          </div>
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

      {/* Floating Chat Button Overlay */}
      {!isEntering && (
        <div className="absolute bottom-6 right-6 md:bottom-10 md:right-10 z-20 transition-opacity duration-500">
          <button className="w-12 h-12 md:w-14 md:h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-transform hover:scale-110 group">
            <MessageCircle size={22} className="group-hover:animate-pulse" />
          </button>
        </div>
      )}

      {!isEntering && !isAboutOpen && (
        <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-2 md:gap-3 opacity-60">
          <div className="w-6 h-10 md:w-8 md:h-12 border-2 border-white/20 rounded-full flex justify-center p-1.5 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <div className="w-1 h-2 bg-blue-500 rounded-full animate-bounce" />
          </div>
        </div>
      )}

      {/* "WHAT IS ACCORD PRO?" MODAL */}
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
