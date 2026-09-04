import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { 
    RotateCcw, ZoomIn, ZoomOut, Hash, Layers, Sliders, Crosshair, 
    TrendingUp, Grid, Sparkles, Compass, Activity, Disc, Cpu, Loader2 
} from 'lucide-react';

// Sieve of Eratosthenes base engine + Segmented Sieve & Miller-Rabin for scales up to 1,000,000,000 (1000M)
// 1 is explicitly assumed to be prime across all computations and plots.
class PrimeEngine {
    private maxBaseComputed: number = 0;
    private isPrimeBase: Uint8Array | null = null;
    private basePrimesList: Int32Array | null = null;

    constructor() {
        this.computeBaseSieve(2000000);
    }

    computeBaseSieve(limit: number) {
        const target = Math.min(10000000, Math.max(50000, limit));
        if (target <= this.maxBaseComputed && this.isPrimeBase) return;

        const bits = new Uint8Array(target + 1);
        bits.fill(1);
        bits[0] = 0;
        bits[1] = 1; // 1 is assumed prime

        for (let p = 2; p * p <= target; p++) {
            if (bits[p]) {
                for (let i = p * p; i <= target; i += p) {
                    bits[i] = 0;
                }
            }
        }

        let count = 1;
        for (let i = 2; i <= target; i++) {
            if (bits[i]) count++;
        }

        const list = new Int32Array(count);
        list[0] = 1;
        let idx = 1;
        for (let i = 2; i <= target; i++) {
            if (bits[i]) {
                list[idx++] = i;
            }
        }

        this.isPrimeBase = bits;
        this.basePrimesList = list;
        this.maxBaseComputed = target;
    }

    isPrime(n: number): boolean {
        const abs = Math.abs(n);
        if (abs === 1) return true;
        if (abs === 0) return false;
        if (abs <= this.maxBaseComputed && this.isPrimeBase) {
            return this.isPrimeBase[abs] === 1;
        }
        if (abs % 2 === 0 || abs % 3 === 0) return false;

        let d = abs - 1;
        let s = 0;
        while (d % 2 === 0) {
            d /= 2;
            s++;
        }

        const bases = [2, 7, 61];
        for (const a of bases) {
            if (abs <= a) break;
            let x = BigInt(a);
            let exp = BigInt(d);
            const mod = BigInt(abs);
            let res = 1n;
            x = x % mod;
            while (exp > 0n) {
                if (exp % 2n === 1n) res = (res * x) % mod;
                exp = exp / 2n;
                x = (x * x) % mod;
            }
            if (res === 1n || res === BigInt(abs - 1)) continue;

            let composite = true;
            for (let r = 1; r < s; r++) {
                res = (res * res) % mod;
                if (res === BigInt(abs - 1)) {
                    composite = false;
                    break;
                }
            }
            if (composite) return false;
        }
        return true;
    }

    getPrimesInInterval(low: number, high: number): number[] {
        const l = Math.max(1, Math.floor(low));
        const r = Math.min(1000000000, Math.ceil(high));
        if (l > r) return [];

        const size = r - l + 1;
        if (size > 80000) return [];

        const isPrimeSeg = new Uint8Array(size);
        isPrimeSeg.fill(1);

        const sqrtR = Math.floor(Math.sqrt(r));
        if (this.basePrimesList) {
            for (let i = 1; i < this.basePrimesList.length; i++) {
                const p = this.basePrimesList[i];
                if (p > sqrtR) break;
                let start = Math.floor((l + p - 1) / p) * p;
                if (start < p * p) start = p * p;
                for (let j = start; j <= r; j += p) {
                    isPrimeSeg[j - l] = 0;
                }
            }
        }

        const res: number[] = [];
        for (let i = 0; i < size; i++) {
            if (isPrimeSeg[i]) {
                const val = l + i;
                if (val >= 1) res.push(val);
            }
        }
        return res;
    }

    getPrimesUpTo(limit: number): number[] {
        const absLimit = Math.min(10000000, Math.abs(limit));
        if (absLimit < 1) return [];
        if (absLimit > this.maxBaseComputed) {
            this.computeBaseSieve(absLimit);
        }
        if (!this.basePrimesList) return [1];

        let low = 0;
        let high = this.basePrimesList.length - 1;
        let boundIdx = -1;

        while (low <= high) {
            const mid = (low + high) >> 1;
            if (this.basePrimesList[mid] <= absLimit) {
                boundIdx = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        const result: number[] = [];
        if (boundIdx >= 0) {
            for (let i = 0; i <= boundIdx; i++) {
                result.push(this.basePrimesList[i]);
            }
        }
        return result;
    }

    getPrimesCountUpTo(limit: number): number {
        const absLimit = Math.abs(limit);
        if (absLimit < 1) return 0;

        if (absLimit <= this.maxBaseComputed && this.basePrimesList) {
            let low = 0;
            let high = this.basePrimesList.length - 1;
            let boundIdx = -1;

            while (low <= high) {
                const mid = (low + high) >> 1;
                if (this.basePrimesList[mid] <= absLimit) {
                    boundIdx = mid;
                    low = mid + 1;
                } else {
                    high = mid - 1;
                }
            }
            return boundIdx + 1;
        }

        const lnX = Math.log(absLimit);
        const approx = Math.round((absLimit / lnX) * (1 + 1 / lnX + 2 / (lnX * lnX) + 6 / Math.pow(lnX, 3)));
        return approx + 1;
    }
}

const primeEngine = new PrimeEngine();

// Fibonacci numbers precomputed up to 1,000,000,000
const FIBONACCI_NUMBERS: number[] = (() => {
    const list: number[] = [0, 1, 1];
    let a = 1, b = 1;
    while (b <= 1000000000) {
        const c = a + b;
        list.push(c);
        a = b;
        b = c;
    }
    return list;
})();

const FIBONACCI_SET = new Set(FIBONACCI_NUMBERS);
const isFibonacci = (n: number) => FIBONACCI_SET.has(Math.abs(n));
const getFibIndex = (n: number): number => FIBONACCI_NUMBERS.indexOf(Math.abs(n));

// Gaussian Primes check in Z[i]
function isGaussianPrime(x: number, y: number): boolean {
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    if (ax === 0 && ay === 0) return false;
    if (ax === 0) return primeEngine.isPrime(ay) && ay % 4 === 3;
    if (ay === 0) return primeEngine.isPrime(ax) && ax % 4 === 3;
    const norm = ax * ax + ay * ay;
    return primeEngine.isPrime(norm);
}

// Collatz total stopping time calculation
const collatzCache = new Map<number, number>();
function getCollatzSteps(n: number): number {
    const abs = Math.abs(n);
    if (abs <= 1) return 0;
    if (collatzCache.has(abs)) return collatzCache.get(abs)!;

    let cur = BigInt(abs);
    let steps = 0;
    while (cur > 1n && steps < 1200) {
        if (cur % 2n === 0n) {
            cur = cur / 2n;
        } else {
            cur = 3n * cur + 1n;
        }
        steps++;
    }
    collatzCache.set(abs, steps);
    return steps;
}

// Euler's Totient function phi(n)
function getEulerTotient(n: number): number {
    let abs = Math.abs(n);
    if (abs <= 1) return 1;
    let result = abs;
    let p = 2;
    while (p * p <= abs) {
        if (abs % p === 0) {
            while (abs % p === 0) abs = Math.floor(abs / p);
            result -= Math.floor(result / p);
        }
        p++;
    }
    if (abs > 1) {
        result -= Math.floor(result / abs);
    }
    return result;
}

type PlotMode = 
    | 'axis-cross' 
    | 'prime-matrix' 
    | 'gaussian-primes' 
    | 'fibonacci-primes' 
    | 'phyllotaxis-spiral' 
    | 'collatz-primes' 
    | 'euler-totient' 
    | 'pythagorean-primes';

type FibPlotType = 'curve' | 'lattice';

const MAX_SCALE = 1000000000; // 1000M = 1 Billion

const PRESET_RANGES = [
    { label: '50', value: 50 },
    { label: '500', value: 500 },
    { label: '10K', value: 10000 },
    { label: '100K', value: 100000 },
    { label: '1M', value: 1000000 },
    { label: '10M', value: 10000000 },
    { label: '100M', value: 100000000 },
    { label: '500M', value: 500000000 },
    { label: '1000M', value: 1000000000 },
];

export const Primes: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [sliderVal, setSliderVal] = useState<number>(188); // ~50
    const [range, setRange] = useState<number>(50);
    const [showPrimeGridlines, setShowPrimeGridlines] = useState<boolean>(false);
    const [highlightTwinPrimes, setHighlightTwinPrimes] = useState<boolean>(false);
    const [plotMode, setPlotMode] = useState<PlotMode>('axis-cross');
    const [fibType, setFibType] = useState<FibPlotType>('curve');
    const [isComputing, setIsComputing] = useState<boolean>(false);

    // Pan and Zoom states
    const [zoom, setZoom] = useState<number>(1);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

    // Hover inspection
    const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

    const sliderToRange = useCallback((s: number): number => {
        if (s <= 0) return 0;
        if (s >= 1000) return MAX_SCALE;
        const exp = (s / 1000) * 9;
        const val = Math.round(Math.pow(10, exp));
        return Math.min(MAX_SCALE, Math.max(1, val));
    }, []);

    const rangeToSlider = useCallback((r: number): number => {
        if (r <= 0) return 0;
        if (r >= MAX_SCALE) return 1000;
        const s = (Math.log10(Math.max(1, r)) / 9) * 1000;
        return Math.min(1000, Math.max(0, Math.round(s)));
    }, []);

    const handleModeSelect = (mode: PlotMode) => {
        if (mode === plotMode && !isComputing) return;
        setIsComputing(true);
        setPlotMode(mode);
    };

    const handleFibTypeSelect = (type: FibPlotType) => {
        if (type === fibType && !isComputing) return;
        setIsComputing(true);
        setFibType(type);
    };

    const handleToggleGridlines = () => {
        setIsComputing(true);
        setShowPrimeGridlines(prev => !prev);
    };

    const handleToggleTwinPrimes = () => {
        setIsComputing(true);
        setHighlightTwinPrimes(prev => !prev);
    };

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const sVal = parseFloat(e.target.value);
        setSliderVal(sVal);
        const rVal = sliderToRange(sVal);
        setIsComputing(true);
        setRange(rVal);
    };

    const handlePresetSelect = (val: number) => {
        setIsComputing(true);
        setRange(val);
        setSliderVal(rangeToSlider(val));
        setPan({ x: 0, y: 0 });
        setZoom(1);
    };

    const resetView = () => {
        setIsComputing(true);
        setPan({ x: 0, y: 0 });
        setZoom(1);
    };

    const handleZoomIn = () => {
        setIsComputing(true);
        setZoom(prev => Math.min(100000, prev * 1.5));
    };

    const handleZoomOut = () => {
        setIsComputing(true);
        setZoom(prev => Math.max(0.01, prev / 1.5));
    };

    const basePrimes = useMemo(() => {
        return primeEngine.getPrimesUpTo(Math.min(2000000, range));
    }, [range]);

    const primeCount = useMemo(() => {
        return primeEngine.getPrimesCountUpTo(range);
    }, [range]);

    // Fibonacci pairs (p_n, F_n)
    const fibonacciPairs = useMemo(() => {
        const pairs: { n: number; prime: number; fib: number }[] = [];
        const maxLen = Math.min(basePrimes.length, FIBONACCI_NUMBERS.length - 1);
        for (let i = 1; i < maxLen; i++) {
            const p = basePrimes[i - 1];
            const f = FIBONACCI_NUMBERS[i];
            if (p <= range || f <= range) {
                pairs.push({ n: i, prime: p, fib: f });
            }
            if (p > range && f > range) break;
        }
        return pairs;
    }, [basePrimes, range]);

    // Primitive Pythagorean triples with prime hypotenuse (a^2 + b^2 = p^2)
    const pythagoreanTriples = useMemo(() => {
        const triples: { a: number; b: number; c: number }[] = [];
        if (range > 500000) return triples;
        const limit = Math.min(25000, range);
        const primesSub = basePrimes.filter(p => p <= limit && p % 4 === 1);

        for (const p of primesSub) {
            let found = false;
            for (let u = 1; u * u < p; u++) {
                const v2 = p - u * u;
                const v = Math.round(Math.sqrt(v2));
                if (v * v === v2 && u > v) {
                    const a = u * u - v * v;
                    const b = 2 * u * v;
                    triples.push({ a, b, c: p });
                    found = true;
                    break;
                }
            }
            if (!found) continue;
        }
        return triples;
    }, [basePrimes, range]);

    // Draw the Cartesian graph
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);

        const originX = width / 2 + pan.x;
        const originY = height / 2 + pan.y;

        const currentRange = Math.max(1, range);
        const baseScale = ((Math.min(width, height) * 0.85) / 2) / currentRange;
        const scale = baseScale * zoom;

        const xMin = (0 - originX) / scale;
        const xMax = (width - originX) / scale;
        const yMin = (originY - height) / scale;
        const yMax = (originY - 0) / scale;

        // Dynamic standard grid lines
        const targetGridPixels = 60;
        const roughStep = targetGridPixels / scale;
        const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(0.0001, roughStep))));
        let step = magnitude;
        if (roughStep / magnitude >= 5) {
            step = magnitude * 5;
        } else if (roughStep / magnitude >= 2) {
            step = magnitude * 2;
        }
        step = Math.max(1, Math.round(step));

        // Subgrid lines
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';

        const firstGridX = Math.floor(xMin / step) * step;
        const lastGridX = Math.ceil(xMax / step) * step;
        for (let gx = firstGridX; gx <= lastGridX; gx += step) {
            if (gx === 0) continue;
            const px = originX + gx * scale;
            ctx.beginPath();
            ctx.moveTo(px, 0);
            ctx.lineTo(px, height);
            ctx.stroke();
        }

        const firstGridY = Math.floor(yMin / step) * step;
        const lastGridY = Math.ceil(yMax / step) * step;
        for (let gy = firstGridY; gy <= lastGridY; gy += step) {
            if (gy === 0) continue;
            const py = originY - gy * scale;
            ctx.beginPath();
            ctx.moveTo(0, py);
            ctx.lineTo(width, py);
            ctx.stroke();
        }

        // Primary X and Y axes
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.35)';
        ctx.lineWidth = 1.5;

        // X Axis
        ctx.beginPath();
        ctx.moveTo(0, originY);
        ctx.lineTo(width, originY);
        ctx.stroke();

        // Y Axis
        ctx.beginPath();
        ctx.moveTo(originX, 0);
        ctx.lineTo(originX, height);
        ctx.stroke();

        // Axis Tick Labels & Marks
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const formatTick = (val: number): string => {
            const abs = Math.abs(val);
            const sign = val < 0 ? '-' : '+';
            if (abs >= 1000000000) return `${sign}${(abs / 1000000000).toFixed(abs % 1000000000 === 0 ? 0 : 1)}B`;
            if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(abs % 1000000 === 0 ? 0 : 1)}M`;
            if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1)}k`;
            return `${val}`;
        };

        // X Ticks
        for (let gx = firstGridX; gx <= lastGridX; gx += step) {
            if (gx === 0) continue;
            const px = originX + gx * scale;
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
            ctx.beginPath();
            ctx.moveTo(px, originY - 3);
            ctx.lineTo(px, originY + 3);
            ctx.stroke();

            const labelY = Math.min(height - 18, Math.max(12, originY + 6));
            ctx.fillText(formatTick(gx), px, labelY);
        }

        // Y Ticks
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let gy = firstGridY; gy <= lastGridY; gy += step) {
            if (gy === 0) continue;
            const py = originY - gy * scale;
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
            ctx.beginPath();
            ctx.moveTo(originX - 3, py);
            ctx.lineTo(originX + 3, py);
            ctx.stroke();

            const labelX = Math.min(width - 8, Math.max(38, originX - 6));
            ctx.fillText(formatTick(gy), labelX, py);
        }

        // Origin label
        ctx.fillStyle = 'rgba(249, 115, 22, 0.7)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('(0, 0)', originX - 6, originY + 6);

        // Guide lines for x = ±1 and y = ±1
        if (scale >= 4) {
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.15)';
            ctx.setLineDash([4, 4]);
            [-1, 1].forEach(offset => {
                const px = originX + offset * scale;
                ctx.beginPath();
                ctx.moveTo(px, 0);
                ctx.lineTo(px, height);
                ctx.stroke();

                const py = originY - offset * scale;
                ctx.beginPath();
                ctx.moveTo(0, py);
                ctx.lineTo(width, py);
                ctx.stroke();
            });
            ctx.setLineDash([]);
        }

        const pointRadius = Math.max(1.2, Math.min(4.5, scale * 0.45));
        const isDenseSpectrum = scale < 0.08;

        // CONFIG: PRIME GRIDLINES
        if (showPrimeGridlines) {
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.14)';
            ctx.setLineDash([3, 3]);

            if (isDenseSpectrum) {
                ctx.fillStyle = 'rgba(249, 115, 22, 0.04)';
                const minPx = originX - Math.min(range, MAX_SCALE) * scale;
                const maxPx = originX + Math.min(range, MAX_SCALE) * scale;
                const minPy = originY - Math.min(range, MAX_SCALE) * scale;
                const maxPy = originY + Math.min(range, MAX_SCALE) * scale;
                ctx.fillRect(minPx, maxPy, maxPx - minPx, minPy - maxPy);
            } else {
                let pList = basePrimes;
                if (range > 2000000 && Math.max(xMax - xMin, yMax - yMin) <= 50000) {
                    const segX = primeEngine.getPrimesInInterval(Math.max(0, xMin), Math.min(range, xMax));
                    const segY = primeEngine.getPrimesInInterval(Math.max(0, yMin), Math.min(range, yMax));
                    pList = Array.from(new Set([...segX, ...segY]));
                }

                for (const p of pList) {
                    if (p > range) continue;
                    [p, -p].forEach(val => {
                        if (val >= xMin && val <= xMax) {
                            const px = originX + val * scale;
                            ctx.beginPath();
                            ctx.moveTo(px, 0);
                            ctx.lineTo(px, height);
                            ctx.stroke();
                        }
                        if (val >= yMin && val <= yMax) {
                            const py = originY - val * scale;
                            ctx.beginPath();
                            ctx.moveTo(0, py);
                            ctx.lineTo(width, py);
                            ctx.stroke();
                        }
                    });
                }
            }
            ctx.setLineDash([]);
        }

        // CONFIG: HIGHLIGHT TWIN PRIMES OVERLAY
        if (highlightTwinPrimes && !isDenseSpectrum) {
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 1.2;
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 6;

            const twinLimit = Math.min(50000, range);
            const primesForTwins = basePrimes.filter(p => p <= twinLimit);

            for (let i = 0; i < primesForTwins.length - 1; i++) {
                const p1 = primesForTwins[i];
                const p2 = primesForTwins[i + 1];
                if (p2 - p1 === 2) {
                    [1, -1].forEach(sgn => {
                        const px1 = originX + p1 * sgn * scale;
                        const px2 = originX + p2 * sgn * scale;
                        const py = originY - 1 * sgn * scale;

                        if (px1 >= -20 && px2 <= width + 20) {
                            ctx.beginPath();
                            ctx.arc((px1 + px2) / 2, py, Math.abs(px2 - px1) / 2, Math.PI, 0);
                            ctx.stroke();
                        }
                    });
                }
            }
            ctx.shadowBlur = 0;
        }

        // ==========================================
        // PLOTTING ARCHITECTURES
        // ==========================================
        if (plotMode === 'gaussian-primes') {
            ctx.fillStyle = '#38bdf8';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = scale > 2 ? 6 : 0;

            const bound = Math.min(range, isDenseSpectrum ? 500 : 3000);
            const xStart = Math.max(-bound, Math.floor(xMin));
            const xEnd = Math.min(bound, Math.ceil(xMax));
            const yStart = Math.max(-bound, Math.floor(yMin));
            const yEnd = Math.min(bound, Math.ceil(yMax));

            const stride = (xEnd - xStart) * (yEnd - yStart) > 60000 ? 2 : 1;

            for (let x = xStart; x <= xEnd; x += stride) {
                const px = originX + x * scale;
                for (let y = yStart; y <= yEnd; y += stride) {
                    if (isGaussianPrime(x, y)) {
                        const py = originY - y * scale;
                        ctx.beginPath();
                        ctx.arc(px, py, Math.max(1.5, pointRadius * 0.9), 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
            ctx.shadowBlur = 0;
        } else if (plotMode === 'phyllotaxis-spiral') {
            const GOLDEN_ANGLE = 137.50776405 * (Math.PI / 180);
            const maxPoints = Math.min(basePrimes.length, 12000);
            const rScale = scale * (currentRange > 1000 ? Math.sqrt(currentRange) * 0.05 : 1.8);

            ctx.fillStyle = '#a855f7';
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 4;

            for (let n = 1; n <= maxPoints; n++) {
                const p = basePrimes[n - 1];
                const theta = n * GOLDEN_ANGLE;
                const r = Math.sqrt(p) * rScale;

                const px = originX + r * Math.cos(theta);
                const py = originY - r * Math.sin(theta);

                if (px < -10 || px > width + 10 || py < -10 || py > height + 10) continue;

                ctx.beginPath();
                ctx.arc(px, py, Math.max(1.8, pointRadius * 0.8), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.shadowBlur = 0;
        } else if (plotMode === 'collatz-primes') {
            ctx.fillStyle = '#ec4899';
            ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
            ctx.lineWidth = 1;

            const collatzLimit = Math.min(25000, basePrimes.length);
            for (let i = 0; i < collatzLimit; i++) {
                const p = basePrimes[i];
                if (p > range) break;
                const steps = getCollatzSteps(p);

                [1, -1].forEach(sx => {
                    [1, -1].forEach(sy => {
                        const px = originX + p * sx * scale;
                        const py = originY - steps * sy * scale;

                        if (px < -10 || px > width + 10 || py < -10 || py > height + 10) return;

                        ctx.beginPath();
                        ctx.arc(px, py, Math.max(2, pointRadius), 0, Math.PI * 2);
                        ctx.fill();
                    });
                });
            }
        } else if (plotMode === 'euler-totient') {
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.8)';
            
            ctx.beginPath();
            const minDiag = Math.max(-range, xMin);
            const maxDiag = Math.min(range, xMax);
            ctx.moveTo(originX + minDiag * scale, originY - (minDiag - 1) * scale);
            ctx.lineTo(originX + maxDiag * scale, originY - (maxDiag - 1) * scale);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            const sampleLimit = Math.min(2000, Math.floor(range));
            const stepTotient = sampleLimit > 500 ? Math.floor(sampleLimit / 500) : 1;

            for (let n = 2; n <= sampleLimit; n += stepTotient) {
                const phi = getEulerTotient(n);
                [1, -1].forEach(sgn => {
                    const px = originX + n * sgn * scale;
                    const py = originY - phi * sgn * scale;

                    if (px < -10 || px > width + 10 || py < -10 || py > height + 10) return;

                    ctx.beginPath();
                    ctx.arc(px, py, primeEngine.isPrime(n) ? Math.max(2.5, pointRadius + 1) : 1.5, 0, Math.PI * 2);
                    if (primeEngine.isPrime(n)) {
                        ctx.fillStyle = '#f97316';
                        ctx.fill();
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
                    } else {
                        ctx.fill();
                    }
                });
            }
        } else if (plotMode === 'pythagorean-primes') {
            ctx.fillStyle = '#10b981';
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
            ctx.lineWidth = 1;

            for (const { a, b, c } of pythagoreanTriples) {
                if (scale * c < width / 2) {
                    ctx.beginPath();
                    ctx.arc(originX, originY, c * scale, 0, Math.PI * 2);
                    ctx.stroke();
                }

                const pointPairs = [
                    [a, b], [b, a], [-a, b], [-b, a],
                    [-a, -b], [-b, -a], [a, -b], [b, -a]
                ];

                for (const [x, y] of pointPairs) {
                    const px = originX + x * scale;
                    const py = originY - y * scale;

                    if (px < -10 || px > width + 10 || py < -10 || py > height + 10) continue;

                    ctx.beginPath();
                    ctx.arc(px, py, Math.max(2.5, pointRadius + 1), 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (plotMode === 'fibonacci-primes') {
            if (fibType === 'curve') {
                const quadrants = [
                    { sx: 1, sy: 1, color: '#eab308' },
                    { sx: -1, sy: 1, color: '#f59e0b' },
                    { sx: -1, sy: -1, color: '#d97706' },
                    { sx: 1, sy: -1, color: '#fbbf24' },
                ];

                quadrants.forEach(({ sx, sy, color }) => {
                    ctx.strokeStyle = `${color}88`;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    let started = false;

                    for (const pair of fibonacciPairs) {
                        const px = originX + pair.prime * sx * scale;
                        const py = originY - pair.fib * sy * scale;

                        if (!started) {
                            ctx.moveTo(px, py);
                            started = true;
                        } else {
                            ctx.lineTo(px, py);
                        }
                    }
                    ctx.stroke();

                    ctx.fillStyle = color;
                    for (const pair of fibonacciPairs) {
                        const px = originX + pair.prime * sx * scale;
                        const py = originY - pair.fib * sy * scale;

                        if (px < -10 || px > width + 10 || py < -10 || py > height + 10) continue;

                        ctx.beginPath();
                        ctx.arc(px, py, Math.max(2.5, pointRadius + 1), 0, Math.PI * 2);
                        ctx.fill();

                        if (scale >= 1.5 && sx === 1 && sy === 1) {
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                            ctx.font = '9px "JetBrains Mono", monospace';
                            ctx.textAlign = 'left';
                            ctx.textBaseline = 'bottom';
                            ctx.fillText(`F${pair.n}(${pair.prime},${pair.fib})`, px + 5, py - 3);
                            ctx.fillStyle = color;
                        }
                    }
                });
            } else {
                const visibleFibY = FIBONACCI_NUMBERS.filter(f => f <= range && ((f >= yMin && f <= yMax) || (-f >= yMin && -f <= yMax)));
                const visiblePrimesX = basePrimes.filter(p => p <= range && ((p >= xMin && p <= xMax) || (-p >= xMin && -p <= xMax)));

                ctx.strokeStyle = 'rgba(234, 179, 8, 0.15)';
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 2]);
                for (const f of visibleFibY) {
                    [f, -f].forEach(val => {
                        if (val >= yMin && val <= yMax) {
                            const py = originY - val * scale;
                            ctx.beginPath();
                            ctx.moveTo(0, py);
                            ctx.lineTo(width, py);
                            ctx.stroke();
                        }
                    });
                }
                ctx.setLineDash([]);

                ctx.fillStyle = '#eab308';
                const isTiny = pointRadius <= 1.5;

                for (const p of visiblePrimesX) {
                    [p, -p].forEach(xVal => {
                        if (xVal < xMin || xVal > xMax) return;
                        const px = originX + xVal * scale;

                        for (const f of visibleFibY) {
                            [f, -f].forEach(yVal => {
                                if (yVal < yMin || yVal > yMax) return;
                                const py = originY - yVal * scale;

                                if (isTiny) {
                                    ctx.fillRect(px - 1, py - 1, 2, 2);
                                } else {
                                    ctx.beginPath();
                                    ctx.arc(px, py, pointRadius, 0, Math.PI * 2);
                                    ctx.fill();
                                }
                            });
                        }
                    });
                }
            }
        } else if (plotMode === 'axis-cross') {
            ctx.fillStyle = '#f97316';
            const isTiny = pointRadius <= 1.5;

            if (isDenseSpectrum) {
                ctx.strokeStyle = '#f97316';
                ctx.lineWidth = Math.max(1.5, pointRadius * 1.5);
                ctx.shadowColor = '#f97316';
                ctx.shadowBlur = 8;

                [-1, 1].forEach(xCoord => {
                    const px = originX + xCoord * scale;
                    if (px < -10 || px > width + 10) return;

                    const startY = originY - Math.min(range, Math.max(-range, yMax)) * scale;
                    const endY = originY - Math.max(-range, Math.min(range, yMin)) * scale;

                    ctx.beginPath();
                    ctx.moveTo(px, startY);
                    ctx.lineTo(px, endY);
                    ctx.stroke();
                });

                [-1, 1].forEach(yCoord => {
                    const py = originY - yCoord * scale;
                    if (py < -10 || py > height + 10) return;

                    const startX = originX + Math.max(-range, Math.min(range, xMin)) * scale;
                    const endX = originX + Math.min(range, Math.max(-range, xMax)) * scale;

                    ctx.beginPath();
                    ctx.moveTo(startX, py);
                    ctx.lineTo(endX, py);
                    ctx.stroke();
                });

                ctx.shadowBlur = 0;
            } else {
                let activePrimes = basePrimes;
                const windowSpan = Math.max(xMax - xMin, yMax - yMin);

                if (range > 2000000 && windowSpan <= 60000) {
                    const yPrimesPos = primeEngine.getPrimesInInterval(Math.max(1, yMin), Math.min(range, yMax));
                    const yPrimesNeg = primeEngine.getPrimesInInterval(Math.max(1, -yMax), Math.min(range, -yMin));
                    const xPrimesPos = primeEngine.getPrimesInInterval(Math.max(1, xMin), Math.min(range, xMax));
                    const xPrimesNeg = primeEngine.getPrimesInInterval(Math.max(1, -xMax), Math.min(range, -xMin));

                    const distinct = new Set([...yPrimesPos, ...yPrimesNeg, ...xPrimesPos, ...xPrimesNeg]);
                    activePrimes = Array.from(distinct);
                }

                [-1, 1].forEach(xCoord => {
                    const px = originX + xCoord * scale;
                    if (px < -10 || px > width + 10) return;

                    for (const p of activePrimes) {
                        if (p > range) continue;
                        [p, -p].forEach(yCoord => {
                            if (yCoord < yMin || yCoord > yMax) return;
                            const py = originY - yCoord * scale;

                            if (isTiny) {
                                ctx.fillRect(px - 1, py - 1, 2, 2);
                            } else {
                                ctx.beginPath();
                                ctx.arc(px, py, pointRadius, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        });
                    }
                });

                [-1, 1].forEach(yCoord => {
                    const py = originY - yCoord * scale;
                    if (py < -10 || py > height + 10) return;

                    for (const p of activePrimes) {
                        if (p > range) continue;
                        [p, -p].forEach(xCoord => {
                            if (xCoord < xMin || xCoord > xMax) return;
                            const px = originX + xCoord * scale;

                            if (isTiny) {
                                ctx.fillRect(px - 1, py - 1, 2, 2);
                            } else {
                                ctx.beginPath();
                                ctx.arc(px, py, pointRadius, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        });
                    }
                });
            }
        } else if (plotMode === 'prime-matrix') {
            ctx.fillStyle = '#f97316';
            const isTiny = pointRadius <= 1.5;

            if (isDenseSpectrum) {
                ctx.fillStyle = 'rgba(249, 115, 22, 0.08)';
                const minPx = originX - Math.min(range, MAX_SCALE) * scale;
                const maxPx = originX + Math.min(range, MAX_SCALE) * scale;
                const minPy = originY - Math.min(range, MAX_SCALE) * scale;
                const maxPy = originY + Math.min(range, MAX_SCALE) * scale;
                ctx.fillRect(minPx, maxPy, maxPx - minPx, minPy - maxPy);
            } else {
                let pList = basePrimes;
                const windowSpan = Math.max(xMax - xMin, yMax - yMin);
                if (range > 2000000 && windowSpan <= 40000) {
                    const segX = primeEngine.getPrimesInInterval(Math.max(1, Math.min(xMin, -xMax)), Math.min(range, Math.max(xMax, -xMin)));
                    const segY = primeEngine.getPrimesInInterval(Math.max(1, Math.min(yMin, -yMax)), Math.min(range, Math.max(yMax, -yMin)));
                    pList = Array.from(new Set([...segX, ...segY]));
                }

                const visiblePrimesX = pList.filter(p => p <= range && ((p >= xMin && p <= xMax) || (-p >= xMin && -p <= xMax)));
                const visiblePrimesY = pList.filter(p => p <= range && ((p >= yMin && p <= yMax) || (-p >= yMin && -p <= yMax)));

                const maxPointsToRender = 80000;
                const totalPotential = (visiblePrimesX.length * 2) * (visiblePrimesY.length * 2);
                const stride = totalPotential > maxPointsToRender ? Math.ceil(Math.sqrt(totalPotential / maxPointsToRender)) : 1;

                for (let ix = 0; ix < visiblePrimesX.length; ix += stride) {
                    const pxVal = visiblePrimesX[ix];
                    [pxVal, -pxVal].forEach(xCoord => {
                        if (xCoord < xMin || xCoord > xMax) return;
                        const px = originX + xCoord * scale;

                        for (let iy = 0; iy < visiblePrimesY.length; iy += stride) {
                            const pyVal = visiblePrimesY[iy];
                            [pyVal, -pyVal].forEach(yCoord => {
                                if (yCoord < yMin || yCoord > yMax) return;
                                const py = originY - yCoord * scale;

                                if (isTiny) {
                                    ctx.fillRect(px - 1, py - 1, 2, 2);
                                } else {
                                    ctx.beginPath();
                                    ctx.arc(px, py, pointRadius, 0, Math.PI * 2);
                                    ctx.fill();
                                }
                            });
                        }
                    });
                }
            }
        }

        // Draw hover cursor and highlight
        if (hoverCoord) {
            const hpx = originX + hoverCoord.x * scale;
            const hpy = originY - hoverCoord.y * scale;

            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);

            ctx.beginPath();
            ctx.moveTo(hpx, 0);
            ctx.lineTo(hpx, height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, hpy);
            ctx.lineTo(width, hpy);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.strokeStyle = '#f97316';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(hpx, hpy, Math.max(6, pointRadius + 4), 0, Math.PI * 2);
            ctx.stroke();
        }
    }, [range, zoom, pan, basePrimes, showPrimeGridlines, highlightTwinPrimes, plotMode, fibType, fibonacciPairs, pythagoreanTriples, hoverCoord]);

    // Handle high-DPI canvas dimensions on resize
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const updateDimensions = () => {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            const targetWidth = Math.round(rect.width * dpr);
            const targetHeight = Math.round(rect.height * dpr);

            if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                draw();
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [draw]);

    // Draw effect: displays spinner on the active option icon during calculation & plotting,
    // yielding to the browser event loop so animation frames render smoothly before releasing state
    useEffect(() => {
        let isCancelled = false;
        setIsComputing(true);

        const frameId = requestAnimationFrame(() => {
            const timer = setTimeout(() => {
                if (isCancelled) return;
                try {
                    draw();
                } finally {
                    requestAnimationFrame(() => {
                        if (!isCancelled) {
                            setIsComputing(false);
                        }
                    });
                }
            }, 25);

            return () => clearTimeout(timer);
        });

        return () => {
            isCancelled = true;
            cancelAnimationFrame(frameId);
        };
    }, [
        range, 
        zoom, 
        pan, 
        plotMode, 
        fibType, 
        showPrimeGridlines, 
        highlightTwinPrimes, 
        basePrimes, 
        fibonacciPairs, 
        pythagoreanTriples
    ]);

    // Redraw hover cursor without triggering computing spinner
    useEffect(() => {
        if (!isComputing) {
            draw();
        }
    }, [hoverCoord]);

    // Mouse interactions: Pan & Zoom & Hover
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        if (isDragging) {
            setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            });
        }

        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const currentRange = Math.max(1, range);
        const baseScale = ((Math.min(rect.width, rect.height) * 0.85) / 2) / currentRange;
        const scale = baseScale * zoom;

        const originX = rect.width / 2 + pan.x;
        const originY = rect.height / 2 + pan.y;

        const graphX = Math.round((mouseX - originX) / scale);
        const graphY = Math.round((originY - mouseY) / scale);

        if (Math.abs(graphX) <= range && Math.abs(graphY) <= range) {
            setHoverCoord({ x: graphX, y: graphY });
        } else {
            setHoverCoord(null);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
        setZoom(prev => Math.min(100000, Math.max(0.01, prev * zoomFactor)));
    };

    const hoverDetails = useMemo(() => {
        if (!hoverCoord) return null;
        const { x, y } = hoverCoord;
        const absX = Math.abs(x);
        const absY = Math.abs(y);

        const xIsPrime = primeEngine.isPrime(absX);
        const yIsPrime = primeEngine.isPrime(absY);
        const yIsFib = isFibonacci(absY);
        const fibIndex = yIsFib ? getFibIndex(absY) : -1;
        const isGaussian = isGaussianPrime(x, y);
        const collatzSteps = getCollatzSteps(absX);
        const totientVal = getEulerTotient(absX);

        let isPlotted = false;
        if (plotMode === 'axis-cross') {
            isPlotted = ((absX === 1 && yIsPrime) || (absY === 1 && xIsPrime));
        } else if (plotMode === 'prime-matrix') {
            isPlotted = xIsPrime && yIsPrime;
        } else if (plotMode === 'gaussian-primes') {
            isPlotted = isGaussian;
        } else if (plotMode === 'fibonacci-primes') {
            if (fibType === 'lattice') {
                isPlotted = xIsPrime && yIsFib;
            } else {
                isPlotted = fibonacciPairs.some(p => p.prime === absX && p.fib === absY);
            }
        } else if (plotMode === 'collatz-primes') {
            isPlotted = xIsPrime && absY === collatzSteps;
        } else if (plotMode === 'euler-totient') {
            isPlotted = absY === totientVal;
        } else if (plotMode === 'pythagorean-primes') {
            isPlotted = pythagoreanTriples.some(t => (t.a === absX && t.b === absY) || (t.b === absX && t.a === absY));
        }

        const dist = Math.sqrt(x * x + y * y);
        const ratio = x !== 0 ? (y / x).toFixed(4) : 'Undefined';

        return {
            x,
            y,
            xIsPrime,
            yIsPrime,
            yIsFib,
            fibIndex,
            isGaussian,
            collatzSteps,
            totientVal,
            isPlotted,
            ratio,
            dist: dist.toLocaleString(undefined, { maximumFractionDigits: 1 }),
        };
    }, [hoverCoord, plotMode, fibType, fibonacciPairs, pythagoreanTriples]);

    const formatRangeDisplay = (r: number) => {
        if (r >= 1000000000) return `±${(r / 1000000).toLocaleString()}M (1 Billion)`;
        if (r >= 1000000) return `±${(r / 1000000).toFixed(r % 1000000 === 0 ? 0 : 1)}M`;
        return `±${r.toLocaleString()}`;
    };

    // Helper to render spinner on option icon when computing or plotting
    const renderOptionIcon = (mode: PlotMode, defaultIcon: React.ReactNode) => {
        if (plotMode === mode && isComputing) {
            return <Loader2 size={13} className="animate-spin text-current shrink-0" />;
        }
        return defaultIcon;
    };

    // Helper to render spinner on config toggles when computing
    const renderConfigIcon = (type: 'gridlines' | 'twinPrimes', defaultIcon: React.ReactNode) => {
        if (isComputing && ((type === 'gridlines' && showPrimeGridlines) || (type === 'twinPrimes' && highlightTwinPrimes))) {
            return <Loader2 size={11} className="animate-spin text-current shrink-0" />;
        }
        return defaultIcon;
    };

    return (
        <div className="w-full h-full bg-[#050505] relative overflow-hidden flex flex-col select-none">
            <div ref={containerRef} className="flex-1 w-full h-full relative">
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => {
                        handleMouseUp();
                        setHoverCoord(null);
                    }}
                    onWheel={handleWheel}
                    className="w-full h-full cursor-crosshair touch-none"
                />

                {/* Top Info & Stats HUD */}
                <div className="absolute top-24 left-8 pointer-events-none z-10 flex flex-col gap-2">
                    <div className="bg-zinc-950/80 p-4 rounded-2xl border border-orange-500/10 backdrop-blur-md min-w-[250px]">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {isComputing ? (
                                    <Loader2 size={14} className="animate-spin text-orange-400 shrink-0" />
                                ) : (
                                    <>
                                        {plotMode === 'fibonacci-primes' && <TrendingUp size={14} className="text-yellow-500 shrink-0" />}
                                        {plotMode === 'gaussian-primes' && <Sparkles size={14} className="text-sky-400 shrink-0" />}
                                        {plotMode === 'phyllotaxis-spiral' && <Disc size={14} className="text-purple-400 shrink-0" />}
                                        {plotMode === 'collatz-primes' && <Activity size={14} className="text-pink-400 shrink-0" />}
                                        {plotMode === 'euler-totient' && <Cpu size={14} className="text-orange-400 shrink-0" />}
                                        {plotMode === 'pythagorean-primes' && <Compass size={14} className="text-emerald-400 shrink-0" />}
                                        {(plotMode === 'axis-cross' || plotMode === 'prime-matrix') && <Hash size={14} className="text-orange-500 shrink-0" />}
                                    </>
                                )}
                                
                                <span className="text-[10px] text-orange-500/80 font-black tracking-[0.2em] uppercase">
                                    {plotMode === 'gaussian-primes' && 'Gaussian Integers ℤ[i]'}
                                    {plotMode === 'phyllotaxis-spiral' && 'Polar Golden Spiral'}
                                    {plotMode === 'fibonacci-primes' && 'Fibonacci × Primes'}
                                    {plotMode === 'collatz-primes' && 'Collatz 3n+1 Trajectory'}
                                    {plotMode === 'euler-totient' && 'Euler Totient φ Envelope'}
                                    {plotMode === 'pythagorean-primes' && 'Pythagorean Prime Rays'}
                                    {(plotMode === 'axis-cross' || plotMode === 'prime-matrix') && 'Cartesian Metrics'}
                                </span>
                            </div>
                            {isComputing && (
                                <span className="flex items-center gap-1 text-[9px] text-orange-400 font-bold uppercase tracking-wider">
                                    <Loader2 size={10} className="animate-spin" />
                                    <span>Plotting</span>
                                </span>
                            )}
                        </div>
                        <div className="space-y-1.5 text-[10px] font-mono text-white/60">
                            <div className="flex justify-between">
                                <span>DOMAIN [-N, +N]:</span>
                                <span className="text-orange-400 font-bold">{formatRangeDisplay(range)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>PRIMES IN RANGE π(N):</span>
                                <span className="text-white font-bold">{primeCount.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>MAGNIFICATION:</span>
                                <span>{zoom.toFixed(2)}x</span>
                            </div>
                            <div className="flex justify-between">
                                <span>MODE:</span>
                                <span className="text-orange-300 uppercase text-[9px] font-bold">
                                    {plotMode === 'axis-cross' && 'Cross (|x|=1, |y|=1)'}
                                    {plotMode === 'prime-matrix' && 'Lattice (P × P)'}
                                    {plotMode === 'gaussian-primes' && 'Gaussian Primes (ℤ[i])'}
                                    {plotMode === 'fibonacci-primes' && `Fibonacci (Y) vs Primes (X)`}
                                    {plotMode === 'phyllotaxis-spiral' && 'Golden Spiral (Phyllotaxis)'}
                                    {plotMode === 'collatz-primes' && 'Collatz (3n+1) Stopping'}
                                    {plotMode === 'euler-totient' && 'Euler Totient φ(x)'}
                                    {plotMode === 'pythagorean-primes' && 'Pythagorean (a²+b²=p²)'}
                                </span>
                            </div>
                            {plotMode === 'gaussian-primes' && (
                                <div className="flex justify-between pt-1 border-t border-white/5 text-[9px]">
                                    <span className="text-sky-400/80">NORM N(z):</span>
                                    <span className="text-sky-300 font-bold">x² + y²</span>
                                </div>
                            )}
                            {plotMode === 'phyllotaxis-spiral' && (
                                <div className="flex justify-between pt-1 border-t border-white/5 text-[9px]">
                                    <span className="text-purple-400/80">GOLDEN ANGLE:</span>
                                    <span className="text-purple-300 font-bold">137.507764°</span>
                                </div>
                            )}
                            {plotMode === 'fibonacci-primes' && (
                                <div className="flex justify-between pt-1 border-t border-white/5 text-[9px]">
                                    <span className="text-yellow-500/70">GOLDEN RATIO φ:</span>
                                    <span className="text-yellow-400 font-bold">1.6180339887...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Live Hover Inspection HUD */}
                    {hoverDetails && (
                        <div className="bg-zinc-950/90 p-4 rounded-2xl border border-orange-500/30 backdrop-blur-md min-w-[250px] shadow-2xl">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Crosshair size={12} className="text-orange-500 animate-pulse" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-orange-500">
                                        Point Inspector
                                    </span>
                                </div>
                                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                    hoverDetails.isPlotted
                                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                                        : 'bg-white/5 text-white/40'
                                }`}>
                                    {hoverDetails.isPlotted ? 'Plotted' : 'Empty'}
                                </span>
                            </div>
                            <div className="space-y-1 text-[10px] font-mono text-white/70">
                                <div className="flex justify-between">
                                    <span>COORD (X, Y):</span>
                                    <span className="text-white font-bold">({hoverDetails.x.toLocaleString()}, {hoverDetails.y.toLocaleString()})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>|X| STATUS (PRIME):</span>
                                    <span className={hoverDetails.xIsPrime ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                                        {hoverDetails.xIsPrime ? 'Prime' : 'Composite'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>|Y| STATUS (PRIME):</span>
                                    <span className={hoverDetails.yIsPrime ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                                        {hoverDetails.yIsPrime ? 'Prime' : 'Composite'}
                                    </span>
                                </div>
                                {plotMode === 'gaussian-primes' && (
                                    <div className="flex justify-between text-sky-300">
                                        <span>GAUSSIAN PRIME:</span>
                                        <span className="font-bold">{hoverDetails.isGaussian ? 'Yes (Prime in ℤ[i])' : 'No'}</span>
                                    </div>
                                )}
                                {plotMode === 'fibonacci-primes' && (
                                    <div className="flex justify-between text-yellow-300">
                                        <span>|Y| FIBONACCI:</span>
                                        <span>{hoverDetails.yIsFib ? `F_${hoverDetails.fibIndex}` : 'Non-Fibonacci'}</span>
                                    </div>
                                )}
                                {plotMode === 'collatz-primes' && (
                                    <div className="flex justify-between text-pink-300">
                                        <span>COLLATZ STEPS (|X|):</span>
                                        <span>{hoverDetails.collatzSteps}</span>
                                    </div>
                                )}
                                {plotMode === 'euler-totient' && (
                                    <div className="flex justify-between text-orange-300">
                                        <span>TOTIENT φ(|X|):</span>
                                        <span>{hoverDetails.totientVal}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span>RADIUS √(X²+Y²):</span>
                                    <span>{hoverDetails.dist}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Top Right: Mode Selection & Settings */}
                <div className="absolute top-24 right-8 z-20 flex flex-col gap-3 items-end">
                    <div className="bg-zinc-950/85 p-3.5 rounded-2xl border border-orange-500/20 backdrop-blur-xl shadow-2xl flex flex-col gap-2.5 max-h-[75vh] overflow-y-auto w-[240px]">
                        <span className="text-[9px] font-black tracking-widest text-orange-500/70 uppercase px-1">Plotting Architecture</span>
                        
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => handleModeSelect('axis-cross')}
                                className={`px-3 py-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all text-left flex items-center gap-2.5 ${
                                    plotMode === 'axis-cross'
                                        ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {renderOptionIcon('axis-cross', <Crosshair size={13} className="shrink-0" />)}
                                <span>Axis Cross (|x|=1, |y|=1)</span>
                            </button>

                            <button
                                onClick={() => handleModeSelect('prime-matrix')}
                                className={`px-3 py-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all text-left flex items-center gap-2.5 ${
                                    plotMode === 'prime-matrix'
                                        ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                                        : 'text-white/60 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {renderOptionIcon('prime-matrix', <Layers size={13} className="shrink-0" />)}
                                <span>Prime Lattice (P × P)</span>
                            </button>

                            <button
                                onClick={() => handleModeSelect('gaussian-primes')}
                                className={`px-3 py-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all text-left flex items-center gap-2.5 ${
                                    plotMode === 'gaussian-primes'
                                        ? 'bg-sky-500 text-zinc-950 font-black shadow-[0_0_15px_rgba(56,189,248,0.5)]'
                                        : 'text-white/60 hover:text-sky-400 hover:bg-white/5'
                                }`}
                            >
                                {renderOptionIcon('gaussian-primes', <Sparkles size={13} className="shrink-0" />)}
                                <span>Gaussian Primes (ℤ[i])</span>
                            </button>

                            <button
                                onClick={() => handleModeSelect('fibonacci-primes')}
                                className={`px-3 py-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all text-left flex items-center gap-2.5 ${
                                    plotMode === 'fibonacci-primes'
                                        ? 'bg-yellow-500 text-zinc-950 font-black shadow-[0_0_15px_rgba(234,179,8,0.5)]'
                                        : 'text-white/60 hover:text-yellow-400 hover:bg-white/5'
                                }`}
                            >
                                {renderOptionIcon('fibonacci-primes', <TrendingUp size={13} className="shrink-0" />)}
                                <span>Fibonacci (Y) vs Primes (X)</span>
                            </button>

                            <button
                                onClick={() => handleModeSelect('phyllotaxis-spiral')}
                                className={`px-3 py-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all text-left flex items-center gap-2.5 ${
                                    plotMode === 'phyllotaxis-spiral'
                                        ? 'bg-purple-500 text-white font-bold shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                                        : 'text-white/60 hover:text-purple-400 hover:bg-white/5'
                                }`}
                            >
                                {renderOptionIcon('phyllotaxis-spiral', <Disc size={13} className="shrink-0" />)}
                                <span>Golden Spiral (Phyllotaxis)</span>
                            </button>

                            <button
                                onClick={() => handleModeSelect('collatz-primes')}
                                className={`px-3 py-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all text-left flex items-center gap-2.5 ${
                                    plotMode === 'collatz-primes'
                                        ? 'bg-pink-500 text-white font-bold shadow-[0_0_15px_rgba(236,72,153,0.5)]'
                                        : 'text-white/60 hover:text-pink-400 hover:bg-white/5'
                                }`}
                            >
                                {renderOptionIcon('collatz-primes', <Activity size={13} className="shrink-0" />)}
                                <span>Collatz 3n+1 vs Primes</span>
                            </button>

                            <button
                                onClick={() => handleModeSelect('euler-totient')}
                                className={`px-3 py-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all text-left flex items-center gap-2.5 ${
                                    plotMode === 'euler-totient'
                                        ? 'bg-orange-600 text-white font-bold shadow-[0_0_15px_rgba(234,88,12,0.5)]'
                                        : 'text-white/60 hover:text-orange-400 hover:bg-white/5'
                                }`}
                            >
                                {renderOptionIcon('euler-totient', <Cpu size={13} className="shrink-0" />)}
                                <span>Euler Totient φ Envelope</span>
                            </button>

                            <button
                                onClick={() => handleModeSelect('pythagorean-primes')}
                                className={`px-3 py-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all text-left flex items-center gap-2.5 ${
                                    plotMode === 'pythagorean-primes'
                                        ? 'bg-emerald-500 text-zinc-950 font-black shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                        : 'text-white/60 hover:text-emerald-400 hover:bg-white/5'
                                }`}
                            >
                                {renderOptionIcon('pythagorean-primes', <Compass size={13} className="shrink-0" />)}
                                <span>Pythagorean Prime Rays</span>
                            </button>
                        </div>

                        {/* Fibonacci Sub-Selector */}
                        {plotMode === 'fibonacci-primes' && (
                            <div className="pt-2 border-t border-white/10 flex flex-col gap-1 px-1">
                                <span className="text-[8px] font-bold text-yellow-500/80 uppercase tracking-widest">Fibonacci Style:</span>
                                <div className="grid grid-cols-2 gap-1 bg-zinc-900/80 p-1 rounded-lg border border-white/5">
                                    <button
                                        onClick={() => handleFibTypeSelect('curve')}
                                        className={`py-1 text-[9px] font-bold rounded tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                                            fibType === 'curve' ? 'bg-yellow-500 text-zinc-950 shadow' : 'text-white/50 hover:text-white'
                                        }`}
                                    >
                                        {isComputing && fibType === 'curve' && (
                                            <Loader2 size={10} className="animate-spin text-current shrink-0" />
                                        )}
                                        <span>Trajectory</span>
                                    </button>
                                    <button
                                        onClick={() => handleFibTypeSelect('lattice')}
                                        className={`py-1 text-[9px] font-bold rounded tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                                            fibType === 'lattice' ? 'bg-yellow-500 text-zinc-950 shadow' : 'text-white/50 hover:text-white'
                                        }`}
                                    >
                                        {isComputing && fibType === 'lattice' && (
                                            <Loader2 size={10} className="animate-spin text-current shrink-0" />
                                        )}
                                        <span>Lattice</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* CONFIG SECTION */}
                        <div className="pt-2.5 border-t border-orange-500/10 flex flex-col gap-2 px-1">
                            <span className="text-[8px] font-black tracking-widest text-zinc-500 uppercase px-1">Display Configurations</span>

                            {/* Prime Gridlines Toggle */}
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-1.5 text-orange-500">
                                    {renderConfigIcon('gridlines', <Grid size={11} className="text-orange-500/70 shrink-0" />)}
                                    <span className="text-[9px] font-bold text-white/70 tracking-wider uppercase">Prime Gridlines</span>
                                </div>
                                <button
                                    onClick={handleToggleGridlines}
                                    className={`w-9 h-5 rounded-full transition-colors relative ${showPrimeGridlines ? 'bg-orange-500' : 'bg-zinc-800'}`}
                                >
                                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showPrimeGridlines ? 'left-4.5' : 'left-0.5'}`} />
                                </button>
                            </div>

                            {/* Highlight Twin Primes Toggle */}
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-1.5 text-cyan-400">
                                    {renderConfigIcon('twinPrimes', <Sparkles size={11} className="text-cyan-400 shrink-0" />)}
                                    <span className="text-[9px] font-bold text-cyan-300 tracking-wider uppercase">Twin Primes (p+2)</span>
                                </div>
                                <button
                                    onClick={handleToggleTwinPrimes}
                                    className={`w-9 h-5 rounded-full transition-colors relative ${highlightTwinPrimes ? 'bg-cyan-500' : 'bg-zinc-800'}`}
                                >
                                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${highlightTwinPrimes ? 'left-4.5' : 'left-0.5'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Pan & Zoom Toolbar */}
                    <div className="bg-zinc-950/80 p-2 rounded-2xl border border-orange-500/20 backdrop-blur-xl shadow-2xl flex items-center gap-1">
                        <button
                            onClick={handleZoomIn}
                            title="Zoom In"
                            className="p-2.5 rounded-xl hover:bg-orange-500/10 text-white/70 hover:text-orange-400 transition-all"
                        >
                            <ZoomIn size={15} />
                        </button>
                        <button
                            onClick={handleZoomOut}
                            title="Zoom Out"
                            className="p-2.5 rounded-xl hover:bg-orange-500/10 text-white/70 hover:text-orange-400 transition-all"
                        >
                            <ZoomOut size={15} />
                        </button>
                        <div className="w-[1px] h-5 bg-orange-500/20 mx-1" />
                        <button
                            onClick={resetView}
                            title="Reset View"
                            className="p-2.5 rounded-xl hover:bg-orange-500/10 text-white/70 hover:text-orange-400 transition-all"
                        >
                            <RotateCcw size={15} />
                        </button>
                    </div>
                </div>

                {/* Bottom Control Bar: Range Slider from 0 to 1,000,000,000 (1000M) */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-4xl bg-zinc-950/90 border border-orange-500/30 rounded-3xl backdrop-blur-2xl p-5 shadow-[0_10px_50px_rgba(0,0,0,0.8)]">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Sliders size={16} className="text-orange-500" />
                                <span className="text-[11px] font-black tracking-widest text-white uppercase">
                                    Cartesian Axis Range (0 → 1,000M)
                                </span>
                            </div>
                            <div className="flex items-center gap-2 font-mono">
                                <span className="text-[10px] text-zinc-500 uppercase">Scale Bounds:</span>
                                <span className="text-sm font-black text-orange-400 tracking-wider">
                                    {formatRangeDisplay(range)}
                                </span>
                            </div>
                        </div>

                        {/* Slider Track */}
                        <div className="relative flex items-center py-1">
                            <input
                                type="range"
                                min={0}
                                max={1000}
                                step={1}
                                value={sliderVal}
                                onChange={handleSliderChange}
                                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none"
                            />
                        </div>

                        {/* Preset Chips */}
                        <div className="flex items-center justify-between gap-1 overflow-x-auto pt-1">
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mr-2">Presets:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {PRESET_RANGES.map(p => (
                                    <button
                                        key={p.label}
                                        onClick={() => handlePresetSelect(p.value)}
                                        className={`px-3 py-1 rounded-lg text-[9px] font-mono font-bold transition-all ${
                                            range === p.value
                                                ? 'bg-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]'
                                                : 'bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:border-orange-500/30'
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Primes;
