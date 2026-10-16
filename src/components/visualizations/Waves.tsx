import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Circle, Triangle, Square, Pentagon, Hexagon, Star, Plus, Minus } from 'lucide-react';

type Mode = 'two' | 'three' | 'four' | 'thumper';
type Shape = 'line' | 'circle' | 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'star' | 'cross';

const MODES: { id: Mode; label: string }[] = [
    { id: 'two', label: '2 Sources' },
    { id: 'three', label: '3 Sources' },
    { id: 'four', label: '4 Sources' },
    { id: 'thumper', label: 'Thumper' },
];

const SHAPES: { id: Shape; label: string; icon: React.ElementType }[] = [
    { id: 'line', label: 'Thin Line', icon: Minus },
    { id: 'circle', label: 'Circle', icon: Circle },
    { id: 'triangle', label: 'Triangle', icon: Triangle },
    { id: 'square', label: 'Square', icon: Square },
    { id: 'pentagon', label: 'Pentagon', icon: Pentagon },
    { id: 'hexagon', label: 'Hexagon', icon: Hexagon },
    { id: 'star', label: 'Star', icon: Star },
    { id: 'cross', label: 'Cross', icon: Plus },
];

const CELL = 3;               // screen pixels per simulation cell
const STEPS_PER_FRAME = 2;
const STEPS_PER_SEC = 60 * STEPS_PER_FRAME;
const WAVE_C = 0.5;           // cells per step (2D CFL limit is 0.707)
const WAVE_SPEED = WAVE_C * STEPS_PER_SEC; // cells per second
const SPONGE = 28;            // absorbing boundary width in cells

const regularPolygon = (n: number, offset = -Math.PI / 2): [number, number][] =>
    Array.from({ length: n }, (_, i) => {
        const a = offset + (i * 2 * Math.PI) / n;
        return [Math.cos(a), Math.sin(a)] as [number, number];
    });

const SHAPE_VERTS: Record<Exclude<Shape, 'circle'>, [number, number][]> = {
    line: [[-1, -0.1], [1, -0.1], [1, 0.1], [-1, 0.1]],
    triangle: regularPolygon(3),
    square: regularPolygon(4, Math.PI / 4),
    pentagon: regularPolygon(5),
    hexagon: regularPolygon(6, 0),
    star: Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? 1 : 0.45;
        return [r * Math.cos(a), r * Math.sin(a)] as [number, number];
    }),
    cross: [
        [-0.3, -1], [0.3, -1], [0.3, -0.3], [1, -0.3], [1, 0.3], [0.3, 0.3],
        [0.3, 1], [-0.3, 1], [-0.3, 0.3], [-1, 0.3], [-1, -0.3], [-0.3, -0.3],
    ],
};

// Point (unit-space, already un-rotated) inside shape?
const insideShape = (shape: Shape, x: number, y: number): boolean => {
    if (shape === 'circle') return x * x + y * y <= 1;
    const v = SHAPE_VERTS[shape];
    let inside = false;
    for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
        const [xi, yi] = v[i];
        const [xj, yj] = v[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
};

const Waves: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [mode, setMode] = useState<Mode>('two');
    const [shape, setShape] = useState<Shape>('square');
    const [playing, setPlaying] = useState(true);
    const [wavelength, setWavelength] = useState(24);      // cells (interference)
    const [spacing, setSpacing] = useState(50);            // % of min dimension
    const [thumpFreq, setThumpFreq] = useState(1.5);       // Hz
    const [spin, setSpin] = useState(0);                   // rev/s
    const [size, setSize] = useState(100);                 // % shape size
    const [reflect, setReflect] = useState(false);         // reflection from the edges
    const [resetKey, setResetKey] = useState(0);

    // Live parameters read by the animation loop (avoids restarting it on every slider move)
    const params = useRef({ mode, shape, playing, wavelength, spacing, thumpFreq, spin, size, reflect });
    params.current = { mode, shape, playing, wavelength, spacing, thumpFreq, spin, size, reflect };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const off = document.createElement('canvas');
        const offCtx = off.getContext('2d')!;

        let gw = 0, gh = 0;
        let u = new Float32Array(0), p = new Float32Array(0), n = new Float32Array(0);
        let damp = new Float32Array(0);
        let img: ImageData;
        let raf = 0;
        let simTime = 0;     // seconds of simulated time
        let phase = 0;       // thumper phase (rad)
        let angle = 0;       // thumper rotation (rad)
        let lastMode: Mode = params.current.mode;
        let lastShape: Shape = params.current.shape;

        const setup = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = canvas.offsetWidth * dpr;
            canvas.height = canvas.offsetHeight * dpr;
            gw = Math.max(40, Math.floor(canvas.offsetWidth / CELL));
            gh = Math.max(40, Math.floor(canvas.offsetHeight / CELL));
            off.width = gw;
            off.height = gh;
            img = offCtx.createImageData(gw, gh);
            u = new Float32Array(gw * gh);
            p = new Float32Array(gw * gh);
            n = new Float32Array(gw * gh);
            damp = new Float32Array(gw * gh);
            for (let y = 0; y < gh; y++) {
                for (let x = 0; x < gw; x++) {
                    const d = Math.min(x, y, gw - 1 - x, gh - 1 - y);
                    const t = d >= SPONGE ? 0 : (SPONGE - d) / SPONGE;
                    damp[y * gw + x] = 1 - 0.12 * t * t;
                }
            }
            phase = 0; angle = 0; simTime = 0;
        };

        // ---------- Colour map: deep blue (trough) -> black (rest) -> orange/white (crest)
        const colour = (v: number, o: number) => {
            const s = Math.tanh(v * 1.6);
            const a = Math.abs(s);
            let r: number, g: number, b: number;
            if (s >= 0) {
                r = 12 + 243 * a; g = 14 + 140 * a * a + 60 * a * a * a; b = 20 + 20 * a + 120 * a * a * a * a;
            } else {
                r = 10 + 20 * a; g = 14 + 70 * a; b = 24 + 200 * a;
            }
            img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
        };

        const sourcePositions = (m: Mode, spacingPct: number): [number, number][] => {
            const cx = gw / 2, cy = gh / 2;
            const L = (Math.min(gw, gh) * spacingPct) / 100;
            if (m === 'two') return [[cx - L / 2, cy], [cx + L / 2, cy]];
            const count = m === 'three' ? 3 : 4;
            const R = L / 2;
            const off0 = m === 'three' ? -Math.PI / 2 : Math.PI / 4;
            return Array.from({ length: count }, (_, i) => {
                const a = off0 + (i * 2 * Math.PI) / count;
                return [cx + R * Math.cos(a), cy + R * Math.sin(a)] as [number, number];
            });
        };

        const shapeRadius = () => (Math.min(gw, gh) * 0.09 * params.current.size) / 100;

        // ---------- Interference (analytic superposition of circular waves)
        const drawInterference = (m: Mode) => {
            const { wavelength: lam, spacing: sp, reflect: refl } = params.current;
            const real = sourcePositions(m, sp);
            // Rigid walls via the method of images: mirror every source across each edge
            const srcs: [number, number][] = [];
            real.forEach(([sx, sy]) => {
                const xs = refl ? [sx, -sx, 2 * gw - sx] : [sx];
                const ys = refl ? [sy, -sy, 2 * gh - sy] : [sy];
                xs.forEach((ix) => ys.forEach((iy) => srcs.push([ix, iy])));
            });
            const k = (2 * Math.PI) / lam;
            const omega = k * WAVE_SPEED * 0.12; // slowed so the pattern is easy to follow
            const wt = omega * simTime;
            const norm = 1 / Math.sqrt(real.length) * (refl ? 0.8 : 1.1);
            for (let y = 0; y < gh; y++) {
                for (let x = 0; x < gw; x++) {
                    let sum = 0;
                    for (let i = 0; i < srcs.length; i++) {
                        const dx = x - srcs[i][0], dy = y - srcs[i][1];
                        const r = Math.sqrt(dx * dx + dy * dy);
                        sum += Math.cos(k * r - wt) / Math.sqrt(1 + r / lam);
                    }
                    colour(sum * norm, (y * gw + x) * 4);
                }
            }
            offCtx.putImageData(img, 0, 0);
        };

        // ---------- Thumper (finite-difference 2D wave equation with a moving boundary)
        const stepThumper = () => {
            const { thumpFreq: f, spin: sr, shape: sh } = params.current;
            phase += (2 * Math.PI * f) / STEPS_PER_SEC;
            angle += (2 * Math.PI * sr) / STEPS_PER_SEC;

            const refl = params.current.reflect;
            const c2 = WAVE_C * WAVE_C;
            for (let y = 1; y < gh - 1; y++) {
                for (let x = 1; x < gw - 1; x++) {
                    const i = y * gw + x;
                    const lap = u[i - 1] + u[i + 1] + u[i - gw] + u[i + gw] - 4 * u[i];
                    n[i] = (2 * u[i] - p[i] + c2 * lap) * (refl ? 1 : damp[i]) * 0.9998;
                }
            }
            if (refl) {
                // Free (rigid-wall) edges: zero gradient, so waves bounce back in phase
                for (let x = 0; x < gw; x++) {
                    n[x] = n[gw + x];
                    n[(gh - 1) * gw + x] = n[(gh - 2) * gw + x];
                }
                for (let y = 0; y < gh; y++) {
                    n[y * gw] = n[y * gw + 1];
                    n[y * gw + gw - 1] = n[y * gw + gw - 2];
                }
            }
            const t = p; p = u; u = n; n = t;

            // Depth the object is pushed below the surface (0 when it is out of the liquid)
            const depth = Math.max(0, -Math.sin(phase));
            if (depth > 0) {
                const R = shapeRadius();
                const cx = gw / 2, cy = gh / 2;
                const cosA = Math.cos(-angle), sinA = Math.sin(-angle);
                const x0 = Math.max(1, Math.floor(cx - R - 1)), x1 = Math.min(gw - 2, Math.ceil(cx + R + 1));
                const y0 = Math.max(1, Math.floor(cy - R - 1)), y1 = Math.min(gh - 2, Math.ceil(cy + R + 1));
                for (let y = y0; y <= y1; y++) {
                    for (let x = x0; x <= x1; x++) {
                        const dx = (x - cx) / R, dy = (y - cy) / R;
                        const ux = dx * cosA - dy * sinA;
                        const uy = dx * sinA + dy * cosA;
                        if (insideShape(sh, ux, uy)) u[y * gw + x] = -depth * 0.9;
                    }
                }
            }
        };

        const drawThumper = () => {
            for (let i = 0; i < gw * gh; i++) colour(u[i] * 1.8, i * 4);
            offCtx.putImageData(img, 0, 0);
        };

        const render = () => {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(off, 0, 0, canvas.width, canvas.height);

            const dpr = canvas.width / canvas.offsetWidth;
            ctx.setTransform(dpr * CELL, 0, 0, dpr * CELL, 0, 0); // draw in grid units
            const m = params.current.mode;

            if (m === 'thumper') {
                const R = shapeRadius();
                const height = Math.sin(phase);
                const scale = R * (1 + 0.18 * height);
                const immersed = height < 0;
                ctx.save();
                ctx.translate(gw / 2, gh / 2);
                ctx.rotate(angle);
                ctx.scale(scale, scale);
                ctx.beginPath();
                const sh = params.current.shape;
                if (sh === 'circle') ctx.arc(0, 0, 1, 0, Math.PI * 2);
                else SHAPE_VERTS[sh].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
                ctx.closePath();
                ctx.fillStyle = immersed ? 'rgba(249,115,22,0.35)' : 'rgba(249,115,22,0.18)';
                ctx.fill();
                ctx.lineWidth = 2 / scale;
                ctx.strokeStyle = 'rgba(251,146,60,0.95)';
                ctx.shadowColor = 'rgba(249,115,22,0.8)';
                ctx.shadowBlur = 12;
                ctx.stroke();
                ctx.restore();
            } else {
                srcsForOverlay(m).forEach(([x, y]) => {
                    ctx.beginPath();
                    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
                    ctx.fillStyle = '#f97316';
                    ctx.shadowColor = 'rgba(249,115,22,0.9)';
                    ctx.shadowBlur = 14;
                    ctx.fill();
                    ctx.lineWidth = 0.5;
                    ctx.strokeStyle = 'white';
                    ctx.stroke();
                });
            }
            ctx.shadowBlur = 0;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        };

        const srcsForOverlay = (m: Mode) => sourcePositions(m, params.current.spacing);

        setup();

        const onResize = () => setup();
        window.addEventListener('resize', onResize);

        let lastT = performance.now();
        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - lastT) / 1000);
            lastT = now;
            const { mode: m, shape: sh, playing: pl } = params.current;

            if (m !== lastMode || sh !== lastShape) {
                if (m === 'thumper' || lastMode === 'thumper') {
                    u.fill(0); p.fill(0); n.fill(0); phase = 0; angle = 0;
                }
                lastMode = m; lastShape = sh;
            }

            if (pl) {
                simTime += dt;
                if (m === 'thumper') for (let s = 0; s < STEPS_PER_FRAME; s++) stepThumper();
            }
            if (m === 'thumper') drawThumper(); else drawInterference(m);
            render();
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
        };
    }, [resetKey]);

    const isThumper = mode === 'thumper';

    const Slider: React.FC<{
        label: string; value: number; min: number; max: number; step: number;
        unit: string; onChange: (v: number) => void;
    }> = ({ label, value, min, max, step, unit, onChange }) => (
        <label className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[9px] uppercase tracking-[0.2em] font-black text-white/50">
                <span>{label}</span>
                <span className="text-orange-400 font-mono">{value}{unit}</span>
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
                <canvas ref={canvasRef} className="w-full h-full" />

                <div className="absolute top-6 right-6 flex flex-col gap-3 w-[240px] max-h-[calc(100%-48px)] overflow-y-auto no-scrollbar">
                    <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 flex flex-col gap-3 shadow-2xl">
                        <div className="grid grid-cols-2 gap-1.5">
                            {MODES.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => setMode(m.id)}
                                    className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${mode === m.id
                                        ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]'
                                        : 'text-white/40 hover:text-white/90 hover:bg-white/5'}`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        {isThumper ? (
                            <>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {SHAPES.map((s) => (
                                        <button
                                            key={s.id}
                                            title={s.label}
                                            onClick={() => setShape(s.id)}
                                            className={`p-2 rounded-lg flex items-center justify-center transition-all duration-300 ${shape === s.id
                                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                                                : 'text-white/40 border border-transparent hover:text-white/90 hover:bg-white/5'}`}
                                        >
                                            <s.icon className="h-4 w-4" />
                                        </button>
                                    ))}
                                </div>
                                <Slider label="Dip Frequency" value={thumpFreq} min={0.3} max={5} step={0.1} unit=" Hz" onChange={setThumpFreq} />
                                <Slider label="Spin Rate" value={spin} min={-2} max={2} step={0.05} unit=" rev/s" onChange={setSpin} />
                                <Slider label="Object Size" value={size} min={40} max={200} step={5} unit="%" onChange={setSize} />
                            </>
                        ) : (
                            <>
                                <Slider label="Wavelength" value={wavelength} min={10} max={50} step={1} unit="" onChange={setWavelength} />
                                <Slider label="Source Spacing" value={spacing} min={10} max={90} step={1} unit="%" onChange={setSpacing} />
                            </>
                        )}

                        <button
                            onClick={() => setReflect(!reflect)}
                            className="flex items-center justify-between px-1"
                        >
                            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-white/50">Edge Reflection</span>
                            <span className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${reflect ? 'bg-orange-500' : 'bg-white/10'}`}>
                                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all duration-300 ${reflect ? 'left-[18px]' : 'left-0.5'}`} />
                            </span>
                        </button>

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

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/10">
                    <h3 className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Interference</h3>
                    <p className="text-white/80 text-xs font-medium leading-relaxed">
                        Coherent point sources emit circular waves that superpose. Where crests meet crests
                        the surface is amplified; where crests meet troughs it cancels, producing fixed nodal lines.
                    </p>
                </div>
                <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/10">
                    <h3 className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Thumper</h3>
                    <p className="text-white/80 text-xs font-medium leading-relaxed">
                        A prism of the chosen shape dips in and out of the liquid. The surface is solved with the 2D wave
                        equation, so the outgoing wavefront follows the object's footprint, and spinning it sweeps
                        its corners through the water. A circle has no corners, so spin makes no difference.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Waves;
