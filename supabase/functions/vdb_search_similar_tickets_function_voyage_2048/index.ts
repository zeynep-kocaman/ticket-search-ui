/**
 * Semantic Search Edge Function for 2048-dimensional Voyage embeddings.
 *
 * Supports AI query enhancement/date extraction, pgvector search against
 * vdb_embeddings_voyage_2048, and optional Voyage reranking.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

interface TicketSearchRequest {
  query: string;
  threshold?: number;
  use_enhanced_query?: boolean;
  use_reranker?: boolean;
  rerank_top_k?: number;
  match_count?: number;
}

interface SearchFilters {
  date_from: string | null;
  date_to: string | null;
}

interface EnhancedQueryResult {
  semantic_query: string;
  filters: SearchFilters;
  category_hint: string | null;
  request_type_hint: string | null;
}

interface SimilarTicketResult {
  conv_id: string;
  similarity: number;
  rerank_score: number | null;
  rerank_rank: number | null;
  new_message: string;
  embedded_at: string;
  created_at: string;
  pred_category: string | null;
  pred_request_type: string | null;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const langdockApiKey = Deno.env.get("LANGDOCK_API_KEY");
const voyageApiKey = Deno.env.get("VOYAGE_API_KEY");

const chatModel = Deno.env.get("LANGDOCK_CHAT_MODEL") || "gpt-5-mini";
const voyageEmbeddingModel = Deno.env.get("VOYAGE_EMBEDDING_MODEL") || "voyage-3.5-lite";
const voyageRerankModel = Deno.env.get("VOYAGE_RERANK_MODEL") || "rerank-2.5-lite";
const embeddingOutputDimension = Number(
  Deno.env.get("VOYAGE_EMBEDDING_OUTPUT_DIMENSION") || "2048",
);

if (!supabaseUrl || !supabaseKey || !langdockApiKey || !voyageApiKey) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!langdockApiKey) missing.push("LANGDOCK_API_KEY");
  if (!voyageApiKey) missing.push("VOYAGE_API_KEY");
  throw new Error(`Missing required secrets: ${missing.join(", ")}`);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeOptionalDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseJsonObject(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error("Response did not contain a valid JSON object");
  }
}

async function enhanceQuery(query: string): Promise<EnhancedQueryResult> {
  const today = new Date().toISOString().slice(0, 10);
  const response = await fetch(
    "https://api.langdock.com/openai/eu/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${langdockApiKey}`,
      },
      body: JSON.stringify({
        model: chatModel,
        messages: [
          {
            role: "system",
            content: `
You are a query rewriting and filter extraction layer for semantic search over Enpal customer support tickets.
Today is ${today}.
Convert the user's request into one realistic German hypothetical customer support ticket for semantic embedding. Extract hard date filters and soft category/request-type hints.
Return only valid JSON with this exact shape:
{
  "semantic_query": string,
  "filters": { "date_from": string | null, "date_to": string | null },
  "category_hint": string | null,
  "request_type_hint": string | null
}
Rules: semantic_query must be German, short, and from an Enpal customer's perspective. date_to must be exclusive. If no date/category/request type is clear, use null.
            `.trim(),
          },
          { role: "user", content: query.trim() },
        ],
        max_completion_tokens: 1000,
        reasoning_effort: "minimal",
        stream: false,
      }),
    },
  );

  const rawResponse = await response.text();
  if (!response.ok) {
    throw new Error(`Langdock query-enhancement error: ${response.status} - ${rawResponse}`);
  }

  let data: any;
  try {
    data = JSON.parse(rawResponse);
  } catch {
    throw new Error(`Langdock returned non-JSON content: ${rawResponse}`);
  }

  const content = typeof data?.choices?.[0]?.message?.content === "string"
    ? data.choices[0].message.content.trim()
    : "";
  if (!content) throw new Error("Langdock returned no visible text");

  const parsed = parseJsonObject(content);
  const semanticQuery = typeof parsed?.semantic_query === "string"
    ? parsed.semantic_query.trim().replace(/\s+/g, " ")
    : "";
  if (!semanticQuery) throw new Error("Langdock enhancement response did not include semantic_query");

  return {
    semantic_query: semanticQuery,
    filters: {
      date_from: normalizeOptionalDate(parsed?.filters?.date_from),
      date_to: normalizeOptionalDate(parsed?.filters?.date_to),
    },
    category_hint: normalizeOptionalString(parsed?.category_hint),
    request_type_hint: normalizeOptionalString(parsed?.request_type_hint),
  };
}

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${voyageApiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model: voyageEmbeddingModel,
      input_type: "query",
      output_dimension: embeddingOutputDimension,
    }),
  });

  const rawResponse = await response.text();
  if (!response.ok) {
    throw new Error(`Voyage embedding error: ${response.status} - ${rawResponse}`);
  }

  let data: any;
  try {
    data = JSON.parse(rawResponse);
  } catch {
    throw new Error(`Voyage returned non-JSON content: ${rawResponse}`);
  }

  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length !== 2048) {
    throw new Error(`Voyage returned invalid embedding dimension: ${embedding?.length ?? 0}`);
  }
  return embedding;
}

async function searchSimilarTickets(
  embedding: number[],
  matchThreshold: number,
  filters: SearchFilters,
  matchCount: number,
): Promise<Array<{ conv_id: string; similarity: number }>> {
  const { data, error } = await supabase.rpc("search_similar_tickets_filtered_voyage_2048", {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    filter_date_from: filters.date_from,
    filter_date_to: filters.date_to,
    match_count: matchCount,
  });
  if (error) throw new Error(`Supabase search error: ${error.message}`);
  return data || [];
}

async function getTicketContent(convIds: string[]): Promise<Map<string, any>> {
  if (convIds.length === 0) return new Map();
  const ticketMap = new Map<string, any>();
  const batchSize = 100;

  for (let i = 0; i < convIds.length; i += batchSize) {
    const batch = convIds.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from("vdb_raw_tickets")
      .select("conv_id, new_message, embedded_at, created_at, pred_category, pred_request_type")
      .in("conv_id", batch);
    if (error) throw new Error(`Failed to fetch ticket content: ${error.message}`);
    for (const ticket of data || []) ticketMap.set(String(ticket.conv_id), ticket);
  }

  return ticketMap;
}

async function rerankTickets(
  query: string,
  tickets: SimilarTicketResult[],
  topK: number,
): Promise<SimilarTicketResult[]> {
  if (tickets.length === 0) return tickets;
  const candidates = tickets.slice(0, Math.min(topK, tickets.length));
  const remainder = tickets.slice(candidates.length);
  const documents = candidates.map((ticket) =>
    [
      `Ticket ID: ${ticket.conv_id}`,
      `Created at: ${ticket.created_at || ""}`,
      `Predicted category: ${ticket.pred_category || ""}`,
      `Predicted request type: ${ticket.pred_request_type || ""}`,
      `Message: ${ticket.new_message || ""}`,
    ].join("\n"),
  );

  const response = await fetch("https://api.voyageai.com/v1/rerank", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${voyageApiKey}`,
    },
    body: JSON.stringify({
      query,
      documents,
      model: voyageRerankModel,
      top_k: candidates.length,
      return_documents: false,
      truncation: true,
    }),
  });

  const rawResponse = await response.text();
  if (!response.ok) throw new Error(`Voyage rerank error: ${response.status} - ${rawResponse}`);
  const data = JSON.parse(rawResponse);
  const reranked = Array.isArray(data?.data) ? data.data : [];

  const rerankedResults = reranked
    .map((item: any, rank: number) => {
      const original = candidates[item.index];
      if (!original) return null;
      return {
        ...original,
        rerank_score: typeof item.relevance_score === "number" ? item.relevance_score : null,
        rerank_rank: rank + 1,
      };
    })
    .filter(Boolean) as SimilarTicketResult[];

  return [...rerankedResults, ...remainder];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    const body = (await req.json()) as TicketSearchRequest;
    const query = body.query?.trim();
    const threshold = body.threshold ?? 0.84;
    const useEnhancedQuery = body.use_enhanced_query ?? true;
    const useReranker = body.use_reranker ?? true;
    const rerankTopK = Math.max(1, Math.min(body.rerank_top_k ?? 150, 150));
    const matchCount = Math.max(1, Math.min(body.match_count ?? 500, 5000));

    if (!query) return jsonResponse({ error: "Query cannot be empty" }, 400);
    if (query.length > 2_000) {
      return jsonResponse({ error: "Query cannot contain more than 2,000 characters" }, 400);
    }
    if (threshold < 0 || threshold > 1) {
      return jsonResponse({ error: "Threshold must be between 0 and 1" }, 400);
    }

    let enhancedQuery = "";
    let embeddingInput = query;
    let extractedFilters: SearchFilters = { date_from: null, date_to: null };
    let categoryHint: string | null = null;
    let requestTypeHint: string | null = null;

    if (useEnhancedQuery) {
      const enhanced = await enhanceQuery(query);
      enhancedQuery = enhanced.semantic_query;
      embeddingInput = enhanced.semantic_query;
      extractedFilters = enhanced.filters;
      categoryHint = enhanced.category_hint;
      requestTypeHint = enhanced.request_type_hint;
    }

    const embedding = await getEmbedding(embeddingInput);
    const similarEmbeddings = await searchSimilarTickets(
      embedding,
      threshold,
      extractedFilters,
      matchCount,
    );
    const convIds = similarEmbeddings.map((ticket) => ticket.conv_id);
    const ticketMap = await getTicketContent(convIds);

    let results: SimilarTicketResult[] = similarEmbeddings
      .map((match) => {
        const ticket = ticketMap.get(String(match.conv_id));
        return {
          conv_id: String(match.conv_id),
          similarity: match.similarity,
          rerank_score: null,
          rerank_rank: null,
          new_message: ticket?.new_message || "",
          embedded_at: ticket?.embedded_at || "",
          created_at: ticket?.created_at || "",
          pred_category: ticket?.pred_category || null,
          pred_request_type: ticket?.pred_request_type || null,
        };
      })
      .sort((a, b) => b.similarity - a.similarity);

    const retrievedCount = results.length;
    let rerankedCount = 0;

    if (useReranker && results.length > 0) {
      rerankedCount = Math.min(rerankTopK, results.length);
      results = await rerankTickets(embeddingInput, results, rerankedCount);
    }

    return jsonResponse({
      success: true,
      query,
      use_enhanced_query: useEnhancedQuery,
      use_reranker: useReranker,
      embedding_model: voyageEmbeddingModel,
      embedding_output_dimension: embeddingOutputDimension,
      enhanced_query: enhancedQuery,
      embedding_text: embeddingInput,
      threshold,
      match_count: matchCount,
      extracted_filters: extractedFilters,
      category_hint: categoryHint,
      request_type_hint: requestTypeHint,
      retrieved_count: retrievedCount,
      reranked_count: rerankedCount,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error("Error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
