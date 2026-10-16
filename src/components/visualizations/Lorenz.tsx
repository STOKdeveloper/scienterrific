import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

const PERTURBATION = 1e-4;   // initial offset of the second trajectory
const DT = 0.005;
const CHUNKS = 24;           // colour-fade segments per trail

type Vec = [number, number, number];

const Lorenz: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [sigma, setSigma] = useState(10);
    const [rho, setRho] = useState(28);
    const [beta, setBeta] = useState(2.667);
    const [speed, setSpeed] = useState(4);
    const [trail, setTrail] = useState(2500);
    const [playing, setPlaying] = useState(true);
    const [rotate, setRotate] = useState(true);
    const [resetKey, setResetKey] = useState(0);
    const [separation, setSeparation] = useState(PERTURBATION);

    const params = useRef({ sigma, rho, beta, speed, trail, playing, rotate });
    params.current = { sigma, rho, beta, speed, trail, playing, rotate };

    const view = useRef({ yaw: 0.6, pitch: 0.35 });
    const drag = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let w = 0, h = 0, dpr = 1;
        const resize = () => {
            dpr = window.devicePixelRatio || 1;
            canvas.width = canvas.offsetWidth * dpr;
            canvas.height = canvas.offsetHeight * dpr;
            w = canvas.offsetWidth;
            h = canvas.offsetHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        // Two nearly identical starting points: the butterfly effect
        let a: Vec = [1, 1, 1];
        let b: Vec = [1 + PERTURBATION, 1, 1];
        const trailA: Vec[] = [];
        const trailB: Vec[] = [];
        const sepHistory: number[] = [];
        let time = 0;
        let frame = 0;

        const deriv = (s: Vec, sg: number, r: number, bt: number): Vec => [
            sg * (s[1] - s[0]),
            s[0] * (r - s[2]) - s[1],
            s[0] * s[1] - bt * s[2],
        ];

        // Classical RK4 step
        const rk4 = (s: Vec, sg: number, r: number, bt: number): Vec => {
            const k1 = deriv(s, sg, r, bt);
            const k2 = deriv([s[0] + 0.5 * DT * k1[0], s[1] + 0.5 * DT * k1[1], s[2] + 0.5 * DT * k1[2]], sg, r, bt);
            const k3 = deriv([s[0] + 0.5 * DT * k2[0], s[1] + 0.5 * DT * k2[1], s[2] + 0.5 * DT * k2[2]], sg, r, bt);
            const k4 = deriv([s[0] + DT * k3[0], s[1] + DT * k3[1], s[2] + DT * k3[2]], sg, r, bt);
            return [
                s[0] + (DT / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
                s[1] + (DT / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
                s[2] + (DT / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
            ];
        };

        const project = (p: Vec, cosY: number, sinY: number, cosP: number, sinP: number, scale: number, zc: number) => {
            // Centre on the attractor, rotate about the vertical (z) axis, then tilt
            const x = p[0], y = p[1], z = p[2] - zc;
            const rx = x * cosY - y * sinY;
            const ry = x * sinY + y * cosY;
            const sy = ry * cosP - z * sinP;       // depth after tilt
            const sz = ry * sinP + z * cosP;
            const persp = 1 / (1 + sy * 0.004);
            return [w / 2 + rx * scale * persp, h / 2 - sz * scale * persp] as const;
        };

        const drawTrail = (pts: Vec[], rgb: string, proj: (p: Vec) => readonly [number, number]) => {
            const n = pts.length;
            if (n < 2) return;
            const per = Math.ceil(n / CHUNKS);
            ctx.lineWidth = 1.4;
            ctx.lineCap = 'round';
            for (let c = 0; c < CHUNKS; c++) {
                const s = c * per, e = Math.min(n - 1, (c + 1) * per);
                if (s >= e) break;
                ctx.strokeStyle = `rgba(${rgb},${(0.06 + 0.9 * ((c + 1) / CHUNKS) ** 1.6).toFixed(3)})`;
                ctx.beginPath();
                const p0 = proj(pts[s]);
                ctx.moveTo(p0[0], p0[1]);
                for (let i = s + 1; i <= e; i++) {
                    const q = proj(pts[i]);
                    ctx.lineTo(q[0], q[1]);
                }
                ctx.stroke();
            }
        };

        let raf = 0;
        const loop = () => {
            const P = params.current;

            if (P.playing) {
                const steps = Math.round(P.speed * 3);
                for (let s = 0; s < steps; s++) {
                    a = rk4(a, P.sigma, P.rho, P.beta);
                    b = rk4(b, P.sigma, P.rho, P.beta);
                    time += DT;
                    if (s % 3 === 0) {
                        trailA.push(a);
                        trailB.push(b);
                    }
                }
                while (trailA.length > P.trail) trailA.shift();
                while (trailB.length > P.trail) trailB.shift();

                const sep = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
                if (frame % 3 === 0) {
                    sepHistory.push(Math.log10(Math.max(sep, 1e-12)));
                    if (sepHistory.length > 400) sepHistory.shift();
                }
                if (frame % 6 === 0) setSeparation(sep);
                if (!isFinite(sep) || Math.abs(a[0]) > 1e3) { a = [1, 1, 1]; b = [1 + PERTURBATION, 1, 1]; trailA.length = 0; trailB.length = 0; }
            }
            frame++;

            if (P.rotate && !drag.current) view.current.yaw += 0.003;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);

            const { yaw, pitch } = view.current;
            const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
            const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
            const scale = Math.min(w, h) / 70;
            const zc = P.rho - 1; // attractor centre in z
            const proj = (p: Vec) => project(p, cosY, sinY, cosP, sinP, scale, zc);

            // Faint axes
            ctx.strokeStyle = 'rgba(249,115,22,0.12)';
            ctx.lineWidth = 1;
            const axes: [Vec, Vec][] = [
                [[-25, 0, zc], [25, 0, zc]],
                [[0, -30, zc], [0, 30, zc]],
                [[0, 0, 0], [0, 0, 2 * zc]],
            ];
            axes.forEach(([p0, p1]) => {
                const q0 = proj(p0), q1 = proj(p1);
                ctx.beginPath();
                ctx.moveTo(q0[0], q0[1]);
                ctx.lineTo(q1[0], q1[1]);
                ctx.stroke();
            });

            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(249,115,22,0.6)';
            drawTrail(trailA, '249,115,22', proj);
            ctx.shadowColor = 'rgba(56,189,248,0.6)';
            drawTrail(trailB, '56,189,248', proj);
            ctx.shadowBlur = 0;

            // Heads
            const head = (p: Vec, col: string) => {
                const q = proj(p);
                ctx.beginPath();
                ctx.arc(q[0], q[1], 4, 0, Math.PI * 2);
                ctx.fillStyle = col;
                ctx.shadowColor = col;
                ctx.shadowBlur = 14;
                ctx.fill();
                ctx.shadowBlur = 0;
            };
            head(a, '#fb923c');
            head(b, '#38bdf8');

            // Separation chart (log scale): shows exponential divergence then saturation
            const cw = 220, ch = 70, cx0 = 24, cy0 = h - ch - 24;
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(cx0, cy0, cw, ch);
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.strokeRect(cx0, cy0, cw, ch);
            if (sepHistory.length > 1) {
                const lo = -6, hi = 2;
                ctx.beginPath();
                sepHistory.forEach((v, i) => {
                    const x = cx0 + (i / 399) * cw;
                    const y = cy0 + ch - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * ch;
                    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
                });
                ctx.strokeStyle = '#f97316';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.font = '9px JetBrains Mono, monospace';
            ctx.fillText('log10 separation', cx0 + 6, cy0 + 12);

            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, [resetKey]);

    const Slider: React.FC<{
        label: string; value: number; min: number; max: number; step: number;
        onChange: (v: number) => void;
    }> = ({ label, value, min, max, step, onChange }) => (
        <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[9px] uppercase tracking-[0.2em] font-black text-white/50">
                <span>{label}</span>
                <span className="text-orange-400 font-mono">{value}</span>
            </div>
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full accent-orange-500 cursor-pointer"
            />
        </label>
    );

    return (
        <div className="w-full h-full flex flex-col bg-[#050505] p-8 overflow-hidden">
            <div className="flex-1 relative rounded-2xl border border-white/5 bg-zinc-900/20 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
                    onPointerDown={(e) => {
                        drag.current = { x: e.clientX, y: e.clientY };
                        e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) => {
                        if (!drag.current) return;
                        view.current.yaw += (e.clientX - drag.current.x) * 0.008;
                        view.current.pitch = Math.max(-1.4, Math.min(1.4, view.current.pitch + (e.clientY - drag.current.y) * 0.008));
                        drag.current = { x: e.clientX, y: e.clientY };
                    }}
                    onPointerUp={() => { drag.current = null; }}
                />

                <div className="absolute top-6 right-6 flex flex-col gap-3 w-[240px] max-h-[calc(100%-48px)] overflow-y-auto no-scrollbar">
                    <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 flex flex-col gap-3 shadow-2xl">
                        <Slider label="σ (Prandtl)" value={sigma} min={1} max={20} step={0.1} onChange={setSigma} />
                        <Slider label="ρ (Rayleigh)" value={rho} min={0} max={50} step={0.5} onChange={setRho} />
                        <Slider label="β (geometry)" value={beta} min={0.5} max={5} step={0.01} onChange={setBeta} />
                        <Slider label="Speed" value={speed} min={1} max={12} step={1} onChange={setSpeed} />
                        <Slider label="Trail Length" value={trail} min={300} max={6000} step={100} onChange={setTrail} />

                        <button onClick={() => setRotate(!rotate)} className="flex items-center justify-between px-1">
                            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-white/50">Auto Rotate</span>
                            <span className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${rotate ? 'bg-orange-500' : 'bg-white/10'}`}>
                                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all duration-300 ${rotate ? 'left-[18px]' : 'left-0.5'}`} />
                            </span>
                        </button>

                        <div className="text-[10px] font-mono text-white/60 leading-relaxed px-1">
                            <div><span className="text-orange-400">●</span> start (1, 1, 1)</div>
                            <div><span className="text-sky-400">●</span> start (1.0001, 1, 1)</div>
                            <div className="text-white/80 mt-1">separation: {separation.toExponential(2)}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setPlaying(!playing)}
                                className="py-3 rounded-xl flex items-center justify-center gap-2 font-black tracking-widest text-[10px] uppercase bg-blue-600 text-white hover:bg-blue-500 transition-all"
                            >
                                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                                {playing ? 'Pause' : 'Play'}
                            </button>
                            <button
                                onClick={() => setResetKey((k) => k + 1)}
                                className="py-3 rounded-xl flex items-center justify-center gap-2 font-black tracking-widest text-[10px] uppercase bg-white/5 text-white/70 hover:bg-white/10 transition-all"
                            >
                                <RotateCcw className="h-4 w-4" /> Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/10">
                    <h3 className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Strange Attractor</h3>
                    <p className="text-white/80 text-xs font-medium leading-relaxed">
                        Lorenz's 1963 convection model: ẋ = σ(y−x), ẏ = x(ρ−z)−y, ż = xy−βz. At ρ = 28 the path never repeats yet stays on
                        a butterfly-shaped set. Drop ρ below ~24.7 and it settles to a fixed point instead.
                    </p>
                </div>
                <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/10">
                    <h3 className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Butterfly Effect</h3>
                    <p className="text-white/80 text-xs font-medium leading-relaxed">
                        The two paths start 0.0001 apart. The chart shows the gap growing exponentially, then saturating at the size of
                        the attractor, after which the paths are completely unrelated.
                    </p>
                </div>
                <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/10">
                    <h3 className="text-red-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Controls</h3>
                    <p className="text-white/80 text-xs font-medium leading-relaxed">
                        Drag to orbit the view. Change σ, ρ and β live; the system is integrated with fourth-order Runge–Kutta at
                        a fixed step, so the shape stays accurate at every speed.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Lorenz;
