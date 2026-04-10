import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { Play, Pause, Shuffle, StepBack, StepForward, Eye, Box, Globe, Square } from 'lucide-react';

const SPHERE_RADIUS = 15;

const createRandomGrid = (N: number, sparsity: number = 0.8) => {
    const totalCells = 6 * N * N;
    const grid = new Uint8Array(totalCells);
    for (let i = 0; i < grid.length; i++) {
        grid[i] = Math.random() > sparsity ? 1 : 0;
    }
    return grid;
};

// Generates the neighbor reference lookup for O(1) step simulation
function initNeighbors(N: number) {
    const totalCells = 6 * N * N;
    const neighbors = new Int32Array(totalCells * 8).fill(-1);
    
    const coords = new Int32Array(totalCells * 3);
    const spatialHash = new Map<number, number>();
    
    const K = N;
    const pad = N + 3;
    const R = 2 * pad;
    function getHash(x: number, y: number, z: number) {
        return (x + pad) + ((y + pad) * R) + ((z + pad) * R * R);
    }
    
    let idx = 0;
    for(let f=0; f<6; f++) {
        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                const u = 2 * j + 1 - N;
                const v = N - 1 - 2 * i;
                let x=0, y=0, z=0;
                switch(f) {
                    case 0: [x,y,z] = [u, v, K]; break;
                    case 1: [x,y,z] = [K, v, -u]; break;
                    case 2: [x,y,z] = [-u, v, -K]; break;
                    case 3: [x,y,z] = [-K, v, u]; break;
                    case 4: [x,y,z] = [u, K, -v]; break;
                    case 5: [x,y,z] = [u, -K, v]; break;
                }
                coords[idx*3] = x;
                coords[idx*3+1] = y;
                coords[idx*3+2] = z;
                spatialHash.set(getHash(x, y, z), idx);
                idx++;
            }
        }
    }
    
    const offsets: [number, number, number][] = [];
    for(let dx=-2; dx<=2; dx++) {
        for(let dy=-2; dy<=2; dy++) {
            for(let dz=-2; dz<=2; dz++) {
                const distSq = dx*dx + dy*dy + dz*dz;
                // Adjacent cells on folded net have distance squared <= 8
                if (distSq > 0 && distSq <= 8) {
                    offsets.push([dx, dy, dz]);
                }
            }
        }
    }
    
    for(let i=0; i<totalCells; i++) {
        const cx = coords[i*3];
        const cy = coords[i*3+1];
        const cz = coords[i*3+2];
        let n_count = 0;
        for(const [dx, dy, dz] of offsets) {
            const h = getHash(cx+dx, cy+dy, cz+dz);
            if (spatialHash.has(h)) {
                neighbors[i*8 + n_count] = spatialHash.get(h)!;
                n_count++;
                if (n_count === 8) break;
            }
        }
    }
    
    return neighbors;
}

const computeLayouts = (N: number, TOTAL_CELLS: number) => {
    const sphere = { pos: new Float32Array(TOTAL_CELLS*3), quat: new Float32Array(TOTAL_CELLS*4) };
    const cube = { pos: new Float32Array(TOTAL_CELLS*3), quat: new Float32Array(TOTAL_CELLS*4) };
    const flat = { pos: new Float32Array(TOTAL_CELLS*3), quat: new Float32Array(TOTAL_CELLS*4) };

    const dummy = new THREE.Object3D();
    const upZ = new THREE.Vector3(0, 0, 1);
    
    let idx = 0;
    for(let f=0; f<6; f++) {
        for(let i=0; i<N; i++) {
            for(let j=0; j<N; j++) {
                const u = 2 * j + 1 - N;
                const v = N - 1 - 2 * i;
                const K = N;
                let cx=0, cy=0, cz=0;
                switch(f) {
                    case 0: [cx,cy,cz] = [u, v, K]; break;
                    case 1: [cx,cy,cz] = [K, v, -u]; break;
                    case 2: [cx,cy,cz] = [-u, v, -K]; break;
                    case 3: [cx,cy,cz] = [-K, v, u]; break;
                    case 4: [cx,cy,cz] = [u, K, -v]; break;
                    case 5: [cx,cy,cz] = [u, -K, v]; break;
                }
                
                // CUBE
                const scale = (SPHERE_RADIUS * 0.8) / K;
                dummy.position.set(cx * scale, cy * scale, cz * scale);
                // Orient flat against the cube face using the face normal
                const normals: [number,number,number][] = [
                    [0, 0, 1], [1, 0, 0], [0, 0, -1], [-1, 0, 0], [0, 1, 0], [0, -1, 0]
                ];
                const [nx, ny, nz] = normals[f];
                dummy.lookAt(cx * scale + nx, cy * scale + ny, cz * scale + nz);
                cube.pos[idx*3+0] = dummy.position.x;
                cube.pos[idx*3+1] = dummy.position.y;
                cube.pos[idx*3+2] = dummy.position.z;
                cube.quat[idx*4+0] = dummy.quaternion.x;
                cube.quat[idx*4+1] = dummy.quaternion.y;
                cube.quat[idx*4+2] = dummy.quaternion.z;
                cube.quat[idx*4+3] = dummy.quaternion.w;

                // SPHERE (Normalized Cube mapped smoothly)
                dummy.position.set(cx * scale, cy * scale, cz * scale);
                dummy.position.normalize().multiplyScalar(SPHERE_RADIUS);
                dummy.lookAt(0, 0, 0);
                sphere.pos[idx*3+0] = dummy.position.x;
                sphere.pos[idx*3+1] = dummy.position.y;
                sphere.pos[idx*3+2] = dummy.position.z;
                sphere.quat[idx*4+0] = dummy.quaternion.x;
                sphere.quat[idx*4+1] = dummy.quaternion.y;
                sphere.quat[idx*4+2] = dummy.quaternion.z;
                sphere.quat[idx*4+3] = dummy.quaternion.w;

                // FLAT (2D Cross Net Fold-out)
                const spacing = (SPHERE_RADIUS * 2) / (4 * N) * 1.8;
                let fx=0, fy=0;
                const offset = (N - 1) / 2;
                const bx = j - offset;
                const by = offset - i;
                switch(f) {
                    case 0: fx = bx;             fy = by; break;             // Center (Front)
                    case 1: fx = bx + N;         fy = by; break;             // Right
                    case 2: fx = bx + 2*N;       fy = by; break;             // Back
                    case 3: fx = bx - N;         fy = by; break;             // Left
                    case 4: fx = bx;             fy = by + N; break;         // Top
                    case 5: fx = bx;             fy = by - N; break;         // Bottom
                }
                dummy.position.set(fx * spacing, fy * spacing, 0);
                dummy.quaternion.setFromUnitVectors(upZ, new THREE.Vector3(0,0,1));
                flat.pos[idx*3+0] = dummy.position.x;
                flat.pos[idx*3+1] = dummy.position.y;
                flat.pos[idx*3+2] = dummy.position.z;
                flat.quat[idx*4+0] = dummy.quaternion.x;
                flat.quat[idx*4+1] = dummy.quaternion.y;
                flat.quat[idx*4+2] = dummy.quaternion.z;
                flat.quat[idx*4+3] = dummy.quaternion.w;

                idx++;
            }
        }
    }
    return { sphere, cube, flat };
};

const LifeVisualizer = ({ isPlaying, stepBackTrigger, stepForwardTrigger, randomizeTrigger, tickSpeed, sizeMultiplier, sparsity, shape, showEmptyCells }: { isPlaying: boolean, stepBackTrigger: number, stepForwardTrigger: number, randomizeTrigger: number, tickSpeed: number, sizeMultiplier: number, sparsity: number, shape: 'sphere' | 'cube' | 'flat', showEmptyCells: boolean }) => {
    const N = Math.floor(35 * sizeMultiplier);
    const TOTAL_CELLS = 6 * N * N;

    const neighborsMap = useMemo(() => initNeighbors(N), [N]);
    const layouts = useMemo(() => computeLayouts(N, TOTAL_CELLS), [N]);

    const meshRef = useRef<THREE.InstancedMesh>(null);
    const [gameState, setGameState] = useState({
        history: [createRandomGrid(N, sparsity)],
        cursor: 0
    });
    const grid = gameState.history[gameState.cursor];
    
    const lastTickRef = useRef(0);
    const TICK_RATE = 0.1 / tickSpeed;

    const dummy = useMemo(() => new THREE.Object3D(), []);
    const colorDummy = useMemo(() => new THREE.Color(), []);

    const computeNextGen = (current: Uint8Array) => {
        const next = new Uint8Array(TOTAL_CELLS);
        for (let i = 0; i < TOTAL_CELLS; i++) {
            let n_count = 0;
            for(let k = 0; k < 8; k++) {
                const n_idx = neighborsMap[i * 8 + k];
                if (n_idx !== -1 && current[n_idx] > 0) {
                    n_count++;
                }
            }
            
            const isAlive = current[i] > 0;
            if (isAlive && (n_count < 2 || n_count > 3)) {
                next[i] = 0;
            } else if (!isAlive && n_count === 3) {
                next[i] = 1;
            } else if (isAlive) {
                next[i] = Math.min(current[i] + 1, 255);
            }
        }
        return next;
    };

    useEffect(() => {
        if (randomizeTrigger > 0) {
            setGameState({
                history: [createRandomGrid(N, sparsity)],
                cursor: 0
            });
        }
    }, [randomizeTrigger, N, sparsity]);

    useEffect(() => {
        if (stepBackTrigger > 0) {
            setGameState((prev) => ({
                ...prev,
                cursor: Math.max(0, prev.cursor - 1)
            }));
        }
    }, [stepBackTrigger]);

    useEffect(() => {
        if (stepForwardTrigger > 0) {
            setGameState((prev) => {
                if (prev.cursor < prev.history.length - 1) {
                    return { ...prev, cursor: prev.cursor + 1 };
                } else {
                    const currentGrid = prev.history[prev.cursor];
                    const next = computeNextGen(currentGrid);
                    const newHistory = [...prev.history, next];
                    if (newHistory.length > 100) newHistory.shift();
                    return { history: newHistory, cursor: newHistory.length - 1 };
                }
            });
        }
    }, [stepForwardTrigger]);

    useFrame(({ clock }) => {
        if (meshRef.current && isPlaying) {
            meshRef.current.rotation.y += 0.002;
            meshRef.current.rotation.x += 0.0005;
        }

        if (isPlaying && clock.elapsedTime - lastTickRef.current > TICK_RATE) {
            setGameState((prev) => {
                const currentGrid = prev.history[prev.cursor];
                const next = computeNextGen(currentGrid);
                const newHistory = prev.history.slice(0, prev.cursor + 1);
                newHistory.push(next);
                if (newHistory.length > 100) newHistory.shift();
                return { history: newHistory, cursor: newHistory.length - 1 };
            });
            lastTickRef.current = clock.elapsedTime;
        }

        if (meshRef.current) {
            const baseColor = new THREE.Color("#f97316");
            const neonColor = new THREE.Color("#fff2cc");
            const tempVector = new THREE.Vector3();
            
            const layoutPos = layouts[shape].pos;
            const layoutQuat = layouts[shape].quat;

            for (let i = 0; i < TOTAL_CELLS; i++) {
                dummy.position.set(layoutPos[i*3], layoutPos[i*3+1], layoutPos[i*3+2]);
                dummy.quaternion.set(layoutQuat[i*4], layoutQuat[i*4+1], layoutQuat[i*4+2], layoutQuat[i*4+3]);
                
                tempVector.copy(dummy.position).applyEuler(meshRef.current.rotation);
                const depthIntensity = Math.max(0.05, THREE.MathUtils.mapLinear(tempVector.z, SPHERE_RADIUS * 0.9, -SPHERE_RADIUS * 0.5, 1.0, 0.05));

                const cellVal = grid[i];
                const isAlive = cellVal > 0;
                
                let isBackside = false;
                if (shape === 'sphere' || shape === 'cube') {
                    isBackside = tempVector.z < -SPHERE_RADIUS * 0.1;
                }

                const scale = isAlive ? 1 : (showEmptyCells && !isBackside ? 0.9 : 0);
                dummy.scale.setScalar(scale);

                dummy.updateMatrix();
                meshRef.current.setMatrixAt(i, dummy.matrix);

                if (isAlive) {
                    const wave = Math.sin((dummy.position.x + dummy.position.z) * 0.5 + clock.elapsedTime);
                    const intensity = (0.8 + 0.2 * wave) * depthIntensity;
                    const c = cellVal === 1 ? neonColor : baseColor;
                    colorDummy.copy(c).multiplyScalar(intensity);
                    meshRef.current.setColorAt(i, colorDummy);
                } else if (showEmptyCells) {
                    colorDummy.setHex(0x1a1a1a).multiplyScalar(depthIntensity);
                    meshRef.current.setColorAt(i, colorDummy);
                }
            }
            meshRef.current.instanceMatrix.needsUpdate = true;
            if (meshRef.current.instanceColor) {
               meshRef.current.instanceColor.needsUpdate = true;
            }
        }
    });

    const w = (SPHERE_RADIUS * 2) / N * 0.6;
    const boxDepth = shape === 'flat' ? w * 0.2 : w;

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, TOTAL_CELLS]}>
            <boxGeometry args={[w, w, boxDepth]} /> 
            <meshStandardMaterial 
                metalness={0.5} 
                roughness={0.2}
            />
        </instancedMesh>
    );
};

const GameOfLife = () => {
    const [isPlaying, setIsPlaying] = useState(true);
    const [stepBackTrigger, setStepBackTrigger] = useState(0);
    const [stepForwardTrigger, setStepForwardTrigger] = useState(0);
    const [randomizeTrigger, setRandomizeTrigger] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [size, setSize] = useState(2.0);
    const [sparsity, setSparsity] = useState(0.8);
    const [shape, setShape] = useState<'sphere' | 'cube' | 'flat'>('sphere');
    const [showEmptyCells, setShowEmptyCells] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                setIsPlaying(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="w-full h-full bg-black relative">
            <Canvas shadows className="w-full h-full">
                <PerspectiveCamera makeDefault position={[0, 0, 45]} fov={50} />
                <OrbitControls enablePan={true} enableZoom={true} autoRotate={false} />
                <Stars radius={300} depth={60} count={10000} factor={6} saturation={0} fade speed={1} />
                
                <ambientLight intensity={1.5} />
                <pointLight position={[20, 20, 30]} intensity={250} color="#ffffff" />
                <pointLight position={[-20, -20, 30]} intensity={150} color="#ff8800" />

                <LifeVisualizer 
                    key={size}
                    isPlaying={isPlaying} 
                    stepBackTrigger={stepBackTrigger} 
                    stepForwardTrigger={stepForwardTrigger}
                    randomizeTrigger={randomizeTrigger} 
                    tickSpeed={speed}
                    sizeMultiplier={size}
                    sparsity={sparsity}
                    shape={shape}
                    showEmptyCells={showEmptyCells}
                />
            </Canvas>

            {/* HUD / Controls Panel Overlay */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4">
                <div className="bg-zinc-900/80 backdrop-blur-md p-4 rounded-xl border border-orange-500/20 shadow-2xl flex flex-col gap-3 w-48">
                    <h3 className="text-orange-500 font-black tracking-widest text-xs uppercase mb-2">Controls</h3>
                    
                    <div className="flex gap-2 w-full">
                        <button 
                            onClick={() => {
                                setRandomizeTrigger(t => t + 1);
                                setIsPlaying(true);
                            }}
                            className="flex-[3] flex items-center justify-between px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
                        >
                            <span className="text-sm font-semibold">Randomize</span>
                            <Shuffle size={16} />
                        </button>
                        
                        <button 
                            onClick={() => setShowEmptyCells(!showEmptyCells)}
                            className={`flex-[1.5] flex items-center justify-center px-2 py-2 ${showEmptyCells ? 'bg-orange-600' : 'bg-zinc-800 hover:bg-zinc-700'} text-white rounded transition-colors`}
                            title="Toggle Empty Cells"
                        >
                            <Eye size={16} />
                        </button>
                    </div>

                    <div className="flex gap-2 w-full">
                        <button 
                            onClick={() => {
                                setIsPlaying(false);
                                setStepBackTrigger(t => t + 1);
                            }}
                            className="flex-1 flex items-center justify-center py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
                        >
                            <StepBack size={16} />
                        </button>

                        <button 
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={`flex-[2] flex items-center justify-center px-4 py-2 ${isPlaying ? 'bg-orange-600' : 'bg-zinc-800 hover:bg-zinc-700'} text-white rounded transition-colors`}
                        >
                            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                        </button>

                        <button 
                            onClick={() => {
                                setIsPlaying(false);
                                setStepForwardTrigger(t => t + 1);
                            }}
                            className="flex-1 flex items-center justify-center py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
                        >
                            <StepForward size={16} />
                        </button>
                    </div>

                    <div className="mt-2 pt-4 border-t border-zinc-800">
                        <label className="text-[10px] text-orange-500 font-bold uppercase tracking-wider mb-2 block flex justify-between">
                            <span>Grid Density</span>
                            <span>{size}X ({(6*Math.floor(35*size)*Math.floor(35*size)).toLocaleString()} cells)</span>
                        </label>
                        <input
                            type="range"
                            min="0.5"
                            max="4.0"
                            step="0.5"
                            value={size}
                            onChange={(e) => setSize(parseFloat(e.target.value))}
                            className="w-full accent-orange-500 mb-4 cursor-pointer"
                        />

                        <label className="text-[10px] text-orange-500 font-bold uppercase tracking-wider mb-2 block flex justify-between">
                            <span>Seed Sparsity</span>
                            <span>{Math.round(sparsity * 100)}%</span>
                        </label>
                        <input
                            type="range"
                            min="0.1"
                            max="0.9"
                            step="0.05"
                            value={sparsity}
                            onChange={(e) => setSparsity(parseFloat(e.target.value))}
                            className="w-full accent-orange-500 mb-4 cursor-pointer"
                        />

                        <label className="text-[10px] text-orange-500 font-bold uppercase tracking-wider mb-2 block flex justify-between">
                            <span>Simulation Speed</span>
                            <span>{speed}X</span>
                        </label>
                        <input
                            type="range"
                            min="0.25"
                            max="1.0"
                            step="0.25"
                            value={speed}
                            onChange={(e) => setSpeed(parseFloat(e.target.value))}
                            className="w-full accent-orange-500 mb-4 cursor-pointer"
                        />
                    </div>

                    <div className="mt-2 pt-4 border-t border-zinc-800">
                        <h3 className="text-[10px] text-orange-500 font-bold uppercase tracking-wider mb-2">Geometry Projection</h3>
                        <div className="flex gap-2 w-full mb-4">
                            <button 
                                onClick={() => setShape('flat')}
                                className={`flex-1 flex items-center justify-center py-2 ${shape === 'flat' ? 'bg-orange-600' : 'bg-zinc-800 hover:bg-zinc-700'} text-white rounded transition-colors`}
                                title="Flat"
                            >
                                <Square size={16} />
                            </button>
                            <button 
                                onClick={() => setShape('cube')}
                                className={`flex-1 flex items-center justify-center py-2 ${shape === 'cube' ? 'bg-orange-600' : 'bg-zinc-800 hover:bg-zinc-700'} text-white rounded transition-colors`}
                                title="Cube"
                            >
                                <Box size={16} />
                            </button>
                            <button 
                                onClick={() => setShape('sphere')}
                                className={`flex-1 flex items-center justify-center py-2 ${shape === 'sphere' ? 'bg-orange-600' : 'bg-zinc-800 hover:bg-zinc-700'} text-white rounded transition-colors`}
                                title="Sphere"
                            >
                                <Globe size={16} />
                            </button>
                        </div>

                        <div className="text-[10px] text-zinc-400 leading-tight">
                            Use mouse to rotate & zoom. Topologies map seamlessly across edges. 
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameOfLife;
