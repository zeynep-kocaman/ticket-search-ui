'use client';

import { useState, useEffect } from 'react';

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

export default function Home() {
  const semanticEndpoint = process.env.NEXT_PUBLIC_SUPABASE_SEMANTIC_FUNCTION_URL ?? '';
  const hybridEndpoint = process.env.NEXT_PUBLIC_SUPABASE_HYBRID_FUNCTION_URL ?? '';
  const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mode, setMode] = useState<Mode>('semantic');
  const [toast, setToast] = useState('');

  // Semantic search state
  const [semanticQuery, setSemanticQuery] = useState('');
  const [threshold, setThreshold] = useState('0.84');
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [semanticResult, setSemanticResult] = useState<SemanticPayload | null>(null);
  const [semanticOpenTickets, setSemanticOpenTickets] = useState<Set<string>>(new Set());

  // Hybrid search state
  const [hybridQuery, setHybridQuery] = useState('');
  const [matchCount, setMatchCount] = useState('20');
  const [semanticWeight, setSemanticWeight] = useState('1.0');
  const [fullTextWeight, setFullTextWeight] = useState('1.0');
  const [hybridLoading, setHybridLoading] = useState(false);
  const [hybridResult, setHybridResult] = useState<HybridPayload | null>(null);
  const [hybridOpenTickets, setHybridOpenTickets] = useState<Set<string>>(new Set());

  // Read stored theme after mount to avoid hydration mismatch
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    setTheme((stored as 'light' | 'dark') || (prefersLight ? 'light' : 'dark'));
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

  async function findSemanticTickets() {
    const clean = semanticQuery.trim();
    if (!clean) {
      setToast('Enter the customer issue first.');
      return;
    }

    setSemanticLoading(true);
    setSemanticOpenTickets(new Set());

    try {
      if (!semanticEndpoint.trim()) throw new Error('Missing NEXT_PUBLIC_SUPABASE_SEMANTIC_FUNCTION_URL — check your .env config.');
      if (!apiKey.trim()) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY — check your .env config.');

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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not search tickets.';
      setToast(
        message === 'Failed to fetch'
          ? 'Could not reach the endpoint. This is usually a CORS problem — the function must allow this origin.'
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
      if (!hybridEndpoint.trim()) throw new Error('Missing NEXT_PUBLIC_SUPABASE_HYBRID_FUNCTION_URL — check your .env config.');
      if (!apiKey.trim()) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY — check your .env config.');

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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not search tickets.';
      setToast(
        message === 'Failed to fetch'
          ? 'Could not reach the endpoint. This is usually a CORS problem — the function must allow this origin.'
          : message
      );
    } finally {
      setHybridLoading(false);
    }
  }

  const semanticTickets = semanticResult?.results ?? [];
  const hybridTickets = hybridResult?.results ?? [];

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

      {mode === 'semantic' && (
        <>
          <div className="search-card">
            <div className="search-row">
              <div className="search-input-wrap" style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  id="semanticQuery"
                  style={{ border: 'none' }}
                  type="text"
                  placeholder="Describe the customer's issue…"
                  autoComplete="off"
                  value={semanticQuery}
                  onChange={(e) => setSemanticQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') findSemanticTickets();
                  }}
                />
              </div>
              <button className="search-btn" onClick={findSemanticTickets} disabled={semanticLoading}>
                {semanticLoading ? 'Searching…' : 'Find similar tickets'}
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
                  <span className="answer-badge">{semanticTickets.length} found</span>
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
                  placeholder="Describe the customer's issue…"
                  autoComplete="off"
                  value={hybridQuery}
                  onChange={(e) => setHybridQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') findHybridTickets();
                  }}
                />
              </div>
              <button className="search-btn" onClick={findHybridTickets} disabled={hybridLoading}>
                {hybridLoading ? 'Searching…' : 'Find similar tickets'}
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
                  <span className="answer-badge">{hybridTickets.length} found</span>
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
