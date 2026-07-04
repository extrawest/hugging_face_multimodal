"use server";

import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { AutomaticSpeechRecognitionOutput } from "@huggingface/tasks";
import {
  chatWithModel,
  generateImage,
  generateSpeech,
  generateTitleAndPrompt,
  speechRecognition,
  summarizeText,
  translateToFrench,
} from "./hugging-face.api";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type GeneratedBlog = {
  summary: string;
  title: string;
  imagePrompt: string;
  imageUrl: string;
};

const TranscriptionState = Annotation.Root({
  audioUrl: Annotation<string>(),
  transcription: Annotation<AutomaticSpeechRecognitionOutput | null>(),
});

const transcriptionGraph = new StateGraph(TranscriptionState)
  .addNode("transcribeAudio", async (state) => {
    const transcription = await speechRecognition(state.audioUrl);

    return { transcription };
  })
  .addEdge(START, "transcribeAudio")
  .addEdge("transcribeAudio", END)
  .compile();

const BlogGenerationState = Annotation.Root({
  transcriptionText: Annotation<string>(),
  summary: Annotation<string>(),
  title: Annotation<string>(),
  imagePrompt: Annotation<string>(),
  imageUrl: Annotation<string>(),
});

const blogGenerationGraph = new StateGraph(BlogGenerationState)
  .addNode("summarizeTranscript", async (state) => {
    const summary = await summarizeText(state.transcriptionText);

    return { summary };
  })
  .addNode("generateBlogMetadata", async (state) => {
    const { title, imagePrompt } = await generateTitleAndPrompt(state.summary);

    return { title, imagePrompt };
  })
  .addNode("generateHeroImage", async (state) => {
    const imageUrl = await generateImage(state.imagePrompt);

    return { imageUrl };
  })
  .addEdge(START, "summarizeTranscript")
  .addEdge("summarizeTranscript", "generateBlogMetadata")
  .addEdge("generateBlogMetadata", "generateHeroImage")
  .addEdge("generateHeroImage", END)
  .compile();

const ImageGenerationState = Annotation.Root({
  prompt: Annotation<string>(),
  imageUrl: Annotation<string>(),
});

const imageGenerationGraph = new StateGraph(ImageGenerationState)
  .addNode("generateImage", async (state) => {
    const imageUrl = await generateImage(state.prompt);

    return { imageUrl };
  })
  .addEdge(START, "generateImage")
  .addEdge("generateImage", END)
  .compile();

const TranslationState = Annotation.Root({
  text: Annotation<string>(),
  translatedText: Annotation<string>(),
});

const translationGraph = new StateGraph(TranslationState)
  .addNode("translateSummary", async (state) => {
    const translatedText = await translateToFrench(state.text);

    return { translatedText };
  })
  .addEdge(START, "translateSummary")
  .addEdge("translateSummary", END)
  .compile();

const SpeechGenerationState = Annotation.Root({
  text: Annotation<string>(),
  audioUrl: Annotation<string>(),
});

const speechGenerationGraph = new StateGraph(SpeechGenerationState)
  .addNode("generateAudioSummary", async (state) => {
    const audioUrl = await generateSpeech(state.text);

    return { audioUrl };
  })
  .addEdge(START, "generateAudioSummary")
  .addEdge("generateAudioSummary", END)
  .compile();

const PodcastChatState = Annotation.Root({
  messages: Annotation<ChatMessage[]>(),
  transcriptionText: Annotation<string>(),
  response: Annotation<ChatMessage>(),
});

const podcastChatGraph = new StateGraph(PodcastChatState)
  .addNode("answerPodcastQuestion", async (state) => {
    const response = await chatWithModel(
      state.messages,
      state.transcriptionText,
    );

    return {
      response: {
        role: "assistant" as const,
        content: response.content || "Sorry, I could not generate a response.",
      },
    };
  })
  .addEdge(START, "answerPodcastQuestion")
  .addEdge("answerPodcastQuestion", END)
  .compile();

export async function transcribePodcastAudio(
  audioUrl: string,
): Promise<AutomaticSpeechRecognitionOutput | null> {
  const trimmedAudioUrl = audioUrl.trim();

  if (!trimmedAudioUrl) {
    throw new Error("Audio URL is required for transcription.");
  }

  const result = await transcriptionGraph.invoke({ audioUrl: trimmedAudioUrl });

  return result.transcription;
}

export async function generateBlogFromTranscription(
  transcriptionText: string,
): Promise<GeneratedBlog> {
  const trimmedText = transcriptionText.trim();

  if (!trimmedText) {
    throw new Error("Transcription text is required to generate a blog post.");
  }

  const result = await blogGenerationGraph.invoke({
    transcriptionText: trimmedText,
  });

  return {
    summary: result.summary,
    title: result.title,
    imagePrompt: result.imagePrompt,
    imageUrl: result.imageUrl,
  };
}

export async function generateHeroImageFromPrompt(
  prompt: string,
): Promise<string> {
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    throw new Error("Prompt is required for image generation.");
  }

  const result = await imageGenerationGraph.invoke({ prompt: trimmedPrompt });

  return result.imageUrl;
}

export async function translateSummaryToFrench(text: string): Promise<string> {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error("Text is required for translation.");
  }

  const result = await translationGraph.invoke({ text: trimmedText });

  return result.translatedText;
}

export async function generateAudioSummary(text: string): Promise<string> {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error("Text is required for speech generation.");
  }

  const result = await speechGenerationGraph.invoke({ text: trimmedText });

  return result.audioUrl;
}

export async function answerPodcastQuestion(
  messages: ChatMessage[],
  transcriptionText: string,
): Promise<ChatMessage> {
  const trimmedTranscription = transcriptionText.trim();

  if (!trimmedTranscription) {
    throw new Error("Transcription text is required for podcast Q&A.");
  }

  const result = await podcastChatGraph.invoke({
    messages,
    transcriptionText: trimmedTranscription,
  });

  return result.response;
}
