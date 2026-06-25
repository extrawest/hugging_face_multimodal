"use client";
import { use } from "react";
import { AutomaticSpeechRecognitionOutput } from "@huggingface/tasks";

export default function AudioTranscribe({
  transcription,
}: {
  transcription: Promise<AutomaticSpeechRecognitionOutput | null>;
}) {
  const result = use(transcription);

  return <div>{result?.text}</div>;
}
