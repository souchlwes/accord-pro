import React, { useState, Suspense, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Center, PerspectiveCamera, Sparkles, Html, Float } from '@react-three/drei';
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
      state.camera.position.lerp(new THREE.Vector3(0, 0.8, -1.0), delta * 2.5);
      state.camera.lookAt(0, 0.8, -4.5);
    }
  });
  return null;
}

// 2. Premium Immersive UI (Luminescent & Floating)
function BoardUI({ onEnter, onAbout, isEntering }) {
  return (
    <Float 
      speed={1.2} 
      rotationIntensity={0.03} 
      floatIntensity={0.15} 
      floatingRange={[-0.02, 0.02]} 
    >
      <Html
        transform
        position={[0, 0.3, -3.5]} 
        rotation={[0, 0, 0]} 
        distanceFactor={4}
        zIndexRange={[100, 0]}
      >
        <div className={`flex flex-col items-center justify-center transition-all duration-1000 select-none ${isEntering ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          <img 
            src={accordLogo} 
            alt="Accord Pro" 
            className="w-16 h-16 md:w-20 md:h-20 object-contain brightness-0 invert opacity-95 mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" 
          />
          
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-2 italic drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
            Accord <span className="text-blue-400 drop-shadow-[0_0_20px_rgba(96,165,250,0.6)]">Pro</span>
          </h2>
          <p className="text-[10px] md:text-xs font-bold text-slate-300 uppercase tracking-[0.5em] mb-12 md:mb-16 text-center drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
            Secure Terminal Access
          </p>

          <div className="flex flex-col items-center gap-6 md:gap-8 w-full pointer-events-auto">
            <button
              onClick={onEnter}
              disabled={isEntering}
              className="relative text-lg md:text-2xl font-black uppercase tracking-[0.2em] text-white hover:text-blue-300 transition-all duration-500 flex items-center justify-center gap-3 md:gap-4 group drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:drop-shadow-[0_0_25px_rgba(96,165,250,0.8)]"
            >
              {isEntering ? (
                <><Loader2 size={24} className="animate-spin text-blue-500" /> Initializing...</>
              ) : (
                <>
                  <span>Access Terminal</span>
                  <ArrowRight size={24} className="group-hover:translate-x-3 transition-transform duration-500 text-blue-400" />
                </>
              )}
            </button>

            <button
              onClick={onAbout}
              className="text-[9px] md:text-xs font-bold uppercase tracking-widest text-slate-400/80 hover:text-white transition-colors duration-300 flex items-center justify-center gap-2"
            >
              <HelpCircle size={14} className="text-blue-500/80" />
              <span>What is Accord Pro?</span>
            </button>
          </div>
        </div>
      </Html>
    </Float>
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

  return <primitive object={scene} scale={7.5} rotation={[0, Math.PI, 0]} />;
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
              
              {/* Dual-Layer Sparkles for Cinematic Depth */}
              <Sparkles count={150} scale={15} size={2} speed={0.05} opacity={0.15} color="#ffffff" />
              <Sparkles count={300} scale={14} size={1.2} speed={0.2} opacity={0.3} color="#60a5fa" />
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
        <div className="absolute bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-2 md:gap-3 opacity-50 transition-opacity hover:opacity-100">
          <div className="w-6 h-10 md:w-8 md:h-12 border border-white/20 rounded-full flex justify-center p-1.5 shadow-[0_0_20px_rgba(59,130,246,0.15)] bg-black/20 backdrop-blur-sm">
            <div className="w-1 h-2 bg-blue-400 rounded-full animate-bounce shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-[0.4em] text-blue-400 drop-shadow-md">Explore</span>
        </div>
      )}

      {/* PREMIUM GLASSMORPHISM MODAL */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-3xl p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-500 pointer-events-auto">
          <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-white/10 w-full max-w-2xl rounded-[2.5rem] p-6 sm:p-10 shadow-[0_0_60px_rgba(37,99,235,0.15)] relative flex flex-col max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between mb-8 pb-6 border-b border-white/5">
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-blue-500 block mb-2 drop-shadow-md">
                  System Overview
                </span>
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white italic drop-shadow-lg">
                  About Accord <span className="text-blue-500">Pro</span>
                </h2>
              </div>
              <button
                onClick={() => setIsAboutOpen(false)}
                className="bg-white/5 hover:bg-rose-500 border border-white/5 hover:border-rose-500 text-slate-400 hover:text-white p-2.5 rounded-2xl transition-all duration-300"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-8 font-medium">
              Accord Pro is an institutional examination operations platform designed to eliminate scheduling friction, resolve room and proctor conflicts, and orchestrate university-wide exam sessions in real time.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              <div className="bg-gradient-to-b from-white/5 to-transparent p-5 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-colors group">
                <CalendarCheck2 className="text-blue-500 mb-3 group-hover:scale-110 transition-transform duration-300" size={22} />
                <h4 className="text-[10px] md:text-xs font-black uppercase tracking-wider text-white mb-2">Conflict-Free</h4>
                <p className="text-[9px] md:text-[10px] text-slate-400 leading-relaxed">
                  Guarantees no double-booked rooms or proctors across departments.
                </p>
              </div>

              <div className="bg-gradient-to-b from-white/5 to-transparent p-5 rounded-3xl border border-white/5 hover:border-indigo-500/30 transition-colors group">
                <Users className="text-indigo-400 mb-3 group-hover:scale-110 transition-transform duration-300" size={22} />
                <h4 className="text-[10px] md:text-xs font-black uppercase tracking-wider text-white mb-2">Proctor Dispatch</h4>
                <p className="text-[9px] md:text-[10px] text-slate-400 leading-relaxed">
                  Real-time availability logs and emergency substitution routing.
                </p>
              </div>

              <div className="bg-gradient-to-b from-white/5 to-transparent p-5 rounded-3xl border border-white/5 hover:border-emerald-500/30 transition-colors group">
                <ShieldCheck className="text-emerald-400 mb-3 group-hover:scale-110 transition-transform duration-300" size={22} />
                <h4 className="text-[10px] md:text-xs font-black uppercase tracking-wider text-white mb-2">Omni-Sight</h4>
                <p className="text-[9px] md:text-[10px] text-slate-400 leading-relaxed">
                  Master university timelines with role-restricted audit trails.
                </p>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-end gap-3 pt-6 border-t border-white/5">
              <button
                onClick={() => setIsAboutOpen(false)}
                className="px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-black text-[10px] md:text-xs uppercase tracking-widest transition-all"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsAboutOpen(false);
                  handleEnterClassroom();
                }}
                className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] md:text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all flex items-center gap-2 group"
              >
                <span>Launch App</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

useGLTF.preload(process.env.PUBLIC_URL + '/classroom2.glb');
