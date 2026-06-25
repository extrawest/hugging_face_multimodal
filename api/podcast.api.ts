"use server";

import PodcastIndexClient from "podcastdx-client";
import { redirect } from "next/navigation";

const podcastApi = new PodcastIndexClient({
  key: process.env.PODCAST_INDEX_API_KEY! as string,
  secret: process.env.PODCAST_INDEX_API_SECRET! as string,
  disableAnalytics: true,
});

export async function handleSearchPodcast(formData: FormData): Promise<void> {
  const q = formData.get("q")?.toString().trim();
  if (!q) return;
  redirect(`/?q=${encodeURIComponent(q)}`);
}

export async function searchPodcasts(query: string) {
  return await podcastApi.search(query);
}

export async function getEpisodeById(id: number) {
  return await podcastApi.episodeById(id);
}

export async function getEpisodesByFeedId(feedId: number) {
  return await podcastApi.episodesByFeedId(feedId);
}
