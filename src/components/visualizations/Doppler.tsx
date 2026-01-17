import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Activity, User, Radio } from 'lucide-react';

interface Scenario {
    id: string;
    title: string;
    description: string;
}

const scenarios: Scenario[] = [
    { id: 'fixed-observer', title: 'Fixed Observer', description: 'Stationary observer, moving sound source' },
    { id: 'moving-observer', title: 'Moving Observer', description: 'Moving observer, stationary sound source' },
    { id: 'moving-both', title: 'Moving Both', description: 'Both observer and source are in motion' },
];

const Doppler: React.FC = () => {
    const [activeScenario, setActiveScenario] = useState('fixed-observer');
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const oscillatorRef = useRef<OscillatorNode | null>(null);
    const gainRef = useRef<GainNode | null>(null);
    const requestRef = useRef<number>(undefined);

    const SPEED_OF_SOUND = 343; // m/s
    const BASE_FREQ = 220; // Hz
    const SCALE = 200; // Pixels per meter (abstracted)

    // Simulation parameters
    const getPositions = (t: number) => {
        const width = canvasRef.current?.width || 800;
        const height = canvasRef.current?.height || 400;
        const centerY = height / 2;
        const centerX = width / 2;
        const duration = 5; // seconds
        const normT = (t % duration) / duration;

        // Contrain range to 85% of width to prevent going off-screen on tablets
        const xRange = width * 0.85;

        let obsX = centerX;
        let srcX = centerX;

        const obsVel = 50; // m/s (slower by 50%)
        const srcVel = 50; // m/s

        switch (activeScenario) {
            case 'fixed-observer':
                obsX = centerX;
                srcX = (normT * xRange) - (xRange / 2) + centerX;
                return { obs: { x: obsX, y: centerY, v: 0 }, src: { x: srcX, y: centerY - 40, v: srcVel } };
            case 'moving-observer':
                obsX = (normT * xRange) - (xRange / 2) + centerX;
                srcX = centerX;
                return { obs: { x: obsX, y: centerY, v: obsVel }, src: { x: srcX, y: centerY - 40, v: 0 } };
            case 'moving-both':
                obsX = (normT * xRange) - (xRange / 2) + centerX - 100;
                srcX = ((1 - normT) * xRange) - (xRange / 2) + centerX + 100;
                return { obs: { x: obsX, y: centerY, v: obsVel }, src: { x: srcX, y: centerY - 40, v: -srcVel } };
            default:
                return { obs: { x: centerX, y: centerY, v: 0 }, src: { x: centerX, y: centerY, v: 0 } };
        }
    };

    const startAudio = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }

        const ctx = audioCtxRef.current;

        oscillatorRef.current = ctx.createOscillator();
        gainRef.current = ctx.createGain();

        oscillatorRef.current.type = 'sine';
        oscillatorRef.current.frequency.setValueAtTime(BASE_FREQ, ctx.currentTime);

        gainRef.current.gain.setValueAtTime(0, ctx.currentTime);
        gainRef.current.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.1);

        oscillatorRef.current.connect(gainRef.current);
        gainRef.current.connect(ctx.destination);

        oscillatorRef.current.start();
    };

    const stopAudio = () => {
        if (oscillatorRef.current && gainRef.current && audioCtxRef.current) {
            const ctx = audioCtxRef.current;
            gainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
            setTimeout(() => {
                oscillatorRef.current?.stop();
                oscillatorRef.current?.disconnect();
                gainRef.current?.disconnect();
                oscillatorRef.current = null;
                gainRef.current = null;
            }, 150);
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = canvas.offsetWidth * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        };
        resize();
        window.addEventListener('resize', resize);

        let startTime = 0;
        const waves: { x: number, y: number, r: number, time: number, freq: number }[] = [];

        const animate = (time: number) => {
            if (!startTime) startTime = time;
            const t = (time - startTime) / 1000;

            const width = canvas.width / window.devicePixelRatio;
            const height = canvas.height / window.devicePixelRatio;

            ctx.clearRect(0, 0, width, height);

            const { obs, src } = getPositions(t);

            // Calculate Doppler Frequency
            // f = f0 * (v + vr) / (v + vs)
            // vr is relative velocity of receiver to source (positive if moving towards)
            // vs is relative velocity of source to receiver (positive if moving away)

            const dx = src.x - obs.x;
            const dist = Math.abs(dx);

            // Relative velocities along the line of sight
            let vr = 0;
            let vs = 0;

            if (activeScenario === 'fixed-observer') {
                vs = dx > 0 ? -100 : 100; // towards if positive x, but vs is positive if away
            } else if (activeScenario === 'moving-observer') {
                vr = dx > 0 ? 100 : -100;
            } else {
                vr = dx > 0 ? 100 : -100;
                vs = dx > 0 ? -100 : 100;
            }

            // Simplified: if approaching, higher freq. If receding, lower freq.
            const isApproaching = (src.v > 0 && src.x < obs.x) || (src.v < 0 && src.x > obs.x) || (obs.v > 0 && obs.x < src.x) || (obs.v < 0 && obs.x > src.x);

            // Precise calculation based on movement
            const V_SOUND = 340;
            const V_SOURCE = activeScenario === 'moving-observer' ? 0 : (activeScenario === 'moving-both' ? -100 : 100);
            const V_OBS = activeScenario === 'fixed-observer' ? 0 : 100;

            // Distance derivative
            const dDist = (activeScenario === 'fixed-observer') ? (dx > 0 ? -50 : 50) :
                (activeScenario === 'moving-observer') ? (dx > 0 ? 50 : -50) :
                    (dx > 0 ? -100 : 100);

            const factor = V_SOUND / (V_SOUND + dDist);
            const dopplerFreq = BASE_FREQ * factor;

            if (isPlaying && oscillatorRef.current) {
                oscillatorRef.current.frequency.setTargetAtTime(dopplerFreq, audioCtxRef.current!.currentTime, 0.05);
                // Volume based on distance
                const vol = Math.max(0.05, 0.3 * (1 - Math.min(dist / 800, 1)));
                gainRef.current!.gain.setTargetAtTime(vol, audioCtxRef.current!.currentTime, 0.05);
            }

            // Draw background grid
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.05)';
            ctx.lineWidth = 1;
            for (let x = 0; x < width; x += 50) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y < height; y += 50) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            // Emit waves (Frequency reduced to avoid visual clutter)
            if (Math.floor(t * 8) > waves.length) {
                waves.push({ x: src.x, y: src.y, r: 0, time: t, freq: dopplerFreq });
            }

            // Draw waves
            ctx.lineWidth = 1.5;
            for (let i = waves.length - 1; i >= 0; i--) {
                const w = waves[i];
                const age = t - w.time;
                w.r = age * 150; // propagation speed

                if (w.r > 1000) {
                    waves.splice(i, 1);
                    continue;
                }

                const alpha = Math.max(0, 1 - w.r / 600);
                ctx.strokeStyle = `rgba(59, 130, 246, ${alpha * 0.4})`;
                ctx.beginPath();
                ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw Observer (Red)
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, 12, 0, Math.PI * 2);
            ctx.fill();

            // Observer Label
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.font = 'bold 10px Inter';
            ctx.fillText('OBSERVER', obs.x - 25, obs.y + 25);

            // Draw Source (Blue)
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(src.x, src.y, 12, 0, Math.PI * 2);
            ctx.fill();

            // Source Label
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
            ctx.font = 'bold 10px Inter';
            ctx.fillText('SOURCE', src.x - 20, src.y - 20);

            // Draw Velocity Vectors
            const drawVector = (x: number, y: number, vx: number, color: string) => {
                if (Math.abs(vx) < 1) return;
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + (vx > 0 ? 40 : -40), y);
                ctx.stroke();
                // Arrowhead
                ctx.beginPath();
                const ax = x + (vx > 0 ? 40 : -40);
                ctx.moveTo(ax, y);
                ctx.lineTo(ax - (vx > 0 ? 5 : -5), y - 5);
                ctx.moveTo(ax, y);
                ctx.lineTo(ax - (vx > 0 ? 5 : -5), y + 5);
                ctx.stroke();
            };

            if (activeScenario !== 'fixed-observer') drawVector(obs.x, obs.y, 50, '#ef4444');
            if (activeScenario !== 'moving-observer') drawVector(src.x, src.y, (activeScenario === 'moving-both' ? -50 : 50), '#3b82f6');

            // Data Overlay (Moved down to avoid overlap with main title)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '10px JetBrains Mono';
            ctx.fillText(`Relative Distance: ${dist.toFixed(1)}m`, 32, 110);
            ctx.fillText(`Perceived Freq: ${Math.round(dopplerFreq)} Hz`, 32, 125);
            ctx.fillText(`Shift: ${((dopplerFreq / BASE_FREQ - 1) * 100).toFixed(1)}%`, 32, 140);

            requestRef.current = requestAnimationFrame(animate);
        };

        if (isPlaying) {
            requestRef.current = requestAnimationFrame(animate);
        } else {
            // Draw static frame
            animate(startTime || 0);
            cancelAnimationFrame(requestRef.current!);
        }

        return () => {
            cancelAnimationFrame(requestRef.current!);
            window.removeEventListener('resize', resize);
        };
    }, [isPlaying, activeScenario]);

    const togglePlay = () => {
        if (isPlaying) {
            stopAudio();
        } else {
            startAudio();
        }
        setIsPlaying(!isPlaying);
    };

    const handleScenarioChange = (id: string) => {
        setActiveScenario(id);
        if (isPlaying) {
            stopAudio();
            setIsPlaying(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#050505] p-8 overflow-hidden">
            <div className="flex-1 relative rounded-2xl border border-white/5 bg-zinc-900/20 backdrop-blur-sm overflow-hidden group">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                />

                {/* Responsive Controls Overlay */}
                <div className="absolute top-6 right-6 lg:top-8 lg:right-8 flex flex-col gap-3 min-w-[200px] max-w-[calc(100%-48px)]">
                    <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 flex flex-col gap-2 shadow-2xl">
                        <div className="flex flex-col gap-1.5">
                            {scenarios.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => handleScenarioChange(s.id)}
                                    className={`
                                        px-4 py-2.5 rounded-xl text-[10px] lg:text-xs font-black transition-all duration-300 flex items-center gap-3 uppercase tracking-wider
                                        ${activeScenario === s.id
                                            ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]'
                                            : 'text-white/40 hover:text-white/90 hover:bg-white/5'}
                                    `}
                                >
                                    {s.id === 'fixed-observer' && <User className="h-3.5 w-3.5" />}
                                    {s.id === 'moving-observer' && <Activity className="h-3.5 w-3.5" />}
                                    {s.id === 'moving-both' && <Radio className="h-3.5 w-3.5" />}
                                    {s.title}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={togglePlay}
                            className={`
                                mt-2 w-full py-4 rounded-xl flex items-center justify-center gap-3 font-black tracking-widest transition-all duration-500 text-[10px] uppercase
                                ${isPlaying
                                    ? 'bg-red-500/20 text-red-500 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                                    : 'bg-blue-600 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:scale-[1.02] hover:bg-blue-500'}
                            `}
                        >
                            {isPlaying ? (
                                <>
                                    <RotateCcw className="h-4 w-4" />
                                    RESET TEST
                                </>
                            ) : (
                                <>
                                    <Play className="h-4 w-4 fill-current" />
                                    INITIATE SEQUENCE
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Legend - Responsive positioning */}
                <div className="absolute bottom-6 left-6 p-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl hidden md:block">
                    <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
                            <span className="text-[9px] uppercase tracking-[0.2em] text-white/60 font-black">Sound Source</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]" />
                            <span className="text-[9px] uppercase tracking-[0.2em] text-white/60 font-black">Observer</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/10">
                    <h3 className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Scenario Alpha</h3>
                    <p className="text-white/80 text-xs font-medium leading-relaxed">
                        In the <span className="text-white font-bold italic">FIXED OBSERVER</span> scenario, the sound source moves relative to a stationary point. This is like a car horn passing you on the street.
                    </p>
                </div>
                <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/10">
                    <h3 className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Scenario Beta</h3>
                    <p className="text-white/80 text-xs font-medium leading-relaxed">
                        The <span className="text-white font-bold italic">MOVING OBSERVER</span> experiences a shift because their motion causes them to "catch" more or fewer waves per second.
                    </p>
                </div>
                <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/10">
                    <h3 className="text-red-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Scenario Delta</h3>
                    <p className="text-white/80 text-xs font-medium leading-relaxed">
                        When <span className="text-white font-bold italic">BOTH MOVE</span>, the effect is compounded, resulting in the most dramatic frequency shifts.
                    </p>
                </div>
            </div>
        </div >
    );
};

export default Doppler;
