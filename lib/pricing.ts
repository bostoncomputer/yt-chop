const inputPerToken      = 1.00 / 1_000_000;
const outputPerToken     = 5.00 / 1_000_000;
const cacheWritePerToken = 1.25 / 1_000_000;
const cacheReadPerToken  = 0.10 / 1_000_000;
const perWebSearch       = 0.01;

export interface UsageShape {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  server_tool_use?: { web_search_requests?: number };
}

export function costFromUsage(usage: UsageShape): number {
  return (
    (usage.input_tokens ?? 0) * inputPerToken +
    (usage.output_tokens ?? 0) * outputPerToken +
    (usage.cache_creation_input_tokens ?? 0) * cacheWritePerToken +
    (usage.cache_read_input_tokens ?? 0) * cacheReadPerToken +
    (usage.server_tool_use?.web_search_requests ?? 0) * perWebSearch
  );
}
