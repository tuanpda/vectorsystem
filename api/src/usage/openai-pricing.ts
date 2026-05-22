/** USD per 1M input tokens (OpenAI embedding, approx. 2024–2025) */
const DEFAULT_PRICE_PER_1M: Record<string, number> = {
  'text-embedding-3-small': 0.02,
  'text-embedding-3-large': 0.13,
  'text-embedding-ada-002': 0.1,
};

export function estimateEmbeddingCostUsd(
  model: string,
  totalTokens: number,
  overridePer1M?: number,
): number {
  const per1M =
    overridePer1M ??
    DEFAULT_PRICE_PER_1M[model] ??
    DEFAULT_PRICE_PER_1M['text-embedding-3-small'];
  return (totalTokens / 1_000_000) * per1M;
}

export function formatUsd(amount: number): string {
  if (amount === 0) return '$0';
  if (amount < 0.0001) return `<$0.0001`;
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  if (amount < 1) return `$${amount.toFixed(3)}`;
  return `$${amount.toFixed(2)}`;
}
