import type { AIProviderName, ConnectionTestResult } from "./types";

export type AICompletionRequest = {
  providerName: AIProviderName;
  apiKey: string;
  endpoint: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
};

export type AICompletionResult = {
  content: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
};

function isOpenAICompatible(provider: AIProviderName): boolean {
  return [
    "openai",
    "azure_openai",
    "openrouter",
    "ollama",
    "lm_studio",
    "nvidia_nim",
    "mistral",
  ].includes(provider);
}

async function openAICompatibleCompletion(
  req: AICompletionRequest,
): Promise<AICompletionResult> {
  const start = Date.now();
  const base = req.endpoint.replace(/\/$/, "");
  const url = `${base}/chat/completions`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (req.providerName === "azure_openai") {
    headers["api-key"] = req.apiKey;
  } else if (req.providerName === "openrouter") {
    headers.Authorization = `Bearer ${req.apiKey}`;
    headers["HTTP-Referer"] = "https://innovateaegis.com";
  } else if (req.apiKey) {
    headers.Authorization = `Bearer ${req.apiKey}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: req.model,
      messages: [
        { role: "system", content: req.systemPrompt },
        { role: "user", content: req.userPrompt },
      ],
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 4096,
    }),
  });

  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const usage = data.usage ?? {};

  return {
    content,
    inputTokens: usage.prompt_tokens ?? Math.ceil(req.userPrompt.length / 4),
    outputTokens: usage.completion_tokens ?? Math.ceil(content.length / 4),
    latencyMs,
  };
}

async function anthropicCompletion(req: AICompletionRequest): Promise<AICompletionResult> {
  const start = Date.now();
  const base = req.endpoint.replace(/\/$/, "") || "https://api.anthropic.com/v1";

  const response = await fetch(`${base}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": req.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: req.maxTokens ?? 4096,
      system: req.systemPrompt,
      messages: [{ role: "user", content: req.userPrompt }],
      temperature: req.temperature ?? 0.7,
    }),
  });

  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const content =
    data.content?.find((c: { type: string }) => c.type === "text")?.text ?? "";

  return {
    content,
    inputTokens: data.usage?.input_tokens ?? Math.ceil(req.userPrompt.length / 4),
    outputTokens: data.usage?.output_tokens ?? Math.ceil(content.length / 4),
    latencyMs,
  };
}

async function geminiCompletion(req: AICompletionRequest): Promise<AICompletionResult> {
  const start = Date.now();
  const base =
    req.endpoint.replace(/\/$/, "") || "https://generativelanguage.googleapis.com/v1beta";
  const url = `${base}/models/${req.model}:generateContent?key=${req.apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: req.systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: req.userPrompt }] }],
      generationConfig: {
        temperature: req.temperature ?? 0.7,
        maxOutputTokens: req.maxTokens ?? 4096,
      },
    }),
  });

  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return {
    content,
    inputTokens: data.usageMetadata?.promptTokenCount ?? Math.ceil(req.userPrompt.length / 4),
    outputTokens: data.usageMetadata?.candidatesTokenCount ?? Math.ceil(content.length / 4),
    latencyMs,
  };
}

async function huggingFaceCompletion(req: AICompletionRequest): Promise<AICompletionResult> {
  const start = Date.now();
  const base = req.endpoint.replace(/\/$/, "") || "https://api-inference.huggingface.co";
  const url = `${base}/models/${req.model}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${req.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: `${req.systemPrompt}\n\n${req.userPrompt}`,
      parameters: { max_new_tokens: req.maxTokens ?? 1024, temperature: req.temperature ?? 0.7 },
    }),
  });

  const latencyMs = Date.now() - start;

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HuggingFace error ${response.status}: ${errText.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = Array.isArray(data)
    ? (data[0]?.generated_text ?? "")
    : (data.generated_text ?? data[0]?.generated_text ?? JSON.stringify(data).slice(0, 500));

  return {
    content: String(content).slice(0, 8000),
    inputTokens: Math.ceil(req.userPrompt.length / 4),
    outputTokens: Math.ceil(String(content).length / 4),
    latencyMs,
  };
}

export async function generateAICompletion(
  req: AICompletionRequest,
): Promise<AICompletionResult> {
  if (req.providerName === "anthropic") return anthropicCompletion(req);
  if (req.providerName === "google_gemini") return geminiCompletion(req);
  if (req.providerName === "huggingface") return huggingFaceCompletion(req);
  if (isOpenAICompatible(req.providerName)) return openAICompatibleCompletion(req);

  throw new Error(`Unsupported provider: ${req.providerName}`);
}

export async function testAIConnection(
  req: Omit<AICompletionRequest, "systemPrompt" | "userPrompt">,
): Promise<ConnectionTestResult> {
  const testReq: AICompletionRequest = {
    ...req,
    systemPrompt: "You are a connection test assistant.",
    userPrompt: 'Reply with exactly: "SAI connection successful"',
    maxTokens: 50,
    temperature: 0,
  };

  try {
    const result = await generateAICompletion(testReq);
    return {
      connected: result.content.length > 0,
      latencyMs: result.latencyMs,
      model: req.model,
      responsePreview: result.content.slice(0, 200),
    };
  } catch (error) {
    return {
      connected: false,
      latencyMs: 0,
      model: req.model,
      responsePreview: "",
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

const COST_PER_1K: Partial<Record<AIProviderName, number>> = {
  openai: 0.005,
  azure_openai: 0.005,
  anthropic: 0.008,
  google_gemini: 0.002,
  mistral: 0.003,
  openrouter: 0.005,
};

export function estimateCost(
  provider: AIProviderName,
  inputTokens: number,
  outputTokens: number,
): number {
  const rate = COST_PER_1K[provider] ?? 0.003;
  return Math.round(((inputTokens + outputTokens) / 1000) * rate * 1_000_000) / 1_000_000;
}
