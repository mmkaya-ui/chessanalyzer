"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
const ChessboardWrapper = dynamic(() => import("@/components/ChessboardWrapper"), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-800 animate-pulse rounded-lg aspect-square"></div>
});
import AnalysisPanel from "@/components/AnalysisPanel";
import UploadZone from "@/components/UploadZone";
import { Chess, Square } from "chess.js";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { ChessEngine } from "@/lib/engine";
import { processBoardImage } from "@/lib/vision";

export default function AnalysisPage() {
    const [fen, setFen] = useState("start");
    const [game, setGame] = useState(new Chess());
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
            // Parse Evaluation
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
        setIsAnalyzing(true);
        setBestMove("Scanning...");
        setEvalScore("...");

        const detectedFen = await processBoardImage(file);

        if (detectedFen) {
            try {
                // When we load a board, we should check whose turn it is
                // For now, we update the game state
                const newGame = new Chess(detectedFen);
                setGame(newGame);
                setFen(detectedFen);
                setSideToMove(newGame.turn()); // update UI to match FEN
            } catch (e) {
                alert("Detected position was invalid. Please try another image.");
                setIsAnalyzing(false);
            }
        } else {
            alert("Could not detect board. Please try again.");
            setIsAnalyzing(false);
        }
    };

    const onDrop = (sourceSquare: string, targetSquare: string) => {
        try {
            const move = game.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: "q",
            });

            if (move === null) return false;

            setFen(game.fen());
            setSideToMove(game.turn());
            return true;
        } catch (e) {
            return false;
        }
    };

    const resetBoard = () => {
        const newGame = new Chess();
        setGame(newGame);
        setFen("start");
        setArrows([]);
        setBestMove("-");
        setEvalScore("0.0");
        setSideToMove("w");
        setOrientation("white");
    };

    const toggleOrientation = () => {
        setOrientation(prev => prev === "white" ? "black" : "white");
    };

    const toggleSideToMove = () => {
        // To change side to move, we need to manipulate the FEN
        const newSide = sideToMove === "w" ? "b" : "w";
        const fenParts = fen.split(" ");
        if (fenParts.length >= 2) {
            fenParts[1] = newSide;
            // We also need to reset en passant targets and move clocks usually, 
            // but let's just keep them for now or reset en passant (-).
            // Changing side often invalidates en passant.
            if (fenParts.length >= 4) fenParts[3] = "-"; // En passant target

            const newFen = fenParts.join(" ");
            try {
                const newGame = new Chess(newFen);
                setGame(newGame);
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

                {/* Left Column: Board */}
                <div ref={containerRef} className="flex-1 flex flex-col items-center glass-panel p-6 lg:p-12 min-h-[500px] justify-center relative">
                    <div className="absolute top-4 right-4 flex gap-2 z-10">
                        <button onClick={toggleOrientation} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors border border-white/10 text-xs font-medium" title="Flip Board">
                            Flip Board
                        </button>
                        <button onClick={resetBoard} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors" title="Reset Board">
                            <RefreshCw className="w-5 h-5" />
                        </button>
                    </div>
                    <ChessboardWrapper
                        fen={fen}
                        onMove={onDrop}
                        boardWidth={boardWidth}
                        orientation={orientation}
                        customArrows={arrows}
                    />
                </div>

                {/* Right Column: Tools */}
                <div className="w-full lg:w-[400px] flex flex-col gap-6">
                    <div className="glass-panel p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                                Setup
                            </div>
                            <button
                                onClick={toggleSideToMove}
                                className={`text-xs px-2 py-1 rounded border transition-colors ${sideToMove === 'w' ? 'bg-white text-black border-white' : 'bg-black text-white border-slate-600'}`}
                            >
                                {sideToMove === 'w' ? "White to Move" : "Black to Move"}
                            </button>
                        </div>
                        <UploadZone onImageSelected={handleImageSelected} />
                        <p className="text-xs text-slate-500 mt-2 text-center">
                            *Auto-recognition is currently in simulation mode. Upload any image to see a sample board state.
                        </p>
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
