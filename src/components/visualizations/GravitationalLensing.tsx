import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Move } from 'lucide-react';

type Backdrop = 'galaxy' | 'stars' | 'grid';

const BACKDROPS: { id: Backdrop; label: string }[] = [
    { id: 'galaxy', label: 'Galaxy' },
    { id: 'stars', label: 'Starfield' },
    { id: 'grid', label: 'Grid' },
];

const CELL = 3; // screen pixels per ray

// Fast integer hash -> [0,1)
const hash2 = (x: number, y: number) => {
    let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};

const GravitationalLensing: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [mass, setMass] = useState(0.3);            // Einstein radius of the primary lens (theta_E)
    const [binary, setBinary] = useState(false);
    const [separation, setSeparation] = useState(0.35);
    const [backdrop, setBackdrop] = useState<Backdrop>('galaxy');
    const [auto, setAuto] = useState(true);
    const [showRing, setShowRing] = useState(true);
    const [resetKey, setResetKey] = useState(0);

    const params = useRef({ mass, binary, separation, backdrop, auto, showRing });
    params.current = { mass, binary, separation, backdrop, auto, showRing };

    // Source position in the source plane (units: half the smaller canvas dimension)
    const source = useRef({ x: -0.55, y: 0.18 });
    const dragging = useRef(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const off = document.createElement('canvas');
        const offCtx = off.getContext('2d')!;
        let gw = 0, gh = 0;
        let img: ImageData;
        let raf = 0;
        let t = 0;

        const setup = () => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = canvas.offsetWidth * dpr;
            canvas.height = canvas.offsetHeight * dpr;
            gw = Math.max(40, Math.floor(canvas.offsetWidth / CELL));
            gh = Math.max(40, Math.floor(canvas.offsetHeight / CELL));
            off.width = gw;
            off.height = gh;
            img = offCtx.createImageData(gw, gh);
        };
        setup();
        window.addEventListener('resize', setup);

        // Lens centres (image plane). Binary lens: two masses sharing the total mass.
        const lenses = () => {
            const { mass: m, binary: b, separation: s } = params.current;
            const e2 = m * m; // theta_E^2 is proportional to mass
            if (!b) return [{ x: 0, y: 0, m: e2 }];
            return [
                { x: -s / 2, y: 0, m: e2 * 0.6 },
                { x: s / 2, y: 0, m: e2 * 0.4 },
            ];
        };

        const render = () => {
            const { backdrop: bd } = params.current;
            const L = lenses();
            const S = Math.min(gw, gh) / 2;
            const sx = source.current.x, sy = source.current.y;
            const d = img.data;

            for (let py = 0; py < gh; py++) {
                for (let px = 0; px < gw; px++) {
                    // Image-plane angle for this pixel
                    const tx = (px - gw / 2) / S;
                    const ty = (py - gh / 2) / S;

                    // Lens equation: beta = theta - sum m_i (theta - theta_i) / |theta - theta_i|^2
                    let bx = tx, by = ty;
                    for (let i = 0; i < L.length; i++) {
                        const dx = tx - L[i].x, dy = ty - L[i].y;
                        const r2 = dx * dx + dy * dy + 0.0004; // tiny softening avoids a singular pixel
                        bx -= (L[i].m * dx) / r2;
                        by -= (L[i].m * dy) / r2;
                    }

                    // Sample the unlensed background at beta
                    let r = 3, g = 6, b = 16;

                    // Source galaxy (elliptical, rotated), plus a fixed faint companion
                    const gal = (cx: number, cy: number, size: number, ang: number, ell: number) => {
                        const ex = bx - cx, ey = by - cy;
                        const c = Math.cos(ang), s = Math.sin(ang);
                        const u = ex * c + ey * s;
                        const v = (-ex * s + ey * c) * ell;
                        return Math.exp(-Math.sqrt(u * u + v * v) / size);
                    };

                    if (bd === 'grid') {
                        const spacing = 0.12;
                        const gx = Math.abs(((bx / spacing) % 1 + 1.5) % 1 - 0.5) * spacing;
                        const gy = Math.abs(((by / spacing) % 1 + 1.5) % 1 - 0.5) * spacing;
                        const line = Math.max(0, 1 - Math.min(gx, gy) / 0.006);
                        r += 40 * line; g += 160 * line; b += 230 * line;
                    } else {
                        if (bd === 'stars') {
                            const scale = 22;
                            const ix = Math.floor(bx * scale), iy = Math.floor(by * scale);
                            const h = hash2(ix, iy);
                            if (h > 0.9) {
                                const jx = hash2(ix + 17, iy + 3), jy = hash2(ix + 5, iy + 29);
                                const ddx = bx * scale - ix - jx, ddy = by * scale - iy - jy;
                                const star = Math.exp(-(ddx * ddx + ddy * ddy) * 14) * (0.4 + 0.6 * hash2(ix + 91, iy + 7));
                                const warm = hash2(ix + 3, iy + 44);
                                r += 255 * star * (0.7 + 0.3 * warm);
                                g += 235 * star * (0.7 + 0.3 * (1 - warm) * 0.5 + 0.2);
                                b += 255 * star * (1 - 0.3 * warm);
                            }
                        }
                        const a = gal(sx, sy, 0.05, 0.6, 1.8);
                        const a2 = gal(-0.2 + sx * 0.0, 0.42, 0.04, -0.4, 1.4) * 0.5;
                        const core = Math.exp(-((bx - sx) ** 2 + (by - sy) ** 2) / 0.0006);
                        r += 255 * a + 220 * a2 + 120 * core;
                        g += 185 * a + 200 * a2 + 90 * core;
                        b += 110 * a + 255 * a2 + 60 * core;
                    }

                    const o = (py * gw + px) * 4;
                    d[o] = r > 255 ? 255 : r;
                    d[o + 1] = g > 255 ? 255 : g;
                    d[o + 2] = b > 255 ? 255 : b;
                    d[o + 3] = 255;
                }
            }
            offCtx.putImageData(img, 0, 0);

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(off, 0, 0, canvas.width, canvas.height);

            // Overlays in canvas pixel space
            const k = canvas.width / gw;
            const cx = canvas.width / 2, cy = canvas.height / 2;
            const px = (u: number) => cx + u * S * k;
            const py = (v: number) => cy + v * S * k;

            // Lens markers
            L.forEach((l) => {
                ctx.beginPath();
                ctx.arc(px(l.x), py(l.y), 5 * k / CELL + 2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0,0,0,0.9)';
                ctx.fill();
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = 'rgba(251,146,60,0.9)';
                ctx.stroke();
            });

            // Einstein ring (single lens) / combined ring estimate (binary)
            if (params.current.showRing) {
                const eTot = Math.sqrt(L.reduce((a, l) => a + l.m, 0));
                ctx.setLineDash([6, 6]);
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(147,197,253,0.45)';
                ctx.beginPath();
                ctx.arc(cx, cy, eTot * S * k, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // True (unlensed) source position marker
            ctx.beginPath();
            ctx.arc(px(sx), py(sy), 6, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(px(sx) - 10, py(sy));
            ctx.lineTo(px(sx) + 10, py(sy));
            ctx.moveTo(px(sx), py(sy) - 10);
            ctx.lineTo(px(sx), py(sy) + 10);
            ctx.stroke();
        };

        let last = performance.now();
        const loop = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            if (params.current.auto && !dragging.current) {
                t += dt;
                // Slow Lissajous drift that passes behind the lens, so you see the ring form and break
                source.current.x = 0.6 * Math.sin(t * 0.35);
                source.current.y = 0.28 * Math.sin(t * 0.53 + 1.0);
            }
            render();
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', setup);
        };
    }, [resetKey]);

    const moveSource = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const S = Math.min(rect.width, rect.height) / 2;
        source.current.x = (e.clientX - rect.left - rect.width / 2) / S;
        source.current.y = (e.clientY - rect.top - rect.height / 2) / S;
    };

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

    const Toggle: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
        <button onClick={() => onChange(!value)} className="flex items-center justify-between px-1">
            <span className="text-[9px] uppercase tracking-[0.2em] font-black text-white/50">{label}</span>
            <span className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${value ? 'bg-orange-500' : 'bg-white/10'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all duration-300 ${value ? 'left-[18px]' : 'left-0.5'}`} />
            </span>
        </button>
    );

    return (
        <div className="w-full h-full flex flex-col bg-[#050505] p-8 overflow-hidden">
            <div className="flex-1 relative rounded-2xl border border-white/5 bg-zinc-900/20 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-crosshair touch-none"
                    onPointerDown={(e) => {
                        dragging.current = true;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setAuto(false);
                        moveSource(e);
                    }}
                    onPointerMove={(e) => { if (dragging.current) moveSource(e); }}
                    onPointerUp={() => { dragging.current = false; }}
                />

                <div className="absolute bottom-6 left-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-black text-white/40 pointer-events-none">
                    <Move className="h-3.5 w-3.5" /> Drag to move the background source
                </div>

                <div className="absolute top-6 right-6 flex flex-col gap-3 w-[240px] max-h-[calc(100%-48px)] overflow-y-auto no-scrollbar">
                    <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 flex flex-col gap-3 shadow-2xl">
                        <div className="grid grid-cols-3 gap-1.5">
                            {BACKDROPS.map((b) => (
                                <button
                                    key={b.id}
                                    onClick={() => setBackdrop(b.id)}
                                    className={`px-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${backdrop === b.id
                                        ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]'
                                        : 'text-white/40 hover:text-white/90 hover:bg-white/5'}`}
                                >
                                    {b.label}
                                </button>
                            ))}
                        </div>

                        <Slider label="Lens Mass (Einstein radius)" value={mass} min={0.1} max={0.6} step={0.01} onChange={setMass} />
                        <Toggle label="Binary Lens" value={binary} onChange={setBinary} />
                        {binary && <Slider label="Lens Separation" value={separation} min={0.05} max={0.9} step={0.01} onChange={setSeparation} />}
                        <Toggle label="Einstein Ring Guide" value={showRing} onChange={setShowRing} />

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setAuto(!auto)}
                                className="py-3 rounded-xl flex items-center justify-center gap-2 font-black tracking-widest text-[10px] uppercase bg-blue-600 text-white hover:bg-blue-500 transition-all"
                            >
                                {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                                {auto ? 'Pause' : 'Drift'}
                            </button>
                            <button
                                onClick={() => { source.current = { x: -0.55, y: 0.18 }; setAuto(true); setResetKey((k) => k + 1); }}
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
                    <h3 className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Einstein Ring</h3>
                    <p className="text-white/80 text-xs font-medium leading-relaxed">
                        When the source, lens and observer line up, light from every side of the source bends round the lens
                        into a perfect ring. Its angular radius grows with the square root of the lens mass.
                    </p>
                </div>
                <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/10">
                    <h3 className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Arcs and Images</h3>
                    <p className="text-white/80 text-xs font-medium leading-relaxed">
                        Slightly off-axis, the ring breaks into two distorted images: a bright one outside the ring, a fainter
                        one inside. Each image is stretched along the ring and magnified, which is how distant galaxies are seen.
                    </p>
                </div>
                <div className="p-6 rounded-2xl border border-white/5 bg-zinc-900/10">
                    <h3 className="text-red-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Method</h3>
                    <p className="text-white/80 text-xs font-medium leading-relaxed">
                        Every pixel is traced back through the lens equation (β = θ − Σ θ<sub>E</sub>²·Δθ/|Δθ|²) to find which point
                        of the background it shows. A binary lens produces caustics and extra images.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GravitationalLensing;
