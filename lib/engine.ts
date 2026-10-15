
const STOCKFISH_PATH = "/stockfish-17.1-lite-single-03e3232.js";

export interface EngineOption {
    name: string;
    value: number | string;
}

export class ChessEngine {
    private worker: Worker | null = null;
    private isReady = false;
    private onMessage: (data: any) => void;
    private pendingFen: string | null = null;
    private pendingDepth: number = 15;

    constructor(onMessage: (data: any) => void) {
        this.onMessage = onMessage;
    }

    init() {
        if (typeof window === "undefined") return;

        try {
            this.worker = new Worker(STOCKFISH_PATH);

            this.worker.onerror = (err) => {
                console.error("Stockfish Worker Error:", err);
            };

            this.worker.onmessage = (e) => {
                const msg = e.data;
                if (msg === "uciok") {
                    this.isReady = true;
                    // Send basic configuration after uciok
                    this.setOption("UCI_LimitStrength", "true");
                    this.setOption("UCI_Elo", "2200");
                    this.setOption("Skill Level", "20");
                    this.worker?.postMessage("isready");

                    if (this.pendingFen) {
                        const fenToAnalyze = this.pendingFen;
                        const depthToAnalyze = this.pendingDepth;
                        this.pendingFen = null;
                        this.analyze(fenToAnalyze, depthToAnalyze);
                    }
                }

                this.onMessage(msg);
            };

            this.worker.postMessage("uci");
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

        if (!this.isReady) {
            this.pendingFen = fen;
            this.pendingDepth = depth;
            return;
        }

        this.worker.postMessage("stop");
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
