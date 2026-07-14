"use client";

import { useState } from "react";
import { Play, Square, Loader2 } from "lucide-react";

export default function Tts({ episodeId }: { episodeId: number }) {
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const handlePlayTTS = async () => {
    if (audioUrl) {
      if (isPlaying && audio) {
        audio.pause();
        setIsPlaying(false);
      } else if (audio) {
        audio.play();
        setIsPlaying(true);
      }
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/blog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId: String(episodeId),
          action: "audio",
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let finalAudioUrl = "";

      while (true) {
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

          if (
            data.output &&
            data.node === "generateAudioSummary" &&
            data.output.audioUrl
          ) {
            finalAudioUrl = data.output.audioUrl;
          }
        }
      }

      if (!finalAudioUrl) {
        throw new Error("No speech audio returned from ElevenLabs");
      }

      setAudioUrl(finalAudioUrl);

      const newAudio = new Audio(finalAudioUrl);
      newAudio.onended = () => setIsPlaying(false);
      setAudio(newAudio);
      newAudio.play();
      setIsPlaying(true);
    } catch (err: any) {
      console.error("TTS play error:", err);
      alert(
        err.message ||
          "TTS generation failed. Please check ELEVENLABS_API_KEY.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePlayTTS}
      disabled={loading}
      className="btn btn-accent btn-sm gap-2 w-fit"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPlaying ? (
        <>
          <Square className="h-4 w-4 fill-current" /> Stop Audio Summary
        </>
      ) : (
        <>
          <Play className="h-4 w-4 fill-current" /> Listen Summary
        </>
      )}
    </button>
  );
}
