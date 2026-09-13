import React, { useState, Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Center, PerspectiveCamera, Sparkles } from '@react-three/drei';
import { 
  HelpCircle, 
  ArrowRight, 
  ShieldCheck, 
  CalendarCheck2, 
  Users, 
  X, 
  Loader2,
  Mouse
} from 'lucide-react';
import * as THREE from 'three';
import accordLogo from './accord.png';

// 1. Cinematic Distance Tracker (Fades UI based on zoom depth)
function SceneController({ uiRef, hintRef, isEntering }) {
  useFrame((state, delta) => {
    if (isEntering) {
      // Final glide to the terminal when button is clicked
      state.camera.position.lerp(new THREE.Vector3(0, 0.5, 0.5), delta * 2);
      state.camera.lookAt(0, 0.5, -1);
      return;
    }

    // Calculate how far the user is from the center of the room
    const dist = state.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    
    // UI fades in between distance 4.5 (invisible) and 2.5 (fully visible)
    const uiProgress = Math.max(0, Math.min(1, (4.5 - dist) / 2.0));
    
    if (uiRef.current) {
      uiRef.current.style.opacity = uiProgress;
      uiRef.current.style.pointerEvents = uiProgress > 0.5 ? 'auto' : 'none';
      uiRef.current.style.transform = `translateY(${(1 - uiProgress) * 30}px) scale(${0.95 + (uiProgress * 0.05)})`;
    }

    if (hintRef.current) {
      hintRef.current.style.opacity = 1 - (uiProgress * 1.5);
    }
  });
  return null;
}

// 2. The 3D Classroom Model
function ClassroomModel() {
  const { scene } = useGLTF(process.env.PUBLIC_URL + '/classroom1.glb');
  
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

  return (
    <group>
      <Center>
        <primitive object={scene} scale={7.5} />
      </Center>
      {/* Premium Atmospheric Dust */}
      <Sparkles count={200} scale={12} size={1.5} speed={0.2} opacity={0.15} color="#60a5fa" />
    </group>
  );
}

// 3. The Main Interactive Landing Page
export default function LandingPage({ onAuthenticate }) {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  
  const uiRef = useRef(null);
  const hintRef = useRef(null);

  const handleEnterClassroom = () => {
    setIsEntering(true);
    // Smooth camera transition into the login terminal
    setTimeout(() => {
      onAuthenticate();
    }, 1200);
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-white relative overflow-hidden font-sans select-none">
      
      {/* --- 3D CANVAS VIEWPORT --- */}
      <div className="w-full h-full cursor-grab active:cursor-grabbing absolute inset-0 z-0">
        <Canvas shadows gl={{ antialias: true }}>
          <color attach="background" args={['#030712']} />
          <PerspectiveCamera makeDefault position={[0, 1.5, 5.5]} fov={45} />
          
          <Suspense fallback={
            <Html center>
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Loading Realm</span>
              </div>
            </Html>
          }>
            <ambientLight intensity={1.2} />
            <directionalLight position={[6, 12, 6]} intensity={1.8} castShadow shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[-6, -4, -6]} intensity={0.6} color="#60a5fa" />
            
            <ClassroomModel />
            <SceneController uiRef={uiRef} hintRef={hintRef} isEntering={isEntering} />

            <OrbitControls
              enabled={!isEntering}
              enableZoom={true}
              minDistance={1.8} // Prevents clipping through the desk
              maxDistance={5.5} // Prevents leaving the room
              maxPolarAngle={Math.PI / 2 + 0.05}
              minPolarAngle={Math.PI / 6}
              enablePan={false}
              enableDamping={true}
              dampingFactor={0.06}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* --- SCROLL HINT (Fades out on zoom) --- */}
      <div 
        ref={hintRef}
        className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-3 transition-opacity duration-75"
      >
        <div className="w-10 h-16 border-2 border-white/20 rounded-full flex justify-center p-2 shadow-[0_0_30px_rgba(59,130,246,0.2)]">
          <div className="w-1.5 h-3 bg-blue-500 rounded-full animate-bounce" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 drop-shadow-md">
          Scroll to Enter
        </span>
      </div>

      {/* --- COMMAND DECK (Fades in on zoom) --- */}
      <div 
        ref={uiRef}
        className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none opacity-0"
        style={{ willChange: 'opacity, transform' }}
      >
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] shadow-2xl flex flex-col items-center max-w-lg w-full mx-4 relative overflow-hidden">
          
          {/* Subtle glow behind the logo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-500/20 blur-[60px] pointer-events-none" />

          <img src={accordLogo} alt="Accord Pro" className="w-24 h-24 object-contain brightness-0 invert drop-shadow-2xl mb-6 relative z-10" />
          
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white mb-2 relative z-10 italic">
            Accord <span className="text-blue-500">Pro</span>
          </h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-10 text-center relative z-10">
            Secure Terminal Access
          </p>

          <div className="w-full space-y-4 relative z-10">
            <button
              onClick={handleEnterClassroom}
              disabled={isEntering}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_0_40px_rgba(37,99,235,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3 group"
            >
              {isEntering ? (
                <><Loader2 size={16} className="animate-spin" /> Initializing...</>
              ) : (
                <><span>Access Terminal</span><ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
              )}
            </button>

            <button
              onClick={() => setIsAboutOpen(true)}
              className="w-full bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2.5"
            >
              <HelpCircle size={16} className="text-blue-400" />
              <span>What is Accord Pro?</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- "WHAT IS ACCORD PRO ABOUT?" MODAL --- */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-300">
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

useGLTF.preload(process.env.PUBLIC_URL + '/classroom1.glb');
