import { useEffect, useState } from "react";
import { supabase } from "./supabase.ts";

/**
 * Cover-art signing (covers bucket twin of audioEngine signedAudioUrl).
 * Upload stores a bare filename on tracks.cover_path; the covers bucket
 * is private so UI resolves short-lived signed URLs (3600s TTL).
 * Signed URLs are never cached past expiry. Null cover_path resolves
 * to null so callers render the existing letter/icon fallback.
 */

const COVERS_BUCKET = "covers";
const URL_TTL_SECONDS = 3600;
const EXPIRY_MARGIN_MS = 60_000;

const coverUrlCache = new Map<string, { url: string; expiresAt: number }>();

/** Fresh signed URL for a cover path (short TTL, never cached past expiry). */
export async function signedCoverUrl(
  coverPath: string | null | undefined,
): Promise<string | null> {
  if (!coverPath) return null;
  const hit = coverUrlCache.get(coverPath);
  if (hit && Date.now() < hit.expiresAt) return hit.url;
  const { data, error } = await supabase.storage
    .from(COVERS_BUCKET)
    .createSignedUrl(coverPath, URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw error instanceof Error ? error : new Error("Could not sign cover.");
  }
  coverUrlCache.set(coverPath, {
    url: data.signedUrl,
    expiresAt: Date.now() + URL_TTL_SECONDS * 1000 - EXPIRY_MARGIN_MS,
  });
  return data.signedUrl;
}

/** Resolve a tracks.cover_path to a signed URL; null while missing/failed. */
export function useCoverUrl(
  cover_path: string | null | undefined,
): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!cover_path) {
      setUrl(null);
      return;
    }
    void (async () => {
      try {
        const signed = await signedCoverUrl(cover_path);
        if (!cancelled) setUrl(signed);
      } catch {
        if (!cancelled) setUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cover_path]);

  return url;
}
