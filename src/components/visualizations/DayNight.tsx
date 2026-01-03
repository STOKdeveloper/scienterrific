import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, OrbitControls, PerspectiveCamera, Text, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '../ui/button';

type Season = 'SUMMER' | 'WINTER' | 'SPRING' | 'AUTUMN';

const seasons: Record<Season, { rotation: [number, number, number]; label: string; desc: string }> = {
    SUMMER: {
        rotation: [0, 0, (23.5 * Math.PI) / 180],
        label: 'Summer (NH)',
        desc: 'Northern Hemisphere tilts towards the Sun. Longer days, more direct sunlight.'
    },
    WINTER: {
        rotation: [0, 0, (-23.5 * Math.PI) / 180],
        label: 'Winter (NH)',
        desc: 'Northern Hemisphere tilts away from the Sun. Cooler temperatures, shorter days.'
    },
    SPRING: {
        rotation: [(23.5 * Math.PI) / 180, 0, 0],
        label: 'Spring (NH)',
        desc: 'Equinox: The Sun is directly above the equator. Equal day and night.'
    },
    AUTUMN: {
        rotation: [(-23.5 * Math.PI) / 180, 0, 0],
        label: 'Autumn (NH)',
        desc: 'Equinox: Transition from summer to winter. Cooling temperatures.'
    },
};

const LocationMarker = ({ lat, lon, name }: { lat: number; lon: number; name: string }) => {
    const r = 2.01;
    // Map lat/lon to Three.js coordinates
    // y is up, z is forward (0 lon), x is side
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;

    const y = r * Math.sin(latRad);
    const x = r * Math.cos(latRad) * Math.sin(lonRad);
    const z = r * Math.cos(latRad) * Math.cos(lonRad);

    return (
        <group position={[x, y, z]}>
            <mesh>
                <sphereGeometry args={[0.03, 16, 16]} />
                <meshBasicMaterial color="#FF3E3E" />
            </mesh>
            <Html
                distanceFactor={8}
                position={[0, 0.1, 0]}
                occlude
                center
            >
                <div className="bg-black/90 text-[10px] text-white px-2 py-0.5 rounded-full border border-red-500/50 whitespace-nowrap shadow-lg shadow-red-500/20 backdrop-blur-sm pointer-events-none font-medium">
                    {name}
                </div>
            </Html>
        </group>
    );
};

const Earth = ({ season }: { season: Season }) => {
    const groupRef = useRef<THREE.Group>(null);
    const targetRotation = useRef<THREE.Euler>(new THREE.Euler(...seasons[season].rotation));

    useEffect(() => {
        targetRotation.current.set(...seasons[season].rotation);
    }, [season]);

    useFrame(() => {
        if (groupRef.current) {
            // Smoothly interpolate the tilt
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotation.current.x, 0.05);
            groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, targetRotation.current.z, 0.05);
        }
    });

    return (
        <group ref={groupRef}>
            {/* Earth Axis */}
            <Line
                points={[[0, -4, 0], [0, 4, 0]]}
                color="white"
                lineWidth={1}
                transparent
                opacity={0.5}
            />

            {/* Earth Sphere */}
            <mesh>
                <sphereGeometry args={[2, 64, 64]} />
                <meshStandardMaterial
                    color="#1a4d8a"
                    roughness={0.7}
                    metalness={0.3}
                />

                {/* Specific Locations */}
                <LocationMarker name="Cambridge, UK" lat={52.2} lon={0.12} />
                <LocationMarker name="Sydney, Australia" lat={-33.8} lon={151.2} />
                <LocationMarker name="Mauritius" lat={-20.3} lon={57.5} />
            </mesh>

            <Text
                position={[0, 4.5, 0]}
                fontSize={0.25}
                color="white"
                anchorX="center"
                anchorY="middle"
            >
                North Pole (23.5° Axial Tilt)
            </Text>
        </group>
    );
};

const MovingSun = () => {
    const lightRef = useRef<THREE.DirectionalLight>(null);

    useFrame(({ clock }) => {
        if (lightRef.current) {
            const angle = clock.getElapsedTime() * 0.3;
            const radius = 20;
            lightRef.current.position.x = radius * Math.cos(angle);
            lightRef.current.position.z = radius * Math.sin(angle);
        }
    });

    return (
        <directionalLight
            ref={lightRef}
            intensity={3.5}
            color="#fff5e6"
            castShadow
        />
    );
};

const OrbitalContext = ({ season }: { season: Season }) => {
    // Determine orbital position based on season
    const positions: Record<Season, [number, number, number]> = {
        SUMMER: [-6, 0, 0],   // Left side (tilted towards sun)
        WINTER: [6, 0, 0],    // Right side (tilted away)
        SPRING: [0, 0, 6],    // Front
        AUTUMN: [0, 0, -6],   // Back
    };

    return (
        <div className="absolute bottom-6 right-6 w-[312px] h-[312px] bg-black/60 border border-white/20 rounded-2xl backdrop-blur-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-500">
            <div className="absolute top-4 left-5 flex flex-col gap-0.5 z-10">
                <div className="text-xs text-blue-400 font-bold uppercase tracking-widest leading-none">Context</div>
                <div className="text-[10px] text-white/40 uppercase tracking-tighter">Sun-Earth Orbit</div>
            </div>
            <Canvas camera={{ position: [0, 10, 10], fov: 45 }}>
                <ambientLight intensity={0.4} />
                <pointLight position={[0, 0, 0]} intensity={15} color="#FDB813" />

                {/* Sun */}
                <mesh position={[0, 0, 0]}>
                    <sphereGeometry args={[1.2, 32, 32]} />
                    <meshBasicMaterial color="#FDB813" />
                </mesh>

                {/* Sun Glow */}
                <mesh position={[0, 0, 0]}>
                    <sphereGeometry args={[1.5, 32, 32]} />
                    <meshBasicMaterial color="#FDB813" transparent opacity={0.2} />
                </mesh>

                {/* Orbit path */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[5.95, 6.05, 128]} />
                    <meshBasicMaterial color="white" transparent opacity={0.15} side={THREE.DoubleSide} />
                </mesh>

                {/* Earth at position */}
                <group position={positions[season]}>
                    {/* Fixed global axial tilt */}
                    <group rotation={[0, 0, (23.5 * Math.PI) / 180]}>
                        <mesh>
                            <sphereGeometry args={[0.5, 32, 32]} />
                            <meshStandardMaterial color="#2271B3" roughness={0.6} />
                        </mesh>
                        {/* Axis line */}
                        <Line
                            points={[[0, -1, 0], [0, 1, 0]]}
                            color="white"
                            lineWidth={1}
                            transparent
                            opacity={0.6}
                        />
                    </group>
                </group>

                <Stars radius={50} count={200} factor={1} />
            </Canvas>
        </div>
    );
};

const DayNight = () => {
    const [season, setSeason] = useState<Season>('SUMMER');

    return (
        <div className="w-full h-full bg-[#050505] relative overflow-hidden">
            <Canvas shadows gl={{ antialias: true }}>
                <PerspectiveCamera makeDefault position={[12, 6, 12]} fov={40} />
                <OrbitControls enablePan={false} minDistance={5} maxDistance={30} />

                <Stars radius={100} depth={50} count={6000} factor={4} saturation={0} fade />

                <ambientLight intensity={0.2} />

                <MovingSun />

                <Earth season={season} />

                {/* Equator Ring */}
                <group rotation={[0, 0, 0]}>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[2.01, 2.05, 64]} />
                        <meshBasicMaterial color="yellow" transparent opacity={0.3} side={THREE.DoubleSide} />
                    </mesh>
                </group>

                <Html position={[-10, 5, 0]}>
                    <div className="text-white bg-black/60 p-5 border border-white/10 rounded-xl backdrop-blur-xl w-72 pointer-events-none animate-in fade-in slide-in-from-left duration-700">
                        <h2 className="text-2xl font-bold mb-2 text-blue-400">Day & Night</h2>
                        <div className="h-1 w-20 bg-blue-500/50 mb-4 rounded-full" />
                        <p className="text-sm font-medium text-white/90">
                            {seasons[season].label}
                        </p>
                        <p className="text-xs mt-2 opacity-70 leading-relaxed">
                            {seasons[season].desc}
                        </p>
                    </div>
                </Html>
            </Canvas>

            {/* Season Selector Overlay */}
            <div className="absolute top-8 right-8 flex flex-col gap-3 z-10">
                {(Object.keys(seasons) as Season[]).map((s) => (
                    <Button
                        key={s}
                        variant={season === s ? "default" : "outline"}
                        onClick={() => setSeason(s)}
                        className={`
                            justify-start min-w-[140px] transition-all duration-300 backdrop-blur-md
                            ${season === s
                                ? "bg-blue-600 hover:bg-blue-500 border-transparent shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                : "bg-black/40 border-white/10 hover:bg-white/10 text-white/70"}
                        `}
                    >
                        <div className={`w-2 h-2 rounded-full mr-3 ${season === s ? "bg-white" : "bg-white/30"}`} />
                        {seasons[s].label}
                    </Button>
                ))}
            </div>

            {/* Orbital Context Window */}
            <OrbitalContext season={season} />

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-6 py-3 bg-black/40 backdrop-blur-md rounded-full border border-white/5 text-xs text-white/50 tracking-widest uppercase">
                <span>Drag to Rotate</span>
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <span>Scroll to Zoom</span>
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <span>Select Season</span>
            </div>
        </div>
    );
};

export default DayNight;
