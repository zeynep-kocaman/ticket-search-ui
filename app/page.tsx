'use client';

import { useState, useEffect } from 'react';

type SimilarTicket = {
  conv_id: string;
  similarity: number;
  new_message: string;
  embedded_at: string;
};

type Payload = {
  success?: boolean;
  error?: string;
  query?: string;
  threshold?: number;
  results?: SimilarTicket[];
  count?: number;
};

export default function Home() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [query, setQuery] = useState('');
  const [threshold, setThreshold] = useState('0.84');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Payload | null>(null);
  const [toast, setToast] = useState('');

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

  async function findSimilarTickets() {
    const clean = query.trim();
    if (!clean) {
      setToast('Enter the customer issue first.');
      return;
    }

    setLoading(true);

    try {
      if (!endpoint.trim()) throw new Error('Add the POST endpoint first.');
      if (!apiKey.trim()) throw new Error('Add your Supabase anon key first.');

      const parsedThreshold = parseFloat(threshold);

      const response = await fetch(endpoint.trim(), {
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

      const payload: Payload = await response.json();
      if (payload.success === false || payload.error) {
        throw new Error(payload.error || 'The search service returned an error.');
      }
      setResult(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not search tickets.';
      setToast(
        message === 'Failed to fetch'
          ? 'Could not reach the endpoint. This is usually a CORS problem — the function must allow this origin.'
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  const tickets = result?.results ?? [];

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

      <div className="search-card">
        <div className="search-row">
          <div className="search-input-wrap">
            <span aria-hidden="true">🔍</span>
            <input
              id="query"
              type="text"
              placeholder="Describe the customer's issue…"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') findSimilarTickets();
              }}
            />
          </div>
          <button className="search-btn" onClick={findSimilarTickets} disabled={loading}>
            {loading ? 'Searching…' : 'Find similar tickets'}
          </button>
        </div>

        <div className="api-panel">
          <label htmlFor="apiEndpoint">Supabase Endpoint</label>
          <input
            id="apiEndpoint"
            type="url"
            placeholder="https://project.supabase.co/functions/v1/search-tickets"
            autoComplete="off"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
          />

          <label htmlFor="apiKey" style={{ marginTop: 10 }}>Supabase Anon Key</label>
          <input
            id="apiKey"
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />

          <label htmlFor="threshold" style={{ marginTop: 10 }}>Similarity Threshold</label>
          <input
            id="threshold"
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />

          <div className="api-help">
            Configure your Supabase endpoint and anon key to search your knowledge base.
          </div>
        </div>
      </div>

      {!result && (
        <p className="placeholder">
          Enter a support issue above to find similar past tickets.
        </p>
      )}

      {result && (
        <div className="answer-shell">
          <div className="answer-panel">
            <div className="answer-header">
              <div className="answer-title">Similar Tickets</div>
              <span className="answer-badge">{tickets.length} found</span>
            </div>

            <div className="sources">
              <div className="source-list" style={{ flexDirection: 'column', gap: 12 }}>
                {tickets.length === 0 && (
                  <span className="source-ticket">No similar tickets found above this threshold.</span>
                )}
                {tickets.map((ticket) => (
                  <div key={ticket.conv_id} className="ticket-detail" style={{ width: '100%' }}>
                    <div className="detail-head">
                      <span className="detail-id">Ticket {ticket.conv_id}</span>
                      <span className="meta">
                        Similarity <b>{(ticket.similarity * 100).toFixed(1)}%</b>
                      </span>
                    </div>
                    <div className="detail-field">
                      <div className="detail-label">Message</div>
                      <div className={`detail-value${ticket.new_message ? '' : ' empty'}`}>
                        {ticket.new_message || 'No message recorded.'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
