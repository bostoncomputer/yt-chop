export interface ContentBlock {
  type: string; // text | tool_use | server_tool_use | web_search_tool_result
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
}

export interface CachedSystemBlock {
  type: "text";
  text: string;
  cache_control: { type: "ephemeral" };
}

export interface ClaudeUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  server_tool_use?: { web_search_requests?: number };
}

export interface ClaudeResponse {
  content: ContentBlock[];
  usage: ClaudeUsage;
}

interface CallClaudeParams {
  model: string;
  system: string | CachedSystemBlock;
  user: string;
  tools?: object[];
  max_tokens?: number;
  betas?: string[];
}

export async function callClaude({
  model,
  system,
  user,
  tools,
  max_tokens = 8192,
  betas,
}: CallClaudeParams): Promise<ClaudeResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const activeBetas = betas ? [...betas] : [];

  const body: Record<string, unknown> = {
    model,
    max_tokens,
    messages: [{ role: "user", content: user }],
  };

  if (typeof system === "string") {
    body.system = system;
  } else {
    body.system = [system];
    if (!activeBetas.includes("prompt-caching-2024-07-31")) {
      activeBetas.push("prompt-caching-2024-07-31");
    }
  }

  if (tools?.length) body.tools = tools;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
  if (activeBetas.length) headers["anthropic-beta"] = activeBetas.join(",");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${detail}`);
  }

  const data = await res.json();
  return {
    content: data.content as ContentBlock[],
    usage: data.usage as ClaudeUsage,
  };
}
