"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  generateBlogFromTranscription,
  type GeneratedBlog,
} from "@/api/ai.graph";
import Translation from "./translation";
import Tts from "./tts";

export default function SummarySection({
  transcriptionText,
}: {
  transcriptionText: string;
}) {
  const [blog, setBlog] = useState<GeneratedBlog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function runFlow() {
      try {
        setLoading(true);
        setError("");

        const generatedBlog =
          await generateBlogFromTranscription(transcriptionText);

        if (!cancelled) {
          setBlog(generatedBlog);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError("Failed to generate blog content.");
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
  }, [transcriptionText]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="loading loading-spinner loading-lg text-accent"/>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!blog) {
    return null;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="border-b border-white/10 pb-4">
        <span className="text-xs uppercase tracking-widest text-accent font-semibold">
          Generated Blog Title
        </span>
        <h2 className="text-3xl font-extrabold mt-1 text-white">
          {blog.title}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative group overflow-hidden rounded-2xl border border-white/10 shadow-2xl h-64">
          <Image
            src={blog.imageUrl}
            alt="AI Generated Blog Art"
            fill
            unoptimized
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transform transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
            <p className="text-xs text-white/80 line-clamp-2">
              {blog.imagePrompt}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-accent">Executive Summary</h3>
            <p className="text-base leading-relaxed opacity-90">{blog.summary}</p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col gap-4">
            <Tts summaryText={blog.summary} />
            <Translation englishText={blog.summary} />
          </div>
        </div>
      </div>
    </div>
  );
}
