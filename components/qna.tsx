"use client";

import { MoveLeft, MoveRight, Search } from "lucide-react";
import { useState } from "react";

export default function Qna() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: string; message: string }[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
  };
  return (
    <div className="border-gray-500 w-full h-full">
      {messages && messages.length
        ? messages.map((message, index) => (
            <div key={index} className="mb-2 space-y-2">
              {message.role === "user" ? "You" : "AI"}
              {message.message}
            </div>
          ))
        : null}

      <form onSubmit={handleSubmit} className="h-full w-full space-x-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="input outline-0"
        />
        <button type="submit" className="btn">
          <MoveRight />
        </button>
      </form>
    </div>
  );
}
