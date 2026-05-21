export interface ContentBlock {
  type: string; // text | tool_use | server_tool_use | web_search_tool_result
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
}

interface CallClaudeParams {
  model: string;
  system: string;
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
}: CallClaudeParams): Promise<ContentBlock[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const body: Record<string, unknown> = {
    model,
    max_tokens,
    system,
    messages: [{ role: "user", content: user }],
  };
  if (tools?.length) body.tools = tools;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
  if (betas?.length) headers["anthropic-beta"] = betas.join(",");

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
  return data.content as ContentBlock[];
}
