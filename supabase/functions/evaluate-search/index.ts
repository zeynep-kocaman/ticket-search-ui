/**
 * Search evaluation Edge Function.
 *
 * Runs labeled eval queries against multiple semantic-search variants and
 * reports retrieval metrics such as Recall@K, Precision@K, Hit@K, MRR@K,
 * and nDCG@K.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type EvalTicket = {
  conv_id: string;
  relevance?: number;
};

type EvalCase = {
  id?: string;
  query: string;
  relevant_conv_ids?: string[];
  relevant_tickets?: EvalTicket[];
};

type EvalVariant = {
  name: string;
  function_name?: string;
  function_url?: string;
  use_enhanced_query?: boolean;
  use_reranker?: boolean;
  threshold?: number;
  rerank_top_k?: number;
  match_count?: number;
};

type EvalRequest = {
  cases: EvalCase[];
  variants?: EvalVariant[];
  k_values?: number[];
  threshold?: number;
  rerank_top_k?: number;
  match_count?: number;
};

type SearchResult = {
  conv_id: string;
  similarity?: number;
  rerank_score?: number | null;
  rerank_rank?: number | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const functionAuthKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function defaultVariants(): EvalVariant[] {
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
      name: "default_original_rerank",
      function_name: "vdb_search_similar_tickets_function",
      use_enhanced_query: false,
      use_reranker: true,
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
      name: "voyage_original_rerank",
      function_name: "vdb_search_similar_tickets_function_voyage",
      use_enhanced_query: false,
      use_reranker: true,
    },
    {
      name: "voyage_hyde_rerank",
      function_name: "vdb_search_similar_tickets_function_voyage",
      use_enhanced_query: true,
      use_reranker: true,
    },
  ];
}

function relevanceMap(evalCase: EvalCase): Map<string, number> {
  const map = new Map<string, number>();

  for (const id of evalCase.relevant_conv_ids || []) {
    map.set(String(id), 1);
  }

  for (const ticket of evalCase.relevant_tickets || []) {
    map.set(String(ticket.conv_id), ticket.relevance ?? 1);
  }

  return map;
}

function topK<T>(items: T[], k: number): T[] {
  return items.slice(0, Math.max(0, k));
}

function recallAtK(returnedIds: string[], relevantIds: Set<string>, k: number): number {
  if (relevantIds.size === 0) return 0;
  const hits = topK(returnedIds, k).filter((id) => relevantIds.has(id)).length;
  return hits / relevantIds.size;
}

function precisionAtK(returnedIds: string[], relevantIds: Set<string>, k: number): number {
  if (k <= 0) return 0;
  const hits = topK(returnedIds, k).filter((id) => relevantIds.has(id)).length;
  return hits / k;
}

function hitAtK(returnedIds: string[], relevantIds: Set<string>, k: number): number {
  return topK(returnedIds, k).some((id) => relevantIds.has(id)) ? 1 : 0;
}

function mrrAtK(returnedIds: string[], relevantIds: Set<string>, k: number): number {
  const sliced = topK(returnedIds, k);
  for (let i = 0; i < sliced.length; i += 1) {
    if (relevantIds.has(sliced[i])) return 1 / (i + 1);
  }
  return 0;
}

function ndcgAtK(returnedIds: string[], relevance: Map<string, number>, k: number): number {
  const sliced = topK(returnedIds, k);
  const gains = sliced.map((id) => relevance.get(id) || 0);
  const dcg = gains.reduce((sum, gain, index) => {
    return sum + (Math.pow(2, gain) - 1) / Math.log2(index + 2);
  }, 0);

  const idealGains = [...relevance.values()]
    .filter((gain) => gain > 0)
    .sort((a, b) => b - a)
    .slice(0, k);

  const idcg = idealGains.reduce((sum, gain, index) => {
    return sum + (Math.pow(2, gain) - 1) / Math.log2(index + 2);
  }, 0);

  return idcg === 0 ? 0 : dcg / idcg;
}

function metricsFor(returnedIds: string[], relevance: Map<string, number>, kValues: number[]) {
  const relevantIds = new Set(
    [...relevance.entries()].filter(([, grade]) => grade > 0).map(([id]) => id),
  );
  const metrics: Record<string, number> = {};

  for (const k of kValues) {
    metrics[`recall@${k}`] = recallAtK(returnedIds, relevantIds, k);
    metrics[`precision@${k}`] = precisionAtK(returnedIds, relevantIds, k);
    metrics[`hit@${k}`] = hitAtK(returnedIds, relevantIds, k);
    metrics[`mrr@${k}`] = mrrAtK(returnedIds, relevantIds, k);
    metrics[`ndcg@${k}`] = ndcgAtK(returnedIds, relevance, k);
  }

  return metrics;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function functionUrl(variant: EvalVariant): string {
  if (variant.function_url) return variant.function_url;
  if (!supabaseUrl || !variant.function_name) return "";
  return `${supabaseUrl}/functions/v1/${variant.function_name}`;
}

async function runVariant(
  evalCase: EvalCase,
  variant: EvalVariant,
  defaults: Required<Pick<EvalRequest, "threshold" | "rerank_top_k" | "match_count">>,
): Promise<{ results: SearchResult[]; response: any; latency_ms: number }> {
  const url = functionUrl(variant);
  if (!url) throw new Error(`Variant ${variant.name} has no function URL`);
  if (!functionAuthKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY");

  const started = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": functionAuthKey,
      "Authorization": `Bearer ${functionAuthKey}`,
    },
    body: JSON.stringify({
      query: evalCase.query,
      threshold: variant.threshold ?? defaults.threshold,
      use_enhanced_query: variant.use_enhanced_query ?? false,
      use_reranker: variant.use_reranker ?? false,
      rerank_top_k: variant.rerank_top_k ?? defaults.rerank_top_k,
      match_count: variant.match_count ?? defaults.match_count,
    }),
  });
  const latencyMs = Date.now() - started;
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
    response: payload,
    latency_ms: latencyMs,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const body = (await req.json()) as EvalRequest;
    const cases = Array.isArray(body.cases) ? body.cases : [];
    if (cases.length === 0) return jsonResponse({ error: "At least one eval case is required" }, 400);

    const kValues = (body.k_values?.length ? body.k_values : [5, 10, 20, 50])
      .map((value) => Math.max(1, Math.floor(value)))
      .filter((value, index, values) => values.indexOf(value) === index);
    const variants = body.variants?.length ? body.variants : defaultVariants();
    const defaults = {
      threshold: body.threshold ?? 0.1,
      rerank_top_k: body.rerank_top_k ?? 150,
      match_count: body.match_count ?? 500,
    };

    const caseResults = [];

    for (const evalCase of cases) {
      const relevance = relevanceMap(evalCase);
      if (relevance.size === 0) {
        throw new Error(`Eval case ${evalCase.id || evalCase.query} has no relevant tickets`);
      }

      for (const variant of variants) {
        try {
          const run = await runVariant(evalCase, variant, defaults);
          const returnedIds = run.results.map((result) => String(result.conv_id));
          caseResults.push({
            case_id: evalCase.id || null,
            query: evalCase.query,
            variant: variant.name,
            relevant_conv_ids: [...relevance.keys()],
            returned_conv_ids: returnedIds,
            returned_count: returnedIds.length,
            latency_ms: run.latency_ms,
            metrics: metricsFor(returnedIds, relevance, kValues),
            response_meta: {
              count: run.response?.count,
              retrieved_count: run.response?.retrieved_count,
              reranked_count: run.response?.reranked_count,
              threshold: run.response?.threshold,
              match_count: run.response?.match_count,
              category_hint: run.response?.category_hint,
              request_type_hint: run.response?.request_type_hint,
              extracted_filters: run.response?.extracted_filters,
            },
          });
        } catch (error) {
          caseResults.push({
            case_id: evalCase.id || null,
            query: evalCase.query,
            variant: variant.name,
            error: error instanceof Error ? error.message : "Unknown variant error",
          });
        }
      }
    }

    const summary = variants.map((variant) => {
      const rows = caseResults.filter((row: any) => row.variant === variant.name && !row.error);
      const metricNames = kValues.flatMap((k) => [
        `recall@${k}`,
        `precision@${k}`,
        `hit@${k}`,
        `mrr@${k}`,
        `ndcg@${k}`,
      ]);
      const metrics: Record<string, number> = {};

      for (const name of metricNames) {
        metrics[name] = average(rows.map((row: any) => row.metrics[name]));
      }

      return {
        variant: variant.name,
        cases: rows.length,
        errors: caseResults.filter((row: any) => row.variant === variant.name && row.error).length,
        avg_latency_ms: Math.round(average(rows.map((row: any) => row.latency_ms))),
        ...metrics,
      };
    });

    return jsonResponse({
      k_values: kValues,
      defaults,
      summary,
      cases: caseResults,
    });
  } catch (error) {
    console.error("Eval error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
});
