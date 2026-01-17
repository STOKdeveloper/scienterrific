import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplet, Cloud, Sun, ArrowDown, ArrowUp, ArrowRight } from 'lucide-react';

const Particle = ({ type }: { type: 'vapor' | 'rain' }) => {
    const isVapor = type === 'vapor';
    return (
        <motion.div
            initial={{
                opacity: 0,
                y: isVapor ? 400 : 150,
                x: isVapor ? 50 + Math.random() * 300 : 500 + Math.random() * 200
            }}
            animate={{
                opacity: [0, 1, 0],
                y: isVapor ? 150 : 400,
                x: isVapor ? '+=30' : '-=10'
            }}
            transition={{
                duration: isVapor ? 4 + Math.random() * 2 : 2 + Math.random() * 1,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 5
            }}
            className={`absolute w-1 h-1 rounded-full ${isVapor ? 'bg-blue-300/40 blur-[1px]' : 'bg-blue-500'}`}
        />
    );
};

const SteamWisp = ({ index }: { index: number }) => {
    const randomX = useMemo(() => 50 + Math.random() * 350, []);
    const randomDelay = useMemo(() => Math.random() * 4, []);
    const randomDuration = useMemo(() => 5 + Math.random() * 3, []);
    const randomScale = useMemo(() => 0.5 + Math.random() * 1.5, []);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.5 * randomScale, y: 410, x: randomX, filter: 'blur(8px)' }}
            animate={{
                opacity: [0, 0.4, 0],
                y: [410, 300, 180],
                x: [randomX, randomX + 40, randomX + 80],
                scale: [0.5 * randomScale, 2 * randomScale, 3 * randomScale]
            }}
            transition={{
                duration: randomDuration,
                repeat: Infinity,
                ease: "easeOut",
                delay: randomDelay
            }}
            className="absolute w-12 h-12 bg-white/20 rounded-full pointer-events-none"
        />
    );
};

const WaterCycle = () => {
    const [activeStage, setActiveStage] = useState<'evaporation' | 'condensation' | 'precipitation' | 'collection'>('evaporation');

    const stages = {
        evaporation: {
            title: "Evaporation & Transpiration",
            desc: "The sun warms the water in oceans and lakes, turning it into water vapor that rises into the atmosphere.",
            icon: ArrowUp,
            color: "text-orange-400"
        },
        condensation: {
            title: "Condensation",
            desc: "As water vapor rises, it cools and turns back into liquid water droplets, forming clouds.",
            icon: Cloud,
            color: "text-blue-300"
        },
        precipitation: {
            title: "Precipitation",
            desc: "When clouds become heavy, water falls back to Earth as rain, snow, or sleet.",
            icon: Droplet,
            color: "text-blue-500"
        },
        collection: {
            title: "Collection & Runoff",
            desc: "Water flows down mountains into rivers and eventually returns to the sea, completing the cycle.",
            icon: ArrowRight,
            color: "text-cyan-600"
        }
    };

    return (
        <div className="w-full h-full bg-[#050505] relative overflow-hidden flex items-center justify-center font-sans">
            <div className="relative w-full max-w-5xl h-[600px] bg-zinc-900/20 rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">

                {/* Background Landscape SVG */}
                <svg viewBox="0 0 800 500" className="absolute inset-0 w-full h-full opacity-40">
                    <defs>
                        <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.8" />
                        </linearGradient>
                    </defs>

                    {/* Ocean */}
                    <path d="M 0 400 Q 200 380 400 400 Q 600 420 800 400 L 800 500 L 0 500 Z" fill="url(#oceanGradient)" />

                    {/* Mountains */}
                    <path d="M 400 400 L 600 150 L 800 400 Z" fill="#222" />
                    <path d="M 550 400 L 700 200 L 850 400 Z" fill="#1a1a1a" />

                    {/* Snow Caps */}
                    <path d="M 600 150 L 560 200 Q 600 180 640 200 Z" fill="white" opacity="0.6" />

                    {/* River Runoff */}
                    <motion.path
                        d="M 600 250 Q 550 350 400 400"
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="4"
                        strokeDasharray="10 5"
                        animate={{ strokeDashoffset: [0, -30] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="opacity-30"
                    />
                </svg>

                {/* Steam Effect (Evaporation Stage Focused) */}
                <div className="absolute inset-0 pointer-events-none">
                    <AnimatePresence>
                        {activeStage === 'evaporation' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0"
                            >
                                {Array.from({ length: 15 }).map((_, i) => (
                                    <SteamWisp key={`steam-${i}`} index={i} />
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Sun */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-12 left-12"
                >
                    <Sun size={64} className="text-orange-500 blur-[2px]" />
                </motion.div>

                {/* Clouds */}
                <motion.div
                    animate={{ x: [0, 50, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-24 right-1/4"
                >
                    <Cloud size={80} className="text-white/20 blur-[1px]" />
                </motion.div>
                <motion.div
                    animate={{ x: [0, -30, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-16 right-1/2"
                >
                    <Cloud size={60} className="text-white/10 blur-[2px]" />
                </motion.div>

                {/* Dynamic Particles */}
                {Array.from({ length: 20 }).map((_, i) => <Particle key={`v-${i}`} type="vapor" />)}
                {Array.from({ length: 20 }).map((_, i) => <Particle key={`r-${i}`} type="rain" />)}

                {/* Info HUD */}
                <div className="absolute top-12 right-12 text-right">
                    <p className="text-[10px] text-orange-500 uppercase tracking-[0.5em] font-black mb-1">Atmospheric Study</p>
                    <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">The Hydrologic Cycle</h2>
                </div>

                {/* Dynamic Info Explanation Box */}
                <motion.div
                    layout
                    initial={false}
                    animate={
                        activeStage === 'evaporation' ? { top: 'auto', bottom: '48px', left: 'auto', right: '48px', x: 0, y: 0 } :
                            activeStage === 'condensation' ? { top: 'auto', bottom: '48px', left: '48px', right: 'auto', x: 0, y: 0 } :
                                activeStage === 'precipitation' ? { top: '128px', bottom: 'auto', left: '48px', right: 'auto', x: 0, y: 0 } :
                                    { top: '128px', bottom: 'auto', left: '250px', right: 'auto', x: 0, y: 0 } // collection
                    }
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="absolute max-w-xs flex flex-col gap-4 z-50 pointer-events-none"
                >
                    <div className="bg-zinc-950/90 backdrop-blur-2xl border border-white/10 p-6 rounded-[2rem] shadow-2xl pointer-events-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeStage}
                                initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                exit={{ opacity: 0, scale: 1.05, filter: "blur(4px)" }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2.5 rounded-xl bg-white/5 ${stages[activeStage].color}`}>
                                        {React.createElement(stages[activeStage].icon, { size: 20 })}
                                    </div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-white italic">
                                        {stages[activeStage].title}
                                    </h3>
                                </div>
                                <p className="text-xs text-zinc-400 leading-relaxed font-bold opacity-90">
                                    {stages[activeStage].desc}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="flex flex-wrap gap-2 pointer-events-auto">
                        {Object.keys(stages).map((key) => (
                            <button
                                key={key}
                                onClick={() => setActiveStage(key as any)}
                                className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-[0.2em] transition-all border ${activeStage === key
                                    ? 'bg-orange-500 text-black border-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.4)]'
                                    : 'bg-zinc-900/80 text-white/40 border-white/5 hover:border-white/20'
                                    }`}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Aesthetic Border Elements */}
            <div className="absolute top-0 left-1/4 w-px h-24 bg-gradient-to-b from-orange-500 to-transparent opacity-20" />
            <div className="absolute top-0 right-1/4 w-px h-24 bg-gradient-to-b from-orange-500 to-transparent opacity-20" />
        </div>
    );
};

export default WaterCycle;
