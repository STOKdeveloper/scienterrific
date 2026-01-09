import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars, Text, Float, Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';

const PLATE_WIDTH = 12;
const PLATE_DEPTH = 10;
const PLATE_HEIGHT = 1.5;
const SEGMENTS = 30;

const DeformablePlate = ({
    position,
    color,
    label,
    movement,
    rotation = [0, 0, 0],
    deformationType,
    deformationAmount
}: {
    position: [number, number, number],
    color: string,
    label: string,
    movement: [number, number, number],
    rotation?: [number, number, number],
    deformationType: 'none' | 'convergent' | 'divergent' | 'transform',
    deformationAmount: number
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const geomRef = useRef<THREE.BoxGeometry>(null);

    // Store original vertex positions to apply deformation from a base state
    const originalPositions = useMemo(() => {
        const geom = new THREE.BoxGeometry(PLATE_WIDTH, PLATE_HEIGHT, PLATE_DEPTH, SEGMENTS, 1, SEGMENTS);
        return geom.attributes.position.array.slice();
    }, []);

    useFrame(() => {
        if (!meshRef.current || !geomRef.current) return;

        const posAttr = geomRef.current.attributes.position;
        const arr = posAttr.array as Float32Array;

        for (let i = 0; i < arr.length; i += 3) {
            const x = originalPositions[i];
            const y = originalPositions[i + 1];
            const z = originalPositions[i + 2];

            let newY = y;

            // Apply deformation based on proximity to the plate boundary (x = PLATE_WIDTH / 2 or -PLATE_WIDTH / 2)
            // For Plate A (left), boundary is at x = PLATE_WIDTH / 2
            // For Plate B (right), boundary is at x = -PLATE_WIDTH / 2

            const isRightEdge = x > (PLATE_WIDTH / 2 - 2);
            const isLeftEdge = x < (-PLATE_WIDTH / 2 + 2);

            // Determine which edge is the "active" one based on plate position
            const isActiveEdge = position[0] < 0 ? isRightEdge : isLeftEdge;

            if (isActiveEdge && y > 0) { // Only deform the top surface
                const distanceToEdge = position[0] < 0 ? (PLATE_WIDTH / 2 - x) : (x + PLATE_WIDTH / 2);
                const influence = Math.max(0, 1 - distanceToEdge / 3);

                if (deformationType === 'convergent') {
                    // Buckling/Mountain building
                    newY += Math.sin(x * 2 + z * 2) * 0.2 * deformationAmount * influence;
                    newY += 0.8 * deformationAmount * influence;
                } else if (deformationType === 'divergent') {
                    // Thinning/Sloping
                    newY -= 0.5 * deformationAmount * influence;
                } else if (deformationType === 'transform') {
                    // Shear/Jitter
                    newY += Math.sin(z * 5 + Date.now() * 0.01) * 0.05 * deformationAmount * influence;
                }
            }

            arr[i + 1] = newY;
        }
        posAttr.needsUpdate = true;
    });

    return (
        <group position={[position[0] + movement[0], position[1] + movement[1], position[2] + movement[2]]} rotation={rotation}>
            <mesh ref={meshRef} castShadow receiveShadow>
                <boxGeometry ref={geomRef} args={[PLATE_WIDTH, PLATE_HEIGHT, PLATE_DEPTH, SEGMENTS, 1, SEGMENTS]} />
                <meshStandardMaterial
                    color={color}
                    roughness={0.7}
                    metalness={0.2}
                    flatShading={false}
                />
                <Text
                    position={[0, PLATE_HEIGHT / 2 + 0.8, 0]}
                    fontSize={0.6}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                >
                    {label}
                </Text>
            </mesh>
        </group>
    );
};

const Simulation = ({ mode }: { mode: 'divergent' | 'convergent' | 'transform' }) => {
    const [movementA, setMovementA] = useState<[number, number, number]>([0, 0, 0]);
    const [movementB, setMovementB] = useState<[number, number, number]>([0, 0, 0]);
    const [deformation, setDeformation] = useState(0);
    const [subduction, setSubduction] = useState(0);
    const magmaRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();

        if (mode === 'divergent') {
            const m = Math.sin(t * 0.5) * 2 + 1;
            setMovementA([-m, 0, 0]);
            setMovementB([m, 0, 0]);
            setDeformation(Math.max(0, m / 3));
            setSubduction(0);
            if (magmaRef.current) {
                magmaRef.current.scale.x = Math.max(0.1, m * 2);
                magmaRef.current.visible = true;
            }
        } else if (mode === 'convergent') {
            const m = Math.sin(t * 0.5) * 1.5 - 0.5;
            setMovementA([0, 0, 0]); // Keep A still for clearer subduction visual
            setMovementB([m, 0, 0]);
            const def = Math.max(0, -m / 1.5);
            setDeformation(def);
            setSubduction(def * 2.5);
            if (magmaRef.current) magmaRef.current.visible = false;
        } else {
            const m = Math.sin(t * 0.5) * 3;
            setMovementA([0, 0, -m / 2]);
            setMovementB([0, 0, m / 2]);
            setDeformation(1);
            setSubduction(0);
            if (magmaRef.current) magmaRef.current.visible = false;
        }
    });

    return (
        <group>
            {/* Plate A (Left) */}
            <DeformablePlate
                position={[-PLATE_WIDTH / 2 - 0.05, 0, 0]}
                color="#5D737E"
                label="PLATE A"
                movement={movementA}
                deformationType={mode}
                deformationAmount={deformation}
            />

            {/* Plate B (Right) */}
            <DeformablePlate
                position={[PLATE_WIDTH / 2 + 0.05, mode === 'convergent' ? -subduction / 2 : 0, 0]}
                color="#8C705F"
                label="PLATE B"
                movement={movementB}
                rotation={mode === 'convergent' ? [0, 0, subduction * 0.08] : [0, 0, 0]}
                deformationType={mode}
                deformationAmount={deformation}
            />

            {/* Magma */}
            <mesh ref={magmaRef} position={[0, -0.6, 0]}>
                <boxGeometry args={[1, 1.2, PLATE_DEPTH]} />
                <meshStandardMaterial
                    color="#ff4400"
                    emissive="#ff2200"
                    emissiveIntensity={3}
                />
            </mesh>

            {/* Mantle */}
            <mesh position={[0, -2.5, 0]} receiveShadow>
                <boxGeometry args={[50, 3, 30]} />
                <meshStandardMaterial color="#1a0505" emissive="#0a0000" />
            </mesh>

            {/* Volcanoes / Mountain peaks if convergent */}
            {mode === 'convergent' && deformation > 0.5 && (
                <group position={[-2, 1, 0]}>
                    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.2}>
                        <mesh>
                            <coneGeometry args={[1.2, 2.5, 4]} />
                            <meshStandardMaterial color="#333" roughness={0.9} />
                            <pointLight color="#ff3300" intensity={10} distance={8} position={[0, 1, 0]} />
                        </mesh>
                    </Float>
                </group>
            )}

            <ContactShadows
                position={[0, -1.01, 0]}
                opacity={0.4}
                scale={40}
                blur={2}
                far={10}
                resolution={256}
                color="#000000"
            />
            <Html fullscreen style={{ pointerEvents: 'none' }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={mode}
                        initial={{ opacity: 0, x: 50, filter: "blur(15px)" }}
                        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, x: -50, filter: "blur(15px)" }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-32 right-12 w-[400px] p-10 rounded-[2rem] bg-zinc-900/70 backdrop-blur-3xl border border-white/10 pointer-events-none shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="h-[2px] w-16 bg-orange-500 rounded-full" />
                            <span className="text-[10px] text-orange-500 uppercase tracking-[0.5em] font-black">LITHOSPHERIC STUDY</span>
                        </div>

                        <h3 className="text-white font-black uppercase tracking-tighter text-4xl mb-6 italic leading-none">
                            {mode === 'divergent' && "Divergent"}
                            {mode === 'convergent' && "Convergent"}
                            {mode === 'transform' && "Transform"}
                        </h3>

                        <p className="text-sm text-zinc-400 leading-relaxed font-semibold mb-10 opacity-80">
                            {mode === 'divergent' && "Tectonic plates move away from each other. As they separate, molten rock (magma) rises from the mantle to fill the gap, cooling and hardening to create new oceanic crust."}
                            {mode === 'convergent' && "Plates collide with immense force. When an oceanic plate meets a continental plate, it's forced downward into the mantle—a process called subduction—melting crust and fueling volcanoes."}
                            {mode === 'transform' && "Plates slide past one another along a transform fault. Crust is neither created nor destroyed, but the friction causes massive stress build-up, released as earthquakes."}
                        </p>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">Seismic Risk</p>
                                    <p className={`text-lg font-black tracking-tighter ${mode === 'transform' ? 'text-red-500' : 'text-orange-500'}`}>
                                        {mode === 'transform' ? 'EXTREME' : mode === 'convergent' ? 'SEVERE' : 'NOMINAL'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-bold">Boundary Type</p>
                                    <p className="text-lg font-black tracking-tighter text-orange-500 uppercase">
                                        {mode === 'divergent' ? 'CONSTRUCTIVE' : mode === 'convergent' ? 'DESTRUCTIVE' : 'CONSERVATIVE'}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Deformation Rate</span>
                                    <span className="text-[10px] text-orange-500 font-black">
                                        {Math.round(deformation * 100)}%
                                    </span>
                                </div>
                                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-orange-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, deformation * 100)}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </Html>
        </group>
    );
};

const PlateTectonics = () => {
    const [mode, setMode] = useState<'divergent' | 'convergent' | 'transform'>('divergent');

    return (
        <div className="w-full h-full bg-[#050505] relative cursor-crosshair overflow-hidden">
            <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={[22, 15, 25]} fov={35} />
                <OrbitControls
                    enablePan={true}
                    maxPolarAngle={Math.PI / 2.1}
                    minDistance={10}
                    maxDistance={50}
                />
                <Stars radius={100} depth={50} count={6000} factor={4} saturation={0} fade speed={1} />

                <ambientLight intensity={0.6} />
                <spotLight
                    position={[20, 30, 20]}
                    angle={0.3}
                    penumbra={1}
                    intensity={3.5}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                />
                <pointLight position={[-15, 15, -10]} intensity={1.5} color="#44aaff" />
                <pointLight position={[0, -2, 0]} intensity={2} color="#ff4400" />

                <Simulation mode={mode} />
            </Canvas>

            {/* Controls Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-12">
                <div className="flex gap-4 pointer-events-auto">
                    {(['divergent', 'convergent', 'transform'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`px-8 py-3 rounded-full border transition-all duration-500 uppercase tracking-[0.3em] text-[10px] font-black ${mode === m
                                ? 'bg-orange-500 border-orange-500 text-black shadow-[0_0_40px_rgba(249,115,22,0.6)] scale-105'
                                : 'bg-black/40 border-white/10 text-white/60 hover:border-orange-500/50 hover:text-orange-500 hover:bg-orange-500/5'
                                }`}
                        >
                            {m.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>



            {/* Aesthetic Lines & HUD elements */}
            <div className="absolute top-0 right-0 p-8 text-right opacity-20 pointer-events-none">
                <p className="text-[10px] font-mono text-orange-500 mb-1">DATA FLOW: STABLE</p>
                <p className="text-[10px] font-mono text-white">LATENCY: 12ms</p>
            </div>

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-b from-orange-500 to-transparent opacity-30" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-px h-32 bg-gradient-to-t from-orange-500 to-transparent opacity-30" />
        </div>
    );
};

export default PlateTectonics;
