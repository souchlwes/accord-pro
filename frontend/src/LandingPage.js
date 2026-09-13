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

// 2. The Immersive Written UI
function BoardUI({ onEnter, onAbout, isEntering }) {
  return (
    <Float 
      speed={1.5} 
      rotationIntensity={0.05} 
      floatIntensity={0.2} 
      floatingRange={[-0.03, 0.03]} 
    >
      <Html
        transform
        // Lowered Y-axis to 0.3 so it stays at eye-level
        position={[0, 0.3, -3.2]} 
        rotation={[0, 0, 0]} 
        distanceFactor={3.8}
        zIndexRange={[100, 0]}
      >
        <div className={`flex flex-col items-center justify-center transition-opacity duration-1000 select-none ${isEntering ? 'opacity-0' : 'opacity-100'}`}>
          <img 
            src={accordLogo} 
            alt="Accord Pro" 
            className="w-16 h-16 md:w-20 md:h-20 object-contain brightness-0 invert opacity-85 mb-3 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" 
          />
          
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white/90 mb-1 italic drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
            Accord <span className="text-blue-400 drop-shadow-[0_0_12px_rgba(96,165,250,0.4)]">Pro</span>
          </h2>
          <p className="text-[10px] md:text-xs font-bold text-slate-300/80 uppercase tracking-[0.4em] mb-10 md:mb-14 text-center drop-shadow-md">
            Secure Terminal Access
          </p>

          <div className="flex flex-col items-center gap-6 md:gap-8 w-full pointer-events-auto">
            <button
              onClick={onEnter}
              disabled={isEntering}
              className="text-lg md:text-2xl font-black uppercase tracking-[0.15em] text-white/90 hover:text-blue-400 transition-colors flex items-center justify-center gap-3 group drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] hover:drop-shadow-[0_0_12px_rgba(96,165,250,0.5)]"
            >
              {isEntering ? (
                <><Loader2 size={24} className="animate-spin text-blue-500" /> Initializing...</>
              ) : (
                <><span>Access Terminal</span><ArrowRight size={24} className="group-hover:translate-x-2 transition-transform text-blue-500" /></>
              )}
            </button>

            <button
              onClick={onAbout}
              className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400/80 hover:text-white transition-colors flex items-center justify-center gap-2 drop-shadow-md"
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

// 3. Distance Fade Controller
function FadeController({ uiRef, isEntering }) {
  useFrame((state) => {
    if (isEntering) return;
    const dist = state.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    const uiProgress = Math.max(0, Math.min(1, (7.0 - dist) / 2.0));
    
    if (uiRef.current) {
      uiRef.current.style.opacity = uiProgress;
      uiRef.current.style.pointerEvents = uiProgress > 0.3 ? 'auto' : 'none';
    }
  });
  return null;
}

// 4. The Classroom Model
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

// 5. The Main Interactive Landing Page
export default function LandingPage({ onAuthenticate }) {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const uiContainerRef = React.useRef(null);

  const handleEnterClassroom = () => {
    setIsEntering(true);
    setTimeout(() => {
      onAuthenticate();
    }, 1200);
  };

  return (
    <div className="w-screen h-screen bg-slate-950 text-white relative overflow-hidden font-sans select-none">
      
      <div className="w-full h-full cursor-grab active:cursor-grabbing absolute inset-0 z-0">
        <Canvas shadows gl={{ antialias: true }} dpr={[1, 1.5]} performance={{ min: 0.5 }}>
          <color attach="background" args={['#030712']} />
          
          <PerspectiveCamera makeDefault position={[0, 1.5, 5.5]} fov={45} />
          
          <Suspense fallback={
            <Html center style={{ position: 'absolute', top: '-35vh' }}>
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin opacity-80" />
            </Html>
          }>
            {/* STABLE LIGHTING RESTORED */}
            <ambientLight intensity={1.2} />
            <directionalLight position={[6, 12, 6]} intensity={1.8} castShadow shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[-6, -4, -6]} intensity={0.6} color="#60a5fa" />
            
            <group>
              <Center>
                <ClassroomModel />
              </Center>
              <group ref={uiContainerRef}>
                <BoardUI onEnter={handleEnterClassroom} onAbout={() => setIsAboutOpen(true)} isEntering={isEntering} />
              </group>
              <Sparkles count={250} scale={14} size={1.2} speed={0.1} opacity={0.2} color="#60a5fa" />
            </group>
            
            <CameraController isEntering={isEntering} />
            <FadeController uiRef={uiContainerRef} isEntering={isEntering} />

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
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-blue-400 drop-shadow-md">Explore</span>
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
