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
import { Chess, Square } from "chess.js";
import { ArrowLeft, RefreshCw, AlertTriangle, Trash2, X, Copy, Check, Sparkles, KeyRound, Play } from "lucide-react";
import Link from "next/link";
import { ChessEngine } from "@/lib/engine";
import { processBoardImage } from "@/lib/vision";

const PRESETS = [
    {
        name: "Standard Start",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    },
    {
        name: "Ruy Lopez",
        fen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
    },
    {
        name: "Sicilian Defense",
        fen: "rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 2 5",
    },
    {
        name: "Morphy's Opera Game",
        fen: "4kb1r/p2rqppp/5n2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 14",
    },
    {
        name: "Lucena Endgame",
        fen: "1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1",
    },
];

export default function AnalysisPage() {
    const gameRef = useRef(new Chess());
    const [fen, setFen] = useState(() => gameRef.current.fen());
    const [fenInput, setFenInput] = useState(() => gameRef.current.fen());
    const [fenError, setFenError] = useState<string | null>(null);
    const [copiedFen, setCopiedFen] = useState(false);

    const [evalScore, setEvalScore] = useState("0.0");
    const [bestMove, setBestMove] = useState("-");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [boardWidth, setBoardWidth] = useState(480);
    const [arrows, setArrows] = useState<[string, string][]>([]);

    // Editor State
    const [selectedSpare, setSelectedSpare] = useState<string | null>(null);
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
    const [lastLog, setLastLog] = useState("Ready");

    // Preferences
    const [orientation, setOrientation] = useState<"white" | "black">("white");
    const [sideToMove, setSideToMove] = useState<"w" | "b">("w");

    // Key settings modal
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [apiKey, setApiKey] = useState("");
    const [hasSavedKey, setHasSavedKey] = useState(false);

    // Notification toast
    const [toastMessage, setToastMessage] = useState<{ text: string; type: "info" | "error" | "success" } | null>(null);

    const engineRef = useRef<ChessEngine | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const showToast = (text: string, type: "info" | "error" | "success" = "info") => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 5000);
    };

    // Load saved API Key from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("gemini_api_key") || "";
            setApiKey(saved);
            setHasSavedKey(Boolean(saved));
        }
    }, []);

    const saveApiKey = () => {
        if (typeof window !== "undefined") {
            localStorage.setItem("gemini_api_key", apiKey.trim());
            setHasSavedKey(Boolean(apiKey.trim()));
            setShowKeyModal(false);
            showToast(apiKey.trim() ? "Gemini API key saved!" : "API key cleared.", "success");
        }
    };

    // Initialize Engine
    useEffect(() => {
        const engine = new ChessEngine((data) => {
            if (typeof data === "string") {
                // Stockfish scores from the side to move's point of view; show White's,
                // as chess UIs conventionally do (+ = White better, - = Black better).
                const sign = gameRef.current.turn() === "b" ? -1 : 1;
                if (data.startsWith("info") && data.includes("score cp")) {
                    const scoreMatch = data.match(/score cp (-?\d+)/);
                    if (scoreMatch) {
                        const cp = parseInt(scoreMatch[1]) * sign;
                        setEvalScore((cp / 100).toFixed(2));
                    }
                } else if (data.startsWith("info") && data.includes("score mate")) {
                    const mateMatch = data.match(/score mate (-?\d+)/);
                    if (mateMatch) {
                        setEvalScore(`M${parseInt(mateMatch[1]) * sign}`);
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
                    } else {
                        // Checkmate, stalemate, or a position Stockfish refuses to search.
                        // Clear the previous position's move and arrow so they don't linger.
                        setBestMove("None");
                        setArrows([]);
                        setIsAnalyzing(false);
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
                const width = Math.min(560, Math.max(300, containerRef.current.clientWidth - 48));
                setBoardWidth(width);
            }
        };

        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Trigger Analysis when FEN changes
    useEffect(() => {
        setFenInput(fen);
        if (engineRef.current) {
            setIsAnalyzing(true);
            const timeout = setTimeout(() => {
                engineRef.current?.analyze(fen);
            }, 100);
            return () => clearTimeout(timeout);
        }
    }, [fen]);

    // chess.js accepts boards no real game can reach (e.g. 9 pawns or 17 pieces a side,
    // common in AI misreads), and Stockfish then returns no move. Catch them on load.
    const materialProblem = (fenStr: string): string | null => {
        const board = fenStr.trim().split(/\s+/)[0];
        for (const [side, isSide] of [["White", (c: string) => /[PNBRQK]/.test(c)], ["Black", (c: string) => /[pnbrqk]/.test(c)]] as const) {
            const pieces = [...board].filter(isSide);
            const pawns = pieces.filter(c => c.toLowerCase() === "p").length;
            if (pieces.length > 16) return `${side} has ${pieces.length} pieces (max 16)`;
            if (pawns > 8) return `${side} has ${pawns} pawns (max 8)`;
        }
        return null;
    };

    const updateBoardPosition = (newFen: string) => {
        const problem = materialProblem(newFen);
        if (problem) {
            setFenError(`Invalid FEN: ${problem}`);
            return false;
        }
        try {
            const newGame = new Chess(newFen);
            gameRef.current = newGame;
            const fullFen = newGame.fen();
            setFen(fullFen);
            setFenInput(fullFen);
            setSideToMove(newGame.turn());
            setFenError(null);
            return true;
        } catch (e: any) {
            setFenError(e.message || "Invalid FEN position");
            return false;
        }
    };

    const handleApplyFen = () => {
        if (!fenInput.trim()) return;
        const success = updateBoardPosition(fenInput.trim());
        if (success) {
            showToast("Position loaded successfully", "success");
        }
    };

    const handleCopyFen = () => {
        if (typeof navigator !== "undefined") {
            navigator.clipboard.writeText(fen);
            setCopiedFen(true);
            setTimeout(() => setCopiedFen(false), 2000);
            showToast("FEN copied to clipboard", "success");
        }
    };

    const handleImageSelected = async (file: File) => {
        setIsAnalyzing(true);
        setBestMove("Scanning...");
        setEvalScore("...");

        showToast("Analyzing chessboard image with AI...", "info");

        // When recognition fails the board doesn't change, so the [fen] effect won't
        // re-run the engine. Re-analyze the current board to clear "Scanning...".
        const restoreAnalysis = () => engineRef.current?.analyze(gameRef.current.fen());

        try {
            const result = await processBoardImage(file, apiKey);
            if (result.fen) {
                const success = updateBoardPosition(result.fen);
                if (success && result.lowConfidence) {
                    showToast("Low-confidence read from the fallback model. Check every square before trusting the analysis.", "error");
                } else if (success) {
                    showToast("Board detected and loaded!", "success");
                } else {
                    // Keep the detected FEN so a misread square or two can be fixed by hand.
                    // updateBoardPosition already set fenError to the chess.js reason.
                    setFenInput(result.fen);
                    restoreAnalysis();
                    showToast("Detected position isn't legal (likely a misread piece). It's in the FEN bar: fix it and press Load.", "error");
                }
            } else {
                restoreAnalysis();
                if (result.needsKey) {
                    setShowKeyModal(true);
                    showToast("Gemini API Key required for real image recognition.", "error");
                } else {
                    showToast(result.error || "Could not detect board. Try a clearer top-down photo.", "error");
                }
            }
        } catch (e: any) {
            console.error(e);
            restoreAnalysis();
            showToast("Error processing chessboard image.", "error");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const onDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
        setLastLog(`Drop: ${piece} ${sourceSquare}->${targetSquare}`);

        try {
            const gameCopy = new Chess(gameRef.current.fen());

            // 1. Try standard legal chess move first
            try {
                const legalMove = gameCopy.move({
                    from: sourceSquare as Square,
                    to: targetSquare as Square,
                    promotion: "q",
                });

                if (legalMove) {
                    gameRef.current = gameCopy;
                    const newFen = gameCopy.fen();
                    setFen(newFen);
                    setSideToMove(gameCopy.turn());
                    setLastLog(`Move: ${legalMove.san}`);
                    return true;
                }
            } catch {
                // Not a legal move, fall through to free placement
            }

            // 2. God-mode placement / piece adjustment
            const color = piece[0] as "w" | "b";
            const type = piece[1].toLowerCase() as any;

            gameCopy.remove(sourceSquare as Square);
            const success = gameCopy.put({ type, color }, targetSquare as Square);

            if (!success) {
                setLastLog(`Error: Put failed ${piece}->${targetSquare}`);
                return false;
            }

            gameRef.current = gameCopy;
            const newFen = gameCopy.fen();
            setFen(newFen);
            setLastLog(`Placed ${piece} on ${targetSquare}`);
            return true;

        } catch (e: any) {
            console.error("Move Error:", e);
            setLastLog(`Exception: ${e.message}`);
            return false;
        }
    };

    const onRightClick = (square: string) => {
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
        if (selectedSquare) {
            if (selectedSquare === square) {
                setSelectedSquare(null);
                return;
            }

            try {
                const gameCopy = new Chess(gameRef.current.fen());
                // Try legal move first
                try {
                    const legal = gameCopy.move({
                        from: selectedSquare as Square,
                        to: square as Square,
                        promotion: "q",
                    });
                    if (legal) {
                        gameRef.current = gameCopy;
                        setFen(gameCopy.fen());
                        setSideToMove(gameCopy.turn());
                        setSelectedSquare(null);
                        return;
                    }
                } catch {
                    // Not legal, fall through to god-mode reposition
                }

                const sourcePiece = gameRef.current.get(selectedSquare as Square);
                if (sourcePiece) {
                    gameCopy.remove(selectedSquare as Square);
                    gameCopy.put({ type: sourcePiece.type, color: sourcePiece.color }, square as Square);
                    gameRef.current = gameCopy;
                    setFen(gameCopy.fen());
                }

                setSelectedSquare(null);
                return;
            } catch (e) {
                console.error("Click-Move failed", e);
            }
        }

        // 3. SELECTION
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
            setSelectedSpare(null);
        } else {
            setSelectedSpare(piece);
            setSelectedSquare(null);
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
        const initialFen = newGame.fen();
        setFen(initialFen);
        setFenInput(initialFen);
        setArrows([]);
        setBestMove("-");
        setEvalScore("0.0");
        setSideToMove("w");
        setOrientation("white");
        setFenError(null);
    };

    const clearBoard = () => {
        const newGame = new Chess();
        newGame.clear();
        gameRef.current = newGame;
        setFen(newGame.fen());
        setFenInput(newGame.fen());
        setArrows([]);
        setBestMove("-");
        setEvalScore("-");
    };

    const toggleOrientation = () => {
        setOrientation((prev) => (prev === "white" ? "black" : "white"));
    };

    const toggleSideToMove = () => {
        const newSide = sideToMove === "w" ? "b" : "w";
        const currentFen = gameRef.current.fen();
        const fenParts = currentFen.split(" ");
        if (fenParts.length >= 2) {
            fenParts[1] = newSide;
            if (fenParts.length >= 4) fenParts[3] = "-"; // Reset en passant target

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
        <div className="min-h-screen p-4 md:p-8 flex flex-col pb-20 bg-slate-950 text-slate-100">
            {/* Header */}
            <header className="flex items-center justify-between mb-6 max-w-7xl mx-auto w-full">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Back to Home</span>
                </Link>

                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Chess AI Board Analysis
                </h1>

                <button
                    onClick={() => setShowKeyModal(true)}
                    className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-750 hover:border-slate-600 transition-colors"
                >
                    <KeyRound className="w-3.5 h-3.5 text-yellow-400" />
                    <span>AI Vision API Key</span>
                    {hasSavedKey && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" title="API Key configured"></span>
                    )}
                </button>
            </header>

            {/* Notification Toast */}
            {toastMessage && (
                <div className="max-w-7xl mx-auto w-full mb-4">
                    <div
                        className={`p-3 rounded-lg text-sm flex items-center justify-between border ${
                            toastMessage.type === "error"
                                ? "bg-red-500/10 border-red-500/30 text-red-300"
                                : toastMessage.type === "success"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                : "bg-blue-500/10 border-blue-500/30 text-blue-300"
                        }`}
                    >
                        <span>{toastMessage.text}</span>
                        <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* FEN Bar & Presets */}
            <div className="max-w-7xl mx-auto w-full mb-6 bg-slate-900/80 border border-slate-800 p-4 rounded-xl shadow-lg">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="flex-1 w-full flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">FEN</span>
                        <input
                            type="text"
                            value={fenInput}
                            onChange={(e) => setFenInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleApplyFen()}
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-500"
                            placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                        />
                        <button
                            onClick={handleApplyFen}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shrink-0"
                        >
                            Load
                        </button>
                        <button
                            onClick={handleCopyFen}
                            title="Copy FEN"
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg border border-slate-700 transition-colors shrink-0 flex items-center gap-1"
                        >
                            {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                    </div>

                    {/* Presets */}
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold shrink-0">
                            Presets:
                        </span>
                        {PRESETS.map((p) => (
                            <button
                                key={p.name}
                                onClick={() => updateBoardPosition(p.fen)}
                                className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-colors"
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>
                {fenError && (
                    <div className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{fenError}</span>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <main className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto w-full flex-1">
                {/* Chessboard Column */}
                <div
                    ref={containerRef}
                    className="flex-1 flex flex-col items-center bg-slate-900/50 rounded-xl border border-slate-800 p-4 lg:p-8 min-h-[500px]"
                >
                    {/* Control Toolbar */}
                    <div className="flex flex-wrap gap-3 mb-6 bg-slate-800 p-2 rounded-lg border border-slate-700 shadow-lg">
                        <button
                            onClick={toggleOrientation}
                            className="bg-slate-700 hover:bg-slate-600 flex items-center gap-2 px-3 py-2 rounded-md text-slate-200 hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Flip Board
                        </button>
                        <button
                            onClick={resetBoard}
                            className="bg-slate-700 hover:bg-slate-600 flex items-center gap-2 px-3 py-2 rounded-md text-slate-200 hover:text-white transition-all text-xs font-bold uppercase tracking-wider"
                        >
                            <RefreshCw className="w-3.5 h-3.5 rotate-180" /> Reset
                        </button>
                        <button
                            onClick={clearBoard}
                            className="bg-red-900/40 hover:bg-red-800/60 flex items-center gap-2 px-3 py-2 rounded-md text-red-200 hover:text-red-100 transition-all text-xs font-bold uppercase tracking-wider border border-red-700/50"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Clear
                        </button>
                    </div>

                    {/* Selected Piece Actions */}
                    {selectedSquare && (
                        <div className="mb-4 flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-full border border-slate-600 animate-fade-in">
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

                    {/* Board Container */}
                    <div
                        className="relative rounded-lg shadow-2xl overflow-hidden border border-slate-700"
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "copy";
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;
                            const size = rect.width;
                            const squareSize = size / 8;

                            const fileIdx = Math.floor(x / squareSize);
                            const rankIdx = Math.floor(y / squareSize);

                            if (fileIdx < 0 || fileIdx > 7 || rankIdx < 0 || rankIdx > 7) return;

                            const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
                            let file = files[fileIdx];
                            let rank = 8 - rankIdx;

                            if (orientation === "black") {
                                file = files[7 - fileIdx];
                                rank = rankIdx + 1;
                            }

                            const targetSquare = `${file}${rank}`;

                            const sparePiece = e.dataTransfer.getData("text/plain");
                            if (sparePiece && (sparePiece.startsWith("w") || sparePiece.startsWith("b")) && sparePiece.length === 2) {
                                const gameCopy = new Chess(gameRef.current.fen());
                                const color = sparePiece[0] as "w" | "b";
                                const type = sparePiece[1].toLowerCase() as any;

                                gameCopy.remove(targetSquare as Square);
                                const success = gameCopy.put({ type, color }, targetSquare as Square);

                                if (success) {
                                    gameRef.current = gameCopy;
                                    setFen(gameCopy.fen());
                                    setLastLog(`Placed ${sparePiece} on ${targetSquare}`);
                                }
                            }
                        }}
                    >
                        <ChessboardWrapper
                            fen={fen}
                            onMove={onDrop}
                            onSquareRightClick={onRightClick}
                            onSquareClick={onSquareClick}
                            boardWidth={boardWidth}
                            orientation={orientation}
                            customArrows={arrows}
                        />
                    </div>

                    {/* Status Info */}
                    <div className="mt-4 text-[11px] text-slate-400 font-mono bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
                        Status: <span className="text-slate-300">{lastLog}</span>
                    </div>
                </div>

                {/* Right Column: Turn, Spare Pieces, Upload & Analysis */}
                <div className="w-full lg:w-[420px] flex flex-col gap-6">
                    {/* Spare Pieces Bank */}
                    <SparePieces
                        selectedPiece={selectedSpare}
                        onPieceSelect={handleSpareSelect}
                    />

                    {/* Tools & Upload */}
                    <div className="glass-panel p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                Turn to Move
                            </div>
                            <div className="flex bg-slate-800/80 p-1 rounded-lg border border-slate-700">
                                <button
                                    onClick={() => sideToMove !== "w" && toggleSideToMove()}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
                                        sideToMove === "w"
                                            ? "bg-white text-black font-bold shadow"
                                            : "text-slate-400 hover:text-white"
                                    }`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${sideToMove === "w" ? "bg-black" : "bg-white/20"}`}></div>
                                    White
                                </button>
                                <button
                                    onClick={() => sideToMove !== "b" && toggleSideToMove()}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${
                                        sideToMove === "b"
                                            ? "bg-black text-white font-bold shadow border border-slate-700"
                                            : "text-slate-400 hover:text-white"
                                    }`}
                                >
                                    <div className={`w-2 h-2 rounded-full ${sideToMove === "b" ? "bg-white" : "bg-white/20"}`}></div>
                                    Black
                                </button>
                            </div>
                        </div>

                        {/* Image Upload Zone */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                    Photo Recognition
                                </span>
                                <span className="text-[10px] text-purple-400 flex items-center gap-1 font-medium">
                                    <Sparkles className="w-3 h-3" /> Gemini 3.5 Flash Vision
                                </span>
                            </div>
                            <UploadZone onImageSelected={handleImageSelected} />
                        </div>
                    </div>

                    {/* Stockfish Engine Output */}
                    <div className="flex-1 min-h-[260px]">
                        <AnalysisPanel
                            evaluation={evalScore}
                            bestMove={bestMove}
                            isAnalyzing={isAnalyzing}
                            engineName="Stockfish 17.1 WebAssembly"
                        />
                    </div>
                </div>
            </main>

            {/* API Key Modal */}
            {showKeyModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
                        <button
                            onClick={() => setShowKeyModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2 text-purple-400 mb-2">
                            <KeyRound className="w-5 h-5" />
                            <h2 className="text-lg font-bold text-white">Google Gemini API Key</h2>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">
                            Provide your Gemini API key to recognize chess positions directly from photos of physical boards, screens, or diagrams. Stored locally in your browser.
                        </p>

                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500 mb-4 font-mono"
                        />

                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowKeyModal(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveApiKey}
                                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 text-xs font-bold rounded-lg transition-colors"
                            >
                                Save Key
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
