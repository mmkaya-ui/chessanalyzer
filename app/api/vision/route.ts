import { NextRequest, NextResponse } from "next/server";

// Default thinking is used on purpose: in testing, thinkingLevel "low" was not reliably
// faster and produced malformed FENs (ranks not summing to 8) in 3 of 7 runs.

/** True if every rank of the board part of a FEN describes exactly 8 squares. */
function ranksAreValid(fen: string): boolean {
    const ranks = fen.trim().split(/\s+/)[0].split("/");
    return ranks.length === 8 && ranks.every(rank =>
        [...rank].reduce((n, c) => n + (c >= "1" && c <= "8" ? Number(c) : 1), 0) === 8
    );
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("image") as File | null;
        const userApiKey = (formData.get("apiKey") as string | null) || "";

        if (!file) {
            return NextResponse.json({ error: "No image file provided." }, { status: 400 });
        }

        const apiKey = userApiKey.trim() || process.env.GEMINI_API_KEY || "";
        if (!apiKey) {
            return NextResponse.json({
                error: "No Gemini API key provided. Please provide an API key in settings or set GEMINI_API_KEY environment variable.",
                needsKey: true
            }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const base64Data = Buffer.from(bytes).toString("base64");
        const mimeType = file.type || "image/jpeg";

        const systemPrompt = `You are a specialized chess vision analyzer with superior spatial reasoning.
Analyze this chessboard photo and output the exact FEN (Forsyth-Edwards Notation) string for the position.
Requirements:
1. Carefully map the 8x8 grid: examine each rank from 8 down to 1, and each file from a to h.
2. Distinguish piece types and colors precisely (P/p for pawn, N/n for knight, B/b for bishop, R/r for rook, Q/q for queen, K/k for king).
3. Uppercase is White, lowercase is Black.
4. Empty squares are represented by numbers 1-8.
5. If turn/active color cannot be determined from clock or indicators, assume white to move ("w").
6. Output ONLY the raw FEN string, for example:
r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1
Do not include explanations, thinking, markdown code fences, or quotes. Return strictly the FEN string.`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: systemPrompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.1,
                // Gemini 3.x models "think" first and thinking tokens count toward
                // this limit. A small cap (e.g. 100) truncates the FEN mid-string.
                maxOutputTokens: 8192
            }
        };

        // Primary: Gemini 3.5 Flash, tried twice (a bad/failed answer gets one retry).
        // Last resort: Gemini 3.1 Flash-Lite. It is fast but misread ~1/3 of the squares
        // on the sample photo, so its results are flagged lowConfidence for the UI.
        // Override with GEMINI_MODELS="primary,fallback" if Google retires these.
        const [primary, fallback] = (process.env.GEMINI_MODELS || "gemini-3.5-flash,gemini-3.1-flash-lite")
            .split(",").map(m => m.trim()).filter(Boolean);
        const attempts = [primary, primary, ...(fallback ? [fallback] : [])];
        const fenRegex = /([rnbqkpRNBQKP1-8]{1,8}\/){7}[rnbqkpRNBQKP1-8]{1,8}(\s+[wb](\s+([KQkq]+|-))?(\s+([a-h][1-8]|-))?(\s+\d+\s+\d+)?)?/;

        let lastError = "";
        let lastStatus = 500;
        let lastRaw = "";
        let usedModel = primary;
        let detectedFen = "";
        let rawText = "";
        const attemptLog: string[] = [];

        for (const model of attempts) {
            usedModel = model;
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                {
                    method: "POST",
                    // Key in a header, not the URL, so it doesn't end up in proxy/server logs.
                    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
                    body: JSON.stringify(requestBody)
                }
            );

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                lastError = errData?.error?.message || res.statusText;
                lastStatus = res.status;
                attemptLog.push(`${model}: HTTP ${res.status} ${lastError}`);
                // Bad key / permission problems won't be fixed by retrying.
                if (res.status === 400 || res.status === 401 || res.status === 403) break;
                continue; // 404 (model gone), 429 (quota), 5xx: try the next attempt
            }

            const data = await res.json();
            const finish = data?.candidates?.[0]?.finishReason || "unknown";
            const parts: any[] = data?.candidates?.[0]?.content?.parts || [];
            // Skip thought parts; join the rest.
            const text = parts.filter(p => !p.thought).map(p => p.text || "").join("").trim();
            const match = text.match(fenRegex);
            if (match && ranksAreValid(match[0])) {
                rawText = text;
                detectedFen = match[0].trim();
                break;
            }
            lastRaw = text;
            lastStatus = 422;
            lastError = match
                ? `${model} returned a malformed FEN (a rank does not add up to 8 squares): "${match[0]}"`
                : `Could not parse a FEN from ${model} output (finishReason: ${finish}): "${text}"`;
            attemptLog.push(lastError);
        }

        if (attemptLog.length) console.warn("Vision attempts that failed:\n" + attemptLog.join("\n"));

        if (!detectedFen) {
            return NextResponse.json(
                { error: `Gemini API error: ${lastError}`, rawText: lastRaw, model: usedModel },
                { status: lastStatus }
            );
        }

        if (detectedFen.split(" ").length === 1) {
            detectedFen = `${detectedFen} w - - 0 1`;
        }

        const lowConfidence = usedModel !== primary;
        return NextResponse.json({ fen: detectedFen, rawText, model: usedModel, lowConfidence, attempts: attemptLog.length + 1 });
    } catch (err: any) {
        console.error("Vision API Route Error:", err);
        return NextResponse.json({ error: err.message || "Failed to process image." }, { status: 500 });
    }
}
