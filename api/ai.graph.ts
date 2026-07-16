import {
  Annotation,
  END,
  START,
  StateGraph,
  MemorySaver,
} from "@langchain/langgraph";
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
  translatedText?: string;
  audioUrl?: string;
};

const retryPolicy = {
  maxAttempts: 3,
  initialInterval: 1000,
  backoffFactor: 2,
  jitter: true,
};

const TranscriptionState = Annotation.Root({
  audioUrl: Annotation<string>(),
  transcription: Annotation<AutomaticSpeechRecognitionOutput | null>(),
});

const transcriptionGraph = new StateGraph(TranscriptionState)
  .addNode(
    "transcribeAudio",
    async (state) => {
      const transcription = await speechRecognition(state.audioUrl);
      return { transcription };
    },
    { retryPolicy },
  )
  .addEdge(START, "transcribeAudio")
  .addEdge("transcribeAudio", END)
  .compile();

// 2. Unified Blog Generation Graph (with caching, retry policies, and checkpointer)
export const BlogGenerationState = Annotation.Root({
  transcriptionText: Annotation<string>(),
  summary: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  title: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  imagePrompt: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  imageUrl: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  translatedText: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  audioUrl: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  action: Annotation<"generate" | "translate" | "audio" | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
});

const summarizeTranscriptNode = async (
  state: typeof BlogGenerationState.State,
) => {
  if (state.summary) {
    return {};
  }
  const summary = await summarizeText(state.transcriptionText);
  return { summary };
};

const generateBlogMetadataNode = async (
  state: typeof BlogGenerationState.State,
) => {
  if (state.title && state.imagePrompt) {
    return {};
  }
  const { title, imagePrompt } = await generateTitleAndPrompt(state.summary);
  return { title, imagePrompt };
};

const generateHeroImageNode = async (
  state: typeof BlogGenerationState.State,
) => {
  if (state.imageUrl) {
    return {};
  }
  const imageUrl = await generateImage(state.imagePrompt);
  return { imageUrl };
};

const translateSummaryNode = async (
  state: typeof BlogGenerationState.State,
) => {
  if (state.translatedText) {
    return {};
  }
  const translatedText = await translateToFrench(state.summary);
  return { translatedText };
};

const generateAudioSummaryNode = async (
  state: typeof BlogGenerationState.State,
) => {
  if (state.audioUrl) {
    return {};
  }
  const audioUrl = await generateSpeech(state.summary);
  return { audioUrl };
};

const routeAfterMetadata = (state: typeof BlogGenerationState.State) => {
  if (!state.summary || state.summary.trim() === "") {
    if (state.action === "translate") return "translateSummary";
    if (state.action === "audio") return "generateAudioSummary";
    return END;
  }
  return "generateHeroImage";
};

const routeAfterHeroImage = (state: typeof BlogGenerationState.State) => {
  if (state.action === "translate") return "translateSummary";
  if (state.action === "audio") return "generateAudioSummary";
  return END;
};

export const blogCheckpointer = new MemorySaver();

export const blogGenerationGraph = new StateGraph(BlogGenerationState)
  .addNode("summarizeTranscript", summarizeTranscriptNode, { retryPolicy })
  .addNode("generateBlogMetadata", generateBlogMetadataNode, { retryPolicy })
  .addNode("generateHeroImage", generateHeroImageNode, { retryPolicy })
  .addNode("translateSummary", translateSummaryNode, { retryPolicy })
  .addNode("generateAudioSummary", generateAudioSummaryNode, { retryPolicy })

  .addEdge(START, "summarizeTranscript")
  .addEdge("summarizeTranscript", "generateBlogMetadata")
  .addConditionalEdges("generateBlogMetadata", routeAfterMetadata, {
    generateHeroImage: "generateHeroImage",
    translateSummary: "translateSummary",
    generateAudioSummary: "generateAudioSummary",
    [END]: END,
  })
  .addConditionalEdges("generateHeroImage", routeAfterHeroImage, {
    translateSummary: "translateSummary",
    generateAudioSummary: "generateAudioSummary",
    [END]: END,
  })
  .addEdge("translateSummary", END)
  .addEdge("generateAudioSummary", END)
  .compile({ checkpointer: blogCheckpointer });

export const PodcastChatState = Annotation.Root({
  messages: Annotation<ChatMessage[], ChatMessage[] | ChatMessage>({
    reducer: (x, y) => {
      const incoming = Array.isArray(y) ? y : [y];
      return [...x, ...incoming];
    },
    default: () => [],
  }),
  transcriptionText: Annotation<string>(),
});

const answerPodcastQuestionNode = async (
  state: typeof PodcastChatState.State,
) => {
  const response = await chatWithModel(state.messages, state.transcriptionText);
  return {
    messages: [
      {
        role: "assistant" as const,
        content: response.content || "Sorry, I could not generate a response.",
      },
    ],
  };
};

export const chatCheckpointer = new MemorySaver();

export const podcastChatGraph = new StateGraph(PodcastChatState)
  .addNode("answerPodcastQuestion", answerPodcastQuestionNode, { retryPolicy })
  .addEdge(START, "answerPodcastQuestion")
  .addEdge("answerPodcastQuestion", END)
  .compile({ checkpointer: chatCheckpointer });

const ImageGenerationState = Annotation.Root({
  prompt: Annotation<string>(),
  imageUrl: Annotation<string>(),
});

const imageGenerationGraph = new StateGraph(ImageGenerationState)
  .addNode(
    "generateImage",
    async (state) => {
      const imageUrl = await generateImage(state.prompt);
      return { imageUrl };
    },
    { retryPolicy },
  )
  .addEdge(START, "generateImage")
  .addEdge("generateImage", END)
  .compile();

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
  threadId?: string,
): Promise<GeneratedBlog> {
  const trimmedText = transcriptionText.trim();
  if (!trimmedText) {
    throw new Error("Transcription text is required to generate a blog post.");
  }

  const config = threadId
    ? { configurable: { thread_id: threadId } }
    : undefined;
  const result = await blogGenerationGraph.invoke(
    {
      transcriptionText: trimmedText,
      action: "generate",
    },
    config,
  );

  return {
    summary: result.summary,
    title: result.title,
    imagePrompt: result.imagePrompt,
    imageUrl: result.imageUrl,
    translatedText: result.translatedText,
    audioUrl: result.audioUrl,
  };
}

export async function translateSummaryToFrench(
  text: string,
  threadId?: string,
): Promise<string> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Text is required for translation.");
  }
  const config = threadId
    ? { configurable: { thread_id: threadId } }
    : undefined;
  const result = await blogGenerationGraph.invoke(
    {
      summary: trimmedText,
      action: "translate",
    },
    config,
  );
  return result.translatedText;
}

export async function generateAudioSummary(
  text: string,
  threadId?: string,
): Promise<string> {
  const trimmedText = text.trim();
  if (!trimmedText) throw new Error("Text is required for speech generation.");
  const config = threadId
    ? { configurable: { thread_id: threadId } }
    : undefined;
  const result = await blogGenerationGraph.invoke(
    {
      summary: trimmedText,
      action: "audio",
    },
    config,
  );
  return result.audioUrl;
}

export async function answerPodcastQuestion(
  messages: ChatMessage[],
  transcriptionText: string,
  threadId?: string,
): Promise<ChatMessage> {
  const trimmedTranscription = transcriptionText.trim();
  if (!trimmedTranscription)
    throw new Error("Transcription text is required for podcast Q&A.");

  const config = threadId
    ? { configurable: { thread_id: threadId } }
    : undefined;
  const lastMessage = messages[messages.length - 1];

  const result = await podcastChatGraph.invoke(
    {
      messages: [lastMessage],
      transcriptionText: trimmedTranscription,
    },
    config,
  );

  const finalMessages = result.messages;
  return finalMessages[finalMessages.length - 1];
}
