import { Ollama } from 'ollama';
import { query } from '../config/db';
import { EmbeddingSearchResult } from '../types';

const ollama = new Ollama({
  host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
});

const EMBEDDING_MODEL = 'nomic-embed-text';
const EMBEDDING_DIMENSION = 1536;

function padEmbedding(vector: number[]): number[] {
  if (vector.length >= EMBEDDING_DIMENSION) {
    return vector.slice(0, EMBEDDING_DIMENSION);
  }
  const padded = [...vector];
  while (padded.length < EMBEDDING_DIMENSION) {
    padded.push(0);
  }
  return padded;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await ollama.embeddings({
    model: EMBEDDING_MODEL,
    prompt: text,
  });

  return padEmbedding(response.embedding);
}

export async function storeEmbedding(
  organizationId: string,
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const embedding = await generateEmbedding(content);
  const vectorString = `[${embedding.join(',')}]`;

  await query(
    `INSERT INTO embeddings (organization_id, content, embedding, metadata)
     VALUES ($1, $2, $3::vector, $4)`,
    [organizationId, content, vectorString, JSON.stringify(metadata)]
  );
}

function parseMetadata(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    return JSON.parse(raw) as Record<string, unknown>;
  }
  if (raw && typeof raw === 'object') {
    return raw as Record<string, unknown>;
  }
  return {};
}

export async function searchSimilar(
  organizationId: string,
  queryText: string,
  limit: number = 5
): Promise<EmbeddingSearchResult[]> {
  const embedding = await generateEmbedding(queryText);
  const vectorString = `[${embedding.join(',')}]`;

  const rows = await query<{
    content: string;
    metadata: unknown;
    similarity: string;
  }>(
    `SELECT content, metadata,
            1 - (embedding <=> $2::vector) AS similarity
     FROM embeddings
     WHERE organization_id = $1
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    [organizationId, vectorString, limit]
  );

  return rows.map((row) => ({
    content: row.content,
    metadata: parseMetadata(row.metadata),
    similarity: parseFloat(row.similarity),
  }));
}

export async function deleteEmbeddingsByMetadata(
  organizationId: string,
  metadataKey: string,
  metadataValue: string
): Promise<void> {
  await query(
    `DELETE FROM embeddings
     WHERE organization_id = $1
       AND metadata->>$2 = $3`,
    [organizationId, metadataKey, metadataValue]
  );
}
