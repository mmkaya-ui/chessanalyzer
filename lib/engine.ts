
const STOCKFISH_PATH = "/stockfish-17.1-lite-51f59da.js";
// Note: We'll update the path dynamically if needed, but for now we look for the lite version we saw in the file list.

export interface EngineOption {
    name: string;
    value: number | string;
}

export class ChessEngine {
    private worker: Worker | null = null;
    private isReady = false;
    private onMessage: (data: any) => void;

    constructor(onMessage: (data: any) => void) {
        this.onMessage = onMessage;
    }

    init() {
        if (typeof window === "undefined") return;

        try {
            this.worker = new Worker(STOCKFISH_PATH);

            this.worker.onmessage = (e) => {
                const msg = e.data;
                // console.log("Engine:", msg);

                if (msg === "uciok") {
                    this.isReady = true;
                }

                this.onMessage(msg);
            };

            this.worker.postMessage("uci");

            // Configure for "Human-like" play
            // Skill Level: 0-20. 20 is max. 10 crashes often with weak moves. 
            // UCI_LimitStrength: true, UCI_Elo: 1500-2000 for human-like.
            // We will set a high but not perfect ELO to simulate a strong human.

            this.setOption("UCI_LimitStrength", "true");
            this.setOption("UCI_Elo", "2200"); // Grandmaster level but potentially fallible
            this.setOption("Skill Level", "20"); // Keep skill high but capped by ELO

        } catch (error) {
            console.error("Failed to load Stockfish:", error);
        }
    }

    setOption(name: string, value: string) {
        if (this.worker) {
            this.worker.postMessage(`setoption name ${name} value ${value}`);
        }
    }

    analyze(fen: string, depth: number = 15) {
        if (!this.worker) return;
        this.worker.postMessage(`position fen ${fen}`);
        this.worker.postMessage(`go depth ${depth}`);
    }

    stop() {
        if (this.worker) {
            this.worker.postMessage("stop");
        }
    }

    quit() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}
