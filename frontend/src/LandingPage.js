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
      // Glides directly toward the board
      state.camera.position.lerp(new THREE.Vector3(0, 1.5, -1.0), delta * 2.5);
      state.camera.lookAt(0, 1.5, -4);
    }
  });
  return null;
}

// 2. The Immersive Written UI (Decoupled from model hierarchy)
function BoardUI({ onEnter, onAbout, isEntering }) {
  return (
    <Html
      transform
      // ⚠️ TUNE THESE 3 NUMBERS TO ALIGN WITH THE BOARD ⚠️
      // [Left/Right, Up/Down, Forward/Back]
      position={[0, 1.5, -3.5]} 
      rotation={[0, 0, 0]} 
      scale={0.12}
    >
      <div className={`flex flex-col items-center justify-center transition-opacity duration-1000 select-none ${isEntering ? 'opacity-0' : 'opacity-100'}`}>
        <img 
          src={accordLogo} 
          alt="Accord Pro" 
          className="w-20 h-20 object-contain brightness-0 invert opacity-90 mb-4 drop-shadow-md" 
        />
        
        {/* Written Chalk/Marker Aesthetic - No Borders */}
        <h2 className="text-5xl font-black uppercase tracking-tighter text-white/95 mb-2 italic drop-shadow-xl">
          Accord <span className="text-blue-400">Pro</span>
        </h2>
        <p className="text-sm font-bold text-slate-300/80 uppercase tracking-[0.4em] mb-14 text-center drop-shadow-md">
          Secure Terminal Access
        </p>

        <div className="flex flex-col items-center gap-8 w-full pointer-events-auto">
          {/* Borderless Text Button */}
          <button
            onClick={onEnter}
            disabled={isEntering}
            className="text-2xl font-black uppercase tracking-[0.15em] text-white/95 hover:text-blue-400 transition-colors flex items-center justify-center gap-4 group drop-shadow-xl"
          >
            {isEntering ? (
              <><Loader2 size={24} className="animate-spin text-blue-500" /> Initializing...</>
            ) : (
              <><span>Access Terminal</span><ArrowRight size={24} className="group-hover:translate-x-2 transition-transform text-blue-500" /></>
            )}
          </button>

          {/* Borderless Secondary Text */}
          <button
            onClick={onAbout}
            className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 drop-shadow-md"
          >
            <HelpCircle size={14} className="text-blue-500/80" />
            <span>What is Accord Pro?</span>
          </button>
        </div>
      </div>
    </Html>
  );
}

// 3. The Classroom Model (Rendered cleanly as one piece)
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

  const handleEnterClassroom = () => {
    setIsEntering(true);
    setTimeout(() => {
      onAuthenticate();
    }, 1200);
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-white relative overflow-hidden font-sans select-none">
      
      {/* 3D CANVAS VIEWPORT */}
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
              {/* UI is placed securely outside the model's complex hierarchy */}
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

      {/* SCROLL HINT */}
      {!isEntering && !isAboutOpen && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-3 opacity-60">
          <div className="w-8 h-12 border-2 border-white/20 rounded-full flex justify-center p-1.5 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <div className="w-1 h-2 bg-blue-500 rounded-full animate-bounce" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-blue-400 drop-shadow-md">Explore</span>
        </div>
      )}

      {/* "WHAT IS ACCORD PRO?" MODAL */}
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
