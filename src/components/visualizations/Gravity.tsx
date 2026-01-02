import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, OrbitControls, PerspectiveCamera, Html, Line } from '@react-three/drei';
import * as THREE from 'three';

interface Particle {
    id: number;
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    mass: number;
    color: string;
}

const SpacetimeFabric = ({ depth, radius }: { depth: number, radius: number }) => {
    const circles = 20;
    const radialLines = 36;

    const calculateY = (r: number) => {
        // 1/r potential well shape
        return -depth * (5 / (r + 1.5));
    };

    // Create concentric circles
    const circleLines = useMemo(() => {
        const lines = [];
        for (let i = 1; i <= circles; i++) {
            const r = (i / circles) * radius;
            const pts = [];
            const segments = 128;
            for (let j = 0; j <= segments; j++) {
                const theta = (j / segments) * Math.PI * 2;
                pts.push(new THREE.Vector3(Math.cos(theta) * r, calculateY(r), Math.sin(theta) * r));
            }
            lines.push(pts);
        }
        return lines;
    }, [depth, radius]);

    // Create radial lines
    const radialPaths = useMemo(() => {
        const paths = [];
        for (let i = 0; i < radialLines; i++) {
            const theta = (i / radialLines) * Math.PI * 2;
            const pts = [];
            const segments = 50;
            for (let j = 0; j <= segments; j++) {
                const r = (j / segments) * radius;
                pts.push(new THREE.Vector3(Math.cos(theta) * r, calculateY(r), Math.sin(theta) * r));
            }
            paths.push(pts);
        }
        return paths;
    }, [depth, radius]);

    return (
        <group>
            {circleLines.map((pts, i) => (
                <Line key={`c-${i}`} points={pts} color="#3b82f6" lineWidth={1} transparent opacity={0.3} />
            ))}
            {radialPaths.map((pts, i) => (
                <Line key={`r-${i}`} points={pts} color="#3b82f6" lineWidth={1} transparent opacity={0.3} />
            ))}

            {/* Glow at the singularity */}
            <mesh position={[0, calculateY(0), 0]}>
                <sphereGeometry args={[0.5, 32, 32]} />
                <meshBasicMaterial color="#60a5fa" />
                <pointLight intensity={100} color="#3b82f6" />
            </mesh>
        </group>
    );
};

const Mass = ({ particle, depth, onEnterCenter, onLeaveSimulation }: { particle: Particle, depth: number, onEnterCenter: (id: number) => void, onLeaveSimulation: (id: number) => void }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        if (!meshRef.current) return;

        // Use a smaller fixed time step for physics stability if delta is too large
        const dt = Math.min(delta, 0.05);

        const pos = particle.position;
        const r = Math.sqrt(pos.x * pos.x + pos.z * pos.z);

        // Capture at singularity
        if (r < 0.6) {
            onEnterCenter(particle.id);
            return;
        }

        // Boundary check
        if (r > 60) {
            onLeaveSimulation(particle.id);
            return;
        }

        // Gravity Force: F = GM / r^2
        const GM = depth * 80; // Balanced scaling
        const forceMagnitude = GM / (r * r + 2);
        const directionToCenter = new THREE.Vector3(-pos.x, 0, -pos.z).normalize();

        const acceleration = directionToCenter.multiplyScalar(forceMagnitude);

        // Update velocity
        particle.velocity.add(acceleration.multiplyScalar(dt));

        // Mass-dependent drag: Larger masses have more momentum and lose speed slower.
        // Electron (0.3) will decay faster than Star (1.4)
        const frictionBase = 0.996;
        const massEffect = 1 / particle.mass;
        particle.velocity.multiplyScalar(Math.pow(frictionBase, massEffect));

        // Update position (balanced for controlled descent)
        particle.position.add(particle.velocity.clone().multiplyScalar(dt * 4.2));

        // Sink capture check (increased radius to ensure it's caught)
        const newR = Math.sqrt(particle.position.x ** 2 + particle.position.z ** 2);
        if (newR < 1.2) {
            onEnterCenter(particle.id);
            return;
        }
        particle.position.y = -depth * (5 / (newR + 1.5));

        meshRef.current.position.copy(particle.position);
    });

    return (
        <mesh ref={meshRef} position={particle.position}>
            <sphereGeometry args={[particle.mass * 0.3, 16, 16]} />
            <meshStandardMaterial color={particle.color} emissive={particle.color} emissiveIntensity={1} />
        </mesh>
    );
};

const Gravity = () => {
    const [depth, setDepth] = useState(10);
    const [velocityFactor, setVelocityFactor] = useState(0.89);
    const [particles, setParticles] = useState<Particle[]>([]);
    const nextId = useRef(0);
    const fabricRadius = 30;

    // Seed initial orbits
    useEffect(() => {
        const initialSeeds = [
            { mass: 0.3, r: 10, angle: 0, color: '#bfdbfe' },       // Electron
            { mass: 0.7, r: 18, angle: Math.PI, color: '#93c5fd' }, // Planetoid
            { mass: 1.4, r: 25, angle: Math.PI / 2, color: '#60a5fa' } // Star
        ];

        const seedParticles = initialSeeds.map(seed => {
            const x = Math.cos(seed.angle) * seed.r;
            const z = Math.sin(seed.angle) * seed.r;

            const GM = depth * 80;
            const orbitSpeed = Math.sqrt(GM / seed.r) * 1.0;

            const vx = -Math.sin(seed.angle) * orbitSpeed;
            const vz = Math.cos(seed.angle) * orbitSpeed;

            return {
                id: nextId.current++,
                position: new THREE.Vector3(x, -depth * (5 / (seed.r + 1.5)), z),
                velocity: new THREE.Vector3(vx, 0, vz),
                mass: seed.mass,
                color: seed.color
            };
        });

        setParticles(seedParticles);
    }, []); // Run once on mount

    const fireMass = (mass: number) => {
        // Start at top edge (outer rim)
        const angle = 0;
        const rStart = fabricRadius - 2;
        const x = Math.cos(angle) * rStart;
        const z = Math.sin(angle) * rStart;

        // Calculate circular orbit speed for this radius: v = sqrt(GM / r)
        // We scale GM same as in the physics loop
        const GM = depth * 80;
        const orbitSpeed = Math.sqrt(GM / rStart) * velocityFactor;

        // Initial velocity: Tangential + controlled inward component
        const inwardSpeed = orbitSpeed * 0.35;
        const vx = -Math.sin(angle) * orbitSpeed - Math.cos(angle) * inwardSpeed;
        const vz = Math.cos(angle) * orbitSpeed - Math.sin(angle) * inwardSpeed;

        const newParticle: Particle = {
            id: nextId.current++,
            position: new THREE.Vector3(x, -depth * (5 / (rStart + 1.5)), z),
            velocity: new THREE.Vector3(vx, 0, vz),
            mass: mass,
            color: mass > 1 ? '#60a5fa' : mass > 0.5 ? '#93c5fd' : '#bfdbfe'
        };

        setParticles(prev => [...prev, newParticle]);
    };

    const removeParticle = (id: number) => {
        setParticles(prev => prev.filter(p => p.id !== id));
    };

    return (
        <div className="w-full h-full bg-[#030712] relative overflow-hidden">
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[0, 40, 50]} fov={50} />
                <OrbitControls enablePan={false} makeDefault minDistance={10} maxDistance={150} />

                <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade />

                <ambientLight intensity={0.2} />
                <pointLight position={[0, 50, 0]} intensity={1000} color="#3b82f6" />

                <SpacetimeFabric depth={depth} radius={fabricRadius} />

                {particles.map(p => (
                    <Mass
                        key={p.id}
                        particle={p}
                        depth={depth}
                        onEnterCenter={removeParticle}
                        onLeaveSimulation={removeParticle}
                    />
                ))}

                {/* The Singularity Point at the very bottom */}
                <mesh position={[0, -depth * 4.5, 0]}>
                    <sphereGeometry args={[0.3, 16, 16]} />
                    <meshBasicMaterial color="white" />
                </mesh>
            </Canvas>

            {/* Control UI */}
            <div className="absolute top-24 left-8 z-20 space-y-6">
                <div className="bg-zinc-950/80 p-6 rounded-3xl border border-blue-500/20 backdrop-blur-2xl shadow-[0_0_50px_rgba(59,130,246,0.1)]">
                    <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Gravity Intensity (GM)</h3>
                    <input
                        type="range"
                        min="5"
                        max="30"
                        step="0.5"
                        value={depth}
                        onChange={(e) => setDepth(parseFloat(e.target.value))}
                        className="w-48 accent-blue-500 bg-blue-900/20 h-1 rounded-full appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between mt-3 text-[9px] text-blue-500/40 font-black tracking-widest">
                        <span>WEAK</span>
                        <span>CRITICAL</span>
                    </div>
                </div>

                <div className="bg-zinc-950/80 p-6 rounded-3xl border border-blue-500/20 backdrop-blur-2xl shadow-[0_0_50px_rgba(59,130,246,0.1)]">
                    <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Initial Velocity</h3>
                    <input
                        type="range"
                        min="0.1"
                        max="2.0"
                        step="0.01"
                        value={velocityFactor}
                        onChange={(e) => setVelocityFactor(parseFloat(e.target.value))}
                        className="w-48 accent-blue-500 bg-blue-900/20 h-1 rounded-full appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between mt-3 text-[9px] text-blue-500/40 font-black tracking-widest">
                        <span>STAGNANT</span>
                        <span>ESCAPE</span>
                    </div>
                </div>
            </div>

            {/* Launcher UI */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex gap-4 p-3 bg-zinc-950/80 border border-blue-500/20 rounded-3xl backdrop-blur-2xl">
                <button
                    onClick={() => fireMass(0.3)}
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500/30 transition-all group"
                >
                    <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.8)]" />
                    <span className="text-[10px] font-black text-blue-300 tracking-[0.2em]">ELECTRON</span>
                </button>
                <button
                    onClick={() => fireMass(0.7)}
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500/30 transition-all group"
                >
                    <div className="w-3 h-3 rounded-full bg-blue-300 shadow-[0_0_20px_rgba(147,197,253,0.8)]" />
                    <span className="text-[10px] font-black text-blue-200 tracking-[0.2em]">PLANETOID</span>
                </button>
                <button
                    onClick={() => fireMass(1.4)}
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500/30 transition-all group"
                >
                    <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_25px_rgba(255,255,255,0.8)]" />
                    <span className="text-[10px] font-black text-white tracking-[0.2em]">STAR</span>
                </button>
            </div>

            <div className="absolute top-24 right-8 text-right pointer-events-none">
                <div className="space-y-1">
                    <p className="text-[10px] text-blue-500/60 font-black tracking-[0.3em] uppercase">Event Horizon</p>
                    <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase whitespace-pre-line text-right">Singularity{"\n"}Potential</h2>
                    <div className="h-[2px] w-32 bg-gradient-to-l from-blue-500 to-transparent ml-auto mt-2" />
                </div>
            </div>
        </div>
    );
};

export default Gravity;
