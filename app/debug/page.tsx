"use client";

import { Chessboard } from "react-chessboard";
import { useState } from "react";
import { Chess } from "chess.js";

export default function DebugPage() {
    const [game, setGame] = useState(new Chess());

    function onDrop(sourceSquare: string, targetSquare: string) {
        try {
            const gameCopy = new Chess(game.fen());
            const move = gameCopy.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: "q",
            });
            setGame(gameCopy);
            return move !== null;
        } catch (error) {
            return false;
        }
    }

    const ChessboardComponent = Chessboard as any;

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#f0f0f0',
            flexDirection: 'column',
            gap: '20px'
        }}>
            <h1 style={{ color: 'black' }}>Debug Mode: Pure Drag & Drop Test</h1>
            <p style={{ color: 'black' }}>If pieces move here, the issue is the Main App's styling.</p>
            <div style={{ width: '400px', height: '400px', border: '5px solid red' }}>
                <ChessboardComponent
                    position={game.fen()}
                    onPieceDrop={onDrop}
                    arePiecesDraggable={true}
                    animationDuration={200}
                />
            </div>
        </div>
    );
}
