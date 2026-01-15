"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface UploadZoneProps {
    onImageSelected: (file: File) => void;
}

export default function UploadZone({ onImageSelected }: UploadZoneProps) {
    const [dragActive, setDragActive] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            handleFile(file);
        }
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
            // Reset input so same file can be selected again if needed
            e.target.value = "";
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFile = (file: File) => {
        // Basic validation
        if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            onImageSelected(file);
        }
    };

    const clearImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreview(null);
        // Reset file input if needed via ref, but for now just clear preview
    };

    return (
        <div className="w-full">
            <div
                className={`relative group w-full h-64 border-2 border-dashed rounded-xl transition-all duration-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden
          ${dragActive
                        ? "border-primary bg-primary/10 scale-[1.02]"
                        : "border-slate-600 bg-slate-800/50 hover:border-slate-400 hover:bg-slate-800"
                    }
          ${preview ? "border-none p-0" : "p-4"}
        `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={handleClick}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleChange}
                />

                {preview ? (
                    <>
                        <img
                            src={preview}
                            alt="Board Preview"
                            className="w-full h-full object-contain pointer-events-none"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                                onClick={clearImage}
                                className="p-3 bg-red-500/80 hover:bg-red-500 text-white rounded-full transform hover:scale-110 transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center space-y-4 pointer-events-none">
                        <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                            <Upload className={`w-8 h-8 ${dragActive ? "text-primary" : "text-slate-400"}`} />
                        </div>
                        <div>
                            <p className="text-lg font-medium text-slate-200">
                                Drop board photo here
                            </p>
                            <p className="text-sm text-slate-400 mt-1">
                                or click to upload
                            </p>
                        </div>
                        <div className="flex gap-2 justify-center mt-4">
                            <span className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-500">JPG</span>
                            <span className="text-xs px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-500">PNG</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
