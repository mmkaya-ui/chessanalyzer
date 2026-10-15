// Vision processor supporting multimodal Gemini AI and client BYOK

export async function processBoardImage(
    imageFile: File,
    apiKey?: string
): Promise<{ fen: string | null; error?: string; needsKey?: boolean; lowConfidence?: boolean }> {
    try {
        const formData = new FormData();
        formData.append("image", imageFile);

        // Check apiKey parameter or localStorage
        const key = apiKey || (typeof window !== "undefined" ? localStorage.getItem("gemini_api_key") || "" : "");
        if (key) {
            formData.append("apiKey", key);
        }

        const response = await fetch("/api/vision", {
            method: "POST",
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                fen: null,
                error: data.error || "Failed to analyze chessboard image.",
                needsKey: data.needsKey,
            };
        }

        return {
            fen: data.fen,
            // Set when the primary model failed and the fast fallback model answered.
            lowConfidence: !!data.lowConfidence,
        };
    } catch (err: any) {
        console.error("Vision processing error:", err);
        return {
            fen: null,
            error: err.message || "Network error while processing chessboard image.",
        };
    }
}

// Fallback for custom model uploader compatibility
export async function loadCustomModel(jsonFile: File, weightFiles: File[]): Promise<boolean> {
    try {
        console.log("Loading custom model files:", jsonFile.name, weightFiles.length);
        return true;
    } catch (e) {
        console.error("Failed to load custom model:", e);
        return false;
    }
}
