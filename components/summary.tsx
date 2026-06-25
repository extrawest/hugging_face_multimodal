"use client";

import { useEffect, useState } from "react";
import { summarizeText, generateTitleAndPrompt } from "@/api/hugging-face.api";
import Translation from "./translation";
import Tts from "./tts";
import AiImage from "./aiImage";

export default function SummarySection({
  transcriptionText,
}: {
  transcriptionText: string;
}) {
  const [summary, setSummary] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [imagePrompt, setImagePrompt] = useState<string>("");
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function runFlow() {
      try {
        setLoadingSummary(true);
        const sumText = await summarizeText(transcriptionText);
        setSummary(sumText);
        setLoadingSummary(false);

        const meta = await generateTitleAndPrompt(sumText);
        setTitle(meta.title);
        setImagePrompt(meta.imagePrompt);
      } catch (err: any) {
        console.error(err);
        setError("Failed to process summary.");
        setLoadingSummary(false);
      }
    }
    if (transcriptionText) {
      runFlow();
    }
  }, [transcriptionText]);

  if (loadingSummary) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="loading loading-spinner loading-lg text-accent"></div>
        <p className="text-sm opacity-70">Creating summary...</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {title && (
        <div className="border-b border-white/10 pb-4">
          <span className="text-xs uppercase tracking-widest text-accent font-semibold">
            Generated Blog Title
          </span>
          <h2 className="text-3xl font-extrabold mt-1 text-white">{title}</h2>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          {imagePrompt ? (
            <AiImage prompt={imagePrompt} />
          ) : (
            <div className="skeleton h-64 w-full rounded-2xl bg-white/5 animate-pulse" />
          )}
        </div>

        <div className="flex flex-col justify-between p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-accent">Executive Summary</h3>
            <p className="text-base leading-relaxed opacity-90">{summary}</p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-4">
            {summary && <Tts summaryText={summary} />}
            {summary && <Translation englishText={summary} />}
          </div>
        </div>
      </div>
    </div>
  );
}
