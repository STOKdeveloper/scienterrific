import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, RotateCcw, Plus, MousePointer2, Activity, ChevronUp, ChevronDown } from 'lucide-react';

interface Body {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    mass: number;
    visualRadius: number;
    color: string;
    trail: { x: number; y: number }[];
}

const COLORS = ['#f97316', '#3b82f6', '#ef4444', '#a855f7', '#22c55e', '#ffffff'];

const ThreeBodyProblem = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [bodies, setBodies] = useState<Body[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [mode, setMode] = useState<'position' | 'velocity' | 'idle'>('idle');
    const [tempBody, setTempBody] = useState<{ x: number, y: number, r: number } | null>(null);
    const [tempVelocity, setTempVelocity] = useState<{ x: number, y: number } | null>(null);
    const [simulationSpeed, setSimulationSpeed] = useState(1.0);
    const [showControls, setShowControls] = useState(true);
    const hideTimeoutRef = useRef<number | null>(null);

    // Physics Constants - tuned for stable-ish screen simulation
    // We use a small G and large masses to prevent immediate fly-offs
    const G = 0.1;
    const maxTrail = 2000;
    const baseTimeStep = 0.2;
    const timeStep = baseTimeStep * simulationSpeed;

    // Auto-hide controls after inactivity
    useEffect(() => {
        const resetHideTimer = () => {
            setShowControls(true);

            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }

            hideTimeoutRef.current = window.setTimeout(() => {
                setShowControls(false);
            }, 3000); // Hide after 3 seconds of inactivity
        };

        const handleActivity = () => {
            resetHideTimer();
        };

        // Add event listeners for activity
        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('click', handleActivity);

        // Initial timer
        resetHideTimer();

        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('click', handleActivity);
        };
    }, []);

    const reset = () => {
        setBodies([]);
        setIsRunning(false);
        setMode('idle');
        setTempBody(null);
        setTempVelocity(null);
    };

    const increaseSpeed = () => {
        setSimulationSpeed(prev => {
            if (prev >= 50.0) return 50.0;
            if (prev < 5.0) return Math.min(prev + 0.25, 50.0);
            if (prev < 20.0) return Math.min(prev + 1.0, 50.0);
            return Math.min(prev + 5.0, 50.0);
        });
    };

    const decreaseSpeed = () => {
        setSimulationSpeed(prev => {
            if (prev <= 0.1) return 0.1;
            if (prev <= 5.0) return Math.max(prev - 0.25, 0.1);
            if (prev <= 20.0) return Math.max(prev - 1.0, 0.1);
            return Math.max(prev - 5.0, 0.1);
        });
    };

    const createOrbitalPair = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const orbitRadius = 200; // Distance between the two bodies

        // Central mass (large)
        const centralRadius = 60;
        const centralMass = calculateLogMass(centralRadius);

        // Orbiting mass (smaller)
        const orbitingRadius = 25;
        const orbitingMass = calculateLogMass(orbitingRadius);

        // Calculate orbital velocity using vis-viva equation
        // For circular orbit: v = sqrt(G * M / r)
        const orbitalSpeed = Math.sqrt((G * centralMass) / orbitRadius);

        const centralBody: Body = {
            id: Date.now(),
            x: centerX,
            y: centerY,
            vx: 0,
            vy: 0,
            mass: centralMass,
            visualRadius: centralRadius,
            color: '#f97316', // Orange
            trail: []
        };

        const orbitingBody: Body = {
            id: Date.now() + 1,
            x: centerX + orbitRadius,
            y: centerY,
            vx: 0,
            vy: orbitalSpeed,
            mass: orbitingMass,
            visualRadius: orbitingRadius,
            color: '#3b82f6', // Blue
            trail: []
        };

        setBodies([centralBody, orbitingBody]);
        setMode('idle');
        setTempBody(null);
        setTempVelocity(null);
    };

    const createBinarySystem = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const separation = 250; // Distance between the two bodies

        // Create two similar-sized masses
        const radius1 = 40;
        const radius2 = 35;
        const mass1 = calculateLogMass(radius1);
        const mass2 = calculateLogMass(radius2);

        // Calculate distances from barycenter (center of mass)
        const totalMass = mass1 + mass2;
        const r1 = (mass2 / totalMass) * separation; // Distance of body 1 from barycenter
        const r2 = (mass1 / totalMass) * separation; // Distance of body 2 from barycenter

        // For circular orbits around barycenter:
        // v = sqrt(G * M_other * separation / (separation^2))
        // Simplified: v = omega * r, where omega = sqrt(G * M_total / separation^3)
        const omega = Math.sqrt((G * totalMass) / Math.pow(separation, 3));
        const v1 = omega * r1;
        const v2 = omega * r2;

        // Position bodies on opposite sides of the center
        const body1: Body = {
            id: Date.now(),
            x: centerX - r1,
            y: centerY,
            vx: 0,
            vy: -v1, // Move upward
            mass: mass1,
            visualRadius: radius1,
            color: '#ef4444', // Red
            trail: []
        };

        const body2: Body = {
            id: Date.now() + 1,
            x: centerX + r2,
            y: centerY,
            vx: 0,
            vy: v2, // Move downward (opposite direction)
            mass: mass2,
            visualRadius: radius2,
            color: '#a855f7', // Purple
            trail: []
        };

        setBodies([body1, body2]);
        setMode('idle');
        setTempBody(null);
        setTempVelocity(null);
    };

    const createFigure8 = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Figure-8 orbit discovered by Moore (1993)
        // Three equal masses with specific initial conditions
        const radius = 30;
        const mass = calculateLogMass(radius);

        // Scaled parameters for the figure-8 orbit
        const x_offset = 97;
        const v_offset = 0.35;

        const body1: Body = {
            id: Date.now(),
            x: centerX - x_offset,
            y: centerY,
            vx: 0.093,
            vy: 0.125 + v_offset,
            mass: mass,
            visualRadius: radius,
            color: '#f97316', // Orange
            trail: []
        };

        const body2: Body = {
            id: Date.now() + 1,
            x: centerX + x_offset,
            y: centerY,
            vx: 0.093,
            vy: 0.125 + v_offset,
            mass: mass,
            visualRadius: radius,
            color: '#3b82f6', // Blue
            trail: []
        };

        const body3: Body = {
            id: Date.now() + 2,
            x: centerX,
            y: centerY,
            vx: -0.186,
            vy: -0.25 - 2 * v_offset,
            mass: mass,
            visualRadius: radius,
            color: '#22c55e', // Green
            trail: []
        };

        setBodies([body1, body2, body3]);
        setMode('idle');
        setTempBody(null);
        setTempVelocity(null);
    };

    const createLagrangeTriangle = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Lagrange equilateral triangle configuration
        const sideLength = 220;
        const height = (Math.sqrt(3) / 2) * sideLength;

        const radius1 = 45;
        const radius2 = 45;
        const radius3 = 25;

        const mass1 = calculateLogMass(radius1);
        const mass2 = calculateLogMass(radius2);
        const mass3 = calculateLogMass(radius3);

        const totalMass = mass1 + mass2 + mass3;
        const omega = Math.sqrt((G * totalMass) / Math.pow(sideLength, 3)) * 0.8;

        // Triangle vertices
        const body1: Body = {
            id: Date.now(),
            x: centerX - sideLength / 2,
            y: centerY + height / 3,
            vx: omega * (height / 3),
            vy: omega * (sideLength / 2),
            mass: mass1,
            visualRadius: radius1,
            color: '#f97316', // Orange
            trail: []
        };

        const body2: Body = {
            id: Date.now() + 1,
            x: centerX + sideLength / 2,
            y: centerY + height / 3,
            vx: omega * (height / 3),
            vy: -omega * (sideLength / 2),
            mass: mass2,
            visualRadius: radius2,
            color: '#3b82f6', // Blue
            trail: []
        };

        const body3: Body = {
            id: Date.now() + 2,
            x: centerX,
            y: centerY - 2 * height / 3,
            vx: -omega * (2 * height / 3),
            vy: 0,
            mass: mass3,
            visualRadius: radius3,
            color: '#22c55e', // Green
            trail: []
        };

        setBodies([body1, body2, body3]);
        setMode('idle');
        setTempBody(null);
        setTempVelocity(null);
    };

    const createThreeBodyChaos = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Three bodies with random positions and velocities
        const createRandomBody = (id: number, colorIndex: number) => {
            const angle = (id * 120) * Math.PI / 180;
            const distance = 100 + Math.random() * 50;
            const radius = 25 + Math.random() * 20;

            return {
                id: Date.now() + id,
                x: centerX + Math.cos(angle) * distance,
                y: centerY + Math.sin(angle) * distance,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                mass: calculateLogMass(radius),
                visualRadius: radius,
                color: COLORS[colorIndex],
                trail: []
            };
        };

        setBodies([
            createRandomBody(0, 0),
            createRandomBody(1, 1),
            createRandomBody(2, 2)
        ]);
        setMode('idle');
        setTempBody(null);
        setTempVelocity(null);
    };

    const createSlingshot = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Large stationary mass
        const largeMass = calculateLogMass(55);

        // Small fast-moving probe
        const smallRadius = 15;
        const smallMass = calculateLogMass(smallRadius);

        const body1: Body = {
            id: Date.now(),
            x: centerX,
            y: centerY,
            vx: 0,
            vy: 0,
            mass: largeMass,
            visualRadius: 55,
            color: '#f97316', // Orange
            trail: []
        };

        // Probe approaching for slingshot
        const body2: Body = {
            id: Date.now() + 1,
            x: centerX - 300,
            y: centerY - 100,
            vx: 1.5,
            vy: 0.3,
            mass: smallMass,
            visualRadius: smallRadius,
            color: '#22c55e', // Green
            trail: []
        };

        setBodies([body1, body2]);
        setMode('idle');
        setTempBody(null);
        setTempVelocity(null);
    };

    const createCollisionCourse = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const radius = 35;
        const mass = calculateLogMass(radius);
        const separation = 350;
        const speed = 0.6;

        const body1: Body = {
            id: Date.now(),
            x: centerX - separation,
            y: centerY - 30,
            vx: speed,
            vy: 0.15,
            mass: mass,
            visualRadius: radius,
            color: '#ef4444', // Red
            trail: []
        };

        const body2: Body = {
            id: Date.now() + 1,
            x: centerX + separation,
            y: centerY + 30,
            vx: -speed,
            vy: -0.15,
            mass: mass,
            visualRadius: radius,
            color: '#3b82f6', // Blue
            trail: []
        };

        setBodies([body1, body2]);
        setMode('idle');
        setTempBody(null);
        setTempVelocity(null);
    };

    const createMultiPlanet = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Central star
        const starRadius = 50;
        const starMass = calculateLogMass(starRadius);

        const star: Body = {
            id: Date.now(),
            x: centerX,
            y: centerY,
            vx: 0,
            vy: 0,
            mass: starMass,
            visualRadius: starRadius,
            color: '#f97316', // Orange
            trail: []
        };

        // Three planets at different orbits
        const planets: Body[] = [
            {
                id: Date.now() + 1,
                x: centerX + 120,
                y: centerY,
                vx: 0,
                vy: Math.sqrt((G * starMass) / 120),
                mass: calculateLogMass(15),
                visualRadius: 15,
                color: '#3b82f6', // Blue
                trail: []
            },
            {
                id: Date.now() + 2,
                x: centerX + 200,
                y: centerY,
                vx: 0,
                vy: Math.sqrt((G * starMass) / 200),
                mass: calculateLogMass(20),
                visualRadius: 20,
                color: '#22c55e', // Green
                trail: []
            },
            {
                id: Date.now() + 3,
                x: centerX + 280,
                y: centerY,
                vx: 0,
                vy: Math.sqrt((G * starMass) / 280),
                mass: calculateLogMass(18),
                visualRadius: 18,
                color: '#a855f7', // Purple
                trail: []
            }
        ];

        setBodies([star, ...planets]);
        setMode('idle');
        setTempBody(null);
        setTempVelocity(null);
    };

    const createEccentricComet = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Central star
        const starRadius = 55;
        const starMass = calculateLogMass(starRadius);

        const star: Body = {
            id: Date.now(),
            x: centerX,
            y: centerY,
            vx: 0,
            vy: 0,
            mass: starMass,
            visualRadius: starRadius,
            color: '#f97316', // Orange
            trail: []
        };

        // Comet at perihelion (closest point) with high velocity
        const perihelion = 100;
        const eccentricity = 0.7; // Highly eccentric orbit
        const vPerihelion = Math.sqrt((G * starMass / perihelion) * (1 + eccentricity)) * 0.9;

        const comet: Body = {
            id: Date.now() + 1,
            x: centerX + perihelion,
            y: centerY,
            vx: 0,
            vy: vPerihelion,
            mass: calculateLogMass(12),
            visualRadius: 12,
            color: '#22c55e', // Green
            trail: []
        };

        setBodies([star, comet]);
        setMode('idle');
        setTempBody(null);
        setTempVelocity(null);
    };

    const calculateLogMass = (radius: number) => {
        // Logarithmic mass mapping: Small visual differences lead to huge mass differences
        // Using base 1.2 to allow for a wide but manageable range
        // Mass = 1.2^Radius (offset so min radius 10 gives mass ~10)
        return Math.pow(1.15, radius) * 5;
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isRunning) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (mode === 'idle') {
            setTempBody({ x, y, r: 10 });
            setMode('position');
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isRunning) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (mode === 'position' && tempBody) {
            const dist = Math.sqrt((x - tempBody.x) ** 2 + (y - tempBody.y) ** 2);
            setTempBody({ ...tempBody, r: Math.max(10, Math.min(100, dist)) });
        } else if (mode === 'velocity' && tempBody) {
            setTempVelocity({ x, y });
        }
    };

    const handleMouseUp = () => {
        if (isRunning) return;
        if (mode === 'position' && tempBody) {
            setMode('velocity');
        } else if (mode === 'velocity' && tempBody && tempVelocity) {
            const mass = calculateLogMass(tempBody.r);
            const newBody: Body = {
                id: Date.now(),
                x: tempBody.x,
                y: tempBody.y,
                vx: (tempVelocity.x - tempBody.x) * 0.03,
                vy: (tempVelocity.y - tempBody.y) * 0.03,
                mass: mass,
                visualRadius: tempBody.r,
                color: COLORS[bodies.length % COLORS.length],
                trail: []
            };
            setBodies([...bodies, newBody]);
            setTempBody(null);
            setTempVelocity(null);
            setMode('idle');
        }
    };

    // Main simulation loop using Newtons Law of Universal Gravitation
    useEffect(() => {
        if (!isRunning) return;

        let animationFrameId: number;

        const update = () => {
            setBodies(prevBodies => {
                // Deep copy bodies for integration
                const nextBodies = prevBodies.map(b => ({ ...b, trail: [...b.trail, { x: b.x, y: b.y }].slice(-maxTrail) }));

                // Calculate forces and update velocities
                for (let i = 0; i < nextBodies.length; i++) {
                    const b1 = nextBodies[i];
                    let fx = 0;
                    let fy = 0;

                    for (let j = 0; j < nextBodies.length; j++) {
                        if (i === j) continue;
                        const b2 = nextBodies[j];

                        const dx = b2.x - b1.x;
                        const dy = b2.y - b1.y;
                        const distSq = dx * dx + dy * dy + 500; // Softening factor to prevent infinite force
                        const dist = Math.sqrt(distSq);

                        // Gravity Equation: F = G * (m1 * m2) / r^2
                        const Force = (G * b1.mass * b2.mass) / distSq;

                        // Components of force
                        fx += Force * (dx / dist);
                        fy += Force * (dy / dist);
                    }

                    // Acceleration: a = F / m
                    const ax = fx / b1.mass;
                    const ay = fy / b1.mass;

                    b1.vx += ax * timeStep;
                    b1.vy += ay * timeStep;
                }

                // Update positions based on integrated velocities
                nextBodies.forEach(b => {
                    b.x += b.vx * timeStep;
                    b.y += b.vy * timeStep;

                    // Optional: Wrapping or bounce? 
                    // Let's keep it "infinite" space for better physics feel
                });

                return [...nextBodies];
            });

            animationFrameId = requestAnimationFrame(update);
        };

        animationFrameId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isRunning]);

    // Render loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw trails
            bodies.forEach(body => {
                if (body.trail.length < 2) return;
                ctx.beginPath();
                ctx.strokeStyle = body.color;
                ctx.globalAlpha = 0.4;
                ctx.lineWidth = 2;
                ctx.moveTo(body.trail[0].x, body.trail[0].y);
                for (let i = 1; i < body.trail.length; i++) {
                    ctx.lineTo(body.trail[i].x, body.trail[i].y);
                }
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            });

            // Draw bodies
            bodies.forEach(body => {
                ctx.beginPath();
                // Visual radius is kept directly from drag for UI consistency
                ctx.fillStyle = body.color;

                // Add a gradient to the stars/masses
                const grad = ctx.createRadialGradient(body.x, body.y, 0, body.x, body.y, body.visualRadius * 0.5);
                grad.addColorStop(0, 'white');
                grad.addColorStop(0.2, body.color);
                grad.addColorStop(1, 'transparent');

                ctx.fillStyle = grad;
                ctx.arc(body.x, body.y, body.visualRadius * 0.5, 0, Math.PI * 2);
                ctx.fill();

                // Glow effect
                ctx.shadowBlur = 20;
                ctx.shadowColor = body.color;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Display mass info (only when not running)
                if (!isRunning) {
                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    ctx.font = 'bold 8px Courier New';
                    ctx.fillText(`M: ${Math.round(body.mass)}`, body.x + body.visualRadius * 0.5 + 5, body.y);
                }
            });

            // Draw temp body (placement mode)
            if (tempBody) {
                ctx.beginPath();
                ctx.strokeStyle = '#f97316';
                ctx.setLineDash([5, 5]);
                ctx.arc(tempBody.x, tempBody.y, tempBody.r * 0.5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);

                // Show current log mass while dragging
                ctx.fillStyle = '#f97316';
                ctx.font = 'bold 10px Courier New';
                ctx.fillText(`POTENTIAL MASS: ${Math.round(calculateLogMass(tempBody.r))}`, tempBody.x + tempBody.r * 0.5 + 10, tempBody.y);

                if (mode === 'velocity' && tempVelocity) {
                    ctx.beginPath();
                    ctx.strokeStyle = '#f97316';
                    ctx.lineWidth = 2;
                    ctx.moveTo(tempBody.x, tempBody.y);
                    ctx.lineTo(tempVelocity.x, tempVelocity.y);
                    ctx.stroke();

                    // Arrow head
                    const angle = Math.atan2(tempVelocity.y - tempBody.y, tempVelocity.x - tempBody.x);
                    ctx.save();
                    ctx.translate(tempVelocity.x, tempVelocity.y);
                    ctx.rotate(angle);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(-12, -6);
                    ctx.lineTo(-12, 6);
                    ctx.closePath();
                    ctx.fillStyle = '#f97316';
                    ctx.fill();
                    ctx.restore();
                }
            }

            requestAnimationFrame(draw);
        };

        draw();
    }, [bodies, tempBody, tempVelocity, mode]);

    return (
        <div className="w-full h-full bg-[#020202] relative flex flex-col items-center justify-center overflow-hidden">
            <div className={`absolute top-24 left-8 text-left pointer-events-none z-10 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <h2 className="text-4xl font-black text-white italic tracking-tighter">NEWTONIAN CHAOS</h2>
                <div className="flex items-center gap-2 mt-1">
                    <Activity size={12} className="text-orange-500 animate-pulse" />
                    <p className="text-orange-500/60 text-[10px] uppercase tracking-[0.3em] font-bold">Logarithmic Mass Scale v2.0</p>
                </div>
            </div>

            <canvas
                ref={canvasRef}
                width={window.innerWidth - 300}
                height={window.innerHeight}
                className="cursor-crosshair"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            />

            {/* Equations Overlay */}
            <div className={`absolute top-24 right-8 text-right pointer-events-none select-none transition-opacity duration-500 ${showControls ? 'opacity-20' : 'opacity-0'}`}>
                <p className="text-xs font-mono text-blue-400">F = G * (m₁m₂) / r²</p>
                <p className="text-xs font-mono text-blue-400">a = F / m</p>
            </div>

            {/* Control Panel */}
            <div className={`absolute bottom-8 left-8 flex flex-col gap-2 z-20 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                {/* Main Control Buttons */}
                <div className="flex items-center gap-2 px-3 py-2 bg-zinc-950/90 border border-orange-500/20 rounded-2xl backdrop-blur-xl shadow-2xl">
                    <button
                        onClick={() => setIsRunning(!isRunning)}
                        disabled={bodies.length < 2}
                        className={`flex items-center gap-2 px-8 py-4 rounded-xl transition-all font-black text-[10px] tracking-[0.2em]
              ${isRunning
                                ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                : "bg-orange-600 text-white shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale"}
            `}
                    >
                        {isRunning ? <><RotateCcw size={14} /> HALT</> : <><Play size={14} /> ENGAGE</>}
                    </button>

                    <button
                        onClick={reset}
                        className="flex items-center gap-2 px-8 py-4 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all font-black text-[10px] tracking-[0.2em] border border-white/5"
                    >
                        <RotateCcw size={14} /> CLEAR
                    </button>

                    {/* Speed Control inline */}
                    <div className="h-12 w-px bg-white/10 mx-1"></div>

                    <button
                        onClick={decreaseSpeed}
                        disabled={simulationSpeed <= 0.1}
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronDown size={16} />
                    </button>

                    <div className="flex flex-col items-center justify-center px-3">
                        <span className="text-[7px] font-black text-green-500/60 uppercase tracking-[0.2em] leading-none">Speed</span>
                        <span className="text-sm font-black text-white tabular-nums leading-tight">{simulationSpeed.toFixed(2)}x</span>
                    </div>

                    <button
                        onClick={increaseSpeed}
                        disabled={simulationSpeed >= 50.0}
                        className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ChevronUp size={16} />
                    </button>
                </div>

                {/* Setup Buttons Grid - 3 rows */}
                <div className="grid grid-cols-3 gap-2 px-3 py-2 bg-zinc-950/90 border border-blue-500/10 rounded-2xl backdrop-blur-xl shadow-2xl">
                    {/* Row 1: Simple 2-body systems */}
                    <button
                        onClick={createOrbitalPair}
                        disabled={isRunning}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/90 text-white hover:bg-blue-500 transition-all font-black text-[8px] tracking-[0.15em] border border-blue-400/20 disabled:opacity-30 disabled:grayscale hover:scale-105 active:scale-95"
                    >
                        <Plus size={10} /> ORBITAL
                    </button>

                    <button
                        onClick={createBinarySystem}
                        disabled={isRunning}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-purple-600/90 text-white hover:bg-purple-500 transition-all font-black text-[8px] tracking-[0.15em] border border-purple-400/20 disabled:opacity-30 disabled:grayscale hover:scale-105 active:scale-95"
                    >
                        <Plus size={10} /> BINARY
                    </button>

                    <button
                        onClick={createSlingshot}
                        disabled={isRunning}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-600/90 text-white hover:bg-green-500 transition-all font-black text-[8px] tracking-[0.15em] border border-green-400/20 disabled:opacity-30 disabled:grayscale hover:scale-105 active:scale-95"
                    >
                        <Plus size={10} /> SLINGSHOT
                    </button>

                    {/* Row 2: Special orbits */}
                    <button
                        onClick={createCollisionCourse}
                        disabled={isRunning}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-600/90 text-white hover:bg-red-500 transition-all font-black text-[8px] tracking-[0.15em] border border-red-400/20 disabled:opacity-30 disabled:grayscale hover:scale-105 active:scale-95"
                    >
                        <Plus size={10} /> COLLISION
                    </button>

                    <button
                        onClick={createEccentricComet}
                        disabled={isRunning}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600/90 text-white hover:bg-cyan-500 transition-all font-black text-[8px] tracking-[0.15em] border border-cyan-400/20 disabled:opacity-30 disabled:grayscale hover:scale-105 active:scale-95"
                    >
                        <Plus size={10} /> COMET
                    </button>

                    <button
                        onClick={createMultiPlanet}
                        disabled={isRunning}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600/90 text-white hover:bg-amber-500 transition-all font-black text-[8px] tracking-[0.15em] border border-amber-400/20 disabled:opacity-30 disabled:grayscale hover:scale-105 active:scale-95"
                    >
                        <Plus size={10} /> PLANETS
                    </button>

                    {/* Row 3: Complex 3-body systems */}
                    <button
                        onClick={createFigure8}
                        disabled={isRunning}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-pink-600/90 text-white hover:bg-pink-500 transition-all font-black text-[8px] tracking-[0.15em] border border-pink-400/20 disabled:opacity-30 disabled:grayscale hover:scale-105 active:scale-95"
                    >
                        <Plus size={10} /> FIGURE-8
                    </button>

                    <button
                        onClick={createLagrangeTriangle}
                        disabled={isRunning}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600/90 text-white hover:bg-indigo-500 transition-all font-black text-[8px] tracking-[0.15em] border border-indigo-400/20 disabled:opacity-30 disabled:grayscale hover:scale-105 active:scale-95"
                    >
                        <Plus size={10} /> LAGRANGE
                    </button>

                    <button
                        onClick={createThreeBodyChaos}
                        disabled={isRunning}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-orange-600/90 text-white hover:bg-orange-500 transition-all font-black text-[8px] tracking-[0.15em] border border-orange-400/20 disabled:opacity-30 disabled:grayscale hover:scale-105 active:scale-95"
                    >
                        <Plus size={10} /> CHAOS
                    </button>
                </div>
            </div>

            <div className={`absolute bottom-24 right-8 bg-zinc-950/80 p-6 rounded-2xl border border-blue-500/10 backdrop-blur-md pointer-events-none transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex items-center gap-3 mb-4">
                    <MousePointer2 size={12} className="text-blue-500" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Deployment Protocol</span>
                </div>
                <ul className="text-[9px] text-zinc-400 space-y-3 uppercase leading-relaxed font-bold">
                    <li className="flex gap-2"><span className="text-blue-500">01.</span> Drag to scale mass (Exponentially)</li>
                    <li className="flex gap-2"><span className="text-blue-500">02.</span> Project velocity vector</li>
                    <li className="flex gap-2"><span className="text-blue-500">03.</span> Converge systems</li>
                </ul>
            </div>
        </div>
    );
};

export default ThreeBodyProblem;
