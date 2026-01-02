import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, OrbitControls, PerspectiveCamera, Float, Text } from '@react-three/drei';
import * as THREE from 'three';

const Planet = ({ distance, size, speed, color, name }: { distance: number, size: number, speed: number, color: string, name: string }) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime() * speed;
        if (meshRef.current) {
            meshRef.current.position.x = Math.cos(t) * distance;
            meshRef.current.position.z = Math.sin(t) * distance;
            meshRef.current.rotation.y += 0.01;
        }
    });

    return (
        <group>
            {/* Orbit Line */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[distance - 0.05, distance + 0.05, 128]} />
                <meshBasicMaterial color="white" transparent opacity={0.1} side={THREE.DoubleSide} />
            </mesh>

            <mesh ref={meshRef}>
                <sphereGeometry args={[size, 32, 32]} />
                <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
                <Text
                    position={[0, size + 0.5, 0]}
                    fontSize={0.4}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                >
                    {name}
                </Text>
            </mesh>GROUP
        </group>
    );
};

const SolarSystem = () => {
    return (
        <div className="w-full h-full bg-black">
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[0, 40, 80]} fov={50} />
                <OrbitControls enablePan={true} enableZoom={true} />

                <Stars radius={300} depth={60} count={20000} factor={7} saturation={0} fade speed={1} />

                <ambientLight intensity={0.2} />
                <pointLight position={[0, 0, 0]} intensity={2000} color="#ffcc33" castShadow />

                {/* Sun */}
                <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                    <mesh>
                        <sphereGeometry args={[5, 64, 64]} />
                        <meshStandardMaterial
                            emissive="#ffbb00"
                            emissiveIntensity={2}
                            color="#ffcc33"
                        />
                    </mesh>
                </Float>

                {/* Planets: distance, size, speed, color, name */}
                <Planet distance={10} size={0.6} speed={0.8} color="#A5A5A5" name="Mercury" />
                <Planet distance={15} size={0.9} speed={0.5} color="#E3BB76" name="Venus" />
                <Planet distance={22} size={1} speed={0.4} color="#2271B3" name="Earth" />
                <Planet distance={28} size={0.7} speed={0.3} color="#E27B58" name="Mars" />
                <Planet distance={45} size={2.5} speed={0.15} color="#D39C7E" name="Jupiter" />
                <Planet distance={60} size={2.1} speed={0.1} color="#C5AB6E" name="Saturn" />
                <Planet distance={75} size={1.5} speed={0.07} color="#BBE1E4" name="Uranus" />
                <Planet distance={85} size={1.4} speed={0.05} color="#6081FF" name="Neptune" />

            </Canvas>
        </div>
    );
};

import { Canvas } from '@react-three/fiber';

export default SolarSystem;
