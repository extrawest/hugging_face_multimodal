"use client";

import { useState } from "react";
import { generateAudioSummary } from "@/api/ai.graph";
import { Play, Square, Loader2 } from "lucide-react";

export default function Tts({ summaryText }: { summaryText: string }) {
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
      const base64Audio = await generateAudioSummary(summaryText);
      setAudioUrl(base64Audio);
      
      const newAudio = new Audio(base64Audio);
      newAudio.onended = () => setIsPlaying(false);
      setAudio(newAudio);
      newAudio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("TTS play error:", err);
      alert("TTS generation failed. Please check ELEVENLABS_API_KEY.");
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
