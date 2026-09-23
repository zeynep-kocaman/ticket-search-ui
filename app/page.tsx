'use client';

import { useEffect, useMemo, useState } from 'react';

type SimilarTicket = {
  conv_id: string;
  similarity: number;
  new_message: string;
  embedded_at: string;
};

type SemanticPayload = {
  success?: boolean;
  error?: string;
  query?: string;
  enhanced_query?: string;
  embedding_text?: string;
  threshold?: number;
  results?: SimilarTicket[];
  count?: number;
};

type HybridTicket = {
  conv_id: string;
  new_message: string;
  embedded_at: string;
  similarity: number | null;
  keyword_rank: number | null;
  score: number;
};

type HybridPayload = {
  success?: boolean;
  error?: string;
  query?: string;
  results?: HybridTicket[];
  count?: number;
};

type Mode = 'semantic' | 'hybrid';

type RecentSearch = {
  id: string;
  mode: Mode;
  query: string;
  at: string;
  semanticResult?: SemanticPayload;
  hybridResult?: HybridPayload;
};

const RECENT_SEARCHES_KEY = 'ticket-search-recent-searches-v1';

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatPercent(value: number | null | undefined) {
  return typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : '-';
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function newestDate(values: string[]) {
  const dates = values.map((value) => new Date(value)).filter((date) => Number.isFinite(date.getTime()));
  if (!dates.length) return '-';
  return new Date(Math.max(...dates.map((date) => date.getTime()))).toLocaleDateString();
}

export default function Home() {
  const semanticEndpoint = process.env.NEXT_PUBLIC_SUPABASE_SEMANTIC_FUNCTION_URL ?? '';
  const hybridEndpoint = process.env.NEXT_PUBLIC_SUPABASE_HYBRID_FUNCTION_URL ?? '';
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mode, setMode] = useState<Mode>('semantic');
  const [toast, setToast] = useState('');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  const [semanticQuery, setSemanticQuery] = useState('');
  const [threshold, setThreshold] = useState('0.84');
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [semanticResult, setSemanticResult] = useState<SemanticPayload | null>(null);
  const [semanticOpenTickets, setSemanticOpenTickets] = useState<Set<string>>(new Set());

  const [hybridQuery, setHybridQuery] = useState('');
  const [matchCount, setMatchCount] = useState('20');
  const [semanticWeight, setSemanticWeight] = useState('1.0');
  const [fullTextWeight, setFullTextWeight] = useState('1.0');
  const [hybridLoading, setHybridLoading] = useState(false);
  const [hybridResult, setHybridResult] = useState<HybridPayload | null>(null);
  const [hybridOpenTickets, setHybridOpenTickets] = useState<Set<string>>(new Set());

  const semanticTickets = semanticResult?.results ?? [];
  const hybridTickets = hybridResult?.results ?? [];

  const semanticAnalytics = useMemo(() => {
    const similarities = semanticTickets.map((ticket) => ticket.similarity).filter(Number.isFinite);
    const best = similarities.length ? Math.max(...similarities) : null;
    return {
      averageSimilarity: average(similarities),
      bestSimilarity: best,
      newest: newestDate(semanticTickets.map((ticket) => ticket.embedded_at)),
    };
  }, [semanticTickets]);

  const hybridAnalytics = useMemo(() => {
    const scores = hybridTickets.map((ticket) => ticket.score).filter(Number.isFinite);
    const similarities = hybridTickets
      .map((ticket) => ticket.similarity)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    return {
      averageScore: average(scores),
      bestScore: scores.length ? Math.max(...scores) : null,
      averageSimilarity: average(similarities),
      newest: newestDate(hybridTickets.map((ticket) => ticket.embedded_at)),
    };
  }, [hybridTickets]);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    setTheme((stored as 'light' | 'dark') || (prefersLight ? 'light' : 'dark'));

    try {
      const parsed = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]');
      if (Array.isArray(parsed)) setRecentSearches(parsed.slice(0, 2));
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3400);
    return () => clearTimeout(t);
  }, [toast]);

  function rememberSearch(search: RecentSearch) {
    setRecentSearches((current) => {
      const next = [search, ...current.filter((item) => item.query !== search.query || item.mode !== search.mode)].slice(0, 2);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }

  function restoreRecentSearch(search: RecentSearch) {
    setMode(search.mode);
    if (search.mode === 'semantic') {
      setSemanticQuery(search.query);
      setSemanticResult(search.semanticResult ?? null);
      setSemanticOpenTickets(new Set());
    } else {
      setHybridQuery(search.query);
      setHybridResult(search.hybridResult ?? null);
      setHybridOpenTickets(new Set());
    }
    setToast('Recent search restored.');
  }

  function exportSemanticCsv() {
    if (!semanticResult) return;
    downloadCsv(`semantic-ticket-search-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['query', 'enhanced_query', 'embedding_text', 'count', 'threshold', 'conv_id', 'similarity', 'new_message', 'embedded_at'],
      ...semanticTickets.map((ticket) => [
        semanticQuery,
        semanticResult.enhanced_query ?? '',
        semanticResult.embedding_text ?? semanticResult.enhanced_query ?? '',
        semanticResult.count ?? semanticTickets.length,
        semanticResult.threshold ?? threshold,
        ticket.conv_id,
        ticket.similarity,
        ticket.new_message,
        ticket.embedded_at,
      ]),
    ]);
    setToast('CSV export downloaded.');
  }

  function exportHybridCsv() {
    if (!hybridResult) return;
    downloadCsv(`hybrid-ticket-search-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['query', 'count', 'match_count', 'semantic_weight', 'keyword_weight', 'conv_id', 'score', 'similarity', 'keyword_rank', 'new_message', 'embedded_at'],
      ...hybridTickets.map((ticket) => [
        hybridQuery,
        hybridResult.count ?? hybridTickets.length,
        matchCount,
        semanticWeight,
        fullTextWeight,
        ticket.conv_id,
        ticket.score,
        ticket.similarity ?? '',
        ticket.keyword_rank ?? '',
        ticket.new_message,
        ticket.embedded_at,
      ]),
    ]);
    setToast('CSV export downloaded.');
  }

  async function findSemanticTickets() {
    const clean = semanticQuery.trim();
    if (!clean) {
      setToast('Enter the customer issue first.');
      return;
    }

    setSemanticLoading(true);
    setSemanticOpenTickets(new Set());

    try {
      if (!semanticEndpoint.trim()) throw new Error('Missing NEXT_PUBLIC_SUPABASE_SEMANTIC_FUNCTION_URL - check your .env config.');
      if (!apiKey.trim()) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY - check your .env config.');

      const parsedThreshold = parseFloat(threshold);

      const response = await fetch(semanticEndpoint.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey.trim(),
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          query: clean,
          threshold: Number.isFinite(parsedThreshold) ? parsedThreshold : 0.84,
        }),
      });

      if (response.status === 401) {
        throw new Error('Rejected (401). Check that the anon key is complete and belongs to this project.');
      }
      if (!response.ok) {
        throw new Error(`Request failed (${response.status}).`);
      }

      const payload: SemanticPayload = await response.json();
      if (payload.success === false || payload.error) {
        throw new Error(payload.error || 'The search service returned an error.');
      }
      setSemanticResult(payload);
      rememberSearch({
        id: `${Date.now()}-semantic`,
        mode: 'semantic',
        query: clean,
        at: new Date().toISOString(),
        semanticResult: payload,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not search tickets.';
      setToast(
        message === 'Failed to fetch'
          ? 'Could not reach the endpoint. This is usually a CORS problem - the function must allow this origin.'
          : message
      );
    } finally {
      setSemanticLoading(false);
    }
  }

  async function findHybridTickets() {
    const clean = hybridQuery.trim();
    if (!clean) {
      setToast('Enter the customer issue first.');
      return;
    }

    setHybridLoading(true);
    setHybridOpenTickets(new Set());

    try {
      if (!hybridEndpoint.trim()) throw new Error('Missing NEXT_PUBLIC_SUPABASE_HYBRID_FUNCTION_URL - check your .env config.');
      if (!apiKey.trim()) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY - check your .env config.');

      const parsedMatchCount = parseInt(matchCount, 10);
      const parsedSemanticWeight = parseFloat(semanticWeight);
      const parsedFullTextWeight = parseFloat(fullTextWeight);

      const response = await fetch(hybridEndpoint.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey.trim(),
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          query: clean,
          matchCount: Number.isFinite(parsedMatchCount) ? parsedMatchCount : 20,
          semanticWeight: Number.isFinite(parsedSemanticWeight) ? parsedSemanticWeight : 1.0,
          fullTextWeight: Number.isFinite(parsedFullTextWeight) ? parsedFullTextWeight : 1.0,
        }),
      });

      if (response.status === 401) {
        throw new Error('Rejected (401). Check that the anon key is complete and belongs to this project.');
      }
      if (!response.ok) {
        throw new Error(`Request failed (${response.status}).`);
      }

      const payload: HybridPayload = await response.json();
      if (payload.success === false || payload.error) {
        throw new Error(payload.error || 'The search service returned an error.');
      }
      setHybridResult(payload);
      rememberSearch({
        id: `${Date.now()}-hybrid`,
        mode: 'hybrid',
        query: clean,
        at: new Date().toISOString(),
        hybridResult: payload,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not search tickets.';
      setToast(
        message === 'Failed to fetch'
          ? 'Could not reach the endpoint. This is usually a CORS problem - the function must allow this origin.'
          : message
      );
    } finally {
      setHybridLoading(false);
    }
  }

  return (
    <main>
      <div className="topbar">
        <div>
          <div className="kicker">Customer Support</div>
          <h1 className="title">Ticket Search</h1>
        </div>
        <div className="theme-controls">
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>

      <p className="lede">
        Find similar past tickets by describing the customer&apos;s issue.
      </p>

      <div className="tabs" role="tablist" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          role="tab"
          aria-selected={mode === 'semantic'}
          className="theme-toggle"
          style={{
            fontWeight: mode === 'semantic' ? 700 : 400,
            opacity: mode === 'semantic' ? 1 : 0.6,
          }}
          onClick={() => setMode('semantic')}
        >
          Semantic Search
        </button>
        <button
          role="tab"
          aria-selected={mode === 'hybrid'}
          className="theme-toggle"
          style={{
            fontWeight: mode === 'hybrid' ? 700 : 400,
            opacity: mode === 'hybrid' ? 1 : 0.6,
          }}
          onClick={() => setMode('hybrid')}
        >
          Hybrid Search
        </button>
      </div>

      {recentSearches.length > 0 && (
        <section className="recent-panel" aria-label="Recent searches">
          <div className="section-head">
            <div className="section-title">Recent Searches</div>
            <div className="section-note">Latest 2 searches and saved results</div>
          </div>
          <div className="recent-list">
            {recentSearches.map((search) => {
              const count = search.mode === 'semantic'
                ? search.semanticResult?.results?.length ?? 0
                : search.hybridResult?.results?.length ?? 0;
              return (
                <button key={search.id} className="recent-item" onClick={() => restoreRecentSearch(search)}>
                  <span className="recent-query">{search.query}</span>
                  <span className="recent-meta">
                    {search.mode} · {count} results · {new Date(search.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {mode === 'semantic' && (
        <>
          <div className="search-card">
            <div className="search-row">
              <div className="search-input-wrap" style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  id="semanticQuery"
                  style={{ border: 'none' }}
                  type="text"
                  placeholder="Describe the customer's issue..."
                  autoComplete="off"
                  value={semanticQuery}
                  onChange={(e) => setSemanticQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') findSemanticTickets();
                  }}
                />
              </div>
              <button className="search-btn" onClick={findSemanticTickets} disabled={semanticLoading}>
                {semanticLoading ? 'Searching...' : 'Find similar tickets'}
              </button>
            </div>

            <div className="api-panel">
              <label htmlFor="threshold">Similarity Threshold</label>
              <input
                id="threshold"
                style={{ border: 'none' }}
                type="text"
                inputMode="decimal"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value.replace(',', '.'))}
              />

              <div className="api-help">
                Adjust how closely a past ticket must match to be shown.
              </div>
            </div>
          </div>

          {!semanticResult && (
            <p className="placeholder">
              Enter a support issue above to find similar past tickets.
            </p>
          )}

          {semanticResult && (
            <div className="answer-shell">
              <div className="answer-panel">
                <div className="answer-header">
                  <div className="answer-title">Similar Tickets</div>
                  <div className="answer-actions">
                    <button className="export-btn" onClick={exportSemanticCsv} disabled={semanticTickets.length === 0}>
                      Export CSV
                    </button>
                    <span className="answer-badge">{semanticTickets.length} found</span>
                  </div>
                </div>

                <div className="analytics-grid" aria-label="Semantic search analytics">
                  <div className="analytics-card"><span>Best match</span><b>{formatPercent(semanticAnalytics.bestSimilarity)}</b></div>
                  <div className="analytics-card"><span>Avg similarity</span><b>{formatPercent(semanticAnalytics.averageSimilarity)}</b></div>
                  <div className="analytics-card"><span>Newest result</span><b>{semanticAnalytics.newest}</b></div>
                </div>

                <div className="query-inspection" aria-label="Search text inspection">
                  <div className="query-card">
                    <div className="detail-label">LLM enhanced ticket</div>
                    <div className={`detail-value${semanticResult.enhanced_query ? '' : ' empty'}`}>
                      {semanticResult.enhanced_query || 'No enhanced query was returned by the search function.'}
                    </div>
                  </div>
                  <div className="query-card">
                    <div className="detail-label">Text used for semantic search</div>
                    <div className={`detail-value${semanticResult.embedding_text ? '' : ' empty'}`}>
                      {semanticResult.embedding_text || semanticResult.enhanced_query || 'No embedding text was returned by the search function.'}
                    </div>
                  </div>
                </div>

                <div className="sources">
                  <div className="source-list" style={{ flexDirection: 'column', gap: 12 }}>
                    {semanticTickets.length === 0 && (
                      <span className="source-ticket">No similar tickets found above this threshold.</span>
                    )}
                    {semanticTickets.map((ticket) => {
                      const isOpen = semanticOpenTickets.has(ticket.conv_id);
                      return (
                        <div key={ticket.conv_id} className="ticket-detail" style={{ width: '100%' }}>
                          <button
                            className="detail-head"
                            style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none' }}
                            aria-expanded={isOpen}
                            onClick={() =>
                              setSemanticOpenTickets((prev) => {
                                const next = new Set(prev);
                                if (next.has(ticket.conv_id)) {
                                  next.delete(ticket.conv_id);
                                } else {
                                  next.add(ticket.conv_id);
                                }
                                return next;
                              })
                            }
                          >
                            <span className="detail-id">Ticket {ticket.conv_id}</span>
                            <span className="meta">
                              Similarity <b>{(ticket.similarity * 100).toFixed(1)}%</b>
                            </span>
                          </button>

                          {isOpen && (
                            <div className="detail-field">
                              <div className="detail-label">Message</div>
                              <div className={`detail-value${ticket.new_message ? '' : ' empty'}`}>
                                {ticket.new_message || 'No message recorded.'}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {mode === 'hybrid' && (
        <>
          <div className="search-card">
            <div className="search-row">
              <div className="search-input-wrap" style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  id="hybridQuery"
                  style={{ border: 'none' }}
                  type="text"
                  placeholder="Describe the customer's issue..."
                  autoComplete="off"
                  value={hybridQuery}
                  onChange={(e) => setHybridQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') findHybridTickets();
                  }}
                />
              </div>
              <button className="search-btn" onClick={findHybridTickets} disabled={hybridLoading}>
                {hybridLoading ? 'Searching...' : 'Find similar tickets'}
              </button>
            </div>

            <div className="api-panel">
              <label htmlFor="matchCount">Result Count</label>
              <input
                id="matchCount"
                style={{ border: 'none' }}
                type="text"
                inputMode="numeric"
                value={matchCount}
                onChange={(e) => setMatchCount(e.target.value.replace(/[^0-9]/g, ''))}
              />

              <label htmlFor="semanticWeight" style={{ marginTop: 10 }}>Semantic Weight</label>
              <input
                id="semanticWeight"
                style={{ border: 'none' }}
                type="text"
                inputMode="decimal"
                value={semanticWeight}
                onChange={(e) => setSemanticWeight(e.target.value.replace(',', '.'))}
              />

              <label htmlFor="fullTextWeight" style={{ marginTop: 10 }}>Keyword Weight</label>
              <input
                id="fullTextWeight"
                style={{ border: 'none' }}
                type="text"
                inputMode="decimal"
                value={fullTextWeight}
                onChange={(e) => setFullTextWeight(e.target.value.replace(',', '.'))}
              />

              <div className="api-help">
                Adjust how many results to return and how much weight to give semantic vs. keyword matching.
              </div>
            </div>
          </div>

          {!hybridResult && (
            <p className="placeholder">
              Enter a support issue above to find similar past tickets.
            </p>
          )}

          {hybridResult && (
            <div className="answer-shell">
              <div className="answer-panel">
                <div className="answer-header">
                  <div className="answer-title">Similar Tickets</div>
                  <div className="answer-actions">
                    <button className="export-btn" onClick={exportHybridCsv} disabled={hybridTickets.length === 0}>
                      Export CSV
                    </button>
                    <span className="answer-badge">{hybridTickets.length} found</span>
                  </div>
                </div>

                <div className="analytics-grid" aria-label="Hybrid search analytics">
                  <div className="analytics-card"><span>Best score</span><b>{hybridAnalytics.bestScore?.toFixed(4) ?? '-'}</b></div>
                  <div className="analytics-card"><span>Avg score</span><b>{hybridAnalytics.averageScore?.toFixed(4) ?? '-'}</b></div>
                  <div className="analytics-card"><span>Avg similarity</span><b>{formatPercent(hybridAnalytics.averageSimilarity)}</b></div>
                  <div className="analytics-card"><span>Newest result</span><b>{hybridAnalytics.newest}</b></div>
                </div>

                <div className="sources">
                  <div className="source-list" style={{ flexDirection: 'column', gap: 12 }}>
                    {hybridTickets.length === 0 && (
                      <span className="source-ticket">No similar tickets found.</span>
                    )}
                    {hybridTickets.map((ticket) => {
                      const isOpen = hybridOpenTickets.has(ticket.conv_id);
                      return (
                        <div key={ticket.conv_id} className="ticket-detail" style={{ width: '100%' }}>
                          <button
                            className="detail-head"
                            style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none' }}
                            aria-expanded={isOpen}
                            onClick={() =>
                              setHybridOpenTickets((prev) => {
                                const next = new Set(prev);
                                if (next.has(ticket.conv_id)) {
                                  next.delete(ticket.conv_id);
                                } else {
                                  next.add(ticket.conv_id);
                                }
                                return next;
                              })
                            }
                          >
                            <span className="detail-id">Ticket {ticket.conv_id}</span>
                            <span className="meta">
                              Score <b>{ticket.score.toFixed(4)}</b>
                              {ticket.similarity !== null && (
                                <> · Similarity <b>{(ticket.similarity * 100).toFixed(1)}%</b></>
                              )}
                            </span>
                          </button>

                          {isOpen && (
                            <div className="detail-field">
                              <div className="detail-label">Message</div>
                              <div className={`detail-value${ticket.new_message ? '' : ' empty'}`}>
                                {ticket.new_message || 'No message recorded.'}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
