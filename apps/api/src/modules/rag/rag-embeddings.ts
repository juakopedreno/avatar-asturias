const EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL ?? "text-embedding-3-small";
const REAL_EMBEDDING_MIN_DIM = 100;

export type EmbeddingVector = number[];

export function isRealEmbedding(embedding: number[] | null | undefined): boolean {
  return Array.isArray(embedding) && embedding.length >= REAL_EMBEDDING_MIN_DIM;
}

export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const aValue = a[index] ?? 0;
    const bValue = b[index] ?? 0;
    dot += aValue * bValue;
    normA += aValue * aValue;
    normB += bValue * bValue;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function embedTexts(texts: string[]): Promise<EmbeddingVector[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || texts.length === 0) {
    return texts.map(() => []);
  }

  const inputs = texts.map((text) => text.replace(/\s+/g, " ").trim().slice(0, 8000));
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: inputs,
    }),
  });

  if (!response.ok) {
    return texts.map(() => []);
  }

  const json = (await response.json()) as {
    data?: Array<{ embedding?: number[]; index?: number }>;
  };

  const vectors: EmbeddingVector[] = texts.map(() => []);
  for (const item of json.data ?? []) {
    if (typeof item.index === "number" && Array.isArray(item.embedding)) {
      vectors[item.index] = item.embedding;
    }
  }
  return vectors;
}
