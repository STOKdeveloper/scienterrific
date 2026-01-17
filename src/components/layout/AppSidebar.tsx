import React from 'react';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Orbit, SunMoon, Atom, Binary, Sigma, Activity, Mountain } from "lucide-react";

interface AppSidebarProps {
    currentView: string;
    setCurrentView: (view: string) => void;
}

export function AppSidebar({ currentView, setCurrentView }: AppSidebarProps) {
    const spaceItems = [
        {
            title: "Solar System",
            id: "solar-system",
            icon: Orbit,
        },
        {
            title: "Day & Night",
            id: "day-night",
            icon: SunMoon,
        },
    ];

    const conceptItems = [
        {
            title: "Gravity",
            id: "gravity",
            icon: Atom,
        },
        {
            title: "Three Body Problem",
            id: "three-body",
            icon: Binary,
        },
        {
            title: "Doppler Effect",
            id: "doppler",
            icon: Activity,
        },
    ];

    const mathItems = [
        {
            title: "Chaos",
            id: "chaos",
            icon: Sigma,
        },
    ];

    const natureItems = [
        {
            title: "Plate Tectonics",
            id: "plate-tectonics",
            icon: Mountain,
        },
        {
            title: "Volcano",
            id: "volcano",
            icon: Activity,
        },
        {
            title: "Water Cycle",
            id: "water-cycle",
            icon: SunMoon,
        },
    ];

    return (
        <Sidebar className="border-r border-orange-500/10 bg-zinc-900/95 backdrop-blur-xl">
            <SidebarContent className="bg-zinc-900/40">
                <div className="p-6">
                    <h1 className="text-2xl font-black bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent italic tracking-tighter">
                        SCIENTERRIFIC
                    </h1>
                </div>

                <SidebarGroup>
                    <SidebarGroupLabel className="text-orange-500/40 uppercase tracking-[0.2em] text-[10px] px-6 mb-4 font-bold">
                        Space
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {spaceItems.map((item) => (
                                <SidebarMenuItem key={item.id} className="px-2 mb-1">
                                    <SidebarMenuButton
                                        onClick={() => setCurrentView(item.id)}
                                        isActive={currentView === item.id}
                                        className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300
                      ${currentView === item.id
                                                ? "bg-orange-500/10 text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                                                : "text-orange-200/60 hover:text-orange-400 hover:bg-orange-500/5"}
                    `}
                                    >
                                        <item.icon className={`h-5 w-5 ${currentView === item.id ? "text-orange-500" : "text-orange-500/40"}`} />
                                        <span className="font-semibold tracking-tight">{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel className="text-orange-500/40 uppercase tracking-[0.2em] text-[10px] px-6 mb-4 font-bold">
                        Physics
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {conceptItems.map((item) => (
                                <SidebarMenuItem key={item.id} className="px-2 mb-1">
                                    <SidebarMenuButton
                                        onClick={() => setCurrentView(item.id)}
                                        isActive={currentView === item.id}
                                        className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300
                      ${currentView === item.id
                                                ? "bg-orange-500/10 text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                                                : "text-orange-200/60 hover:text-orange-400 hover:bg-orange-500/5"}
                    `}
                                    >
                                        <item.icon className={`h-5 w-5 ${currentView === item.id ? "text-orange-500" : "text-orange-500/40"}`} />
                                        <span className="font-semibold tracking-tight">{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel className="text-orange-500/40 uppercase tracking-[0.2em] text-[10px] px-6 mb-4 font-bold">
                        Mathematics
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {mathItems.map((item) => (
                                <SidebarMenuItem key={item.id} className="px-2 mb-1">
                                    <SidebarMenuButton
                                        onClick={() => setCurrentView(item.id)}
                                        isActive={currentView === item.id}
                                        className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300
                      ${currentView === item.id
                                                ? "bg-orange-500/10 text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                                                : "text-orange-200/60 hover:text-orange-400 hover:bg-orange-500/5"}
                    `}
                                    >
                                        <item.icon className={`h-5 w-5 ${currentView === item.id ? "text-orange-500" : "text-orange-500/40"}`} />
                                        <span className="font-semibold tracking-tight">{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup>
                    <SidebarGroupLabel className="text-orange-500/40 uppercase tracking-[0.2em] text-[10px] px-6 mb-4 font-bold">
                        Nature
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {natureItems.map((item) => (
                                <SidebarMenuItem key={item.id} className="px-2 mb-1">
                                    <SidebarMenuButton
                                        onClick={() => setCurrentView(item.id)}
                                        isActive={currentView === item.id}
                                        className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300
                      ${currentView === item.id
                                                ? "bg-orange-500/10 text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
                                                : "text-orange-200/60 hover:text-orange-400 hover:bg-orange-500/5"}
                    `}
                                    >
                                        <item.icon className={`h-5 w-5 ${currentView === item.id ? "text-orange-500" : "text-orange-500/40"}`} />
                                        <span className="font-semibold tracking-tight">{item.title}</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <div className="mt-auto p-6 border-t border-orange-500/10 bg-zinc-900/20">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Atom className="h-4 w-4 text-orange-500 animate-spin-slow" />
                        <div className="absolute inset-0 blur-md bg-orange-500/50 animate-pulse" />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-orange-500/60 font-bold">Scienter OS</span>
                </div>
            </div>
        </Sidebar>
    );
}
