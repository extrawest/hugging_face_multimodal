"use server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { finished } from "stream/promises";
import { InferenceClient } from "@huggingface/inference";

const client = new InferenceClient(process.env.HF_TOKEN);

export const speechRecognition = async (audioUrl: string) => {
  const dirPath = path.join(process.cwd(), "tmp");
  try {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

    const urlFilename = path.basename(new URL(audioUrl).pathname);
    const filename = urlFilename.endsWith(".mp3")
      ? urlFilename
      : `audio-${Date.now()}.mp3`;
    const destinationPath = path.join(dirPath, filename);
    const response = await fetch(audioUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    console.log(response);
    if (!response.ok) {
      throw new Error(`Failed to fetch MP3: ${response.statusText}`);
    }
    if (!response.body) {
      throw new Error("Response body is empty");
    }

    const fileStream = fs.createWriteStream(destinationPath);
    const nodeReadableStream = Readable.fromWeb(response.body as any);

    nodeReadableStream.pipe(fileStream);

    await finished(fileStream);

    const data = fs.readFileSync(destinationPath);
    const blob = new Blob([data], { type: "audio/mpeg" });
    return await client.automaticSpeechRecognition({
      data: blob,
      model: "openai/whisper-large-v3",
      provider: "hf-inference",
    });
  } catch (error: any) {
    console.error("Server Action Error:", error);
    throw new Error(error?.message ?? "Transcription failed");
  }
};

export const chatWithModel = async (
  messages: { role: string; message: string }[],
  transcription: string,
) => {
  const response = await client.chatCompletion({
    model: "openai/gpt-oss-120b:fastest",
    messages: [
      {
        role: "system",
        message: `You have to answer to questions regarding this podcast transcription: ${transcription}`,
      },
      ...messages,
    ],
  });
  return response.choices[0].message;
};
