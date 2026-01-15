"use client";

import { Activity, Cpu, Zap } from "lucide-react";

interface AnalysisPanelProps {
    evaluation: string;
    bestMove: string;
    isAnalyzing: boolean;
    engineName?: string;
}

export default function AnalysisPanel({ evaluation, bestMove, isAnalyzing, engineName = "Stockfish 16 (Human-Like)" }: AnalysisPanelProps) {
    return (
        <div className="glass-panel p-6 w-full h-full flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-purple-400" />
                    Engine Status
                </h2>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${isAnalyzing ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-pulse" : "bg-slate-500/10 border-slate-500/20 text-slate-400"}`}>
                    {isAnalyzing ? "Analyzing..." : "Ready"}
                </span>
            </div>

            <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Evaluation</p>
                    <div className="text-3xl font-mono font-bold text-white flex items-center gap-2">
                        <Activity className="w-6 h-6 text-blue-400" />
                        {evaluation || "0.0"}
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-purple-600/10 border border-primary/20">
                    <p className="text-xs text-primary/80 uppercase tracking-wider mb-1">Best Move</p>
                    <div className="text-3xl font-mono font-bold text-white flex items-center gap-2">
                        <Zap className="w-6 h-6 text-yellow-400" />
                        {bestMove || "---"}
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-4 text-xs text-slate-500 text-center">
                Running {engineName} • Client-side
            </div>
        </div>
    );
}
