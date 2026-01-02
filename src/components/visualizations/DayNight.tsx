import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, OrbitControls, PerspectiveCamera, Text, Line, Html } from '@react-three/drei';
import * as THREE from 'three';

const Earth = () => {
    const earthRef = useRef<THREE.Mesh>(null);
    const groupRef = useRef<THREE.Group>(null);

    // 23.5 degrees tilt in radians
    const tilt = (23.5 * Math.PI) / 180;

    useFrame(({ clock }) => {
        if (earthRef.current) {
            earthRef.current.rotation.y = clock.getElapsedTime() * 0.5;
        }
    });

    return (
        <group ref={groupRef} rotation={[0, 0, tilt]}>
            {/* Earth Axis */}
            <Line
                points={[[0, -4, 0], [0, 4, 0]]}
                color="white"
                lineWidth={1}
                transparent
                opacity={0.5}
            />

            {/* Earth Sphere */}
            <mesh ref={earthRef}>
                <sphereGeometry args={[2, 64, 64]} />
                <meshStandardMaterial
                    color="#2271B3"
                    roughness={0.8}
                    metalness={0.2}
                />

                {/* Simple visual Representation of continents (rough) */}
                <mesh position={[0, 0, 1.9]} rotation={[0, 0.4, 0]}>
                    <sphereGeometry args={[0.2, 16, 16]} />
                    <meshBasicMaterial color="green" />
                </mesh>
            </mesh>

            <Text
                position={[0, 4.5, 0]}
                fontSize={0.3}
                color="white"
                anchorX="center"
                anchorY="middle"
            >
                North Pole (23.5° Tilt)
            </Text>
        </group>
    );
};

const DayNight = () => {
    const [showExplanation, setShowExplanation] = useState(true);

    return (
        <div className="w-full h-full bg-black relative">
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[10, 5, 15]} fov={45} />
                <OrbitControls enablePan={false} />

                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />

                <ambientLight intensity={0.1} />
                {/* Sun light coming from one side */}
                <directionalLight
                    position={[-15, 0, 0]}
                    intensity={3}
                    color="#ffffff"
                    castShadow
                />

                <Earth />

                {/* Visual Line for Equator */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[2.01, 2.03, 64]} />
                    <meshBasicMaterial color="yellow" transparent opacity={0.3} side={THREE.DoubleSide} />
                </mesh>

                <Html position={[-8, 4, 0]}>
                    <div className="text-white bg-black/50 p-4 border border-white/20 rounded-lg backdrop-blur-md w-64 pointer-events-none select-none">
                        <h2 className="text-xl font-bold mb-2">Day & Night Tilt</h2>
                        <p className="text-sm opacity-80">
                            The Earth tilted at 23.5° means as it orbits the Sun, different hemispheres receive more or less direct sunlight.
                        </p>
                        <p className="text-sm mt-2 opacity-80">
                            This tilt is what causes seasons and the variation in day length throughout the year.
                        </p>
                    </div>
                </Html>
            </Canvas>

            <div className="absolute bottom-8 left-8 right-8 text-center text-white/60 text-xs">
                Drag to rotate • Scroll to zoom
            </div>
        </div>
    );
};

export default DayNight;
