import type { AIProviderName } from "./types";

export const PROVIDER_LABELS: Record<AIProviderName, string> = {
  openai: "OpenAI",
  azure_openai: "Microsoft Azure OpenAI",
  anthropic: "Anthropic Claude",
  google_gemini: "Google AI Studio (Gemini)",
  mistral: "Mistral AI",
  nvidia_nim: "NVIDIA NIM Catalog",
  huggingface: "Hugging Face Inference",
  openrouter: "OpenRouter",
  ollama: "Ollama (Local)",
  lm_studio: "LM Studio (Local)",
};

export const DEFAULT_ENDPOINTS: Partial<Record<AIProviderName, string>> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google_gemini: "https://generativelanguage.googleapis.com/v1beta",
  mistral: "https://api.mistral.ai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  ollama: "http://localhost:11434/v1",
  lm_studio: "http://localhost:1234/v1",
};

export const DEFAULT_MODELS: Partial<Record<AIProviderName, string>> = {
  openai: "gpt-4o",
  azure_openai: "gpt-4o",
  anthropic: "claude-sonnet-4-20250514",
  google_gemini: "gemini-2.0-flash",
  mistral: "mistral-large-latest",
  openrouter: "openai/gpt-4o",
  ollama: "llama3.2",
  lm_studio: "local-model",
  nvidia_nim: "meta/llama-3.1-8b-instruct",
  huggingface: "meta-llama/Llama-3.2-3B-Instruct",
};

export function getProviderLabel(name: AIProviderName): string {
  return PROVIDER_LABELS[name] ?? name;
}

export function getDefaultEndpoint(name: AIProviderName): string {
  return DEFAULT_ENDPOINTS[name] ?? "";
}

export function getDefaultModel(name: AIProviderName): string {
  return DEFAULT_MODELS[name] ?? "gpt-4o";
}

export function listSupportedProviders(): AIProviderName[] {
  return Object.keys(PROVIDER_LABELS) as AIProviderName[];
}
