/**
 * Semantic Search Edge Function for Customer Support Tickets.
 *
 * Adds optional LLM query enhancement and optional Voyage reranking on top of
 * pgvector retrieval.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

interface TicketSearchRequest {
  query: string;
  threshold?: number;
  use_enhanced_query?: boolean;
  use_reranker?: boolean;
  rerank_top_k?: number;
}

interface SimilarTicketResult {
  conv_id: string;
  similarity: number;
  rerank_score: number | null;
  rerank_rank: number | null;
  new_message: string;
  embedded_at: string;
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
const embeddingModel =
  Deno.env.get("LANGDOCK_EMBEDDING_MODEL") || "text-embedding-ada-002";
const voyageRerankModel =
  Deno.env.get("VOYAGE_RERANK_MODEL") || "rerank-2.5-lite";

if (!supabaseUrl || !supabaseKey || !langdockApiKey) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!langdockApiKey) missing.push("LANGDOCK_API_KEY");
  throw new Error(
    `Missing required secrets: ${missing.join(", ")}. ` +
      `Add them via: supabase secrets set <KEY>=<VALUE>`,
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function enhanceQuery(query: string): Promise<string> {
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
            content:
              "You expand customer support search queries in energy sector context. Write customer problems related to that query as you were a customer of Enpal, an energy systems and solar energy company. You may add concise synonyms, related issue terms, and support terminology. Do not only write related keywords, write it as a customer ticket. Do not answer the query. Return only one short plain text search query.",
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
  console.log("Langdock status:", response.status);
  console.log("Langdock raw response:", rawResponse);

  if (!response.ok) {
    throw new Error(
      `Langdock query-enhancement error: ${response.status} - ${rawResponse}`,
    );
  }

  let data: any;
  try {
    data = JSON.parse(rawResponse);
  } catch {
    throw new Error(`Langdock returned non-JSON content: ${rawResponse}`);
  }

  const choice = data?.choices?.[0];
  const message = choice?.message;
  const enhancedQuery =
    typeof message?.content === "string"
      ? message.content.trim().replace(/\s+/g, " ")
      : "";

  if (!enhancedQuery) {
    console.error("Langdock completion diagnostics:", {
      finish_reason: choice?.finish_reason,
      refusal: message?.refusal,
      completion_tokens: data?.usage?.completion_tokens,
      reasoning_tokens: data?.usage?.completion_tokens_details?.reasoning_tokens,
    });
    throw new Error("Langdock returned no visible text");
  }

  return enhancedQuery;
}

async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(
    "https://api.langdock.com/openai/eu/v1/embeddings",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${langdockApiKey}`,
      },
      body: JSON.stringify({ input: text, model: embeddingModel }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Langdock embedding error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Langdock returned an invalid embedding");
  }
  return embedding;
}

async function searchSimilarTickets(
  embedding: number[],
  matchThreshold = 0.84,
): Promise<Array<{ conv_id: string; similarity: number }>> {
  const { data, error } = await supabase.rpc("search_similar_tickets", {
    query_embedding: embedding,
    match_threshold: matchThreshold,
  });

  if (error) throw new Error(`Supabase search error: ${error.message}`);
  return data || [];
}

async function getTicketContent(convIds: string[]): Promise<Map<string, any>> {
  if (convIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("vdb_raw_tickets")
    .select("conv_id, new_message, embedded_at")
    .in("conv_id", convIds);

  if (error) throw new Error(`Failed to fetch ticket content: ${error.message}`);

  const ticketMap = new Map<string, any>();
  for (const ticket of data || []) ticketMap.set(ticket.conv_id, ticket);
  return ticketMap;
}

async function rerankTickets(
  query: string,
  tickets: SimilarTicketResult[],
  topK: number,
): Promise<SimilarTicketResult[]> {
  if (!voyageApiKey) throw new Error("Missing VOYAGE_API_KEY");
  if (tickets.length === 0) return tickets;

  const candidates = tickets.slice(0, Math.min(topK, tickets.length));
  const remainder = tickets.slice(candidates.length);
  const documents = candidates.map((ticket) =>
    [`Ticket ID: ${ticket.conv_id}`, `Message: ${ticket.new_message || ""}`]
      .join("\n"),
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
  console.log("Voyage rerank status:", response.status);
  console.log("Voyage rerank raw response:", rawResponse);

  if (!response.ok) {
    throw new Error(`Voyage rerank error: ${response.status} - ${rawResponse}`);
  }

  let data: any;
  try {
    data = JSON.parse(rawResponse);
  } catch {
    throw new Error(`Voyage returned non-JSON content: ${rawResponse}`);
  }

  const reranked = Array.isArray(data?.data) ? data.data : [];
  const rerankedResults = reranked
    .map((item: any, rank: number) => {
      const original = candidates[item.index];
      if (!original) return null;
      return {
        ...original,
        rerank_score:
          typeof item.relevance_score === "number" ? item.relevance_score : null,
        rerank_rank: rank + 1,
      };
    })
    .filter(Boolean) as SimilarTicketResult[];

  return [...rerankedResults, ...remainder];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as TicketSearchRequest;
    const query = body.query?.trim();
    const threshold = body.threshold ?? 0.84;
    const useEnhancedQuery = body.use_enhanced_query ?? true;
    const useReranker = body.use_reranker ?? true;
    const rerankTopK = Math.max(1, Math.min(body.rerank_top_k ?? 150, 150));

    if (!query) {
      return new Response(JSON.stringify({ error: "Query cannot be empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (query.length > 2_000) {
      return new Response(
        JSON.stringify({ error: "Query cannot contain more than 2,000 characters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (threshold < 0 || threshold > 1) {
      return new Response(
        JSON.stringify({ error: "Threshold must be between 0 and 1" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let enhancedQuery = "";
    let embeddingInput = query;

    console.log("Original query:", query);
    console.log("Use enhanced query:", useEnhancedQuery);
    console.log("Use Voyage reranker:", useReranker);

    if (useEnhancedQuery) {
      enhancedQuery = await enhanceQuery(query);
      embeddingInput = enhancedQuery;
    }

    console.log("Enhanced query:", enhancedQuery || "[not used]");
    console.log("Embedding input:", embeddingInput);

    const embedding = await getEmbedding(embeddingInput);
    const similarEmbeddings = await searchSimilarTickets(embedding, threshold);
    const convIds = similarEmbeddings.map((ticket) => ticket.conv_id);
    const ticketMap = await getTicketContent(convIds);

    let results: SimilarTicketResult[] = similarEmbeddings
      .map((match) => {
        const ticket = ticketMap.get(match.conv_id);
        return {
          conv_id: match.conv_id,
          similarity: match.similarity,
          rerank_score: null,
          rerank_rank: null,
          new_message: ticket?.new_message || "",
          embedded_at: ticket?.embedded_at || "",
        };
      })
      .sort((a, b) => b.similarity - a.similarity);

    const retrievedCount = results.length;
    let rerankedCount = 0;

    if (useReranker && results.length > 0) {
      rerankedCount = Math.min(rerankTopK, results.length);
      results = await rerankTickets(embeddingInput, results, rerankedCount);
    }

    return new Response(
      JSON.stringify({
        success: true,
        query,
        use_enhanced_query: useEnhancedQuery,
        use_reranker: useReranker,
        enhanced_query: enhancedQuery,
        embedding_text: embeddingInput,
        threshold,
        retrieved_count: retrievedCount,
        reranked_count: rerankedCount,
        results,
        count: results.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
