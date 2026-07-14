"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";

export default function Qna({
  transcriptionText,
  episodeId,
}: {
  transcriptionText: string;
  episodeId: number;
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoadingHistory(true);
        const res = await fetch(`/api/chat?threadId=${episodeId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            // Filter out system prompts if stored in history
            const filteredMessages = data.messages.filter(
              (msg: any) => msg.role === "user" || msg.role === "assistant",
            );
            setMessages(filteredMessages);
          }
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setLoadingHistory(false);
      }
    }
    loadHistory();
  }, [episodeId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const userMsg = { role: "user" as const, content: question.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMsg,
          transcriptionText,
          threadId: String(episodeId),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantContent = "";

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

          if (data.output && data.node === "answerPodcastQuestion") {
            const msgs = data.output.messages;
            if (msgs && msgs.length > 0) {
              const lastMsg = msgs[msgs.length - 1];
              if (lastMsg && lastMsg.role === "assistant") {
                assistantContent = lastMsg.content;
              }
            }
          }
        }
      }

      if (!assistantContent) {
        throw new Error("No response content from model");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantContent,
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err.message || "Error communicating with AI model.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/5 border border-white/10 rounded-3xl backdrop-blur-lg w-full">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-accent" /> Ask the Podcast AI
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-75 max-h-112.5">
        {loadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 opacity-50 text-sm">
            Ask any questions regarding the full original transcription.
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 text-sm ${
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`p-1.5 rounded-full flex items-center justify-center h-8 w-8 shrink-0 ${
                  message.role === "user"
                    ? "bg-accent text-accent-content"
                    : "bg-white/10"
                }`}
              >
                {message.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              <div
                className={`p-3 rounded-2xl max-w-[80%] leading-relaxed break-words ${
                  message.role === "user"
                    ? "bg-accent/20 text-white rounded-tr-none border border-accent/30"
                    : "bg-white/10 text-white/95 rounded-tl-none border border-white/5"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex gap-3 text-sm">
            <div className="bg-white/10 p-1.5 rounded-full h-8 w-8 flex items-center justify-center animate-pulse">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none flex items-center gap-2 border border-white/5">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <span className="opacity-70">AI is thinking...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-white/10 flex gap-2"
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about details..."
          disabled={isLoading || loadingHistory}
          className="input input-bordered flex-1 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/30 focus:outline-accent"
        />
        <button
          type="submit"
          disabled={isLoading || loadingHistory}
          className="btn btn-accent btn-square rounded-xl"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
