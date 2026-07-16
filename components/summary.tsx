"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Translation from "./translation";
import Tts from "./tts";

export default function SummarySection({
  transcriptionText,
  episodeId,
}: {
  transcriptionText: string;
  episodeId: number;
}) {
  const [summary, setSummary] = useState("");
  const [title, setTitle] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function runFlow() {
      try {
        setLoading(true);
        setError("");
        setSummary("");
        setTitle("");
        setImagePrompt("");
        setImageUrl("");

        const response = await fetch("/api/blog", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transcriptionText,
            threadId: String(episodeId),
            action: "generate",
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to generate blog: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Response body is not readable");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            const data = JSON.parse(line);

            if (data.error) {
              throw new Error(data.error);
            }

            if (data.output) {
              if (data.node === "summarizeTranscript" && data.output.summary) {
                setSummary(data.output.summary);
              } else if (data.node === "generateBlogMetadata") {
                if (data.output.title) setTitle(data.output.title);
                if (data.output.imagePrompt)
                  setImagePrompt(data.output.imagePrompt);
              } else if (
                data.node === "generateHeroImage" &&
                data.output.imageUrl
              ) {
                setImageUrl(data.output.imageUrl);
              }
            }
          }
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          setError(err.message || "Failed to generate blog content.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (transcriptionText) {
      runFlow();
    }

    return () => {
      cancelled = true;
    };
  }, [transcriptionText, episodeId]);

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (loading && !summary && !title) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="loading loading-spinner loading-lg text-accent" />
        <p className="text-xs opacity-60">
          Initializing blog generation pipeline...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-white/10 pb-4">
        <span className="text-xs uppercase tracking-widest text-accent font-semibold">
          Generated Blog Title
        </span>
        <h2 className="text-3xl font-extrabold mt-1 text-white">
          {title || (
            <span className="loading loading-dots loading-md text-white/50" />
          )}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Hero Image */}
        <div className="relative group overflow-hidden rounded-2xl border border-white/10 shadow-2xl h-64 bg-white/5 flex items-center justify-center">
          {imageUrl ? (
            <>
              <Image
                src={imageUrl}
                alt="AI Generated Blog Art"
                fill
                unoptimized
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover transform transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <p className="text-xs text-white/80 line-clamp-2">
                  {imagePrompt}
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <span className="loading loading-spinner text-accent mb-2" />
              <p className="text-xs opacity-60">Generating hero image...</p>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-accent">Executive Summary</h3>
            {summary ? (
              <p className="text-base leading-relaxed opacity-90">{summary}</p>
            ) : (
              <div className="space-y-2">
                <div className="skeleton h-4 w-full bg-white/5" />
                <div className="skeleton h-4 w-full bg-white/5" />
                <div className="skeleton h-4 w-2/3 bg-white/5" />
              </div>
            )}
          </div>

          {summary && (
            <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-4">
              <Tts summaryText={summary} episodeId={episodeId} />
              <Translation englishText={summary} episodeId={episodeId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
