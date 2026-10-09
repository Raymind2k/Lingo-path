const BROWSER_ID_KEY = "lingo-path-browser-id";
let learnerBootstrap: Promise<string> | null = null;

function newBrowserId(): string {
  if (typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getBrowserId(): string {
  const saved = window.localStorage.getItem(BROWSER_ID_KEY);
  if (saved && /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(saved)) {
    return saved;
  }

  const browserId = newBrowserId();
  window.localStorage.setItem(BROWSER_ID_KEY, browserId);
  return browserId;
}

/** Create this browser's demo learner once, then resolve the same saved learner on future visits. */
export function ensureBrowserLearner(apiUrl: string): Promise<string> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("A browser is required to load learner progress."));
  }

  if (learnerBootstrap) return learnerBootstrap;

  learnerBootstrap = fetch(`${apiUrl}/profile/bootstrap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ browser_id: getBrowserId() }),
    cache: "no-store",
  })
    .then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? "Could not initialize this browser's learner profile.");
      }
      return data.username as string;
    })
    .catch((error: unknown) => {
      learnerBootstrap = null;
      throw error;
    });

  return learnerBootstrap;
}
