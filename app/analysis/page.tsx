"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
const ChessboardWrapper = dynamic(() => import("@/components/ChessboardWrapper"), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-800 animate-pulse rounded-lg aspect-square"></div>
});
import AnalysisPanel from "@/components/AnalysisPanel";
import UploadZone from "@/components/UploadZone";
import SparePieces from "@/components/SparePieces";
import ModelUploader from "@/components/ModelUploader";
import { Chess, Square } from "chess.js";
import { ArrowLeft, RefreshCw, AlertTriangle, Trash2, X } from "lucide-react";
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

    // Editor State
    const [selectedSpare, setSelectedSpare] = useState<string | null>(null);
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
    const [lastLog, setLastLog] = useState("Ready"); // Debug State

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

    const onDragStart = (piece: string, sourceSquare: string) => {
        console.log(`Drag started: ${piece} from ${sourceSquare}`);
    };

    const onDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
        setLastLog(`Drop: ${piece} ${sourceSquare}->${targetSquare}`);

        try {
            const gameCopy = new Chess(gameRef.current.fen());

            // 1. Remove from source
            const removed = gameCopy.remove(sourceSquare as Square);

            // 2. Put on target
            const color = piece[0] as "w" | "b";
            const type = piece[1].toLowerCase() as any;

            // Note: put returns true if successful
            const success = gameCopy.put({ type, color }, targetSquare as Square);

            if (!success) {
                console.error("Put logic failed for", piece);
                setLastLog(`Error: Put failed ${piece}->${targetSquare}`);
                return false;
            }

            // 3. Update State
            gameRef.current = gameCopy;
            const newFen = gameCopy.fen();
            setFen(newFen);
            setLastLog(`Success: ${piece} moved`);
            return true;

        } catch (e: any) {
            console.error("Move Error:", e);
            setLastLog(`Exception: ${e.message}`);
            return false;
        }
    };

    const onRightClick = (square: string) => {
        // Remove piece on right click
        const gameCopy = new Chess(gameRef.current.fen());
        gameCopy.remove(square as Square);
        gameRef.current = gameCopy;
        setFen(gameCopy.fen());
        setSelectedSquare(null);
    };

    const onSquareClick = (square: string) => {
        setLastLog(`Click: ${square}`);

        // 1. SPARE PLACEMENT
        if (selectedSpare) {
            const gameCopy = new Chess(gameRef.current.fen());
            const color = selectedSpare[0] as "w" | "b";
            const type = selectedSpare[1].toLowerCase() as any;

            gameCopy.remove(square as Square);
            gameCopy.put({ type, color }, square as Square);

            gameRef.current = gameCopy;
            setFen(gameCopy.fen());
            return;
        }

        // 2. MOVE LOGIC (Click-Move)
        // If we already have a square selected...
        if (selectedSquare) {
            // If clicking the SAME square, deselect
            if (selectedSquare === square) {
                setSelectedSquare(null);
                return;
            }

            // If clicking a NEW square, try to move there!
            // We use the same 'God Mode' logic: Force Move.

            // Check if source has a piece
            const sourcePiece = gameRef.current.get(selectedSquare as Square);
            if (!sourcePiece) {
                // Should not happen if logic is correct, but safety check
                setSelectedSquare(square);
                return;
            }

            // FORCE MOVE (A -> B)
            try {
                const gameCopy = new Chess(gameRef.current.fen());

                // Remove from A
                gameCopy.remove(selectedSquare as Square);
                // Put on B (using source piece info)
                gameCopy.put({ type: sourcePiece.type, color: sourcePiece.color }, square as Square);

                gameRef.current = gameCopy;
                setFen(gameCopy.fen());
                setLastLog(`ClickMove: ${selectedSquare}->${square}`);

                // Clear selection after move
                setSelectedSquare(null);
                return;
            } catch (e) {
                console.error("Click-Move failed", e);
                // If failed, maybe they just wanted to select the new square?
            }
        }

        // 3. SELECTION
        // If nothing selected (or move failed/skipped), select this square if it has a piece
        const piece = gameRef.current.get(square as Square);
        if (piece) {
            setSelectedSquare(square);
            setLastLog(`Selected: ${square}`);
        } else {
            setSelectedSquare(null);
        }
    };

    const handleSpareSelect = (piece: string) => {
        if (selectedSpare === piece) {
            setSelectedSpare(null); // Toggle off
        } else {
            setSelectedSpare(piece);
            setSelectedSquare(null); // Clear square selection if picking spare
        }
    };

    const removeSelectedPiece = () => {
        if (selectedSquare) {
            const gameCopy = new Chess(gameRef.current.fen());
            gameCopy.remove(selectedSquare as Square);
            gameRef.current = gameCopy;
            setFen(gameCopy.fen());
            setSelectedSquare(null);
        }
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
                <div ref={containerRef} className="flex-1 flex flex-col items-center bg-slate-900/50 rounded-xl border border-slate-700 p-4 lg:p-8 min-h-[500px]">

                    {/* Control Toolbar - Standard Flex Flow (Not absolute) */}
                    <div className="flex gap-4 mb-6 z-10 bg-slate-800 p-2 rounded-lg border border-slate-700 shadow-lg">
                        <button
                            onClick={toggleOrientation}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-200 hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
                        >
                            <RefreshCw className="w-4 h-4" /> Flip
                        </button>
                        <button
                            onClick={resetBoard}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-200 hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
                        >
                            <RefreshCw className="w-4 h-4 rotate-180" /> Reset
                        </button>
                        <button
                            onClick={clearBoard}
                            className="flex items-center gap-2 px-3 py-2 bg-red-900/50 hover:bg-red-800/50 rounded-md text-red-200 hover:text-red-100 transition-all text-xs font-bold uppercase tracking-wider border border-red-700/50"
                        >
                            <Trash2 className="w-4 h-4" /> Clear
                        </button>
                    </div>

                    {/* Selected Piece Actions (Only show if needed) */}
                    {selectedSquare && (
                        <div className="mb-4 flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-full border border-slate-600 animate-fade-in z-10">
                            <span className="text-sm text-white font-medium">Selected: {selectedSquare}</span>
                            <button
                                onClick={removeSelectedPiece}
                                className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs transition-colors font-bold"
                            >
                                <Trash2 className="w-3 h-3" /> Remove
                            </button>
                            <button
                                onClick={() => setSelectedSquare(null)}
                                className="p-1 hover:bg-slate-700 rounded-full text-slate-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Board Container - No Overlays */}
                    <div className="relative" style={{ zIndex: 0 }}>
                        <ChessboardWrapper
                            fen={fen}
                            onMove={onDrop}
                            onPieceDragBegin={onDragStart}
                            onSquareRightClick={onRightClick}
                            onSquareClick={onSquareClick}
                            boardWidth={boardWidth}
                            orientation={orientation}
                            customArrows={arrows}
                        />
                    </div>

                    {/* Debug Log Below Board */}
                    <div className="mt-4 text-[10px] text-slate-500 font-mono">
                        Debug: {lastLog}
                    </div>
                </div>

                <div className="w-full lg:w-[400px] flex flex-col gap-6">
                    {/* Editor Tools */}
                    <SparePieces
                        selectedPiece={selectedSpare}
                        onPieceSelect={handleSpareSelect}
                    />

                    <div className="glass-panel p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                                Turn
                            </div>
                            <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                                <button
                                    onClick={() => sideToMove !== 'w' && toggleSideToMove()}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${sideToMove === 'w' ? 'bg-white text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${sideToMove === 'w' ? 'bg-black' : 'bg-white/20'}`}></div>
                                    White
                                </button>
                                <button
                                    onClick={() => sideToMove !== 'b' && toggleSideToMove()}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center gap-2 ${sideToMove === 'b' ? 'bg-black text-white shadow-lg border border-slate-700' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${sideToMove === 'b' ? 'bg-white' : 'bg-white/20'}`}></div>
                                    Black
                                </button>
                            </div>
                        </div>

                        <ModelUploader />
                        <UploadZone onImageSelected={handleImageSelected} />

                        <div className="mt-4 p-3 rounded bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
                            {/* Content */}
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
