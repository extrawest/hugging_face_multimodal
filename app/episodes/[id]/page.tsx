import { getEpisodeById } from "@/api/podcast.api";
import { speechRecognition } from "@/api/hugging-face.api";
import AudioTranscribe from "@/components/audioTranscribe";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, Clock, Play } from "lucide-react";

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { episode } = await getEpisodeById(Number(id));

  // Starts the Whisper Speech-to-Text Promise asynchronously
  const transcription = speechRecognition(episode.enclosureUrl);

  return (
    <main className="min-h-screen relative overflow-hidden bg-slate-950 text-white pb-16">
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8">
        <Link
          href={`/episodes?feedId=${episode.feedId}`}
          className="btn btn-ghost btn-sm gap-2 text-white/70 hover:text-white hover:bg-white/10 mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Episodes
        </Link>

        <div className="flex flex-col md:flex-row gap-8 items-center bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl mb-8">
          {episode.image && (
            <img
              src={episode.image}
              alt={episode.title}
              className="w-32 h-32 md:w-48 md:h-48 object-cover rounded-2xl border border-white/10 shadow-lg"
            />
          )}
          <div className="flex-1 space-y-4 w-full text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
              {episode.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start text-sm text-white/60">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />{" "}
                {Math.floor(episode.duration / 60)} min
              </span>
            </div>
            <p className="text-sm md:text-base opacity-80 max-w-3xl line-clamp-3">
              {episode.description.replace(/<[^>]*>/g, "")}
            </p>
            <div className="pt-2">
              <audio controls className="w-full max-w-xl">
                <source src={episode.enclosureUrl} type="audio/mpeg" />
              </audio>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
            <Play className="h-5 w-5 text-accent animate-pulse" />
            <h2 className="text-xl font-bold">
              Transcription & AI Blog Builder
            </h2>
          </div>

          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="loading loading-bars loading-lg text-accent"></div>
                <p className="text-sm text-white/60">
                  Running speech-to-text transcription...
                </p>
              </div>
            }
          >
            <AudioTranscribe transcription={transcription} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
