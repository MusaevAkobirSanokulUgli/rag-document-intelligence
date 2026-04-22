const DEEPSEEK_BASE = "https://api.deepseek.com/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekOptions {
  model?: "deepseek-chat" | "deepseek-reasoner";
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export class DeepSeekError extends Error {
  constructor(message: string, public status: number, public body?: string) {
    super(message);
    this.name = "DeepSeekError";
  }
}

function apiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new DeepSeekError(
      "DEEPSEEK_API_KEY is not set. Add it in Vercel → Project → Settings → Environment Variables. Get a free key at https://platform.deepseek.com/api_keys",
      500
    );
  }
  return key;
}

export async function chatComplete(
  messages: ChatMessage[],
  opts: DeepSeekOptions = {}
): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; latency_ms: number }> {
  const started = Date.now();
  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: opts.model ?? "deepseek-chat",
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 800,
      stream: false,
    }),
  });

  const latency_ms = Date.now() - started;
  if (!res.ok) {
    const body = await res.text();
    throw new DeepSeekError(`DeepSeek API error: ${res.status} ${res.statusText}`, res.status, body);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  return {
    content,
    usage: data?.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    latency_ms,
  };
}

export async function chatStream(
  messages: ChatMessage[],
  opts: DeepSeekOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify({
      model: opts.model ?? "deepseek-chat",
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 800,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new DeepSeekError(`DeepSeek stream error: ${res.status}`, res.status, body);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          continue;
        }
        try {
          const obj = JSON.parse(payload);
          const delta = obj?.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`));
          }
        } catch {
          // ignore malformed chunks
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });
}
