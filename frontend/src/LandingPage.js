import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Html, Environment } from '@react-three/drei';
import { motion } from 'framer-motion-3d';
import { Loader2 } from 'lucide-react';

// 1. Camera Animation Controller
function CameraRig({ isZoomed }) {
  return (
    <motion.perspectiveCamera
      makeDefault
      initial={false}
      animate={{
        x: isZoomed ? 0.7 : 0,         
        y: isZoomed ? 1.5 : 4,         
        z: isZoomed ? -1 : 8,         
        rotateX: isZoomed ? 0 : -0.1  
      }}
      transition={{ duration: 1.8, ease: [0.25, 1, 0.5, 1] }}
    />
  );
}

// 2. Your Specific 3D Classroom Component
function ClassroomScene({ isZoomed, onLoginTrigger }) {
  // THE FIX: process.env.PUBLIC_URL forces React to find the file in the deployed public folder
  const { nodes, materials } = useGLTF(process.env.PUBLIC_URL + '/classroom.glb');

  return (
    <group dispose={null}>
      {/* The Exported Blender Geometry */}
      <group position={[0.732, 0.239, -2.373]} rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
        <mesh castShadow receiveShadow geometry={nodes.Mesh.geometry} material={materials.lambert30} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_1.geometry} material={materials.lambert28} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_2.geometry} material={materials.lambert25} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_3.geometry} material={materials.lambert27} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_4.geometry} material={materials.lambert10} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_5.geometry} material={materials.lambert1} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_6.geometry} material={materials.lambert11} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_7.geometry} material={materials.lambert14} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_8.geometry} material={materials.lambert9} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_9.geometry} material={materials.lambert33} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_10.geometry} material={materials.lambert26} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_11.geometry} material={materials.lambert20} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_12.geometry} material={materials.lambert17} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_13.geometry} material={materials.lambert12} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_14.geometry} material={materials.lambert34} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_15.geometry} material={materials.lambert13} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_16.geometry} material={materials.lambert21} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_17.geometry} material={materials.lambert18} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_18.geometry} material={materials.lambert22} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_19.geometry} material={materials.lambert32} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_20.geometry} material={materials.lambert35} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_21.geometry} material={materials.lambert29} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_22.geometry} material={materials.lambert24} />
        <mesh castShadow receiveShadow geometry={nodes.Mesh_23.geometry} material={materials.lambert23} />
      </group>

      {/* HTML Projection */}
      <Html
        transform
        occlude
        position={[0.7, 1.5, -2.3]} // Adjust these values if the UI is not flat against the board
        scale={0.15}                
      >
        <div className="w-[1000px] h-[700px] bg-slate-900/90 backdrop-blur-md rounded-3xl p-12 flex flex-col items-center justify-center border-4 border-slate-700 shadow-2xl">
          <h1 className="text-white text-6xl font-black uppercase tracking-tighter mb-4 italic">
            Accord <span className="text-blue-500">Pro</span>
          </h1>
          <p className="text-slate-400 text-xl font-bold uppercase tracking-widest mb-12">
            System Initialization
          </p>

          {isZoomed && (
            <div className="w-full max-w-md animate-in fade-in zoom-in duration-700 delay-300">
              <button 
                onClick={onLoginTrigger}
                className="w-full bg-blue-600 text-white p-6 rounded-2xl text-2xl font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl active:scale-95"
              >
                Access Terminal
              </button>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

// 3. The Main Landing Page Wrapper
export default function LandingPage({ onAuthenticate }) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className="w-screen h-screen bg-slate-950 relative overflow-hidden">
      
      {!isZoomed && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <button 
            onClick={() => setIsZoomed(true)}
            className="bg-white text-slate-900 px-10 py-5 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all"
          >
            Enter Classroom
          </button>
        </div>
      )}

      <Canvas shadows>
        <Suspense fallback={
          <Html center>
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <span className="text-white text-[10px] font-black uppercase tracking-widest">Loading Assets</span>
            </div>
          </Html>
        }>
          <CameraRig isZoomed={isZoomed} />
          <Environment preset="city" />
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
          
          <ClassroomScene isZoomed={isZoomed} onLoginTrigger={onAuthenticate} />
        </Suspense>
      </Canvas>
    </div>
  );
}

// THE FIX: Preload with PUBLIC_URL
useGLTF.preload(process.env.PUBLIC_URL + '/classroom.glb');
