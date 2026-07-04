"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { generateHeroImageFromPrompt } from "@/api/ai.graph";

export default function AiImage({ prompt }: { prompt: string }) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchImage() {
      try {
        setLoading(true);
        const dataUrl = await generateHeroImageFromPrompt(prompt);
        setImageUrl(dataUrl);
      } catch (err) {
        console.error(err);
        setError("Could not generate image");
      } finally {
        setLoading(false);
      }
    }
    if (prompt) {
      fetchImage();
    }
  }, [prompt]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 w-full rounded-2xl bg-white/5 border border-white/10 animate-pulse">
        <span className="loading loading-spinner text-accent"></span>
        <span className="text-xs mt-2 opacity-60">
          Generating post image...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 w-full rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="relative group overflow-hidden rounded-2xl border border-white/10 shadow-2xl h-64">
      <Image
        src={imageUrl}
        alt="AI Generated Blog Art"
        fill
        unoptimized
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover transform transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
        <p className="text-xs text-white/80 line-clamp-2">{prompt}</p>
      </div>
    </div>
  );
}
