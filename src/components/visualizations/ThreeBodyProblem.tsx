import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, RotateCcw, Plus, MousePointer2, Activity } from 'lucide-react';

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

    // Physics Constants - tuned for stable-ish screen simulation
    // We use a small G and large masses to prevent immediate fly-offs
    const G = 0.1;
    const maxTrail = 2000;
    const timeStep = 0.2;

    const reset = () => {
        setBodies([]);
        setIsRunning(false);
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
            <div className="absolute top-24 left-8 text-left pointer-events-none z-10">
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
            <div className="absolute top-24 right-8 text-right pointer-events-none select-none opacity-20">
                <p className="text-xs font-mono text-blue-400">F = G * (m₁m₂) / r²</p>
                <p className="text-xs font-mono text-blue-400">a = F / m</p>
            </div>

            {/* Control Panel */}
            <div className="absolute bottom-8 flex gap-4 z-20">
                <div className="flex gap-2 p-2 bg-zinc-950/90 border border-orange-500/20 rounded-2xl backdrop-blur-xl shadow-2xl">
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
                </div>
            </div>

            <div className="absolute bottom-24 right-8 bg-zinc-950/80 p-6 rounded-2xl border border-blue-500/10 backdrop-blur-md pointer-events-none">
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
