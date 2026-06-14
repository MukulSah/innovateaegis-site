export class ApiResponseError extends Error {
  constructor(
    public readonly route: string,
    public readonly status: number,
    public readonly bodyPreview: string,
  ) {
    super(`API request failed: ${route} (${status})`);
    this.name = "ApiResponseError";
  }

  userMessage(fallbackLabel = "API request"): string {
    const preview = this.bodyPreview.trim().startsWith("<!DOCTYPE")
      ? "Non-JSON response received (HTML error page)"
      : this.bodyPreview.slice(0, 200) || "Non-JSON response received";
    return `${fallbackLabel} failed\nRoute: ${this.route}\nStatus: ${this.status}\nReason: ${preview}`;
  }
}

export async function parseJsonResponse<T>(response: Response, route: string): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await response.text();
    throw new ApiResponseError(route, response.status, text.slice(0, 500));
  }
  return response.json() as Promise<T>;
}

export async function fetchJson<T>(
  route: string,
  init?: RequestInit,
): Promise<{ data: T; response: Response }> {
  const response = await fetch(route, init);
  const data = await parseJsonResponse<T>(response, route);
  return { data, response };
}
