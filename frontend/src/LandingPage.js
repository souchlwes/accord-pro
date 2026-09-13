import React, { useState, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, useAnimations, Html, Environment, OrbitControls } from '@react-three/drei';
import { motion } from 'framer-motion-3d';
import { Loader2 } from 'lucide-react';

// 1. Camera Animation Controller
function CameraRig({ isZoomed }) {
  return (
    <motion.perspectiveCamera
      makeDefault
      initial={false}
      animate={{
        x: isZoomed ? 0 : 0,         
        y: isZoomed ? 1.5 : 2,         
        z: isZoomed ? -0.5 : 5,         
        rotateX: isZoomed ? 0 : 0  
      }}
      transition={{ duration: 1.8, ease: [0.25, 1, 0.5, 1] }}
    />
  );
}

// 2. Your Specific 3D Classroom Component
function ClassroomScene({ isZoomed, onLoginTrigger }) {
  const group = useRef();
  const { nodes, materials, animations } = useGLTF(process.env.PUBLIC_URL + '/classroom1.glb');
  const { actions } = useAnimations(animations, group);

  return (
    <group dispose={null}>
      {/* Fixed scale and centering */}
      <group position={[0, -1, 0]} rotation={[0, 0, 0]} scale={1}>
        
        {/* YOUR NEW CLASSROOM1.GLB GEOMETRY */}
        <group ref={group} name="Scene">
          <mesh name="pCube139" castShadow receiveShadow geometry={nodes.pCube139.geometry} material={materials.lambert1} position={[-0.275, 0.041, 0.228]} rotation={[Math.PI / 2, 0, -Math.PI / 2]} scale={0.007} />
          <mesh name="pCube18" castShadow receiveShadow geometry={nodes.pCube18.geometry} material={materials.lambert1} position={[-0.168, 0.067, -0.091]} rotation={[Math.PI / 2, 0, 0]} scale={[-0.163, -0.003, -0.093]} />
          <group name="pCube126" position={[-0.454, -0.009, 0.014]} rotation={[Math.PI / 2, 0, 0.076]} scale={[0.01, 0.014, 0.001]}>
            <group name="transform88" position={[45.016, -3.547, -8.684]} rotation={[-1.572, 0.08, -0.023]} scale={[99.613, 940.416, 73.704]} />
          </group>
          <group name="pCube50" position={[-0.093, 0.007, 0.171]} rotation={[Math.PI / 2, 0, 2.761]} scale={0.01}>
            <group name="transform155" position={[847.73, 467.027, 109.199]} rotation={[Math.PI / 2, 0.381, Math.PI]} scale={100} />
          </group>
          <group name="pCube23" position={[-0.085, -0.015, 0]} rotation={[-Math.PI / 2, -0.133, 0]} scale={[0.014, 0.018, 0.001]}>
            <group name="transform26" position={[5.906, -47.76, 3.926]} rotation={[1.964, 0.374, -0.566]} scale={[142.355, 921.716, 55.191]} />
          </group>
          <group name="pCube85" position={[-0.307, 0.015, 0.014]} rotation={[-Math.PI / 2, 1.473, Math.PI / 2]} scale={[0.01, 0.017, 0]}>
            <group name="transform108" position={[-85.184, 39.409, 916.203]} rotation={[2.53, -0.871, 1.946]} scale={[2438.189, 245.551, 95.652]} />
          </group>
          <group name="pCylinder1" position={[0.115, -0.012, 0]} rotation={[1.392, 0, 0]} scale={[0.002, 0.002, 0.037]}>
            <group name="transform16" position={[-57.427, 1.092, -0.33]} rotation={[-0.82, 0, 0]} scale={[499.793, 93.076, 491.812]} />
          </group>
          <group name="pCylinder5" position={[0.079, -0.012, 0]} rotation={[1.392, 0, 0]} scale={[0.002, 0.002, 0.037]}>
            <group name="transform15" position={[-39.528, 1.092, -0.33]} rotation={[-0.82, 0, 0]} scale={[499.793, 93.076, 491.812]} />
          </group>
          <group name="pCube67" position={[-0.318, -0.013, 0.014]} rotation={[Math.PI / 2, 0, -0.191]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform140" position={[20.299, 2.232, -8.111]} rotation={[-1.577, -0.2, 0.056]} scale={[63.864, 607.167, 48.188]} />
          </group>
          <group name="pCube80" position={[-0.281, 0.066, 0.014]} rotation={[Math.PI / 2, 0, -0.371]} scale={[0.016, 0.021, 0.001]}>
            <group name="transform141" position={[17.163, 4.221, 50.7]} rotation={[-1.592, -0.383, 0.095]} scale={[62.434, 769.648, 50.027]} />
          </group>
          <mesh name="pCube140" castShadow receiveShadow geometry={nodes.pCube140.geometry} material={materials.lambert1} position={[-0.009, -0.011, 0.205]} rotation={[Math.PI / 2, 0, 0]} scale={0.008} />
          <group name="pCube28" position={[0.031, 0.077, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
            <group name="transform42" position={[-2.979, 0, 7.429]} rotation={[-Math.PI / 2, 0, 0]} scale={96.451} />
          </group>
          <group name="pCube4" position={[0.019, 0.001, -0.03]} rotation={[Math.PI / 2, 0, 0]} scale={[0.053, 0.044, 0.046]}>
            <group name="transform2" position={[-0.347, 0.687, 0.016]} rotation={[-Math.PI / 2, 0, 0]} scale={[18.707, 21.663, 22.626]} />
          </group>
          <group name="pCube48" position={[-0.093, 0.007, 0.42]} rotation={[Math.PI / 2, 0, -Math.PI]} scale={0.01}>
            <group name="transform158" position={[960.607, 143.17, 109.199]} rotation={[Math.PI / 2, 0, Math.PI]} scale={100} />
          </group>
          <group name="pCube21" position={[-0.075, -0.01, 0]} rotation={[-Math.PI / 2, Math.PI / 2, 0]} scale={[0.019, 0.018, 0.001]}>
            <group name="transform29" position={[-0.531, 0, 69.627]} rotation={[Math.PI / 2, 0, Math.PI / 2]} scale={[929.872, 53.262, 55.191]} />
          </group>
          <group name="pCube102" position={[-0.445, 0.027, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.016, 0.017, 0]}>
            <group name="transform65" position={[0.891, -1.735, 1261.9]} rotation={[1.759, -1.445, 1.634]} scale={[2834.449, 60.603, 64.399]} />
          </group>
          <group name="pCube64" position={[-0.309, -0.019, 0.014]} rotation={[Math.PI / 2, 0, -0.036]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform138" position={[19.916, -0.135, -11.604]} rotation={[-1.571, -0.037, -0.011]} scale={[64.38, 607.167, 47.496]} />
          </group>
          <mesh name="pCube17" castShadow receiveShadow geometry={nodes.pCube17.geometry} material={materials.lambert1} position={[-0.061, 0.033, -0.086]} rotation={[Math.PI / 2, 0, 0]} scale={0.01} />
          <group name="pCylinder7" position={[0.132, -0.014, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.008}>
            <group name="transform33" position={[-16.087, 0, -1.736]} rotation={[-Math.PI / 2, 0, 0]} scale={122.039} />
          </group>
          <group name="pCube2" position={[-0.031, 0.001, -0.03]} rotation={[Math.PI / 2, 0, 0]} scale={0.045}>
            <group name="transform5" position={[0.682, 0.671, 0.028]} rotation={[-Math.PI / 2, 0, 0]} scale={22.255} />
          </group>
          <group name="pCube110" position={[-0.426, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.007, 0.014, 0.001]}>
            <group name="transform86" position={[-118.813, 49.971, 816.745]} rotation={[-1.464, -1.5, -1.535]} scale={[1900.695, 71.526, 133.413]} />
          </group>
          <group name="pCube46" position={[0.091, 0.029, 0.347]} rotation={[1.616, 0, -0.513]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform151" position={[5.806, -16.394, 27.073]} rotation={[-1.903, -0.444, -0.001]} scale={[60.758, 606.563, 58.662]} />
          </group>
          <group name="pCube19" position={[-0.085, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.023, 0.018, 0.001]}>
            <group name="transform25" position={[3.619, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[42.61, 929.872, 55.191]} />
          </group>
          <group name="pCube100" position={[-0.459, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.01, 0.017, 0]}>
            <group name="transform64" position={[-85.184, 41.206, 1133.234]} rotation={[1.735, -1.461, 1.626]} scale={[2449.792, 59.861, 95.652]} />
          </group>
          <group name="pSphere6" position={[-0.156, -0.006, -0.123]} rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
            <group name="polySurface1" position={[0.577, -0.272, -1.211]}>
              <group name="transform48" position={[806.552, 84.673, 0.619]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
            </group>
            <group name="polySurface2" position={[8.492, 0, -0.49]}>
              <group name="transform46" position={[7.072, 12.342, -0.101]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
            </group>
            <group name="polySurface3" position={[-0.208, 0.096, -1.462]}>
              <group name="transform47" position={[807.337, 84.304, 0.87]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
            </group>
            <group name="polySurface4" position={[-0.867, -0.421, -1.002]}>
              <group name="transform49" position={[807.996, 84.821, 0.41]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
            </group>
            <group name="polySurface5001" position={[-0.522, 0.335, -1.059]} scale={0.709}>
              <group name="transform50" position={[1139.046, 118.559, 0.659]} rotation={[-Math.PI / 2, 0, 0]} scale={141.032} />
            </group>
            <group name="transform45" position={[864.802, -36.687, -0.591]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
          </group>
          <group name="pCube122" position={[-0.443, 0.064, 0.014]} rotation={[-Math.PI / 2, 1.473, Math.PI / 2]} scale={[0.016, 0.018, 0.001]}>
            <group name="transform75" position={[0.89, -5.983, 391.943]} rotation={[2.313, -1.055, 1.841]} scale={[897.027, 103.86, 64.399]} />
          </group>
          <mesh name="pPlane3" castShadow receiveShadow geometry={nodes.pPlane3.geometry} material={materials.lambert1} position={[0.124, 0.075, 0]} rotation={[Math.PI / 2, -Math.PI / 2, 0]} scale={[0.426, 0.727, 0.727]} />
          <group name="pCube76" position={[-0.25, 0.066, 0.014]} rotation={[-Math.PI / 2, -1.425, -Math.PI / 2]} scale={[0.016, 0.021, 0]}>
            <group name="transform126" position={[-0.89, -1.392, -567.297]} rotation={[-0.551, 0.817, 1.162]} scale={[2183.257, 324.262, 64.399]} />
          </group>
          <group name="pCube88" position={[-0.259, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.01, 0.017, 0]}>
            <group name="transform116" position={[-85.184, 41.268, 642.839]} rotation={[1.735, -1.461, 1.626]} scale={[2449.792, 59.861, 95.652]} />
          </group>
          <mesh name="pCube13" castShadow receiveShadow geometry={nodes.pCube13.geometry} material={materials.lambert1} position={[0.014, -0.002, -0.056]} rotation={[Math.PI / 2, 0, 0]} scale={0.01} />
          <group name="pCube91" position={[-0.273, 0.027, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.016, 0.017, 0.001]}>
            <group name="transform113" position={[0.89, -1.699, 515.573]} rotation={[1.698, -1.486, 1.613]} scale={[1890.652, 59.552, 64.399]} />
          </group>
          <group name="pCube61" position={[-0.281, 0.062, 0.014]} rotation={[Math.PI / 2, 0, -0.108]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform129" position={[18.062, 0.779, 37.784]} rotation={[-1.573, -0.113, 0.033]} scale={[64.229, 607.167, 47.701]} />
          </group>
          <group name="pCube132" position={[-0.421, -0.022, 0.014]} rotation={[Math.PI / 2, 0, -0.268]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform92" position={[26.347, 4.659, -13.521]} rotation={[-1.559, -0.278, -0.075]} scale={[63.357, 607.167, 48.853]} />
          </group>
          <group name="pCube115" position={[-0.408, 0.015, 0.014]} rotation={[Math.PI / 2, 1.523, -Math.PI / 2]} scale={[0.007, 0.009, 0.001]}>
            <group name="transform82" position={[-118.813, 77.199, 709.757]} rotation={[1.044, -1.213, 1.387]} scale={[1898.558, 139.677, 133.413]} />
          </group>
          <mesh name="pCube142" castShadow receiveShadow geometry={nodes.pCube142.geometry} material={materials.lambert1} position={[-0.305, 0.088, 0.327]} rotation={[Math.PI / 2, 0, -Math.PI / 2]} scale={0.01} />
          <mesh name="pPlane1" castShadow receiveShadow geometry={nodes.pPlane1.geometry} material={materials.lambert1} position={[-0.042, -0.038, 0.132]} rotation={[Math.PI / 2, 0, 0]} scale={0.727} />
          <group name="pCube44" position={[0.091, 0.029, 0.148]} rotation={[1.612, 0, 0.294]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform146" position={[-8.361, -5.43, 21.077]} rotation={[-1.852, 0.263, -0.019]} scale={[63.153, 606.655, 55.079]} />
          </group>
          <group name="pCube15" position={[-0.094, -0.007, 0.023]} rotation={[Math.PI / 2, 0, 0]} scale={[0.002, 0.022, 0.011]}>
            <group name="transform21" position={[48.682, -1.076, -0.596]} rotation={[-Math.PI / 2, 0, 0]} scale={[519.643, 87.48, 46.401]} />
          </group>
          <group name="pCube38" position={[0.094, 0.007, 0.171]} rotation={[Math.PI / 2, 0, -2.928]} scale={0.01}>
            <group name="transform145" position={[982.153, -92.451, 109.199]} rotation={[Math.PI / 2, -0.214, -Math.PI]} scale={100} />
          </group>
          <group name="pCylinder6" position={[0.117, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.005}>
            <group name="transform34" position={[-25.956, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={220.902} />
          </group>
          <group name="pCube59" position={[-0.281, 0.052, 0.014]} rotation={[Math.PI / 2, 0, 0]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform130" position={[18.071, -0.656, 31.535]} rotation={[-Math.PI / 2, 0, 0]} scale={[64.399, 607.167, 47.471]} />
          </group>
          <group name="pPipe3" position={[0.043, 0.029, -0.016]} rotation={[Math.PI, 0, 0]} scale={[0.001, 0.001, 0.015]}>
            <group name="transform13" position={[-38.503, 25.605, -1.037]} rotation={[-Math.PI, 0, 0]} scale={[888.594, 888.594, 66.852]} />
          </group>
          <group name="pCylinder13" position={[0.039, 0.095, -0.085]} rotation={[Math.PI / 2, 0, 0]} scale={0.004}>
            <group name="transform160" position={[-3400.533, 72.563, 25.49]} rotation={[-Math.PI / 2, 0, 0]} scale={268.016} />
          </group>
          <group name="pCube41" position={[0.094, 0.007, 0.289]} rotation={[Math.PI / 2, 0, -Math.PI]} scale={0.01}>
            <group name="transform149" position={[979.376, 130.12, 109.199]} rotation={[Math.PI / 2, 0, Math.PI]} scale={100} />
          </group>
          <group name="pCube32" position={[0.011, 0.091, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
            <group name="transform38" position={[-1.109, 0, 8.797]} rotation={[-Math.PI / 2, 0, 0]} scale={96.451} />
          </group>
          <group name="pCube98" position={[-0.463, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.01, 0.011, 0.001]}>
            <group name="transform102" position={[-85.184, 61.509, 420.944]} rotation={[1.612, -1.544, 1.585]} scale={[901.814, 87.312, 95.652]} />
          </group>
          <group name="pCube118" position={[-0.468, 0.067, 0.014]} rotation={[-Math.PI / 2, 1.473, Math.PI / 2]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform73" position={[0.89, -5.318, 278.747]} rotation={[2.237, -1.115, 1.809]} scale={[604.298, 75.684, 64.399]} />
          </group>
          <group name="pCube75" position={[-0.308, 0.051, 0.014]} rotation={[-Math.PI / 2, 1.473, Math.PI / 2]} scale={[0.01, 0.014, 0.001]}>
            <group name="transform125" position={[-85.184, 45.017, 335.393]} rotation={[2.237, -1.115, 1.809]} scale={[897.566, 112.414, 95.652]} />
          </group>
          <group name="pCube25" position={[-0.085, -0.009, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
            <group name="transform30" position={[857.73, -94.065, -0.941]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
          </group>
          <group name="pCube106" position={[-0.436, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.01, 0.013, 0.001]}>
            <group name="transform61" position={[-85.184, 53.753, 599.015]} rotation={[1.642, -1.523, 1.595]} scale={[1362.72, 76.51, 95.652]} />
          </group>
          <group name="pCube120" position={[-0.448, 0.051, 0.014]} rotation={[-Math.PI / 2, 1.473, Math.PI / 2]} scale={[0.01, 0.021, 0.001]}>
            <group name="transform77" position={[-85.184, 29.522, 461.471]} rotation={[2.363, -1.015, 1.863]} scale={[897.552, 99.619, 95.652]} />
          </group>
          <group name="pCube57" position={[-0.293, 0.047, 0.008]} rotation={[Math.PI / 2, 0, 0]} scale={[0.009, 0.01, 0.01]}>
            <group name="transform134" position={[32.585, -0.758, 4.713]} rotation={[-Math.PI / 2, 0, 0]} scale={[111.111, 100, 100]} />
          </group>
          <group name="pCube128" position={[-0.454, -0.019, 0.014]} rotation={[Math.PI / 2, 0, -0.036]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform89" position={[29.229, 0.109, -11.63]} rotation={[-1.571, -0.037, -0.011]} scale={[64.38, 607.167, 47.496]} />
          </group>
          <mesh name="polySurface8" castShadow receiveShadow geometry={nodes.polySurface8.geometry} material={materials.lambert1} position={[0, -0.014, -0.029]} rotation={[Math.PI / 2, 0, 0]} scale={0.01} />
          <group name="pCube83" position={[-0.317, 0.015, 0.014]} rotation={[-1.571, 1.473, 1.571]} scale={[0.013, 0.014, 0.001]}>
            <group name="transform110" position={[-69.509, 47.898, 283.159]} rotation={[2.164, -1.172, 1.779]} scale={[732.415, 100.738, 78.051]} />
          </group>
          <group name="pPipe6" position={[0.041, 0.033, -0.016]} rotation={[Math.PI, 0, 0]} scale={[0.001, 0.001, 0.015]}>
            <group name="transform12" position={[-36.427, 29.012, -1.037]} rotation={[-Math.PI, 0, 0]} scale={[888.594, 888.594, 66.852]} />
          </group>
          <group name="pCube141" position={[0.039, 0.079, -0.085]} rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
            <group name="transform161" position={[1071.808, -46.159, 239.852]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
          </group>
          <group name="pCube71" position={[-0.277, -0.062, 0.014]} rotation={[Math.PI / 2, 0, -0.026]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform128" position={[17.827, -0.309, -37.431]} rotation={[-1.571, -0.028, -0.008]} scale={[64.389, 607.167, 47.485]} />
          </group>
          <mesh name="pCube10" castShadow receiveShadow geometry={nodes.pCube10.geometry} material={materials.lambert1} position={[0, 0.015, -0.038]} rotation={[Math.PI / 2, 0, -0.204]} scale={[0.011, 0.014, 0.001]} />
          <group name="pCube105" position={[-0.438, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.01, 0.017, 0]}>
            <group name="transform62" position={[-85.184, 41.212, 1082.853]} rotation={[1.735, -1.461, 1.626]} scale={[2449.792, 59.861, 95.652]} />
          </group>
          <group name="pCube55" position={[-0.293, -0.028, 0.008]} rotation={[Math.PI / 2, 0, 0]} scale={[0.009, 0.01, 0.01]}>
            <group name="transform133" position={[33.838, -0.758, -2.79]} rotation={[-Math.PI / 2, 0, 0]} scale={[115.385, 100, 100]} />
          </group>
          <group name="pCube78" position={[-0.255, 0.059, 0.014]} rotation={[-Math.PI / 2, -1.425, -Math.PI / 2]} scale={[0.013, 0.012, 0]}>
            <group name="transform112" position={[-1.074, -1.76, -695.197]} rotation={[-0.588, 0.853, 1.184]} scale={[2632.068, 395.126, 77.637]} />
          </group>
          <group name="pCube30" position={[0.015, 0.056, 0]} rotation={[Math.PI / 2, -Math.PI / 2, 0]} scale={0.01}>
            <group name="transform40" position={[5.406, 0, 1.479]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={96.451} />
          </group>
          <mesh name="polySurface5" castShadow receiveShadow geometry={nodes.polySurface5.geometry} material={materials.lambert1} position={[-0.216, -0.01, -0.014]} rotation={[Math.PI / 2, 0, -0.533]} scale={0.014} />
          <mesh name="pCube26" castShadow receiveShadow geometry={nodes.pCube26.geometry} material={materials.lambert1} position={[0.077, 0.079, -0.085]} rotation={[Math.PI / 2, 0, 0]} scale={0.01} />
          <group name="pCube114" position={[-0.403, 0.015, 0.014]} rotation={[Math.PI / 2, 1.523, -Math.PI / 2]} scale={[0.007, 0.014, 0]}>
            <group name="transform83" position={[-118.813, 51.428, 1462.294]} rotation={[-2.451, -0.937, -1.905]} scale={[3962.371, 202.325, 133.413]} />
          </group>
          <group name="pCube136" position={[-0.454, -0.004, 0.014]} rotation={[Math.PI / 2, 0, 0.231]} scale={[0.013, 0.017, 0.001]}>
            <group name="transform68" position={[34.549, -6.805, -5.877]} rotation={[-1.579, 0.24, -0.066]} scale={[77.843, 1392.819, 59.34]} />
          </group>
          <group name="pCube86" position={[-0.301, 0.015, 0.014]} rotation={[-Math.PI / 2, 1.473, Math.PI / 2]} scale={[0.01, 0.011, 0.002]}>
            <group name="transform115" position={[-85.184, 58.851, 156.73]} rotation={[1.918, -1.357, 1.688]} scale={[423.089, 96.133, 95.652]} />
          </group>
          <group name="pCube69" position={[-0.272, -0.056, 0.014]} rotation={[Math.PI / 2, 0, 0.076]} scale={[0.01, 0.014, 0.001]}>
            <group name="transform131" position={[26.967, -2.534, -52.282]} rotation={[-1.572, 0.08, -0.023]} scale={[99.613, 940.416, 73.704]} />
          </group>
          <group name="pCube14" position={[-0.108, 0, 0.023]} rotation={[Math.PI / 2, 0, 0]} scale={[0.035, 0.022, 0.002]}>
            <group name="transform23" position={[3.106, -1.076, 0.146]} rotation={[-Math.PI / 2, 0, 0]} scale={[28.869, 405.728, 46.401]} />
          </group>
          <group name="pCube52" position={[-0.288, -0.006, 0.038]} rotation={[Math.PI / 2, 0, 0]} scale={0.091}>
            <group name="transform58" position={[3.169, -0.423, -0.07]} rotation={[-Math.PI / 2, 0, 0]} scale={11.01} />
          </group>
          <group name="pCube124" position={[-0.429, 0.051, 0.014]} rotation={[-1.571, 1.473, 1.571]} scale={[0.01, 0.018, 0.001]}>
            <group name="transform78" position={[-85.184, 34.8, 659.729]} rotation={[2.424, -0.964, 1.891]} scale={[1332.343, 141.597, 95.652]} />
          </group>
          <group name="pCube108" position={[-0.43, 0.014, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.005, 0.007, 0]}>
            <group name="transform70" position={[-165.842, 104.7, 1152.05]} rotation={[1.642, -1.523, 1.595]} scale={[2653.027, 148.954, 186.221]} />
          </group>
          <mesh name="pCylinder11" castShadow receiveShadow geometry={nodes.pCylinder11.geometry} material={materials.lambert1} position={[0.076, 0.095, -0.085]} rotation={[Math.PI / 2, 0, 0]} scale={0.004} />
          <group name="pSphere2" position={[0, -0.007, 0.055]} rotation={[Math.PI / 2, 0, 0]} scale={0.005}>
            <group name="transform8" position={[0, -11.858, -1.446]} rotation={[-Math.PI / 2, 0, 0]} scale={214.126} />
          </group>
          <group name="pCube33" position={[0.015, 0.077, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
            <group name="transform43" position={[-156.001, 770.187, 7.702]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
          </group>
          <group name="pCube130" position={[-0.421, -0.014, 0.014]} rotation={[Math.PI / 2, 0, -0.166]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform96" position={[26.856, 2.648, -8.464]} rotation={[-1.575, -0.173, 0.049]} scale={[63.997, 607.167, 48.012]} />
          </group>
          <group name="pCube134" position={[-0.421, -0.018, 0.014]} rotation={[Math.PI / 2, 0, -0.433]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform95" position={[24.951, 7.786, -10.821]} rotation={[-1.542, -0.444, -0.103]} scale={[61.752, 607.167, 50.866]} />
          </group>
          <group name="pCube93" position={[-0.436, 0.047, 0.008]} rotation={[Math.PI / 2, 0, 0]} scale={[0.007, 0.01, 0.01]}>
            <group name="transform100" position={[64.825, -0.758, 4.713]} rotation={[-Math.PI / 2, 0, 0]} scale={[148.569, 100, 100]} />
          </group>
          <mesh name="pSphere5" castShadow receiveShadow geometry={nodes.pSphere5.geometry} material={materials.lambert1} position={[0.098, -0.014, -0.043]} rotation={[Math.PI / 2, 0, 0.358]} scale={[0.013, 0.013, 0.016]} />
          <group name="pCube7" position={[0, 0.003, -0.032]} rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
            <group name="polySurface15" position={[7.717, 41.053, 0.674]}>
              <group name="transform147" position={[-7.717, -37.863, -0.352]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
            </group>
            <group name="polySurface16" position={[7.717, 31.169, 0.674]}>
              <group name="transform148" position={[-7.717, -27.979, -0.352]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
            </group>
            <group name="polySurface17" position={[7.717, 20.483, 0.674]}>
              <group name="transform144" position={[-7.717, -17.293, -0.352]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
            </group>
            <group name="polySurface18" position={[-10.938, 41.053, 0.674]}>
              <group name="transform157" position={[10.938, -37.863, -0.352]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
            </group>
            <group name="polySurface19" position={[-10.938, 31.002, 0.674]}>
              <group name="transform154" position={[10.938, -27.812, -0.352]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
            </group>
            <group name="polySurface20" position={[-10.938, 20.438, 0.674]}>
              <group name="transform156" position={[10.938, -17.248, -0.352]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
            </group>
            <group name="polySurface6" position={[0, 3.19, 0.323]}>
              <group name="transform54" rotation={[-Math.PI / 2, 0, 0]} scale={100} />
            </group>
            <group name="polySurface7" position={[0, 3.19, 0.323]}>
              <group name="transform55" rotation={[-Math.PI / 2, 0, 0]} scale={100} />
            </group>
            <group name="polySurface8001" position={[0, 3.19, 0.323]}>
              <group name="transform57" rotation={[-Math.PI / 2, 0, 0]} scale={100} />
            </group>
            <group name="polySurface9" position={[0, 3.19, 0.323]}>
              <group name="transform56" rotation={[-Math.PI / 2, 0, 0]} scale={100} />
            </group>
            <group name="transform53" position={[0, 35.445, -318.639]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
          </group>
          <group name="pCube51" position={[-0.287, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.105}>
            <group name="transform59" position={[2.735, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={9.513} />
          </group>
          <group name="pCylinder10" position={[0.126, 0.002, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
            <group name="transform35" position={[-1277.553, 18.585, 0.186]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
          </group>
          <group name="pCube65" position={[-0.309, -0.022, 0.014]} rotation={[Math.PI / 2, 0, -0.026]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform137" position={[19.914, -0.268, -13.521]} rotation={[-1.571, -0.028, -0.008]} scale={[64.389, 607.167, 47.485]} />
          </group>
          <group name="pCylinder12" position={[-0.204, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.001}>
            <group name="transform51" position={[181.46, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={888.196} />
          </group>
          <group name="pCube12" position={[0.097, -0.014, 0.018]} rotation={[Math.PI / 2, 0, 0]} scale={[0.039, 0.037, 0.005]}>
            <group name="transform19" position={[-2.47, -0.499, -2.646]} rotation={[-Math.PI / 2, 0, 0]} scale={[25.459, 189.201, 27.058]} />
          </group>
          <group name="pPipe1" position={[0.039, 0.029, -0.016]} rotation={[Math.PI, 0, 0]} scale={[0.001, 0.001, 0.015]}>
            <group name="transform9" position={[-34.418, 25.605, -1.037]} rotation={[-Math.PI, 0, 0]} scale={[888.594, 888.594, 66.852]} />
          </group>
          <group name="pCube137" position={[-0.454, 0, 0.014]} rotation={[Math.PI / 2, 0, -0.046]} scale={[0.013, 0.017, 0.002]}>
            <group name="transform85" position={[35.757, 0.398, -0.041]} rotation={[-1.571, -0.048, 0.014]} scale={[78.751, 540.318, 58.129]} />
          </group>
          <mesh name="pCube138" castShadow receiveShadow geometry={nodes.pCube138.geometry} material={materials.lambert1} position={[-0.275, 0.041, 0.061]} rotation={[Math.PI / 2, 0, -Math.PI / 2]} scale={0.007} />
          <group name="pCube92" position={[-0.437, 0, 0]} rotation={[Math.PI / 2, 0, -Math.PI]} scale={[0.008, 0.01, 0.01]}>
            <group name="transform84" position={[-3549.33, 0, 0]} rotation={[Math.PI / 2, 0, Math.PI]} scale={[121.622, 100, 100]} />
          </group>
          <group name="pCube96" position={[-0.436, -0.068, 0.008]} rotation={[Math.PI / 2, 0, 0]} scale={[0.007, 0.01, 0.01]}>
            <group name="transform101" position={[64.825, -0.758, -6.782]} rotation={[-Math.PI / 2, 0, 0]} scale={[148.569, 100, 100]} />
          </group>
          <group name="pCube5" position={[0.017, -0.003, -0.03]} rotation={[Math.PI / 2, 0, 0]} scale={[0.045, 0.085, 0.039]}>
            <group name="transform1" position={[-0.378, 0.357, -0.074]} rotation={[-Math.PI / 2, 0, 0]} scale={[22.263, 25.782, 11.739]} />
          </group>
          <mesh name="pSphere3" castShadow receiveShadow geometry={nodes.pSphere3.geometry} material={materials.lambert1} position={[-0.039, 0.015, -0.031]} rotation={[Math.PI / 2, 0, 0]} scale={0.01} />
          <group name="pCube22" position={[-0.085, -0.006, 0]} rotation={[-Math.PI / 2, -0.133, 0]} scale={[0.014, 0.018, 0.001]}>
            <group name="transform27" position={[5.82, -47.76, -4.43]} rotation={[1.964, 0.374, -0.566]} scale={[142.355, 921.716, 55.191]} />
          </group>
          <group name="pCube6" position={[0.019, 0.001, -0.03]} rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
            <group name="transform3" position={[-187.178, 16.969, -303.66]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
          </group>
          <group name="pCube63" position={[-0.267, -0.021, 0.014]} rotation={[Math.PI / 2, 0, 0.29]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform136" position={[16.227, -4.252, -12.904]} rotation={[-1.584, 0.3, -0.08]} scale={[63.187, 607.167, 49.073]} />
          </group>
          <mesh name="pPlane2" castShadow receiveShadow geometry={nodes.pPlane2.geometry} material={materials.lambert1} position={[-0.315, 0.075, 0.118]} rotation={[Math.PI / 2, -Math.PI / 2, 0]} scale={[0.426, 0.727, 0.727]} />
          <group name="pCube11" position={[0.097, -0.009, 0]} rotation={[1.392, 0, 0]} scale={[0.037, 0, 0.066]}>
            <group name="transform20" position={[-2.619, 3.513, -0.129]} rotation={[-0.665, 0, 0]} scale={[27.081, 407.873, 2249.949]} />
          </group>
          <group name="pCube27" position={[0, 0.077, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
            <group name="transform41" position={[0, 0, 7.429]} rotation={[-Math.PI / 2, 0, 0]} scale={96.451} />
          </group>
          <group name="pCube3" position={[0.049, 0.001, -0.03]} rotation={[Math.PI / 2, 0, -Math.PI]} scale={[0.009, 0.045, 0.045]}>
            <group name="transform4" position={[5.636, -0.671, 0.028]} rotation={[Math.PI / 2, 0, Math.PI]} scale={[116, 22.255, 22.255]} />
          </group>
          <group name="pPipe4" position={[0.042, 0.031, -0.016]} rotation={[Math.PI, 0, 0]} scale={[0.001, 0.001, 0.015]}>
            <group name="transform14" position={[-37.499, 27.302, -1.037]} rotation={[-Math.PI, 0, 0]} scale={[888.594, 888.594, 66.852]} />
          </group>
          <group name="pCube47" position={[-0.087, 0.029, 0.148]} rotation={[1.612, 0, 0.294]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform152" position={[2.613, -7.879, 21.077]} rotation={[-1.852, 0.263, -0.019]} scale={[63.153, 606.655, 55.079]} />
          </group>
          <group name="pCube20" position={[-0.095, -0.01, 0]} rotation={[Math.PI / 2, -Math.PI / 2, 0]} scale={[0.019, 0.018, 0.001]}>
            <group name="transform24" position={[-0.531, 0, -88.178]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={[929.872, 53.262, 55.191]} />
          </group>
          <group name="pCube101" position={[-0.454, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.01, 0.011, 0.002]}>
            <group name="transform67" position={[-85.184, 61.513, 194.543]} rotation={[1.591, -1.558, 1.578]} scale={[425.019, 87.21, 95.652]} />
          </group>
          <mesh name="pCube9" castShadow receiveShadow geometry={nodes.pCube9.geometry} material={materials.lambert1} position={[0, 0.013, -0.037]} rotation={[Math.PI / 2, 0, 0.294]} scale={[0.016, 0.021, 0.002]} />
          <group name="pSphere1" position={[0, 0, 0.055]} rotation={[Math.PI / 2, 0, 0]} scale={0.005}>
            <group name="transform7" position={[0, -11.858, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={214.126} />
          </group>
          <mesh name="pPlane4" castShadow receiveShadow geometry={nodes.pPlane4.geometry} material={materials.lambert1} position={[-0.064, 0.075, -0.096]} rotation={[Math.PI, 0, Math.PI / 2]} scale={[0.426, 0.727, 0.727]} />
          <group name="pCylinder8" position={[0.118, 0.025, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0}>
            <group name="transform32" position={[-598.937, 0, 128.301]} rotation={[-Math.PI / 2, 0, 0]} scale={5091.034} />
          </group>
          <group name="pCube89" position={[-0.263, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.01, 0.011, 0.001]}>
            <group name="transform118" position={[-85.184, 61.579, 240.893]} rotation={[1.612, -1.544, 1.585]} scale={[901.814, 87.312, 95.652]} />
          </group>
          <group name="pCube111" position={[-0.424, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.007, 0.014, 0]}>
            <group name="transform103" position={[-118.813, 49.972, 1695.858]} rotation={[1.788, -1.426, 1.644]} scale={[3966.844, 73.888, 133.413]} />
          </group>
          <group name="pCube62" position={[-0.267, -0.017, 0.014]} rotation={[Math.PI / 2, 0, -0.108]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform139" position={[17.195, 0.71, -10.128]} rotation={[-1.573, -0.113, 0.033]} scale={[64.229, 607.167, 47.701]} />
          </group>
          <group name="pCube49" position={[-0.093, 0.007, 0.296]} rotation={[Math.PI / 2, 0, -Math.PI]} scale={0.01}>
            <group name="transform159" position={[960.607, 130.852, 109.199]} rotation={[Math.PI / 2, 0, Math.PI]} scale={100} />
          </group>
          <group name="pCube1" position={[0, 0.026, -0.032]} rotation={[Math.PI / 2, 0, 0]} scale={[0.115, 0.057, 0.004]}>
            <group name="transform6" position={[0, 0.558, 6.45]} rotation={[-Math.PI / 2, 0, 0]} scale={[8.68, 251.064, 17.506]} />
          </group>
          <group name="pCube45" position={[-0.097, 0.03, 0.25]} rotation={[1.622, 0.019, -0.325]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform153" position={[10.978, -9.708, 27.087]} rotation={[-1.913, -0.183, -0.063]} scale={[63.87, 606.265, 58.439]} />
          </group>
          <group name="pCube16" position={[-0.122, -0.007, 0.023]} rotation={[Math.PI / 2, 0, 0]} scale={[0.002, 0.022, 0.011]}>
            <group name="transform22" position={[63.369, -1.076, -0.596]} rotation={[-Math.PI / 2, 0, 0]} scale={[519.643, 87.48, 46.401]} />
          </group>
          <group name="pCube84" position={[-0.311, 0.015, 0.014]} rotation={[-Math.PI / 2, 1.473, Math.PI / 2]} scale={[0.01, 0.011, 0.001]}>
            <group name="transform109" position={[-85.184, 58.766, 341.503]} rotation={[2.164, -1.172, 1.779]} scale={[897.58, 123.455, 95.652]} />
          </group>
          <group name="pCube99" position={[-0.469, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.013, 0.014, 0.001]}>
            <group name="transform105" position={[-69.509, 50.183, 348.016]} rotation={[-1.529, -1.544, -1.557]} scale={[735.87, 71.246, 78.051]} />
          </group>
          <group name="pCube121" position={[-0.438, 0.051, 0.014]} rotation={[-Math.PI / 2, 1.473, Math.PI / 2]} scale={[0.013, 0.015, 0.001]}>
            <group name="transform74" position={[-69.509, 42.308, 547.181]} rotation={[2.313, -1.055, 1.841]} scale={[1087.188, 125.877, 78.051]} />
          </group>
          <group name="pCube87" position={[-0.254, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.01, 0.011, 0.002]}>
            <group name="transform119" position={[-85.184, 61.583, 109.463]} rotation={[1.591, -1.558, 1.578]} scale={[425.019, 87.21, 95.652]} />
          </group>
          <group name="pCube60" position={[-0.281, 0.058, 0.014]} rotation={[Math.PI / 2, 0, 0.29]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform123" position={[17.063, -4.436, 35.009]} rotation={[-1.584, 0.3, -0.08]} scale={[63.187, 607.167, 49.073]} />
          </group>
          <group name="pCube79" position={[-0.259, 0.059, 0.014]} rotation={[-Math.PI / 2, -1.425, -Math.PI / 2]} scale={[0.013, 0.011, 0.001]}>
            <group name="transform142" position={[-1.074, -1.848, -257.429]} rotation={[-0.82, 1.056, 1.298]} scale={[962.912, 167.036, 77.637]} />
          </group>
          <group name="pCube131" position={[-0.421, -0.009, 0.014]} rotation={[Math.PI / 2, 0, -0.166]} scale={[0.01, 0.014, 0.001]}>
            <group name="transform93" position={[41.595, 4.101, -8.684]} rotation={[-1.566, -0.173, -0.049]} scale={[99.123, 940.416, 74.363]} />
          </group>
          <group name="pCube77" position={[-0.253, 0.062, 0.014]} rotation={[-Math.PI / 2, -1.425, -Math.PI / 2]} scale={[0.016, 0.015, 0]}>
            <group name="transform117" position={[-0.89, -1.632, -572.338]} rotation={[-0.588, 0.853, 1.184]} scale={[2183.269, 327.752, 64.399]} />
          </group>
          <group name="pCube31" position={[0.015, 0.084, 0]} rotation={[Math.PI / 2, -Math.PI / 2, 0]} scale={0.01}>
            <group name="transform39" position={[8.132, 0, 1.479]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={96.451} />
          </group>
          <group name="pCube43" position={[0.094, 0.007, 0.373]} rotation={[Math.PI / 2, 0, 2.977]} scale={0.01}>
            <group name="transform150" position={[943.326, 297.486, 109.199]} rotation={[Math.PI / 2, 0.165, -Math.PI]} scale={100} />
          </group>
          <group name="pCube29" position={[0.015, 0.098, 0]} rotation={[Math.PI / 2, -Math.PI / 2, 0]} scale={0.01}>
            <group name="transform37" position={[9.489, 0, 1.479]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} scale={96.451} />
          </group>
          <group name="pCube81" position={[-0.302, 0.051, 0.014]} rotation={[-Math.PI / 2, 1.473, Math.PI / 2]} scale={[0.01, 0.021, 0.001]}>
            <group name="transform107" position={[-85.184, 30.194, 330.445]} rotation={[2.363, -1.015, 1.863]} scale={[897.552, 99.619, 95.652]} />
          </group>
          <group name="pCube73" position={[-0.322, 0.067, 0.014]} rotation={[-Math.PI / 2, 1.473, Math.PI / 2]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform120" position={[0.89, -4.643, 190.532]} rotation={[2.237, -1.115, 1.809]} scale={[604.298, 75.684, 64.399]} />
          </group>
          <group name="pSphere4" position={[-0.079, 0.003, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.004}>
            <group name="transform31" position={[21.879, 0, 0.873]} rotation={[-Math.PI / 2, 0, 0]} scale={276.408} />
          </group>
          <group name="pCube107" position={[-0.433, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.007, 0.009, 0.001]}>
            <group name="transform71" position={[-122.211, 77.131, 853.265]} rotation={[-1.499, -1.523, -1.547]} scale={[1955.049, 109.766, 137.229]} />
          </group>
          <group name="pCube58" position={[-0.293, -0.068, 0.008]} rotation={[Math.PI / 2, 0, 0]} scale={[0.009, 0.01, 0.01]}>
            <group name="transform124" position={[33.41, -0.758, -6.782]} rotation={[-Math.PI / 2, 0, 0]} scale={[113.924, 100, 100]} />
          </group>
          <group name="pCube129" position={[-0.454, -0.018, 0.014]} rotation={[Math.PI / 2, 0, -0.191]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform94" position={[28.852, 3.454, -10.821]} rotation={[-1.565, -0.2, -0.056]} scale={[63.864, 607.167, 48.188]} />
          </group>
          <group name="pCube109" position={[-0.428, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.007, 0.009, 0.001]}>
            <group name="transform69" position={[-118.813, 74.989, 821.494]} rotation={[-1.499, -1.523, -1.547]} scale={[1900.695, 106.714, 133.413]} />
          </group>
          <group name="pCylinder4" position={[0.08, -0.031, 0.033]} rotation={[1.477, 0, 0]} scale={[0.002, 0.002, 0.016]}>
            <group name="transform17" position={[-39.811, -15.159, -2.085]} rotation={[-1.2, 0, 0]} scale={[499.793, 76.867, 497.626]} />
          </group>
          <group name="pCube113" position={[-0.401, 0.015, 0.014]} rotation={[Math.PI / 2, 1.523, -Math.PI / 2]} scale={[0.006, 0.012, 0]}>
            <group name="transform81" position={[-139.837, 60.531, 812.186]} rotation={[0.904, -1.108, 1.332]} scale={[2209.423, 134.542, 157.021]} />
          </group>
          <group name="pCube82" position={[-0.324, 0.027, 0.014]} rotation={[-Math.PI / 2, 1.473, Math.PI / 2]} scale={[0.016, 0.017, 0.001]}>
            <group name="transform106" position={[0.89, -3.457, 277.088]} rotation={[2.285, -1.077, 1.829]} scale={[863.147, 102.689, 64.399]} />
          </group>
          <group name="pCube95" position={[-0.436, -0.028, 0.008]} rotation={[Math.PI / 2, 0, 0]} scale={[0.007, 0.01, 0.01]}>
            <group name="transform98" position={[64.825, -0.758, -2.79]} rotation={[-Math.PI / 2, 0, 0]} scale={[148.569, 100, 100]} />
          </group>
          <group name="pCube34" position={[0.015, 0.077, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
            <group name="transform44" position={[-156.001, 770.187, 7.702]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
          </group>
          <group name="pCube117" position={[-0.46, 0.051, 0.014]} rotation={[-Math.PI / 2, 1.473, Math.PI / 2]} scale={[0.013, 0.017, 0.001]}>
            <group name="transform79" position={[-69.509, 35.871, 385.089]} rotation={[2.237, -1.115, 1.809]} scale={[732.404, 91.729, 78.051]} />
          </group>
          <group name="pCube72" position={[-0.272, -0.053, 0.014]} rotation={[Math.PI / 2, 0, 0.076]} scale={[0.018, 0.024, 0.002]}>
            <group name="transform121" position={[15.296, -1.437, -28.147]} rotation={[-1.572, 0.08, -0.023]} scale={[56.501, 533.406, 41.805]} />
          </group>
          <group name="pCube135" position={[-0.454, -0.007, 0.014]} rotation={[Math.PI / 2, 0, -0.234]} scale={[0.013, 0.017, 0.001]}>
            <group name="transform104" position={[35.025, 5.32, -9.116]} rotation={[-1.58, -0.243, 0.067]} scale={[77.818, 1392.819, 59.373]} />
          </group>
          <group name="pCube90" position={[-0.27, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.013, 0.014, 0.001]}>
            <group name="transform114" position={[-69.509, 50.233, 201.096]} rotation={[-1.529, -1.544, -1.557]} scale={[735.87, 71.246, 78.051]} />
          </group>
          <group name="pCube56" position={[-0.293, 0.011, 0.008]} rotation={[Math.PI / 2, 0, 0]} scale={[0.009, 0.01, 0.01]}>
            <group name="transform132" position={[32.585, -0.758, 1.106]} rotation={[-Math.PI / 2, 0, 0]} scale={[111.111, 100, 100]} />
          </group>
          <group name="pCube127" position={[-0.454, -0.022, 0.014]} rotation={[Math.PI / 2, 0, -0.026]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform90" position={[29.23, -0.087, -13.521]} rotation={[-1.571, -0.028, -0.008]} scale={[64.389, 607.167, 47.485]} />
          </group>
          <group name="pCube94" position={[-0.436, 0.011, 0.008]} rotation={[Math.PI / 2, 0, 0]} scale={[0.007, 0.01, 0.01]}>
            <group name="transform99" position={[64.825, -0.758, 1.106]} rotation={[-Math.PI / 2, 0, 0]} scale={[148.569, 100, 100]} />
          </group>
          <mesh name="pCube37" castShadow receiveShadow geometry={nodes.pCube37.geometry} material={materials.lambert1} position={[-0.187, 0.008, -0.082]} rotation={[1.414, -0.03, 0.006]} scale={[0.01, 0.01, 0.012]} />
          <group name="pCube112" position={[-0.422, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.006, 0.012, 0]}>
            <group name="transform87" position={[-139.837, 58.82, 942.429]} rotation={[-1.465, -1.501, -1.536]} scale={[2211.915, 84.164, 157.021]} />
          </group>
          <group name="pCube116" position={[-0.405, 0.015, 0.014]} rotation={[Math.PI / 2, 1.523, -Math.PI / 2]} scale={[0.007, 0.014, 0.001]}>
            <group name="transform80" position={[-118.813, 51.431, 704.834]} rotation={[0.9, -1.106, 1.331]} scale={[1898.554, 115.117, 133.413]} />
          </group>
          <group name="pCube70" position={[-0.272, -0.058, 0.014]} rotation={[Math.PI / 2, 0, -0.191]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform127" position={[17.378, 1.815, -35.25]} rotation={[-1.565, -0.2, -0.056]} scale={[63.864, 607.167, 48.188]} />
          </group>
          <group name="pCube36" position={[-0.204, -0.038, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0.01}>
            <group name="transform52" position={[20.413, 0, -3.756]} rotation={[-Math.PI / 2, 0, 0]} scale={100} />
          </group>
          <group name="pCube103" position={[-0.44, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.01, 0.017, 0]}>
            <group name="transform63" position={[-85.184, 41, 1239.034]} rotation={[1.758, -1.446, 1.634]} scale={[2790.453, 59.984, 95.652]} />
          </group>
          <group name="pCube53" position={[-0.287, 0, 0]} rotation={[Math.PI / 2, 0, -Math.PI]} scale={[0.009, 0.01, 0.01]}>
            <group name="transform135" position={[-3266.335, 0, 0]} rotation={[Math.PI / 2, 0, Math.PI]} scale={[112.5, 100, 100]} />
          </group>
          <group name="pCube125" position={[-0.454, -0.014, 0.014]} rotation={[Math.PI / 2, 0, 0.076]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform91" position={[29.064, -2.29, -8.464]} rotation={[-1.572, 0.08, -0.023]} scale={[64.314, 607.166, 47.586]} />
          </group>
          <group name="pPipe2" position={[0.041, 0.029, -0.016]} rotation={[Math.PI, 0, 0]} scale={[0.001, 0.001, 0.015]}>
            <group name="transform10" position={[-36.461, 25.605, -1.037]} rotation={[-Math.PI, 0, 0]} scale={[888.594, 888.594, 66.852]} />
          </group>
          <mesh name="pCube35" castShadow receiveShadow geometry={nodes.pCube35.geometry} material={materials.lambert1} position={[0.001, 0.077, -0.087]} rotation={[Math.PI / 2, 0, 0]} scale={0.016} />
          <group name="pCube97" position={[-0.472, 0.027, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.016, 0.017, 0.001]}>
            <group name="transform66" position={[0.891, -1.746, 893.049]} rotation={[1.698, -1.486, 1.613]} scale={[1890.652, 59.552, 64.399]} />
          </group>
          <mesh name="pPipe7" castShadow receiveShadow geometry={nodes.pPipe7.geometry} material={materials.lambert1} position={[0.041, 0.013, -0.016]} rotation={[Math.PI / 2, 0, 0]} scale={0.01} />
          <group name="pCube74" position={[-0.314, 0.051, 0.014]} rotation={[-Math.PI / 2, 1.473, Math.PI / 2]} scale={[0.013, 0.017, 0.001]}>
            <group name="transform143" position={[-69.509, 36.689, 278.173]} rotation={[2.237, -1.115, 1.809]} scale={[732.404, 91.729, 78.051]} />
          </group>
          <group name="pCube68" position={[-0.309, -0.009, 0.014]} rotation={[Math.PI / 2, 0, 0.076]} scale={[0.01, 0.014, 0.001]}>
            <group name="transform111" position={[30.624, -2.739, -8.643]} rotation={[-1.572, 0.08, -0.023]} scale={[99.613, 940.416, 73.704]} />
          </group>
          <group name="pCube119" position={[-0.454, 0.051, 0.014]} rotation={[-Math.PI / 2, 1.473, Math.PI / 2]} scale={[0.01, 0.014, 0.001]}>
            <group name="transform72" position={[-85.184, 44.015, 466.419]} rotation={[2.237, -1.115, 1.809]} scale={[897.566, 112.414, 95.652]} />
          </group>
          <group name="pCube123" position={[-0.433, 0.051, 0.014]} rotation={[-1.571, 1.473, 1.571]} scale={[0.01, 0.012, 0.001]}>
            <group name="transform76" position={[-85.184, 51.899, 664.735]} rotation={[2.313, -1.055, 1.841]} scale={[1332.356, 154.263, 95.652]} />
          </group>
          <group name="pCube24" position={[-0.085, -0.011, 0]} rotation={[-Math.PI / 2, -0.133, 0]} scale={[0.014, 0.018, 0.001]}>
            <group name="transform28" position={[5.863, -47.76, -0.252]} rotation={[1.964, 0.374, -0.566]} scale={[142.355, 921.716, 55.191]} />
          </group>
          <group name="pPipe5" position={[0.04, 0.031, -0.016]} rotation={[Math.PI, 0, 0]} scale={[0.001, 0.001, 0.015]}>
            <group name="transform11" position={[-35.424, 27.302, -1.037]} rotation={[-Math.PI, 0, 0]} scale={[888.594, 888.594, 66.852]} />
          </group>
          <group name="pCube133" position={[-0.421, -0.019, 0.014]} rotation={[Math.PI / 2, 0, -0.277]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform97" position={[26.289, 4.835, -11.63]} rotation={[-1.559, -0.288, -0.077]} scale={[63.287, 607.167, 48.944]} />
          </group>
          <group name="pCube66" position={[-0.309, -0.018, 0.014]} rotation={[Math.PI / 2, 0, -0.191]} scale={[0.016, 0.021, 0.002]}>
            <group name="transform122" position={[19.703, 2.147, -10.795]} rotation={[-1.565, -0.2, -0.056]} scale={[63.864, 607.167, 48.188]} />
          </group>
          <mesh name="pCube8" castShadow receiveShadow geometry={nodes.pCube8.geometry} material={materials.lambert1} position={[0, 0.011, -0.035]} rotation={[Math.PI / 2, 0, 0]} scale={[0.02, 0.027, 0.002]} />
          <group name="pCube104" position={[-0.443, 0.015, 0.014]} rotation={[-1.571, 1.565, 1.571]} scale={[0.013, 0.014, 0.001]}>
            <group name="transform60" position={[-69.509, 50.197, 642.915]} rotation={[-1.49, -1.517, -1.544]} scale={[1438.394, 71.549, 78.051]} />
          </group>
          <group name="pCylinder9" position={[0.132, -0.005, 0]} rotation={[Math.PI / 2, 0, 0]} scale={0}>
            <group name="transform36" position={[-670.572, 0, -27.703]} rotation={[-Math.PI / 2, 0, 0]} scale={5091.034} />
          </group>
          <group name="pCylinder3" position={[0.114, -0.031, 0.033]} rotation={[1.477, 0, 0]} scale={[0.002, 0.002, 0.016]}>
            <group name="transform18" position={[-56.994, -15.159, -2.085]} rotation={[-1.2, 0, 0]} scale={[499.793, 76.867, 497.626]} />
          </group>
        </group>
      </group>

      {/* HTML Projection on Blackboard */}
      {/* ⚠️ Adjust the position array [X, Y, Z] so this UI sits exactly over your specific blackboard mesh ⚠️ */}
      <Html
        transform
        occlude
        position={[0, 1.5, -3]} 
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
          
          <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} minPolarAngle={Math.PI / 2 - 0.5} makeDefault />
          
          <Environment preset="city" />
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
          
          <ClassroomScene isZoomed={isZoomed} onLoginTrigger={onAuthenticate} />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Path updated to classroom1.glb
useGLTF.preload(process.env.PUBLIC_URL + '/classroom1.glb');
