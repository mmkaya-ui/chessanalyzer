"use client";

import { useState } from "react";
import { loadCustomModel } from "@/lib/vision";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

export default function ModelUploader() {
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
    const [fileName, setFileName] = useState("");

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        // We expect at least a .json file and optionally .bin files
        const files = Array.from(e.target.files);
        const jsonFile = files.find(f => f.name.endsWith('.json'));
        const weightFiles = files.filter(f => f.name.endsWith('.bin'));

        if (!jsonFile) {
            alert("Please select a model.json file (and associated .bin files).");
            return;
        }

        setFileName(jsonFile.name);

        try {
            const success = await loadCustomModel(jsonFile, weightFiles);
            setStatus(success ? "success" : "error");
        } catch (err) {
            console.error(err);
            setStatus("error");
        }
    };

    return (
        <div className="glass-panel p-4 mb-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Custom AI Model
            </h3>

            <div className={`relative border border-dashed rounded-lg p-3 flex flex-col items-center justify-center transition-colors
                ${status === 'success' ? 'border-green-500/50 bg-green-500/10' :
                    status === 'error' ? 'border-red-500/50 bg-red-500/10' :
                        'border-slate-600 hover:border-slate-500 hover:bg-white/5'}`
            }>
                <input
                    type="file"
                    multiple
                    accept=".json,.bin"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {status === 'idle' && (
                    <>
                        <Upload className="w-5 h-5 text-slate-400 mb-1" />
                        <span className="text-xs text-slate-300 text-center">Click to upload model files<br />(model.json + .bin)</span>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="w-5 h-5 text-green-400 mb-1" />
                        <span className="text-xs text-green-300 font-medium">Model Loaded!</span>
                        <span className="text-[10px] text-green-400/70">{fileName}</span>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <AlertCircle className="w-5 h-5 text-red-400 mb-1" />
                        <span className="text-xs text-red-300">Load Failed</span>
                    </>
                )}
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
                Use standard TensorFlow.js Graph Model format.
            </p>
        </div>
    );
}
