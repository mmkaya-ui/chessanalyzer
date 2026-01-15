"use client";

import { useState } from "react";

const PIECES = [
    { type: "p", name: "Pawn" },
    { type: "n", name: "Knight" },
    { type: "b", name: "Bishop" },
    { type: "r", name: "Rook" },
    { type: "q", name: "Queen" },
    { type: "k", name: "King" },
];

interface SparePiecesProps {
    onPieceSelect: (piece: string) => void;
    selectedPiece: string | null;
}

export default function SparePieces({ onPieceSelect, selectedPiece }: SparePiecesProps) {
    return (
        <div className="flex flex-col gap-4 p-4 glass-panel bg-slate-800/50">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider text-center">Spare Pieces</h3>

            <div className="flex flex-wrap gap-2 justify-center">
                <div className="w-full text-xs text-slate-500 text-center mb-1">White</div>
                {PIECES.map((p) => {
                    const pieceCode = `w${p.type.toUpperCase()}`;
                    const isSelected = selectedPiece === pieceCode;
                    return (
                        <button
                            key={pieceCode}
                            onClick={() => onPieceSelect(pieceCode)}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all shrink-0 ${isSelected ? "bg-primary shadow-[0_0_15px_rgba(139,92,246,0.5)] scale-110" : "bg-white/5 hover:bg-white/10"}`}
                            title={`White ${p.name}`}
                        >
                            <img
                                src={`https://images.chesscomfiles.com/chess-themes/pieces/neo/150/w${p.type}.png`}
                                alt={p.name}
                                style={{ width: '32px', height: '32px' }}
                                className="pointer-events-none select-none"
                            />
                        </button>
                    );
                })}
            </div>

            <div className="w-full h-px bg-white/5 my-1"></div>

            <div className="flex flex-wrap gap-2 justify-center">
                <div className="w-full text-xs text-slate-500 text-center mb-1">Black</div>
                {PIECES.map((p) => {
                    const pieceCode = `b${p.type.toUpperCase()}`;
                    const isSelected = selectedPiece === pieceCode;
                    return (
                        <button
                            key={pieceCode}
                            onClick={() => onPieceSelect(pieceCode)}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all shrink-0 ${isSelected ? "bg-primary shadow-[0_0_15px_rgba(139,92,246,0.5)] scale-110" : "bg-white/5 hover:bg-white/10"}`}
                            title={`Black ${p.name}`}
                        >
                            <img
                                src={`https://images.chesscomfiles.com/chess-themes/pieces/neo/150/b${p.type}.png`}
                                alt={p.name}
                                style={{ width: '32px', height: '32px' }}
                                className="pointer-events-none select-none"
                            />
                        </button>
                    );
                })}
            </div>

            <p className="text-[10px] text-slate-500 text-center mt-2 leading-tight">
                Select a piece, then click a square to place it.
            </p>
        </div>
    );
}
