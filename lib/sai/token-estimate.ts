/** Rough token estimate (~4 chars per token for English prose). */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function estimatePromptTokens(systemPrompt: string, userPrompt: string): number {
  return estimateTokens(systemPrompt) + estimateTokens(userPrompt);
}

export function truncateToCharBudget(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n_[Context truncated — ${text.length - maxChars} chars omitted]_`;
}

export function truncateToTokenBudget(text: string, maxTokens: number): string {
  return truncateToCharBudget(text, maxTokens * 4);
}
