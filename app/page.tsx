import { handleSearchPodcast, searchPodcasts } from "@/api/podcast.api";
import Link from "next/link";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const results = q ? await searchPodcasts(q) : null;
  return (
    <main className="min-h-screen flex flex-col gap-4 items-center justify-center px-2">
      <h1 className="text-6xl text-center font-semibold">📺 Blogcaster</h1>
      <form
        action={handleSearchPodcast}
        className="w-full flex items-center justify-center"
      >
        <input
          placeholder="Search for a podcast..."
          type="text"
          name="q"
          defaultValue={q || ""}
          className="input border-r-0 rounded-r-none outline-0 w-96"
        />
        <button type="submit" className="btn btn-accent rounded-l-none">
          Search
        </button>
      </form>

      {results && (
        <div className="flex flex-wrap gap-4 justify-center max-w-4xl">
          {results.feeds.length === 0 && <p>No podcasts found for “{q}”.</p>}
          {results.feeds.map((feed) => (
            <Link
              key={feed.id}
              href={`/episodes?feedId=${feed.id}`}
              className="card-border card card-body bg-white/10 hover:bg-white/20 cursor-pointer w-fit max-w-xs"
            >
              <h2 className="card-title">{feed.title}</h2>
              <p className="line-clamp-2 text-sm opacity-80">
                {feed.author}
              </p>
            </Link>
          ))}
        </div>
      )}
      {/*{selectedEpisode && (
        <div className="flex flex-col items-center gap-4">
          <h1 className="text-5xl text-center">{selectedEpisode.title}</h1>
          <p>{selectedEpisode.description.replace(/<[^>]*>/g, "")}</p>
          <audio controls>
            <source src={selectedEpisode.enclosureUrl} type="audio/mpeg" />
          </audio>
          {transcription && (
            <Suspense
              fallback={
                <div className="skeleton-text w-screen h-12 bg-red-500" />
              }
            >
              <AudioTranscribe transcription={transcription} />
            </Suspense>
          )}
        </div>
      )}*/}
    </main>
  );
}
