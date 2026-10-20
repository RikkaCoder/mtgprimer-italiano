export const USER_AGENT =
  "MTGPrimerItaliano/0.2 (+https://github.com/RikkaCoder/mtgprimer-italiano)";
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let nextRequest = 0;

export function retryDelay(
  status: number,
  retryAfter: string | null,
  attempt: number,
  now = Date.now(),
): number {
  const retryMs =
    retryAfter && /^\d+$/.test(retryAfter)
      ? Number(retryAfter) * 1000
      : Date.parse(retryAfter ?? "") - now;
  return Math.max(status === 429 ? 30000 : 1000 * 2 ** attempt, retryMs || 0);
}

export async function fetchChecked(
  url: string,
  accept = "application/json",
): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt++) {
    // Shared limiter for the ordinary API methods used here. Bulk CDN files
    // have no API rate limit. Search/collection/manifest are not used.
    await pause(Math.max(0, nextRequest - Date.now()));
    nextRequest = Date.now() + 150;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: accept },
        signal: AbortSignal.timeout(120000),
      });
    } catch (error) {
      if (attempt === 2) throw error;
      await pause(1000 * 2 ** attempt);
      continue;
    }
    if (response.ok) return response;
    if (attempt === 2 || (response.status !== 429 && response.status < 500))
      throw new Error(`HTTP ${response.status}: ${url}`);
    const retry = response.headers.get("retry-after");
    const delay = retryDelay(response.status, retry, attempt);
    await response.body?.cancel();
    await pause(delay);
  }
  throw new Error(`Request failed: ${url}`);
}
