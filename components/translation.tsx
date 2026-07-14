"use client";

import { useState } from "react";
import { Globe, Loader2 } from "lucide-react";

export default function Translation({
  episodeId,
}: {
  englishText: string;
  episodeId: number;
}) {
  const [translatedText, setTranslatedText] = useState("");
  const [isFrench, setIsFrench] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    if (isFrench) {
      setIsFrench(false);
      return;
    }

    if (translatedText) {
      setIsFrench(true);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/blog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId: String(episodeId),
          action: "translate",
        }),
      });

      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let finalTranslation = "";

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

          if (
            data.output &&
            data.node === "translateSummary" &&
            data.output.translatedText
          ) {
            finalTranslation = data.output.translatedText;
          }
        }
      }

      if (!finalTranslation) {
        throw new Error("No translation returned from AI");
      }

      setTranslatedText(finalTranslation);
      setIsFrench(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Translation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex gap-2">
        <button
          onClick={handleTranslate}
          disabled={loading}
          className="btn btn-outline btn-sm gap-2 text-white border-white/20 hover:bg-white/10 w-fit"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
          {isFrench ? "Show English" : "Translate to French"}
        </button>
      </div>

      {isFrench && translatedText && (
        <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl mt-2 animate-fade-in text-sm leading-relaxed">
          <span className="text-xs text-accent font-semibold block mb-1">
            Traduction en Français :
          </span>
          {translatedText}
        </div>
      )}
    </div>
  );
}
