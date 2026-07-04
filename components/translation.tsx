"use client";

import { useState } from "react";
import { translateSummaryToFrench } from "@/api/ai.graph";
import { Globe, Loader2 } from "lucide-react";

export default function Translation({ englishText }: { englishText: string }) {
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
      const res = await translateSummaryToFrench(englishText);
      setTranslatedText(res);
      setIsFrench(true);
    } catch (err) {
      console.error(err);
      alert("Translation failed");
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
          <span className="text-xs text-accent font-semibold block mb-1">Traduction en Français :</span>
          {translatedText}
        </div>
      )}
    </div>
  );
}
