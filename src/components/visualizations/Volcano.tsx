import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Float, Html, ContactShadows, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

const LavaParticles = ({ count = 50, active = false }: { count?: number; active?: boolean }) => {
    const points = useMemo(() => {
        const p = new Float32Array(count * 3);
        const s = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            p[i * 3] = (Math.random() - 0.5) * 1;
            p[i * 3 + 1] = 0;
            p[i * 3 + 2] = (Math.random() - 0.5) * 1;
            s[i] = Math.random() * 0.5 + 0.1;
        }
        return { positions: p, sizes: s };
    }, [count]);

    const ref = useRef<THREE.Points>(null);

    useFrame((state) => {
        if (!ref.current || !active) return;
        const positions = ref.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < count; i++) {
            // Move up
            positions[i * 3 + 1] += 0.1 + Math.random() * 0.1;
            // Spread out
            positions[i * 3] += (Math.random() - 0.5) * 0.1 * positions[i * 3 + 1];
            positions[i * 3 + 2] += (Math.random() - 0.5) * 0.1 * positions[i * 3 + 1];

            // Reset if too high
            if (positions[i * 3 + 1] > 10) {
                positions[i * 3 + 1] = 0;
                positions[i * 3] = (Math.random() - 0.5) * 0.5;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
            }
        }
        ref.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={ref} position={[0, 4, 0]}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[points.positions, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.2}
                color="#ff4400"
                transparent
                opacity={0.8}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

const Simulation = ({ pressure }: { pressure: number }) => {
    const magmaRef = useRef<THREE.Mesh>(null);
    const eruptionActive = pressure >= 100;

    useFrame((state) => {
        if (magmaRef.current) {
            // Scale magma chamber based on pressure
            const targetScale = 0.5 + (pressure / 100) * 1.5;
            magmaRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

            // Pulsing effect
            const pulse = Math.sin(state.clock.elapsedTime * 5) * (pressure / 200) * 0.1;
            magmaRef.current.scale.addScalar(pulse);
        }
    });

    return (
        <group>
            {/* Main Volcano Cone - Inner (Magma Conduit) */}
            <mesh position={[0, 2, 0]}>
                <cylinderGeometry args={[0.5, 3, 4, 32, 1, true]} />
                <meshStandardMaterial color="#222" roughness={1} side={THREE.DoubleSide} />
            </mesh>

            {/* Main Volcano Cone - Outer */}
            <mesh position={[0, 2, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[1, 5, 4, 32]} />
                <meshStandardMaterial color="#333" roughness={0.9} />
            </mesh>

            {/* Magma Chamber */}
            <mesh ref={magmaRef} position={[0, -1.5, 0]}>
                <sphereGeometry args={[2, 32, 32]} />
                <meshStandardMaterial
                    color="#ff2200"
                    emissive="#ff0000"
                    emissiveIntensity={Math.max(1, (pressure / 100) * 10)}
                />
                <pointLight intensity={Math.max(1, (pressure / 10) * 2)} color="#ff4400" distance={10} />
            </mesh>

            {/* Lava Overflow if erupting */}
            {eruptionActive && (
                <group position={[0, 4, 0]}>
                    <mesh rotation={[Math.PI, 0, 0]}>
                        <cylinderGeometry args={[1.2, 0.8, 0.2, 32]} />
                        <meshStandardMaterial color="#ff4400" emissive="#ff0000" emissiveIntensity={5} />
                    </mesh>
                    <LavaParticles count={100} active={true} />
                    <pointLight intensity={50} color="#ff3300" distance={15} position={[0, 2, 0]} />
                </group>
            )}

            {/* Earth Surface */}
            <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[50, 50]} />
                <meshStandardMaterial color="#1a1a1a" />
            </mesh>

            <ContactShadows
                position={[0, 0.01, 0]}
                opacity={0.6}
                scale={20}
                blur={2}
                far={5}
                color="#000000"
            />

            <Sparkles count={50} scale={10} size={2} speed={0.5} color="#ff9900" opacity={pressure / 200} />
        </group>
    );
};

const Volcano = () => {
    const [pressure, setPressure] = useState(0);
    const [isErupting, setIsErupting] = useState(false);

    useFrame((state, delta) => {
        if (isErupting) {
            setPressure(prev => Math.max(0, prev - delta * 40));
            if (pressure < 5) setIsErupting(false);
        } else {
            setPressure(prev => Math.min(100, prev + delta * 5));
        }
    });

    const handleErupt = () => {
        if (pressure >= 95) {
            setIsErupting(true);
        }
    };

    return (
        <div className="w-full h-full bg-[#050505] relative cursor-crosshair overflow-hidden">
            <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={[12, 10, 15]} fov={40} />
                <OrbitControls
                    enablePan={false}
                    maxPolarAngle={Math.PI / 2.1}
                    minDistance={10}
                    maxDistance={30}
                />
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

                <ambientLight intensity={0.2} />
                <spotLight
                    position={[10, 20, 10]}
                    angle={0.15}
                    penumbra={1}
                    intensity={2}
                    castShadow
                />

                <Simulation pressure={pressure} />
            </Canvas>

            {/* HUD Overlay */}
            <div className="absolute inset-x-0 bottom-12 flex justify-center pointer-events-none">
                <div className="flex flex-col items-center gap-6 pointer-events-auto">
                    <div className="bg-zinc-950/80 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl min-w-[320px]">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-[10px] text-white/40 uppercase tracking-[0.3em] font-black">Magma Pressure</span>
                            <span className={`text-sm font-black tracking-tighter ${pressure > 80 ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
                                {Math.round(pressure)}%
                            </span>
                        </div>

                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-8">
                            <motion.div
                                className={`h-full ${pressure > 80 ? 'bg-red-500' : 'bg-orange-500'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${pressure}%` }}
                                transition={{ type: "spring", stiffness: 50 }}
                            />
                        </div>

                        <button
                            onClick={handleErupt}
                            disabled={pressure < 95 || isErupting}
                            className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 border ${pressure >= 95 && !isErupting
                                ? 'bg-red-500 border-red-500 text-white shadow-[0_0_40px_rgba(239,68,68,0.4)] hover:scale-105 active:scale-95'
                                : 'bg-zinc-900 border-white/5 text-white/20 cursor-not-allowed'
                                }`}
                        >
                            {isErupting ? 'Erupting...' : pressure >= 95 ? 'Trigger Eruption' : 'Building Pressure'}
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
