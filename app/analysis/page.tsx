"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
const ChessboardWrapper = dynamic(() => import("@/components/ChessboardWrapper"), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-800 animate-pulse rounded-lg aspect-square"></div>
});
import AnalysisPanel from "@/components/AnalysisPanel";
import UploadZone from "@/components/UploadZone";
import { Chess, Square } from "chess.js";
import { ArrowLeft, RefreshCw, AlertTriangle, Trash2 } from "lucide-react";
import Link from "next/link";
import { ChessEngine } from "@/lib/engine";
import { processBoardImage } from "@/lib/vision";

export default function AnalysisPage() {
    const [fen, setFen] = useState("start");
    // Use a ref to hold the game instance to avoid staleness in closures, 
    // but force updates via setFen
    const gameRef = useRef(new Chess());

    const [evalScore, setEvalScore] = useState("0.0");
    const [bestMove, setBestMove] = useState("-");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [boardWidth, setBoardWidth] = useState(480);
    const [arrows, setArrows] = useState<[string, string][]>([]);

    // User preferences
    const [orientation, setOrientation] = useState<"white" | "black">("white");
    const [sideToMove, setSideToMove] = useState<"w" | "b">("w");

    const engineRef = useRef<ChessEngine | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize Engine
    useEffect(() => {
        const engine = new ChessEngine((data) => {
            if (typeof data === 'string') {
                if (data.startsWith("info") && data.includes("score cp")) {
                    const scoreMatch = data.match(/score cp (-?\d+)/);
                    if (scoreMatch) {
                        const cp = parseInt(scoreMatch[1]);
                        setEvalScore((cp / 100).toFixed(2));
                    }
                } else if (data.startsWith("info") && data.includes("score mate")) {
                    const mateMatch = data.match(/score mate (-?\d+)/);
                    if (mateMatch) {
                        setEvalScore(`M${mateMatch[1]}`);
                    }
                }

                if (data.startsWith("bestmove")) {
                    const parts = data.split(" ");
                    const move = parts[1];
                    if (move && move !== "(none)") {
                        setBestMove(move);
                        setIsAnalyzing(false);
                        const from = move.substring(0, 2);
                        const to = move.substring(2, 4);
                        setArrows([[from, to]]);
                    }
                }
            }
        });

        engine.init();
        engineRef.current = engine;

        return () => {
            engine.quit();
        };
    }, []);

    // Window Resize Handling
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const width = Math.min(600, containerRef.current.clientWidth - 48);
                setBoardWidth(width);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Trigger Analysis when FEN changes
    useEffect(() => {
        if (engineRef.current) {
            setIsAnalyzing(true);
            const timeout = setTimeout(() => {
                engineRef.current?.analyze(fen);
            }, 100);
            return () => clearTimeout(timeout);
        }
    }, [fen]);

    const handleImageSelected = async (file: File) => {
        if (isAnalyzing && bestMove === "Scanning...") return; // debounce

        setIsAnalyzing(true);
        setBestMove("Scanning...");
        setEvalScore("...");

        console.log("Analyzing image:", file.name);
        try {
            const detectedFen = await processBoardImage(file);
            console.log("Detected FEN:", detectedFen);

            if (detectedFen) {
                const newGame = new Chess(detectedFen);
                gameRef.current = newGame;
                setFen(detectedFen);
                setSideToMove(newGame.turn());
                // engine analysis triggers via useEffect
            } else {
                alert("Could not detect board. Please try again.");
                setIsAnalyzing(false);
            }
        } catch (e) {
            console.error(e);
            alert("Error analyzing image.");
            setIsAnalyzing(false);
        }
    };

    const onDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
        try {
            // 1. Try Standard Move (Game Logic)
            const gameCopy = new Chess(gameRef.current.fen());
            const move = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: "q",
            });

            if (move) {
                gameRef.current = gameCopy;
                setFen(gameCopy.fen());
                setSideToMove(gameCopy.turn());
                return true;
            }

            // 2. Fallback: "God Mode" / Manual Setup (Force the move)
            // If the standard move failed, we manually edit the board state
            // piece format from react-chessboard is "wP", "bK" etc.

            const color = piece[0];
            const type = piece[1].toLowerCase();

            // Remove from source
            gameCopy.remove(sourceSquare as Square);
            // Place on target
            gameCopy.put({ type: type as any, color: color as any }, targetSquare as Square);

            // Update State
            gameRef.current = gameCopy;
            setFen(gameCopy.fen());
            // Note: Side to move remains whatever it was, unless we explicitly change it elsewhere
            return true;

        } catch (e) {
            console.error("Move error:", e);
            return false;
        }
    };

    const onRightClick = (square: string) => {
        // Remove piece on right click
        const gameCopy = new Chess(gameRef.current.fen());
        gameCopy.remove(square as Square);
        gameRef.current = gameCopy;
        setFen(gameCopy.fen());
    };

    const resetBoard = () => {
        const newGame = new Chess();
        gameRef.current = newGame;
        setFen("start");
        setArrows([]);
        setBestMove("-");
        setEvalScore("0.0");
        setSideToMove("w");
        setOrientation("white");
    };

    const clearBoard = () => {
        const newGame = new Chess();
        newGame.clear();
        gameRef.current = newGame;
        setFen(newGame.fen());
        setArrows([]);
        setBestMove("-");
        setEvalScore("-");
    };

    const toggleOrientation = () => {
        setOrientation(prev => prev === "white" ? "black" : "white");
    };

    const toggleSideToMove = () => {
        const newSide = sideToMove === "w" ? "b" : "w";
        const fenParts = fen.split(" ");
        if (fenParts.length >= 2) {
            fenParts[1] = newSide;
            if (fenParts.length >= 4) fenParts[3] = "-"; // Reset en passant

            const newFen = fenParts.join(" ");
            try {
                const newGame = new Chess(newFen);
                gameRef.current = newGame;
                setFen(newFen);
                setSideToMove(newSide);
            } catch (e) {
                console.error("Invalid FEN after side swap", e);
            }
        }
    };

    return (
        <div className="min-h-screen p-4 md:p-8 flex flex-col animate-fade-in pb-20">
            <header className="flex items-center justify-between mb-8 max-w-7xl mx-auto w-full">
                <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back to Home</span>
                </Link>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Analysis Board
                </h1>
                <div className="w-24"></div>
            </header>

            <main className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto w-full flex-1">
                <div ref={containerRef} className="flex-1 flex flex-col items-center glass-panel p-6 lg:p-12 min-h-[500px] justify-center relative">
                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                        <button onClick={toggleOrientation} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors border border-white/10 text-xs font-medium" title="Flip Board">
                            Flip Board
                        </button>
                        <button onClick={resetBoard} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors" title="Reset to Start">
                            <RefreshCw className="w-5 h-5" />
                        </button>
                        <button onClick={clearBoard} className="p-2 hover:bg-red-500/20 rounded-full text-red-400 hover:text-red-200 transition-colors" title="Clear Board">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                    {/* Key prop ensures re-mount if weird state issues persist, but usually not needed */}
                    <ChessboardWrapper
                        fen={fen}
                        onMove={onDrop}
                        onSquareRightClick={onRightClick}
                        boardWidth={boardWidth}
                        orientation={orientation}
                        customArrows={arrows}
                    />
                </div>

                <div className="w-full lg:w-[400px] flex flex-col gap-6">
                    <div className="glass-panel p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                                Setup
                            </div>
                            <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                                <button
                                    onClick={() => sideToMove !== 'w' && toggleSideToMove()}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${sideToMove === 'w' ? 'bg-white text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${sideToMove === 'w' ? 'bg-black' : 'bg-white/20'}`}></div>
                                    White to Move
                                </button>
                                <button
                                    onClick={() => sideToMove !== 'b' && toggleSideToMove()}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${sideToMove === 'b' ? 'bg-black text-white shadow-lg border border-slate-700' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${sideToMove === 'b' ? 'bg-white' : 'bg-white/20'}`}></div>
                                    Black to Move
                                </button>
                            </div>
                        </div>
                        <UploadZone onImageSelected={handleImageSelected} />

                        <div className="mt-4 p-3 rounded bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-yellow-200/80">
                                <strong>Note:</strong> Image recognition is currently in <u>Demo Mode</u>. It will always return a sample position (Ruy Lopez) to demonstrate the analysis flow. Real recognition requires a client-side model.
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 min-h-[300px]">
                        <AnalysisPanel
                            evaluation={evalScore}
                            bestMove={bestMove}
                            isAnalyzing={isAnalyzing}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
