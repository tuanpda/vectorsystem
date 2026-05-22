export type TokenUsage = {
  promptTokens: number;
  totalTokens: number;
};

export type EmbedTextsResult = {
  vectors: number[][];
  usage: TokenUsage;
};
