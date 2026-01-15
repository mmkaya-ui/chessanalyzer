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
    customArrows?: [string, string][];
    areArrowsAllowed?: boolean;
    snapToCursor?: boolean;
    animationDuration?: number;
    autoPromoteToQueen?: boolean;
}

export default function ChessboardWrapper({
    fen,
    onMove,
    onSquareRightClick,
    orientation = "white",
    boardWidth = 400,
    customArrows,
    ...props
}: ChessboardWrapperProps) {
    const [boardSize, setBoardSize] = useState(boardWidth);

    useEffect(() => {
        setBoardSize(boardWidth);
    }, [boardWidth]);

    // Cast to any to bypass strict prop types if needed
    const ChessboardComponent = Chessboard as any;

    return (
        // KEY CHANGE: Removed the heavy border/shadow container for now to ensure no event capturing
        // If this works, we add style back on the PARENT div in the Page, not here.
        <div style={{ width: boardSize, height: boardSize }}>
            <ChessboardComponent
                id="AnalysisBoard"
                position={fen}
                onPieceDrop={onMove}
                onPieceDragBegin={props.onPieceDragBegin}
                onSquareRightClick={onSquareRightClick}
                onSquareClick={props.onSquareClick}
                boardOrientation={orientation}
                boardWidth={boardSize}
                arePiecesDraggable={true}
                areArrowsAllowed={false}
                autoPromoteToQueen={true}
                customArrows={customArrows}
                customDarkSquareStyle={{ backgroundColor: "#334155" }}
                customLightSquareStyle={{ backgroundColor: "#94a3b8" }}
                animationDuration={200}
            />
        </div>
    );
}
