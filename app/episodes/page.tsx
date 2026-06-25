import { getEpisodesByFeedId } from "@/api/podcast.api";
import Link from "next/link";

export default async function Episodes({
  searchParams,
}: {
  searchParams: Promise<{ feedId?: string }>;
}) {
  const { feedId } = await searchParams;
  const episodes = feedId
    ? await getEpisodesByFeedId(Number(feedId))
    : null;

  return (
    <main className="min-h-screen flex flex-col gap-4 items-center px-2 py-12">
      <Link href="/" className="btn btn-ghost self-start">
        ← Back to search
      </Link>
      <h1 className="text-5xl font-semibold mb-4">Episodes</h1>
      <div className="space-x-4 space-y-4 flex flex-wrap justify-center">
        {episodes?.items.map((episode) => (
          <Link
            key={episode.id}
            href={`/episodes/${episode.id}`}
            className="card-border card card-body bg-white/10 hover:bg-white/20 cursor-pointer w-fit"
          >
            <h2 className="card-title">{episode.title}</h2>
            <p>
              Duration: {(episode.duration / 60).toFixed(0)}m{" "}
              {episode.duration % 60}s
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
