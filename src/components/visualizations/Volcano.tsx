import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Float, Html, ContactShadows, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

const LavaStream = ({ active, rotationY = 0, speed = 1 }: { active: boolean; rotationY?: number; speed?: number }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.visible = active;
            if (active) {
                const material = meshRef.current.material as THREE.MeshStandardMaterial;
                material.emissiveIntensity = 3 + Math.sin(state.clock.elapsedTime * 5 * speed + rotationY) * 2;
                meshRef.current.scale.x = 1 + Math.sin(state.clock.elapsedTime * 10 + rotationY) * 0.05;
            }
        }
    });

    return (
        <group rotation={[0, rotationY, 0]}>
            <mesh ref={meshRef} position={[0, 3.8, 1]} rotation={[-Math.PI / 3, 0, 0]}>
                <cylinderGeometry args={[0.2, 0.5, 5, 8]} />
                <meshStandardMaterial
                    color="#ff3300"
                    emissive="#ff0000"
                    emissiveIntensity={4}
                    transparent
                    opacity={0.9}
                />
            </mesh>
        </group>
    );
};

const LavaParticles = ({ count = 200, active = false }: { count?: number; active?: boolean }) => {
    const points = useMemo(() => {
        const p = new Float32Array(count * 3);
        const v = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            p[i * 3] = (Math.random() - 0.5) * 0.5;
            p[i * 3 + 1] = 0;
            p[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

            v[i * 3] = (Math.random() - 0.5) * 0.1;
            v[i * 3 + 1] = Math.random() * 0.2 + 0.1;
            v[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
        }
        return { positions: p, velocities: v };
    }, [count]);

    const ref = useRef<THREE.Points>(null);

    useFrame((state, delta) => {
        if (!ref.current || !active) return;
        const positions = ref.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < count; i++) {
            positions[i * 3] += points.velocities[i * 3];
            positions[i * 3 + 1] += points.velocities[i * 3 + 1];
            positions[i * 3 + 2] += points.velocities[i * 3 + 2];

            points.velocities[i * 3 + 1] -= delta * 0.5; // Gravity

            if (positions[i * 3 + 1] < -2) {
                positions[i * 3] = (Math.random() - 0.5) * 0.5;
                positions[i * 3 + 1] = 0;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
                points.velocities[i * 3 + 1] = Math.random() * 0.4 + 0.2;
            }
        }
        ref.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={ref} position={[0, 0, 0]}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[points.positions, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.3}
                color="#ff2200"
                transparent
                opacity={0.8}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

const RuggedVolcano = () => {
    const geom = useMemo(() => {
        const g = new THREE.CylinderGeometry(1, 5, 4, 128, 64, false, 0, Math.PI * 1.5);
        const posAttr = g.attributes.position;
        const vertex = new THREE.Vector3();

        for (let i = 0; i < posAttr.count; i++) {
            vertex.fromBufferAttribute(posAttr, i);
            const isTop = vertex.y > 1.95;
            const isBottom = vertex.y < -1.95;

            if (!isTop && !isBottom) {
                const noise = (Math.sin(vertex.y * 3) * Math.cos(vertex.x * 1.5) * 0.4) +
                    (Math.sin(vertex.z * 5 + vertex.y * 2) * 0.2) +
                    (Math.random() * 0.08);
                const angle = Math.atan2(vertex.z, vertex.x);
                vertex.x += Math.cos(angle) * noise;
                vertex.z += Math.sin(angle) * noise;
            }
            posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        g.computeVertexNormals();
        return g;
    }, []);

    return (
        <mesh position={[0, 2, 0]} geometry={geom} castShadow receiveShadow>
            <meshStandardMaterial
                color="#7a5c44" // LIGHTER WARMER BROWN
                roughness={0.5} // REDUCED ROUGHNESS TO CATCH LIGHT
                side={THREE.DoubleSide}
                flatShading={true}
            />
        </mesh>
    );
};

const Simulation = ({ onPressureChange }: { onPressureChange: (p: number, e: boolean) => void }) => {
    const [pressure, setPressure] = useState(0);
    const [isErupting, setIsErupting] = useState(false);
    const magmaRef = useRef<THREE.Mesh>(null);
    const capRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (magmaRef.current) {
            const targetScale = 0.5 + (pressure / 100) * 1.5;
            magmaRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
            const pulse = Math.sin(state.clock.elapsedTime * 6) * (pressure / 150) * 0.15;
            magmaRef.current.scale.addScalar(pulse);
        }

        if (isErupting) {
            const nextPressure = Math.max(0, pressure - delta * 30);
            setPressure(nextPressure);
            onPressureChange(nextPressure, true);

            if (capRef.current) {
                capRef.current.position.y += delta * 15;
                capRef.current.position.x += delta * 5;
                capRef.current.rotation.z += delta * 8;
                capRef.current.scale.multiplyScalar(Math.max(0, 1 - delta * 0.8));
                if (capRef.current.scale.x < 0.05) capRef.current.visible = false;
            }

            if (nextPressure < 5) {
                setIsErupting(false);
                onPressureChange(nextPressure, false);
                if (capRef.current) {
                    capRef.current.visible = true;
                    capRef.current.position.set(0, 4.05, 0);
                    capRef.current.rotation.set(0, 0, 0);
                    capRef.current.scale.set(1, 1, 1);
                }
            }
        } else {
            const nextPressure = Math.min(99, pressure + delta * 5);
            setPressure(nextPressure);
            onPressureChange(nextPressure, false);
        }
    });

    const eruptionActive = isErupting;

    useEffect(() => {
        const handleTrigger = () => {
            if (pressure >= 95 && !isErupting) {
                setIsErupting(true);
            }
        };
        window.addEventListener('trigger-eruption', handleTrigger);
        return () => window.removeEventListener('trigger-eruption', handleTrigger);
    }, [pressure, isErupting]);

    return (
        <group>
            {/* Realistic Brown Rugged Volcano */}
            <RuggedVolcano />

            {/* Volcano Cap */}
            <mesh ref={capRef} position={[0, 4.05, 0]} castShadow>
                <cylinderGeometry args={[1.05, 1.05, 0.2, 32, 1, false, 0, Math.PI * 1.5]} />
                <meshStandardMaterial color="#5c3a1e" roughness={0.5} side={THREE.DoubleSide} flatShading={true} />
            </mesh>

            {/* Inner Conduit Wall */}
            <mesh position={[0, 2.1, 0]}>
                <cylinderGeometry args={[0.4, 0.4, 4.2, 32]} />
                <meshStandardMaterial color="#1a0f00" emissive="#ff4400" emissiveIntensity={pressure / 100} />
            </mesh>

            {/* Magma Chamber */}
            <mesh ref={magmaRef} position={[0, -0.5, 0]}>
                <sphereGeometry args={[1.5, 32, 32]} />
                <meshStandardMaterial
                    color="#ff2200"
                    emissive="#ff0000"
                    emissiveIntensity={Math.max(3, (pressure / 100) * 30)}
                />
                <pointLight intensity={Math.max(150, pressure * 15)} color="#ff4400" distance={25} />
            </mesh>

            {/* Lava Overflow & Extras if erupting */}
            {eruptionActive && (
                <group position={[0, 4, 0]}>
                    <mesh rotation={[Math.PI, 0, 0]}>
                        <cylinderGeometry args={[1.2, 0.8, 0.2, 32]} />
                        <meshStandardMaterial color="#ff4400" emissive="#ff1100" emissiveIntensity={20} />
                    </mesh>
                    <LavaParticles count={500} active={true} />
                    <pointLight intensity={2500} color="#ff3300" distance={40} position={[0, 1, 0]} />
                </group>
            )}

            {/* Multiple Lava streams running down the sides */}
            <LavaStream active={eruptionActive} rotationY={0.5} speed={1.2} />
            <LavaStream active={eruptionActive} rotationY={1.2} speed={0.8} />
            <LavaStream active={eruptionActive} rotationY={Math.PI / 1.5} speed={1.5} />
            <LavaStream active={eruptionActive} rotationY={-0.3} speed={1} />
            <LavaStream active={eruptionActive} rotationY={Math.PI / 4} speed={0.9} />
            <LavaStream active={eruptionActive} rotationY={-Math.PI / 1.2} speed={1.3} />

            {/* Earth-toned Boulders */}
            <mesh position={[4, 0.2, -3]} rotation={[0.4, 0.2, 0.5]}>
                <dodecahedronGeometry args={[0.6]} />
                <meshStandardMaterial color="#5c3a1e" roughness={0.5} flatShading={true} />
            </mesh>
            <mesh position={[-3.5, 0.3, 4]} rotation={[0.1, 0.8, -0.2]}>
                <dodecahedronGeometry args={[0.8]} />
                <meshStandardMaterial color="#7a5c44" roughness={0.5} flatShading={true} />
            </mesh>

            {/* Earth Crust Cross-section */}
            <mesh position={[0, -1, 0]} receiveShadow>
                <boxGeometry args={[40, 2, 40]} />
                <meshStandardMaterial color="#1a0f0a" />
            </mesh>

            {/* Earth Surface */}
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial color="#0a0805" />
            </mesh>

            <ContactShadows
                position={[0, 0.01, 0]}
                opacity={0.6}
                scale={40}
                blur={2}
                far={10}
                color="#000000"
            />

            <Sparkles count={120} scale={20} size={4} speed={1.2} color="#ff9900" opacity={pressure / 80} />
        </group>
    );
};

const Volcano = () => {
    const [uiState, setUiState] = useState({ pressure: 0, isErupting: false });

    return (
        <div className="w-full h-full min-h-[500px] flex flex-col bg-[#030305] relative cursor-crosshair overflow-hidden text-sans">
            <div className="flex-1 relative w-full h-full min-h-0">
                <Canvas
                    shadows
                    dpr={[1, 2]}
                    camera={{ position: [15, 12, 18], fov: 40 }}
                    gl={{ antialias: true, alpha: false }}
                >
                    <OrbitControls
                        enablePan={false}
                        maxPolarAngle={Math.PI / 2.1}
                        minDistance={10}
                        maxDistance={50}
                    />

                    <Stars radius={500} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                    {/* Boosted Nighttime Lighting */}
                    <ambientLight intensity={0.6} color="#b4c5ff" />

                    <spotLight
                        position={[30, 40, 50]}
                        angle={0.5}
                        penumbra={0.2}
                        intensity={2500}
                        color="#ffffff"
                        castShadow
                        shadow-mapSize={[2048, 2048]}
                    />

                    <directionalLight
                        position={[10, 10, 20]}
                        intensity={1.5}
                        color="#fff"
                    />

                    <Simulation onPressureChange={(pressure, isErupting) => setUiState({ pressure, isErupting })} />
                </Canvas>
            </div>

            {/* HUD Overlay - Responsive adjustments */}
            <div className="absolute inset-x-0 bottom-8 lg:bottom-12 flex justify-center pointer-events-none z-20">
                <div className="flex flex-col items-center gap-6 pointer-events-auto">
                    <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl min-w-[320px]">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-black">Magma Pressure</span>
                            <span className={`text-sm font-black tracking-tighter ${uiState.pressure > 80 ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
                                {Math.round(uiState.pressure)}%
                            </span>
                        </div>

                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-8">
                            <motion.div
                                className={`h-full ${uiState.pressure > 80 ? 'bg-red-500' : 'bg-orange-500'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${uiState.pressure}%` }}
                                transition={{ type: "spring", stiffness: 50 }}
                            />
                        </div>

                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('trigger-eruption'))}
                            disabled={uiState.pressure < 95 || uiState.isErupting}
                            className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 border ${uiState.pressure >= 95 && !uiState.isErupting
                                ? 'bg-red-500 border-red-500 text-white shadow-[0_0_40px_rgba(239,68,68,0.4)] hover:scale-105 active:scale-95'
                                : 'bg-zinc-900 border-white/5 text-white/20 cursor-not-allowed'
                                }`}
                        >
                            {uiState.isErupting ? 'Erupting...' : uiState.pressure >= 95 ? 'Trigger Eruption' : 'Building Pressure'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="absolute top-24 left-8 pointer-events-none">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-[10px] text-red-500/60 uppercase tracking-[0.4em] font-black">Volcanic Activity Detected</span>
                </div>
                <h3 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">Mount Scienter</h3>
            </div>
        </div>
    );
};

export default Volcano;
