"use client";

import { useState, useRef, useEffect } from "react";
import { chatWithModel } from "@/api/hugging-face.api";
import { Send, Bot, User, Loader2 } from "lucide-react";

export default function Qna({
  transcriptionText,
}: {
  transcriptionText: string;
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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
      const chatHistory = [...messages, userMsg];
      const aiResponse = await chatWithModel(chatHistory, transcriptionText);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            aiResponse.content || "Sorry, I could not generate a response.",
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error communicating with AI model." },
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[450px]">
        {messages.length === 0 ? (
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
          disabled={isLoading}
          className="input input-bordered flex-1 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/30 focus:outline-accent"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-accent btn-square rounded-xl"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
