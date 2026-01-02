import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, ZoomIn, Maximize2, MousePointerClick } from 'lucide-react';

const Mandelbrot = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [view, setView] = useState({
        x: -0.5,
        y: 0,
        zoom: 1,
    });
    const [maxIterations, setMaxIterations] = useState(100);
    const [isZooming, setIsZooming] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Zoom speed per frame (1.05 = 5% increase)
    const ZOOM_SPEED = 1.05;

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        const zoomScale = 4 / (view.zoom * Math.min(width, height));

        for (let ix = 0; ix < width; ix++) {
            for (let iy = 0; iy < height; iy++) {
                const x0 = (ix - width / 2) * zoomScale + view.x;
                const y0 = (iy - height / 2) * zoomScale + view.y;

                let x = 0;
                let y = 0;
                let iteration = 0;

                // Optimization: use x*x + y*y precalculated if needed, 
                // but basic loop is clearer for science visualization
                while (x * x + y * y <= 4 && iteration < maxIterations) {
                    const xTemp = x * x - y * y + x0;
                    y = 2 * x * y + y0;
                    x = xTemp;
                    iteration++;
                }

                const pixelIndex = (iy * width + ix) * 4;
                if (iteration === maxIterations) {
                    data[pixelIndex] = 0;
                    data[pixelIndex + 1] = 0;
                    data[pixelIndex + 2] = 0;
                } else {
                    const t = iteration / maxIterations;
                    // Science aesthetic: Blues to Oranges
                    data[pixelIndex] = Math.min(255, t * 500);
                    data[pixelIndex + 1] = Math.min(255, t * 200);
                    data[pixelIndex + 2] = Math.min(255, (1 - t) * 150);
                }
                data[pixelIndex + 3] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }, [view, maxIterations]);

    // Handle continuous zoom loop
    useEffect(() => {
        if (!isZooming) return;

        let animationFrameId: number;

        const performZoom = () => {
            setView(prev => {
                const canvas = canvasRef.current;
                if (!canvas) return prev;

                const width = canvas.width;
                const height = canvas.height;
                const zoomScale = 4 / (prev.zoom * Math.min(width, height));

                // Point in complex plane currently under mouse
                const targetX = (mousePos.x - width / 2) * zoomScale + prev.x;
                const targetY = (mousePos.y - height / 2) * zoomScale + prev.y;

                const newZoom = prev.zoom * ZOOM_SPEED;
                const newZoomScale = 4 / (newZoom * Math.min(width, height));

                // Re-calculate center so target point stays under mouse
                const newX = targetX - (mousePos.x - width / 2) * newZoomScale;
                const newY = targetY - (mousePos.y - height / 2) * newZoomScale;

                return {
                    x: newX,
                    y: newY,
                    zoom: newZoom
                };
            });

            // Gradually increase iterations as we zoom in
            setMaxIterations(prev => {
                const zoomLog = Math.log10(view.zoom);
                return Math.min(1000, 100 + Math.floor(zoomLog * 50));
            });

            animationFrameId = requestAnimationFrame(performZoom);
        };

        animationFrameId = requestAnimationFrame(performZoom);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isZooming, mousePos, view.zoom]);

    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth - 300;
                canvasRef.current.height = window.innerHeight;
                draw();
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, [draw]);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        setIsZooming(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isZooming) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handlePointerUp = () => {
        setIsZooming(false);
    };

    const resetView = () => {
        setView({ x: -0.5, y: 0, zoom: 1 });
        setMaxIterations(100);
    };

    return (
        <div className="w-full h-full bg-[#050505] relative overflow-hidden flex items-center justify-center select-none">
            <div className="absolute top-24 left-8 text-left pointer-events-none z-10">
                <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Chaos Theory</h2>
                <div className="flex items-center gap-2 mt-1">
                    <Maximize2 size={12} className="text-orange-500 animate-pulse" />
                    <p className="text-orange-500/60 text-[10px] uppercase tracking-[0.3em] font-bold">Infinite Depth Engine</p>
                </div>
            </div>

            <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="cursor-crosshair shadow-2xl touch-none"
            />

            {/* Instruction Banner */}
            {!isZooming && view.zoom === 1 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-4 bg-orange-500/10 border border-orange-500/20 rounded-full backdrop-blur-xl pointer-events-none animate-bounce">
                    <div className="flex items-center gap-3">
                        <MousePointerClick size={16} className="text-orange-500" />
                        <span className="text-[10px] font-black text-white tracking-[0.2em] uppercase">Hold to dive into chaos</span>
                    </div>
                </div>
            )}

            {/* Controls Overlay */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex gap-4 p-2 bg-zinc-950/80 border border-orange-500/20 rounded-2xl backdrop-blur-xl shadow-2xl">
                <div className="px-6 py-3 flex items-center gap-4 border-r border-orange-500/10">
                    <ZoomIn size={14} className="text-orange-500" />
                    <span className="text-[10px] font-black text-white/80 tracking-widest uppercase">
                        Depth: {view.zoom > 1000 ? view.zoom.toExponential(2) : Math.round(view.zoom).toLocaleString()}x
                    </span>
                </div>
                <button
                    onClick={resetView}
                    className="flex items-center gap-3 px-6 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-all group"
                >
                    <RotateCcw size={14} className="text-orange-500 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="text-[10px] font-black text-orange-200 tracking-widest uppercase">Recall Observer</span>
                </button>
            </div>

            <div className="absolute top-24 right-8 bg-zinc-950/80 p-6 rounded-2xl border border-orange-500/10 backdrop-blur-md pointer-events-none max-w-[200px]">
                <p className="text-[10px] text-orange-500/60 font-black tracking-[0.2em] uppercase mb-4 text-right">Singularity Data</p>
                <div className="space-y-2 text-[9px] font-mono text-white/40 uppercase">
                    <div className="flex justify-between"><span>X_VEC</span> <span>{view.x.toFixed(6)}</span></div>
                    <div className="flex justify-between"><span>Y_VEC</span> <span>{view.y.toFixed(6)}</span></div>
                    <div className="flex justify-between"><span>RECUR</span> <span>{maxIterations}</span></div>
                </div>
                <div className="mt-6 pt-4 border-t border-orange-500/10">
                    <p className="text-[8px] text-zinc-500 uppercase leading-relaxed font-bold">
                        Hold Mouse1 to continuously converge. Center of mass shifts toward pointer.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Mandelbrot;
