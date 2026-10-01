/**
 * Eval candidate discovery Edge Function.
 *
 * Loads unlabeled eval queries from vdb_eval_queries, runs broad retrieval
 * variants, and stores returned tickets in vdb_eval_candidates for manual
 * relevance labeling.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

type DiscoverVariant = {
  name: string;
  function_name?: string;
  function_url?: string;
  use_enhanced_query?: boolean;
  use_reranker?: boolean;
  threshold?: number;
  rerank_top_k?: number;
  match_count?: number;
};

type DiscoverRequest = {
  query_ids?: string[];
  limit?: number;
  threshold?: number;
  match_count?: number;
  rerank_top_k?: number;
  variants?: DiscoverVariant[];
  clear_existing?: boolean;
};

type EvalQuery = {
  id: string;
  query: string;
};

type SearchResult = {
  conv_id: string;
  similarity?: number | null;
  rerank_score?: number | null;
  rerank_rank?: number | null;
  new_message?: string | null;
  embedded_at?: string | null;
  created_at?: string | null;
  pred_category?: string | null;
  pred_request_type?: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const functionAuthKey = supabaseServiceRoleKey || Deno.env.get("SUPABASE_ANON_KEY") || "";

if (!supabaseUrl || !supabaseServiceRoleKey) {
  const missing = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  throw new Error(`Missing required secrets: ${missing.join(", ")}`);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function defaultVariants(): DiscoverVariant[] {
  return [
    {
      name: "default_original_vector",
      function_name: "vdb_search_similar_tickets_function",
      use_enhanced_query: false,
      use_reranker: false,
    },
    {
      name: "default_hyde_vector",
      function_name: "vdb_search_similar_tickets_function",
      use_enhanced_query: true,
      use_reranker: false,
    },
    {
      name: "default_hyde_rerank",
      function_name: "vdb_search_similar_tickets_function",
      use_enhanced_query: true,
      use_reranker: true,
    },
    {
      name: "voyage_original_vector",
      function_name: "vdb_search_similar_tickets_function_voyage",
      use_enhanced_query: false,
      use_reranker: false,
    },
    {
      name: "voyage_hyde_vector",
      function_name: "vdb_search_similar_tickets_function_voyage",
      use_enhanced_query: true,
      use_reranker: false,
    },
    {
      name: "voyage_hyde_rerank",
      function_name: "vdb_search_similar_tickets_function_voyage",
      use_enhanced_query: true,
      use_reranker: true,
    },
  ];
}

function functionUrl(variant: DiscoverVariant): string {
  if (variant.function_url) return variant.function_url;
  if (!variant.function_name) return "";
  return `${supabaseUrl}/functions/v1/${variant.function_name}`;
}

async function loadQueries(body: DiscoverRequest): Promise<EvalQuery[]> {
  let query = supabase
    .from("vdb_eval_queries")
    .select("id, query")
    .order("created_at", { ascending: true });

  if (body.query_ids?.length) {
    query = query.in("id", body.query_ids);
  } else if (body.limit) {
    query = query.limit(Math.max(1, body.limit));
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load eval queries: ${error.message}`);
  return (data || []) as EvalQuery[];
}

async function runSearch(
  evalQuery: EvalQuery,
  variant: DiscoverVariant,
  defaults: Required<Pick<DiscoverRequest, "threshold" | "match_count" | "rerank_top_k">>,
): Promise<{ results: SearchResult[]; responseMeta: Record<string, unknown> }> {
  const url = functionUrl(variant);
  if (!url) throw new Error(`Variant ${variant.name} has no function URL`);
  if (!functionAuthKey) throw new Error("Missing function auth key");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": functionAuthKey,
      "Authorization": `Bearer ${functionAuthKey}`,
    },
    body: JSON.stringify({
      query: evalQuery.query,
      threshold: variant.threshold ?? defaults.threshold,
      match_count: variant.match_count ?? defaults.match_count,
      rerank_top_k: variant.rerank_top_k ?? defaults.rerank_top_k,
      use_enhanced_query: variant.use_enhanced_query ?? false,
      use_reranker: variant.use_reranker ?? false,
    }),
  });

  const raw = await response.text();
  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error(`Variant ${variant.name} returned non-JSON: ${raw}`);
  }

  if (!response.ok || payload?.success === false || payload?.error) {
    throw new Error(payload?.error || `Variant ${variant.name} failed with ${response.status}`);
  }

  return {
    results: Array.isArray(payload?.results) ? payload.results : [],
    responseMeta: {
      count: payload?.count,
      retrieved_count: payload?.retrieved_count,
      reranked_count: payload?.reranked_count,
      threshold: payload?.threshold,
      match_count: payload?.match_count,
      category_hint: payload?.category_hint,
      request_type_hint: payload?.request_type_hint,
      extracted_filters: payload?.extracted_filters,
      embedding_text: payload?.embedding_text,
    },
  };
}

async function clearExistingCandidates(queryIds: string[]) {
  if (queryIds.length === 0) return;
  const { error } = await supabase
    .from("vdb_eval_candidates")
    .delete()
    .in("query_id", queryIds);
  if (error) throw new Error(`Failed to clear existing candidates: ${error.message}`);
}

async function storeCandidates(
  evalQuery: EvalQuery,
  variant: DiscoverVariant,
  results: SearchResult[],
  responseMeta: Record<string, unknown>,
) {
  if (results.length === 0) return 0;

  const rows = results.map((result, index) => ({
    query_id: evalQuery.id,
    conv_id: String(result.conv_id),
    source_variant: variant.name,
    rank: index + 1,
    similarity: result.similarity ?? null,
    rerank_score: result.rerank_score ?? null,
    ticket_text: result.new_message ?? "",
    metadata: {
      ...responseMeta,
      rerank_rank: result.rerank_rank ?? null,
      embedded_at: result.embedded_at ?? null,
      created_at: result.created_at ?? null,
      pred_category: result.pred_category ?? null,
      pred_request_type: result.pred_request_type ?? null,
    },
  }));

  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from("vdb_eval_candidates")
      .upsert(batch, { onConflict: "query_id,conv_id,source_variant" });

    if (error) throw new Error(`Failed to store candidates: ${error.message}`);
    inserted += batch.length;
  }

  return inserted;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const body = (await req.json()) as DiscoverRequest;
    const queries = await loadQueries(body);
    if (queries.length === 0) return jsonResponse({ error: "No eval queries found" }, 400);

    if (body.clear_existing) {
      await clearExistingCandidates(queries.map((query) => query.id));
    }

    const variants = body.variants?.length ? body.variants : defaultVariants();
    const defaults = {
      threshold: body.threshold ?? 0.1,
      match_count: body.match_count ?? 500,
      rerank_top_k: body.rerank_top_k ?? 150,
    };

    const details = [];
    let totalStored = 0;

    for (const evalQuery of queries) {
      for (const variant of variants) {
        try {
          const run = await runSearch(evalQuery, variant, defaults);
          const stored = await storeCandidates(
            evalQuery,
            variant,
            run.results,
            run.responseMeta,
          );
          totalStored += stored;
          details.push({
            query_id: evalQuery.id,
            variant: variant.name,
            returned: run.results.length,
            stored,
          });
        } catch (error) {
          details.push({
            query_id: evalQuery.id,
            variant: variant.name,
            error: error instanceof Error ? error.message : "Unknown variant error",
          });
        }
      }
    }

    return jsonResponse({
      queries: queries.length,
      variants: variants.length,
      total_stored: totalStored,
      defaults,
      details,
    });
  } catch (error) {
    console.error("Discovery error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
