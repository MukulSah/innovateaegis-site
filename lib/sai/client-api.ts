import { ApiResponseError, fetchJson, parseJsonResponse } from "./api-response-guard";

export { ApiResponseError, fetchJson, parseJsonResponse };

export function formatClientApiError(err: unknown, label = "API request"): string {
  if (err instanceof ApiResponseError) return err.userMessage(label);
  if (err instanceof Error) return err.message;
  return `${label} failed`;
}

export async function readSaiJson<T>(response: Response, route: string): Promise<T> {
  return parseJsonResponse<T>(response, route);
}
