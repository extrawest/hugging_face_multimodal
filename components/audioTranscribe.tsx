"use client";
import { use } from "react";
import { AutomaticSpeechRecognitionOutput } from "@huggingface/tasks";
import SummarySection from "./summary";
import Qna from "./qna";

export default function AudioTranscribe({
  transcription,
  episodeId,
}: {
  transcription: Promise<AutomaticSpeechRecognitionOutput | null>;
  episodeId: number;
}) {
  const result = use(transcription);
  const text = result?.text || "";

  if (!text) {
    return (
      <div className="alert alert-error mt-4">
        Speech recognition returned no text.
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 mt-8 w-full items-start">
      <div className="flex-1 space-y-6 w-full">
        <div className="collapse collapse-arrow bg-white/5 border border-white/10 rounded-2xl">
          <input type="checkbox" />
          <div className="collapse-title text-base font-semibold text-accent">
            View Full Raw Transcription
          </div>
          <div className="collapse-content">
            <div className="max-h-60 overflow-y-auto p-4 bg-black/20 rounded-xl text-sm leading-relaxed text-white/80">
              {text}
            </div>
          </div>
        </div>

        <SummarySection transcriptionText={text} episodeId={episodeId} />
      </div>

      <div className="w-full lg:w-96 shrink-0 lg:sticky lg:top-4">
        <Qna transcriptionText={text} episodeId={episodeId} />
      </div>
    </div>
  );
}
