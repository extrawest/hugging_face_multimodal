import { getEpisodeById } from "@/api/podcast.api";
import { speechRecognition } from "@/api/hugging-face.api";
import AudioTranscribe from "@/components/audioTranscribe";
import Link from "next/link";
import { Suspense } from "react";
import Qna from "@/components/qna";

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { episode } = await getEpisodeById(Number(id));

  const transcription = speechRecognition(episode.enclosureUrl);

  return (
    <main className="min-h-screen flex">
      <div className="h-full">
        <Link href="/" className="btn btn-ghost self-start">
          ← Back to search
        </Link>
        <h1 className="text-5xl text-center">{episode.title}</h1>
        <p className="max-w-2xl text-center opacity-80">
          {episode.description.replace(/<[^>]*>/g, "")}
        </p>
        <audio controls>
          <source src={episode.enclosureUrl} type="audio/mpeg" />
        </audio>

        <Suspense
          fallback={
            <div className="skeleton-text w-full max-w-2xl h-24 rounded bg-white/10 animate-pulse" />
          }
        >
          <AudioTranscribe transcription={transcription} />
        </Suspense>
      </div>
      <Qna />
    </main>
  );
}
