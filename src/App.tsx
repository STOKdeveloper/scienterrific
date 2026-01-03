import React, { useState } from 'react';
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import SolarSystem from "@/components/visualizations/SolarSystem";
import DayNight from "@/components/visualizations/DayNight";
import Gravity from "@/components/visualizations/Gravity";
import ThreeBodyProblem from "@/components/visualizations/ThreeBodyProblem";
import Mandelbrot from "@/components/visualizations/Mandelbrot";
import { AnimatePresence, motion } from "framer-motion";

function App() {
  const [currentView, setCurrentView] = useState('solar-system');

  const getViewTitle = (view: string) => {
    switch (view) {
      case 'solar-system': return 'THE SOLAR SYSTEM';
      case 'day-night': return 'EARTH: DAY & NIGHT';
      case 'gravity': return 'SINGULARITY';
      case 'three-body': return 'THREE BODY PROBLEM';
      case 'chaos': return 'CHAOS THEORY';
      default: return 'SCIENTERRIFIC';
    }
  };

  const getViewSubtitle = (view: string) => {
    switch (view) {
      case 'gravity': return 'THEORETICAL MODEL';
      case 'three-body': return 'CHAOTIC ORBITAL DYNAMICS';
      case 'chaos': return 'MANDELBROT SET EXPLORATION';
      default: return 'VISUALIZATION ACTIVE';
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-[#050505] text-white overflow-hidden">
        <AppSidebar currentView={currentView} setCurrentView={setCurrentView} />

        <SidebarInset className="flex-1 relative flex flex-col bg-transparent">
          <main className="flex-1 w-full h-full relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 1.02, filter: "blur(10px)" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="w-full h-full"
              >
                {currentView === 'solar-system' && <SolarSystem />}
                {currentView === 'day-night' && <DayNight />}
                {currentView === 'gravity' && <Gravity />}
                {currentView === 'three-body' && <ThreeBodyProblem />}
                {currentView === 'chaos' && <Mandelbrot />}
              </motion.div>
            </AnimatePresence>

            {/* Subtle Overlay HUD */}
            <div className="absolute top-8 left-8 pointer-events-none z-10">
              <div className="space-y-1">
                <span className="text-[10px] text-orange-500/60 uppercase tracking-[0.3em] font-bold">
                  {getViewSubtitle(currentView)}
                </span>
                <h2 className="text-3xl font-black tracking-tight text-white/90 italic uppercase">
                  {getViewTitle(currentView)}
                </h2>
              </div>
            </div>

            <div className="absolute bottom-8 right-8 pointer-events-none z-10 text-right opacity-40">
              <p className="text-[10px] uppercase tracking-[0.2em] font-mono text-orange-500">SCIENTER-OS v1.5.0</p>
              <p className="text-[10px] uppercase tracking-[0.2em] font-mono text-white/60">SYSTEMS READY</p>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default App;
