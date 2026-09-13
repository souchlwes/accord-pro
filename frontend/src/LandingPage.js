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
      // Glides directly into the whiteboard
      state.camera.position.lerp(new THREE.Vector3(0, 1.5, -1.5), delta * 2.5);
      state.camera.lookAt(0, 1.5, -4);
    }
  });
  return null;
}

// 2. The Immersive Written UI
function BoardUI({ onEnter, onAbout, isEntering }) {
  return (
    <Html
      transform
      // Occlude removed so the board stops hiding the text
      // Local position adjusted to pop slightly off the board's collision mesh
      position={[0, 0.5, 0.05]} 
      rotation={[Math.PI / 2, 0, 0]} 
      scale={0.1}
    >
      <div className={`flex flex-col items-center justify-center transition-opacity duration-1000 select-none ${isEntering ? 'opacity-0' : 'opacity-100'}`}>
        <img 
          src={accordLogo} 
          alt="Accord Pro" 
          className="w-16 h-16 object-contain brightness-0 invert opacity-80 mb-3 drop-shadow-md" 
        />
        
        <h2 className="text-4xl font-black uppercase tracking-tighter text-white/90 mb-1 italic drop-shadow-lg">
          Accord <span className="text-blue-400">Pro</span>
        </h2>
        <p className="text-[10px] font-bold text-slate-300/80 uppercase tracking-[0.4em] mb-12 text-center drop-shadow-md">
          Secure Terminal Access
        </p>

        <div className="flex flex-col items-center gap-6 w-full pointer-events-auto">
          <button
            onClick={onEnter}
            disabled={isEntering}
            className="text-xl font-black uppercase tracking-[0.2em] text-white hover:text-blue-400 transition-colors flex items-center justify-center gap-3 group drop-shadow-md"
          >
            {isEntering ? (
              <><Loader2 size={20} className="animate-spin text-blue-500" /> Initializing...</>
            ) : (
              <><span>Access Terminal</span><ArrowRight size={20} className="group-hover:translate-x-2 transition-transform text-blue-500" /></>
            )}
          </button>

          <button
            onClick={onAbout}
            className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 drop-shadow-md"
          >
            <HelpCircle size={12} className="text-blue-500/80" />
            <span>What is Accord Pro?</span>
          </button>
        </div>
      </div>
    </Html>
  );
}

// 3. The Exploded Classroom Model
function ClassroomModel({ onEnter, onAbout, isEntering }) {
  const { nodes, materials } = useGLTF(process.env.PUBLIC_URL + '/classroom2.glb');
  
  useEffect(() => {
    Object.values(materials).forEach((material) => {
      material.side = THREE.DoubleSide;
    });
  }, [materials]);

  return (
    <group>
      <Center>
        <group scale={7.5}> 
          <group scale={0.01}>
            <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
              <mesh castShadow receiveShadow geometry={nodes.Cube015_Classroom_Asets_0.geometry} material={materials.Classroom_Asets} />
              <mesh castShadow receiveShadow geometry={nodes.Cube015_Dirty_glass001_0.geometry} material={materials['Dirty_glass.001']} />
            </group>
            <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
              <mesh castShadow receiveShadow geometry={nodes.Cube018_Classroom_Asets_0.geometry} material={materials.Classroom_Asets} />
              <mesh castShadow receiveShadow geometry={nodes.Cube018_Dirty_glass001_0.geometry} material={materials['Dirty_glass.001']} />
            </group>
            <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
              <mesh castShadow receiveShadow geometry={nodes.Cube029_Classroom_Asets_0.geometry} material={materials.Classroom_Asets} />
              <mesh castShadow receiveShadow geometry={nodes.Cube029_Dirty_glass001_0.geometry} material={materials['Dirty_glass.001']} />
            </group>
            
            {[
              'Cube_Classroom_Asets_0', 'Cube002_Classroom_Wall_and_Floor_0', 'Cube003_Classroom_Asets_0',
              'Cube004_Classroom_Asets_0', 'Cube005_Classroom_Asets_0', 'Cube009_Classroom_Wall_and_Floor_0',
              'Cube010_Classroom_Wall_and_Floor_0', 'Cube011_Classroom_Asets_0', 'Cube013_Classroom_Asets_0',
              'Cube014_Classroom_Wall_and_Floor_0', 'Cube016_Classroom_Asets_0', 'Cube017_Classroom_Wall_and_Floor_0',
              'Cube019_Classroom_Asets_0', 'Cube021_Classroom_Asets_0', 'Cube022_Classroom_Wall_and_Floor_0',
              'Cube023_Classroom_Asets_0', 'Cube024_Classroom_Wall_and_Floor_0', 'Cube025_Classroom_Asets_0',
              'Cube027_Classroom_Asets_0', 'Cube028_Classroom_Asets_0', 'Cylinder_Classroom_Asets_0',
              'Cylinder001_Classroom_Asets_0', 'Cylinder002_Classroom_Asets_0', 'Cylinder003_Classroom_Asets_0',
              'Object_4002_Classroom_Asets_0', 'Object_4004_Classroom_Asets_0', 'Object_4006_Classroom_Asets_0',
              'Object_4008_Classroom_Asets_0', 'Object_4009_Classroom_Asets_0', 'Object_4010_Classroom_Asets_0',
              'Object_4011_Classroom_Asets_0', 'Object_4014_Classroom_Asets_0', 'Object_4016_Classroom_Asets_0',
              'Object_4018_Classroom_Asets_0', 'Plane_Classroom_Asets_0', 'Plane002_Classroom_Asets_0',
              'aa_Classroom_Asets_0', 'defaultMaterial_Classroom_Asets_0', 'defaultMaterial002_Classroom_Asets_0',
              'defaultMaterial003_Classroom_Asets_0', 'defaultMaterial004_Classroom_Asets_0', 'defaultMaterial005_Classroom_Asets_0',
              'defaultMaterial006_Classroom_Asets_0', 'defaultMaterial007_Classroom_Asets_0', 'defaultMaterial008_Classroom_Asets_0',
              'defaultMaterial009_Classroom_Asets_0', 'defaultMaterial010_Classroom_Asets_0', 'defaultMaterial011_Classroom_Asets_0',
              'defaultMaterial012_Classroom_Asets_0', 'defaultMaterial013_Classroom_Asets_0', 'defaultMaterial014_Classroom_Asets_0',
              'defaultMaterial015_Classroom_Asets_0', 'defaultMaterial016_Classroom_Asets_0', 'defaultMaterial017_Classroom_Asets_0',
              'defaultMaterial018_Classroom_Asets_0'
            ].map((meshName) => (
              <mesh
                key={meshName}
                castShadow
                receiveShadow
                geometry={nodes[meshName].geometry}
                material={nodes[meshName].material || materials.Classroom_Asets || materials.Classroom_Wall_and_Floor}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={100}
              />
            ))}

            <mesh
              castShadow
              receiveShadow
              geometry={nodes.mesh_White_Bord_decals__0.geometry}
              material={materials.White_Bord_decals}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={100}
            >
              <BoardUI onEnter={onEnter} onAbout={onAbout} isEntering={isEntering} />
            </mesh>
            
          </group>
        </group>
      </Center>
      <Sparkles count={250} scale={14} size={1.2} speed={0.1} opacity={0.2} color="#60a5fa" />
    </group>
  );
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
            
            <ClassroomModel onEnter={handleEnterClassroom} onAbout={() => setIsAboutOpen(true)} isEntering={isEntering} />
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
          <div className="w-8 h-12 border-2 border-white/20 rounded-full flex justify-center p-1.5">
            <div className="w-1 h-2 bg-blue-500 rounded-full animate-bounce" />
          </div>
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-blue-400">Explore</span>
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
