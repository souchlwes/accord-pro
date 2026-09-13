import React, { useState, Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Center, PerspectiveCamera, Sparkles, Html } from '@react-three/drei';
import { 
  HelpCircle, 
  ArrowRight, 
  ShieldCheck, 
  CalendarCheck2, 
  Users, 
  X, 
  Loader2
} from 'lucide-react';
import * as THREE from 'three';
import accordLogo from './accord.png';

// 1. Cinematic Camera Glide
function CameraController({ isEntering }) {
  useFrame((state, delta) => {
    if (isEntering) {
      state.camera.position.lerp(new THREE.Vector3(0, 1.5, -1.0), delta * 2.5);
      state.camera.lookAt(0, 1.5, -4.5);
    }
  });
  return null;
}

// 2. The Immersive Written UI (Parallax Fixed)
function BoardUI({ onEnter, onAbout, isEntering }) {
  return (
    <Html
      transform
      // ⚠️ FIX PARALLAX: Push the Z-value further back (e.g., -4.5 or -5) until it physically hits the wall mesh 
      position={[0, 1.6, -4.5]} 
      rotation={[0, 0, 0]} 
      // distanceFactor locks the text scale so it remains highly visible and stable
      distanceFactor={4}
      zIndexRange={[100, 0]}
    >
      <div className={`flex flex-col items-center justify-center transition-opacity duration-1000 select-none ${isEntering ? 'opacity-0' : 'opacity-100'}`}>
        <img 
          src={accordLogo} 
          alt="Accord Pro" 
          className="w-24 h-24 object-contain brightness-0 invert opacity-90 mb-4" 
        />
        
        {/* Made text bolder and brighter to look like fresh chalk/marker */}
        <h2 className="text-6xl font-black uppercase tracking-tighter text-white mb-2 italic">
          Accord <span className="text-blue-400">Pro</span>
        </h2>
        <p className="text-lg font-bold text-slate-200 uppercase tracking-[0.4em] mb-14 text-center">
          Secure Terminal Access
        </p>

        <div className="flex flex-col items-center gap-8 w-full pointer-events-auto">
          <button
            onClick={onEnter}
            disabled={isEntering}
            className="text-2xl font-black uppercase tracking-[0.15em] text-white hover:text-blue-400 transition-colors flex items-center justify-center gap-4 group"
          >
            {isEntering ? (
              <><Loader2 size={24} className="animate-spin text-blue-500" /> Initializing...</>
            ) : (
              <><span>Access Terminal</span><ArrowRight size={24} className="group-hover:translate-x-2 transition-transform text-blue-500" /></>
            )}
          </button>

          <button
            onClick={onAbout}
            className="text-sm font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-2"
          >
            <HelpCircle size={16} className="text-blue-500" />
            <span>What is Accord Pro?</span>
          </button>
        </div>
      </div>
    </Html>
  );
}

// 3. The Classroom Model
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

  return <primitive object={scene} scale={7.5} />;
}

// 4. The Main Interactive Landing Page
export default function LandingPage({ onAuthenticate }) {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detects mobile devices to prevent WebGL crashes
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile(); // Check immediately
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleEnterClassroom = () => {
    setIsEntering(true);
    setTimeout(() => {
      onAuthenticate();
    }, 1200);
  };

  // --- MOBILE FALLBACK UI (Instant load, no 3D rendering) ---
  if (isMobile) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center w-full max-w-sm">
          <img src={accordLogo} alt="Accord Pro" className="w-20 h-20 object-contain brightness-0 invert mb-6" />
          <h2 className="text-4xl font-black uppercase tracking-tighter text-white mb-2 italic text-center">
            Accord <span className="text-blue-500">Pro</span>
          </h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mb-12 text-center">
            System Initialization
          </p>

          <button
            onClick={() => onAuthenticate()}
            className="w-full bg-blue-600 text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3 mb-6 shadow-xl shadow-blue-600/20"
          >
            <span>Access Terminal</span>
            <ArrowRight size={16} />
          </button>

          <button
            onClick={() => setIsAboutOpen(true)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-300 px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <HelpCircle size={16} className="text-blue-400" />
            <span>What is Accord Pro?</span>
          </button>
        </div>

        {/* Re-use the modal for mobile */}
        {isAboutOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 p-6 overflow-y-auto">
             <div className="flex items-start justify-between mb-8 pb-4 border-b border-white/10 mt-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 block mb-1">Overview</span>
                <h2 className="text-2xl font-black uppercase tracking-tight text-white italic">About Accord Pro</h2>
              </div>
              <button onClick={() => setIsAboutOpen(false)} className="bg-white/10 p-2.5 rounded-xl"><X size={18} /></button>
            </div>
            
            <p className="text-sm text-slate-300 leading-relaxed mb-8">Accord Pro is an institutional examination operations platform designed to eliminate scheduling friction and resolve room conflicts.</p>
            
            <div className="space-y-4">
              <div className="bg-slate-900 p-5 rounded-2xl border border-white/5"><CalendarCheck2 className="text-blue-400 mb-2" size={20} /><h4 className="text-xs font-black uppercase tracking-wider text-white mb-1">Conflict-Free</h4></div>
              <div className="bg-slate-900 p-5 rounded-2xl border border-white/5"><Users className="text-indigo-400 mb-2" size={20} /><h4 className="text-xs font-black uppercase tracking-wider text-white mb-1">Proctor Dispatch</h4></div>
              <div className="bg-slate-900 p-5 rounded-2xl border border-white/5"><ShieldCheck className="text-emerald-400 mb-2" size={20} /><h4 className="text-xs font-black uppercase tracking-wider text-white mb-1">Omni-Sight</h4></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- DESKTOP 3D UI ---
  return (
    <div className="w-screen h-screen bg-slate-950 text-white relative overflow-hidden font-sans select-none">
      
      <div className="w-full h-full cursor-grab active:cursor-grabbing absolute inset-0 z-0">
        <Canvas shadows gl={{ antialias: true }}>
          <color attach="background" args={['#030712']} />
          <PerspectiveCamera makeDefault position={[0, 1.5, 5.5]} fov={45} />
          
          <Suspense fallback={
            <Html center>
              <div className="flex flex-col items-center justify-center gap-4 w-screen h-screen pointer-events-none">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Loading Realm</span>
              </div>
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
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-3 opacity-60">
          <div className="w-8 h-12 border-2 border-white/20 rounded-full flex justify-center p-1.5 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <div className="w-1 h-2 bg-blue-500 rounded-full animate-bounce" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-blue-400 drop-shadow-md">Explore</span>
        </div>
      )}

      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-300 pointer-events-auto">
          <div className="bg-slate-900 border border-slate-700/70 w-full max-w-2xl rounded-[2.5rem] p-6 sm:p-10 shadow-2xl relative flex flex-col max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between mb-6 pb-6 border-b border-white/10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 block mb-1">
                  System Overview
                </span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white italic">
                  About Accord <span className="text-blue-500">Pro</span>
                </h2>
              </div>
              <button
                onClick={() => setIsAboutOpen(false)}
                className="bg-white/10 hover:bg-rose-500 text-slate-300 hover:text-white p-2.5 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 font-medium">
              Accord Pro is an institutional examination operations platform designed to eliminate scheduling friction, resolve room and proctor conflicts, and orchestrate university-wide exam sessions in real time.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-800/60 p-5 rounded-2xl border border-white/5 shadow-inner">
                <CalendarCheck2 className="text-blue-400 mb-3" size={24} />
                <h4 className="text-xs font-black uppercase tracking-wider text-white mb-1.5">Conflict-Free</h4>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Guarantees no double-booked rooms or proctors across departments.
                </p>
              </div>

              <div className="bg-slate-800/60 p-5 rounded-2xl border border-white/5 shadow-inner">
                <Users className="text-indigo-400 mb-3" size={24} />
                <h4 className="text-xs font-black uppercase tracking-wider text-white mb-1.5">Proctor Dispatch</h4>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Real-time availability logs and emergency substitution routing.
                </p>
              </div>

              <div className="bg-slate-800/60 p-5 rounded-2xl border border-white/5 shadow-inner">
                <ShieldCheck className="text-emerald-400 mb-3" size={24} />
                <h4 className="text-xs font-black uppercase tracking-wider text-white mb-1.5">Omni-Sight</h4>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Master university timelines with role-restricted audit trails.
                </p>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setIsAboutOpen(false)}
                className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-black text-xs uppercase tracking-widest transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsAboutOpen(false);
                  handleEnterClassroom();
                }}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
              >
                <span>Launch App</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

useGLTF.preload(process.env.PUBLIC_URL + '/classroom2.glb');
