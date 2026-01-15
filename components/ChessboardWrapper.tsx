"use client";

import { Chessboard } from "react-chessboard";
import { useState, useEffect } from "react";

interface ChessboardWrapperProps {
    fen: string;
    onMove?: (sourceSquare: string, targetSquare: string, piece: string) => boolean;
    onPieceDragBegin?: (piece: string, sourceSquare: string) => void;
    onSquareRightClick?: (square: string) => void;
    onSquareClick?: (square: string) => void;
    orientation?: "white" | "black";
    boardWidth?: number;
    customArrows?: [string, string][]; // Tuple of squares e.g. ["e2", "e4"]
}

export default function ChessboardWrapper({ fen, onMove, onSquareRightClick, orientation = "white", boardWidth = 400, customArrows, ...props }: ChessboardWrapperProps) {
    // Use state to force re-render if needed/styling
    const [boardSize, setBoardSize] = useState(boardWidth);

    useEffect(() => {
        // Handle resizing if container changes
        setBoardSize(boardWidth);
    }, [boardWidth]);

    // Cast to any to bypass strict prop types in this version
    const ChessboardComponent = Chessboard as any;

    return (
        <div className="relative rounded-lg shadow-2xl shadow-black/50 border-[4px] border-slate-700/50 z-50 bg-slate-800">
            <ChessboardComponent
                id="AnalysisBoard"
                position={fen}
                onPieceDrop={onMove}
                onPieceDragBegin={props.onPieceDragBegin}
                onSquareRightClick={onSquareRightClick}
                onSquareClick={props.onSquareClick}
                boardOrientation={orientation}
                boardWidth={boardSize}
                areArrowsAllowed={false}
                customArrows={customArrows}
                customDarkSquareStyle={{ backgroundColor: "#334155" }} // Slate-700
                customLightSquareStyle={{ backgroundColor: "#94a3b8" }} // Slate-400
                customBoardStyle={{
                    borderRadius: '4px',
                    cursor: 'pointer',
                }}
                animationDuration={200}
                arePiecesDraggable={true}
            />
        </div>
    );
}
