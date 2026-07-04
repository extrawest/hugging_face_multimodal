"use server";
import fs from "fs";
import path from "path";

import { InferenceClient } from "@huggingface/inference";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new InferenceClient(process.env.HF_TOKEN);

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

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

    if (!response.ok)
      throw new Error(`Failed to fetch MP3: ${response.statusText}`);
    const data = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(destinationPath, data);

    const blob = new Blob([data], { type: "audio/mpeg" });

    return await client.automaticSpeechRecognition({
      data: blob,
      model: "openai/whisper-large-v3",
    });
  } catch (error: unknown) {
    console.error("Transcription Error:", error);
    throw new Error(getErrorMessage(error, "Transcription failed"));
  }
};

export const summarizeText = async (text: string): Promise<string> => {
  try {
    const result = await client.summarization({
      model: "facebook/bart-large-cnn",
      inputs: text,
    });
    return result.summary_text || "";
  } catch (error: unknown) {
    console.error("Summarization Error:", error);
    throw new Error(getErrorMessage(error, "Summarization failed"));
  }
};

export const generateTitleAndPrompt = async (
  summary: string,
): Promise<{ title: string; imagePrompt: string }> => {
  try {
    const prompt = `<|system|>
You are a creative blog writer. Generate a catchy, SEO-friendly blog post title and a detailed description (prompt) for a blog post hero image based on the provided summary.
Return ONLY a valid JSON object with the keys "title" and "imagePrompt". No explanation, no extra text.
JSON format:
{
  "title": "...",
  "imagePrompt": "..."
}
</s>
<|user|>
Summary: ${summary}
</s>
<|assistant|>`;

    const response = await client.chatCompletion({
      model: "meta-llama/Llama-3.1-8B-Instruct",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
    });

    const content = response.choices[0].message.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return {
      title: "Podcast Insight",
      imagePrompt: `A vibrant visual representation of the summary: ${summary.slice(0, 100)}`,
    };
  } catch (error) {
    console.error("Title/Prompt Generation Error:", error);
    return {
      title: "Podcast Summary Blog Post",
      imagePrompt:
        "A sleek workspace with a podcast microphone, digital blog graphics, vibrant ambient lighting, 3d render",
    };
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const blob = await client.textToImage(
      {
        model: "stabilityai/stable-diffusion-xl-base-1.0",
        inputs: prompt,
      },
      {
        outputType: "blob",
      },
    );

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("Image Generation Error:", error);
    throw new Error("Image generation failed");
  }
};

export const translateToFrench = async (text: string): Promise<string> => {
  try {
    const response = await client.translation({
      model: "Helsinki-NLP/opus-mt-en-fr",
      inputs: text,
    });
    return response.translation_text || "";
  } catch (error) {
    console.error("Translation Error:", error);
    throw new Error("Translation failed");
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured in the environment");
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";

  try {
    const client = new ElevenLabsClient({ apiKey });
    const responseStream = await client.textToSpeech.convert(voiceId, {
      text,
      modelId: "eleven_multilingual_v2",
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.75,
      },
    });

    const chunks: Uint8Array[] = [];
    const reader = responseStream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);
    return `data:audio/mpeg;base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("TTS Error:", error);
    throw new Error("Text-to-speech generation failed");
  }
};

export const chatWithModel = async (
  messages: { role: "user" | "assistant"; content: string }[],
  transcription: string,
) => {
  try {
    const formattedMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await client.chatCompletion({
      model: "meta-llama/Llama-3.1-8B-Instruct",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant. You must answer questions regarding this podcast transcription: "${transcription}"`,
        },
        ...formattedMessages,
      ],
      max_tokens: 300,
    });
    return response.choices[0].message;
  } catch (error) {
    console.error("Chat Error:", error);
    return {
      role: "assistant" as const,
      content:
        "I encountered an issue processing your chat request. Please try again.",
    };
  }
};
