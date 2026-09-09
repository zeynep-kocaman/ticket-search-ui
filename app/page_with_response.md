'use client';

import { useState, useEffect } from 'react';

type Ticket = {
  ticket_id: string | number;
  description?: string | null;
  resolution?: string | null;
};

type Payload = {
  success?: boolean;
  error?: string;
  answer?: string;
  note?: string;
  retrieved_count?: number;
  reranked_count?: number;
  source_tickets?: (string | number)[];
  sources?: Ticket[];
};

export default function Home() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [query, setQuery] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Payload | null>(null);
  const [openTicket, setOpenTicket] = useState<string | null>(null);
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

  async function draftAnswer() {
    const clean = query.trim();
    if (!clean) {
      setToast('Enter the customer issue first.');
      return;
    }

    setLoading(true);
    setOpenTicket(null);

    try {
      if (!endpoint.trim()) throw new Error('Add the POST endpoint first.');
      if (!apiKey.trim()) throw new Error('Add your Supabase anon key first.');

      const response = await fetch(endpoint.trim(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey.trim(),
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({ query: clean }),
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
      const message = error instanceof Error ? error.message : 'Could not draft an answer.';
      setToast(
        message === 'Failed to fetch'
          ? 'Could not reach the endpoint. This is usually a CORS problem — the function must allow this origin.'
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  const tickets = result?.source_tickets ?? [];
  const ticketMap = new Map(
    (result?.sources ?? []).map((t) => [String(t.ticket_id), t])
  );
  const activeTicket = openTicket ? ticketMap.get(openTicket) : undefined;

  return (
    <main>
      <div className="topbar">
        <div>
          <div className="kicker">Customer Support AI</div>
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
        Find resolutions to similar tickets by searching the knowledge base.
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
                if (e.key === 'Enter') draftAnswer();
              }}
            />
          </div>
          <button className="search-btn" onClick={draftAnswer} disabled={loading}>
            {loading ? 'Drafting…' : 'Draft answer'}
          </button>
        </div>

        <div className="api-panel">
          <label htmlFor="apiEndpoint">Supabase Endpoint</label>
          <input
            id="apiEndpoint"
            type="url"
            placeholder="https://project.supabase.co/functions/v1/your-edge-function"
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

          <div className="api-help">
            Configure your Supabase endpoint and anon key to search your knowledge base.
          </div>
        </div>
      </div>

      {!result && (
        <p className="placeholder">
          Enter a support issue above to generate an answer draft. Results will appear here with
          relevant ticket citations.
        </p>
      )}

      {result && (
        <div className="answer-shell">
          <div className="answer-panel">
            <div className="answer-header">
              <div className="answer-title">Draft</div>
              <span className="answer-badge">Generated Answer</span>
            </div>

            <div className="answer-text">
              {result.answer || 'No answer was returned for this query.'}
            </div>

            <div className="answer-note">
              <i>⚠</i>
              <span>{result.note || 'Verify this draft before sending it to a customer.'}</span>
            </div>

            <div className="meta-row">
              <div className="meta">Retrieved <b>{result.retrieved_count ?? '—'}</b></div>
              <div className="meta">Reranked <b>{result.reranked_count ?? '—'}</b></div>
              <div className="meta">Sources <b>{tickets.length || '—'}</b></div>
            </div>

            <div className="sources">
              <h2>Related Tickets</h2>
              <div className="source-list">
                {tickets.length === 0 && <span className="source-ticket">None cited</span>}
                {tickets.map((id) => {
                  const key = String(id);
                  return (
                    <button
                      key={key}
                      className="source-ticket"
                      aria-expanded={openTicket === key}
                      onClick={() => setOpenTicket(openTicket === key ? null : key)}
                    >
                      Ticket {key}
                    </button>
                  );
                })}
              </div>
            </div>

            {openTicket && (
              <div className="ticket-detail">
                <div className="detail-head">
                  <span className="detail-id">Ticket {openTicket}</span>
                  <button className="detail-close" onClick={() => setOpenTicket(null)}>
                    Close
                  </button>
                </div>

                {activeTicket ? (
                  <>
                    <div className="detail-field">
                      <div className="detail-label">Description</div>
                      <div className={`detail-value${activeTicket.description ? '' : ' empty'}`}>
                        {activeTicket.description || 'No description recorded.'}
                      </div>
                    </div>
                    <div className="detail-field">
                      <div className="detail-label">Resolution</div>
                      <div className={`detail-value${activeTicket.resolution ? '' : ' empty'}`}>
                        {activeTicket.resolution || 'No resolution recorded.'}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="detail-status">
                    Full text for this ticket was not included in the response.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}
