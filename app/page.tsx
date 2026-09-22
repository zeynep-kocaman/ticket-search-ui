import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support Answer Drafts',
  description: 'Secure ticket search and support answer drafting tool',
};

export default function Home() {
  return (
    <div suppressHydrationWarning>
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#07101c" />
          <title>Support answer drafts</title>
          <style>{`
            :root {
              color-scheme: light dark;

              /* Light mode */
              --light-bg: #f8f7f5;
              --light-ink: #1a1a18;
              --light-muted: #666662;
              --light-subtle: #999993;
              --light-line: rgba(0, 0, 0, .08);
              --light-panel: #ffffff;

              /* Dark mode */
              --dark-bg: #07101c;
              --dark-ink: #eaf1f7;
              --dark-muted: #8fa0af;
              --dark-subtle: #536578;
              --dark-line: rgba(157, 184, 205, .16);
              --dark-panel: #101d2c;

              /* Semantic colors */
              --navy: #1e3a5f;
              --navy-light: #2d5a8c;
              --gray: #a8a8a6;
              --gray-light: #d4d4d0;
              --gold: #ffb81c;
              --blue: #2563eb;
              --blue-light: #3b82f6;
              --orange: #ff6b35;
              --orange-light: #ff8c5a;

              /* Current mode */
              --bg: var(--dark-bg);
              --ink: var(--dark-ink);
              --muted: var(--dark-muted);
              --subtle: var(--dark-subtle);
              --line: var(--dark-line);
              --panel: var(--dark-panel);
            }

            @media (prefers-color-scheme: light) {
              :root {
                --bg: var(--light-bg);
                --ink: var(--light-ink);
                --muted: var(--light-muted);
                --subtle: var(--light-subtle);
                --line: var(--light-line);
                --panel: var(--light-panel);
              }
            }

            html[data-theme="light"] {
              --bg: var(--light-bg);
              --ink: var(--light-ink);
              --muted: var(--light-muted);
              --subtle: var(--light-subtle);
              --line: var(--light-line);
              --panel: var(--light-panel);
            }

            html[data-theme="dark"] {
              --bg: var(--dark-bg);
              --ink: var(--dark-ink);
              --muted: var(--dark-muted);
              --subtle: var(--dark-subtle);
              --line: var(--dark-line);
              --panel: var(--dark-panel);
            }

            * { box-sizing: border-box; }
            body {
              margin: 0;
              min-height: 100vh;
              color: var(--ink);
              background: var(--bg);
              font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
              transition: background-color .3s ease, color .3s ease;
            }

            button, input, select { font: inherit; }
            button { cursor: pointer; }
            button:focus-visible, input:focus-visible, select:focus-visible {
              outline: 3px solid rgba(121,213,208,.7);
              outline-offset: 3px;
            }

            main { width: min(780px, 100%); margin: 0 auto; padding: 44px clamp(20px, 5vw, 40px) 72px; }

            .topbar { display: flex; justify-content: space-between; align-items: center; gap: 18px; margin-bottom: 44px; }
            .kicker { color: var(--subtle); font-size: 11px; letter-spacing: .13em; text-transform: uppercase; }
            .theme-controls { display: flex; align-items: center; gap: 8px; }
            .mode-wrap { display: flex; align-items: center; gap: 9px; }
            .mode-label { color: var(--subtle); font-size: 10px; text-transform: uppercase; letter-spacing: .13em; }
            .mode-select { border: 1px solid var(--line); background: var(--panel); color: var(--ink); border-radius: 999px; padding: 8px 13px; font-size: 11px; transition: border-color .18s ease, background-color .18s ease; }
            .theme-toggle { border: 1px solid var(--line); background: transparent; color: var(--muted); border-radius: 7px; padding: 8px 10px; font-size: 12px; text-transform: uppercase; letter-spacing: .11em; font-weight: 600; cursor: pointer; transition: .18s ease; }
            .theme-toggle:hover { border-color: var(--subtle); color: var(--ink); }

            .lede { font-size: 15px; line-height: 1.6; color: var(--muted); margin: 0 0 20px; }
            .lede strong { color: var(--ink); font-weight: 600; }

            .search-card { background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 14px; transition: border-color .18s ease; }
            .search-row { display: flex; gap: 10px; }
            .search-input-wrap { flex: 1; position: relative; }
            .search-input-wrap span { position: absolute; left: 16px; top: 14px; color: var(--blue); font-size: 16px; }
            #query { width: 100%; border: 1px solid var(--line); background: var(--panel); color: var(--ink); border-radius: 11px; padding: 13px 16px 13px 44px; min-height: 48px; font-size: 14px; transition: border-color .18s ease; }
            #query::placeholder { color: var(--subtle); }
            .search-btn { border: 0; background: var(--gold); color: #1a1a18; min-width: 138px; border-radius: 11px; font-weight: 750; font-size: 13px; transition: background .18s ease, transform .18s ease; }
            .search-btn:hover { background: #ffc940; transform: translateY(-1px); }
            .search-btn[disabled] { opacity: .65; cursor: progress; }

            .api-panel { display: none; border-top: 1px solid var(--line); margin-top: 14px; padding-top: 14px; }
            .api-panel.visible { display: block; }
            .api-panel label { display: block; color: var(--subtle); text-transform: uppercase; letter-spacing: .12em; font-size: 9px; margin-bottom: 6px; }
            #apiEndpoint, #apiKey { width: 100%; background: var(--panel); border: 1px solid var(--line); color: var(--ink); border-radius: 9px; padding: 10px; font-size: 12px; transition: border-color .18s ease; }
            .api-help { color: var(--subtle); font-size: 10px; line-height: 1.55; margin-top: 8px; }
            .api-help code { color: var(--blue); }

            .answer-shell { display: none; margin-top: 28px; }
            .answer-shell.visible { display: block; animation: rise .3s both; }
            @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

            .answer-panel { border: 1px solid var(--line); background: var(--panel); border-radius: 15px; padding: 24px; }
            .answer-header { display: flex; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 14px; }
            .answer-title { color: var(--blue); text-transform: uppercase; letter-spacing: .14em; font-size: 10px; font-weight: 750; }
            .answer-badge { color: var(--ink); background: rgba(255, 184, 28, .12); border: 1px solid rgba(255, 184, 28, .3); border-radius: 999px; padding: 5px 10px; font-size: 10px; white-space: nowrap; }
            .answer-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
            .utility-btn { border: 1px solid var(--line); background: transparent; color: var(--muted); border-radius: 8px; padding: 7px 10px; font-size: 11px; font-weight: 650; transition: .18s ease; }
            .utility-btn:hover:not([disabled]) { color: var(--ink); border-color: var(--blue); background: rgba(37, 99, 235, .06); }
            .utility-btn[disabled] { opacity: .45; cursor: not-allowed; }
            .answer-text { font-size: 16px; line-height: 1.7; }
            .answer-note { display: flex; gap: 9px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--line); color: var(--muted); font-size: 11px; line-height: 1.55; }
            .answer-note i { font-style: normal; color: var(--orange); }

            .meta-row { display: flex; flex-wrap: wrap; gap: 10px 26px; align-items: baseline; margin-top: 18px; padding: 14px 2px 0; border-top: 1px solid var(--line); }
            .meta { color: var(--subtle); font-size: 10px; text-transform: uppercase; letter-spacing: .12em; }
            .meta b { color: var(--ink); font-size: 15px; letter-spacing: -.01em; margin-right: 6px; font-weight: 650; }

            .insights-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
            .insight-card { border: 1px solid var(--line); background: rgba(37, 99, 235, .04); border-radius: 12px; padding: 12px; min-height: 82px; }
            .insight-label { color: var(--subtle); font-size: 9px; text-transform: uppercase; letter-spacing: .12em; margin-bottom: 8px; }
            .insight-value { font-size: 20px; font-weight: 750; letter-spacing: -.03em; }
            .insight-copy { color: var(--muted); font-size: 11px; line-height: 1.45; margin-top: 5px; }
            .keyword-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
            .keyword-chip { border: 1px solid var(--line); color: var(--muted); border-radius: 999px; padding: 4px 8px; font-size: 10px; }

            .recent-panel { display: none; margin-top: 16px; border: 1px solid var(--line); background: var(--panel); border-radius: 15px; padding: 16px; }
            .recent-panel.visible { display: block; animation: rise .24s both; }
            .section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
            .section-title { color: var(--subtle); text-transform: uppercase; letter-spacing: .13em; font-size: 10px; font-weight: 750; }
            .section-note { color: var(--subtle); font-size: 11px; }
            .recent-list { display: grid; gap: 10px; }
            .recent-item { width: 100%; text-align: left; border: 1px solid var(--line); background: transparent; color: var(--ink); border-radius: 12px; padding: 12px; transition: .18s ease; }
            .recent-item:hover { border-color: var(--blue); background: rgba(37, 99, 235, .05); transform: translateY(-1px); }
            .recent-top { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; margin-bottom: 6px; }
            .recent-query { font-size: 13px; font-weight: 700; line-height: 1.35; }
            .recent-time { color: var(--subtle); font-size: 10px; white-space: nowrap; }
            .recent-preview { color: var(--muted); font-size: 12px; line-height: 1.5; margin-bottom: 8px; }
            .recent-tickets { display: flex; gap: 6px; flex-wrap: wrap; color: var(--blue); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; }

            .sources { margin-top: 16px; }
            .sources h2 { margin: 0 0 10px; font-size: 10px; text-transform: uppercase; letter-spacing: .13em; color: var(--subtle); font-weight: 650; }
            .source-list { display: flex; gap: 7px; flex-wrap: wrap; }
            .source-ticket { border: 1px solid var(--line); background: var(--panel); color: var(--blue); border-radius: 8px; padding: 6px 10px; font-size: 11px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; transition: border-color .15s ease, background .15s ease; }
            button.source-ticket { cursor: pointer; }
            button.source-ticket:hover { border-color: var(--blue); background: rgba(37, 99, 235, .06); }
            button.source-ticket[aria-expanded="true"] { border-color: var(--blue); background: rgba(37, 99, 235, .1); color: var(--blue-light); }

            .ticket-detail { display: none; margin-top: 12px; border: 1px solid var(--line); background: var(--panel); border-radius: 12px; padding: 18px; }
            .ticket-detail.visible { display: block; animation: rise .22s both; }
            .detail-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; }
            .detail-id { color: var(--blue); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; }
            .detail-close { border: 1px solid var(--line); background: transparent; color: var(--muted); border-radius: 7px; padding: 4px 9px; font-size: 11px; transition: .18s ease; }
            .detail-close:hover { color: var(--ink); border-color: var(--subtle); }
            .detail-field + .detail-field { margin-top: 14px; }
            .detail-label { color: var(--subtle); font-size: 9px; text-transform: uppercase; letter-spacing: .12em; margin-bottom: 5px; }
            .detail-value { font-size: 13px; line-height: 1.65; white-space: pre-wrap; }
            .detail-value.empty { color: var(--subtle); font-style: italic; }
            .detail-status { color: var(--muted); font-size: 12px; }

            @media (max-width: 540px) {
              main { padding: 28px clamp(16px, 4vw, 28px) 44px; }
              .topbar { gap: 12px; }
              .search-row { flex-direction: column; }
              .answer-panel { padding: 16px; }
              .answer-header { align-items: flex-start; flex-direction: column; }
              .answer-actions { justify-content: flex-start; }
              .insights-grid { grid-template-columns: 1fr; }
              .recent-top { flex-direction: column; gap: 3px; }
            }
          `}</style>
        </head>
        <body>
          <main>
            <div className="topbar">
              <div>
                <div className="kicker">Customer Support AI</div>
                <h1 style={{ margin: '6px 0 0', fontSize: '28px', fontWeight: 700 }}>Drafting Tool</h1>
              </div>
              <div className="theme-controls">
                <div className="mode-wrap">
                  <label className="mode-label" htmlFor="modeSelect">Mode</label>
                  <select id="modeSelect" className="mode-select">
                    <option value="demo">Demo</option>
                    <option value="api">API</option>
                  </select>
                </div>
                <button id="themeToggle" className="theme-toggle"></button>
              </div>
            </div>

            <p className="lede"><strong>Draft support answers</strong> by searching your knowledge base. Configure a Supabase endpoint to run live queries—otherwise, the demo shows sample results.</p>

            <form id="searchForm" className="search-card">
              <div className="search-row">
                <div className="search-input-wrap">
                  <span>🔍</span>
                  <input
                    id="query"
                    type="text"
                    placeholder="Describe the customer's issue…"
                    autoComplete="off"
                    required
                  />
                </div>
                <button type="submit" className="search-btn">Draft answer</button>
              </div>

              <div id="apiPanel" className="api-panel">
                <label htmlFor="apiEndpoint">Supabase Endpoint</label>
                <input
                  id="apiEndpoint"
                  type="url"
                  placeholder="https://project.supabase.co/functions/v1/your-edge-function"
                  autoComplete="off"
                />

                <label htmlFor="apiKey" style={{ marginTop: '10px' }}>Supabase Anon Key</label>
                <input
                  id="apiKey"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                  autoComplete="off"
                />

                <div className="api-help">
                  Your anon key is public (embedded in client-side code). It only grants access to your configured Supabase policies.
                  <br />Keep your <code>service_role</code> key secret and never share it.
                </div>
              </div>
            </form>

            <section id="recentPanel" className="recent-panel" aria-live="polite">
              <div className="section-head">
                <div className="section-title">Recent Searches</div>
                <div className="section-note">Latest 2 with answer previews and cited tickets</div>
              </div>
              <div id="recentList" className="recent-list"></div>
            </section>

            <div id="placeholder" style={{ marginTop: '40px' }}>
              <p style={{ color: 'var(--subtle)', fontSize: '13px', lineHeight: 1.6 }}>
                Enter a support issue above to generate an answer draft. Results will appear here with relevant ticket citations.
              </p>
            </div>

            <div id="answerShell" className="answer-shell">
              <div className="answer-panel">
                <div className="answer-header">
                  <div className="answer-title">Draft</div>
                  <div className="answer-actions">
                    <button id="copyAnswerBtn" type="button" className="utility-btn">Copy draft</button>
                    <button id="exportCsvBtn" type="button" className="utility-btn" disabled>Export CSV</button>
                    <span className="answer-badge">Generated Answer</span>
                  </div>
                </div>
                <div id="answerText" className="answer-text"></div>
                <div id="answerNote" className="answer-note">
                  <i>⚠</i>
                </div>

                <div className="meta-row">
                  <div className="meta">Retrieved <b id="statRetrieved">—</b></div>
                  <div className="meta">Reranked <b id="statReranked">—</b></div>
                  <div className="meta">Sources <b id="statSources">—</b></div>
                </div>

                <div className="insights-grid" aria-label="Search analytics">
                  <div className="insight-card">
                    <div className="insight-label">Coverage</div>
                    <div id="insightCoverage" className="insight-value">—</div>
                    <div id="insightCoverageCopy" className="insight-copy">How much of the retrieved set made it into citations.</div>
                  </div>
                  <div className="insight-card">
                    <div className="insight-label">Resolution Fill</div>
                    <div id="insightResolution" className="insight-value">—</div>
                    <div className="insight-copy">Share of cited tickets with resolution text.</div>
                  </div>
                  <div className="insight-card">
                    <div className="insight-label">Query Signals</div>
                    <div id="insightKeywords" className="keyword-list"></div>
                  </div>
                </div>

                <div className="sources">
                  <h2>Related Tickets</h2>
                  <div id="sourceList" className="source-list"></div>
                </div>

                <div id="ticketDetail" className="ticket-detail"></div>
              </div>
            </div>
          </main>

          <script dangerouslySetInnerHTML={{ __html: `
            const modeEl = document.getElementById('modeSelect');
            const apiPanel = document.getElementById('apiPanel');
            const queryEl = document.getElementById('query');
            const shell = document.getElementById('answerShell');
            const placeholder = document.getElementById('placeholder');
            const button = document.querySelector('.search-btn');
            const themeToggle = document.getElementById('themeToggle');
            const recentPanel = document.getElementById('recentPanel');
            const recentList = document.getElementById('recentList');
            const exportCsvBtn = document.getElementById('exportCsvBtn');
            const copyAnswerBtn = document.getElementById('copyAnswerBtn');
            const RECENT_KEY = 'ticketSearch.recentSearches.v1';
            let currentSearch = null;

            // Theme toggle
            function initTheme() {
              const stored = localStorage.getItem('theme');
              const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
              const theme = stored || (prefersLight ? 'light' : 'dark');
              setTheme(theme);
            }

            function setTheme(theme) {
              document.documentElement.setAttribute('data-theme', theme);
              localStorage.setItem('theme', theme);
              themeToggle.textContent = theme === 'light' ? 'Dark' : 'Light';
            }

            themeToggle.addEventListener('click', () => {
              const current = document.documentElement.getAttribute('data-theme') || 'dark';
              setTheme(current === 'dark' ? 'light' : 'dark');
            });

            initTheme();

            function escapeHtml(value) {
              return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
            }

            function truncate(value, max = 150) {
              const text = String(value ?? '').trim().replace(/\s+/g, ' ');
              return text.length > max ? text.slice(0, max - 1) + '…' : text;
            }

            function getTicketId(ticket) {
              return ticket?.ticket_id ?? ticket?.id ?? ticket?.Ticket_ID ?? ticket?.TicketID ?? ticket?.['Ticket ID'];
            }

            function getSources(payload) {
              return Array.isArray(payload.sources) ? payload.sources : [];
            }

            function getTicketIds(payload) {
              const ids = Array.isArray(payload.source_tickets) ? payload.source_tickets : [];
              const sourceIds = getSources(payload).map(getTicketId).filter(Boolean);
              return [...new Set([...ids, ...sourceIds].map(id => String(id)))];
            }

            function getTicketField(ticket, fields) {
              for (const field of fields) {
                if (ticket?.[field]) return ticket[field];
              }
              return null;
            }

            function normalizeSearch(query, payload) {
              const tickets = getTicketIds(payload);
              const sources = getSources(payload);
              return {
                query,
                at: new Date().toISOString(),
                payload: {
                  answer: payload.answer || '',
                  note: payload.note || '',
                  retrieved_count: payload.retrieved_count ?? null,
                  reranked_count: payload.reranked_count ?? null,
                  source_tickets: tickets,
                  sources
                }
              };
            }

            function loadRecentSearches() {
              try {
                const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
                return Array.isArray(parsed) ? parsed.slice(0, 2) : [];
              } catch {
                return [];
              }
            }

            function saveRecentSearch(search) {
              const next = [search, ...loadRecentSearches().filter(item => item.query !== search.query)].slice(0, 2);
              localStorage.setItem(RECENT_KEY, JSON.stringify(next));
              renderRecentSearches();
            }

            function renderRecentSearches() {
              const searches = loadRecentSearches();
              if (!searches.length) {
                recentPanel.classList.remove('visible');
                recentList.innerHTML = '';
                return;
              }

              recentPanel.classList.add('visible');
              recentList.innerHTML = searches.map((item, index) => {
                const tickets = getTicketIds(item.payload || {}).slice(0, 4);
                const time = item.at ? new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                return \`
                  <button type="button" class="recent-item" data-recent-index="\${index}">
                    <div class="recent-top">
                      <div class="recent-query">\${escapeHtml(item.query)}</div>
                      <div class="recent-time">\${escapeHtml(time)}</div>
                    </div>
                    <div class="recent-preview">\${escapeHtml(truncate(item.payload?.answer || 'No answer text captured yet.', 180))}</div>
                    <div class="recent-tickets">\${tickets.length ? tickets.map(id => '<span>' + escapeHtml(id) + '</span>').join('') : '<span>No citations</span>'}</div>
                  </button>\`;
              }).join('');
            }

            function extractKeywords(query) {
              const stopWords = new Set(['about','after','again','answer','could','customer','describe','does','from','have','help','into','issue','please','search','support','that','their','there','these','they','this','ticket','what','when','where','which','with','would','your']);
              return [...new Set(String(query || '').toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) || [])]
                .filter(word => !stopWords.has(word))
                .slice(0, 5);
            }

            function renderInsights(query, payload, tickets) {
              const retrieved = Number(payload.retrieved_count) || 0;
              const coverage = retrieved && tickets.length ? Math.round((tickets.length / retrieved) * 100) : null;
              const sources = getSources(payload);
              const withResolution = sources.filter(ticket => getTicketField(ticket, ['resolution', 'Resolution', 'answer', 'Answer'])).length;
              const resolutionFill = sources.length ? Math.round((withResolution / sources.length) * 100) : null;
              const keywords = extractKeywords(query);

              document.getElementById('insightCoverage').textContent = coverage === null ? '—' : coverage + '%';
              document.getElementById('insightCoverageCopy').textContent = coverage === null
                ? 'Coverage appears when retrieved count is returned.'
                : tickets.length + ' cited from ' + retrieved + ' retrieved results.';
              document.getElementById('insightResolution').textContent = resolutionFill === null ? '—' : resolutionFill + '%';
              document.getElementById('insightKeywords').innerHTML = keywords.length
                ? keywords.map(word => '<span class="keyword-chip">' + escapeHtml(word) + '</span>').join('')
                : '<span class="insight-copy">No strong terms detected.</span>';
            }

            function escapeCsv(value) {
              const text = String(value ?? '');
              return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
            }

            function exportCurrentSearchCsv() {
              if (!currentSearch) { showToast('Run a search before exporting.'); return; }
              const payload = currentSearch.payload;
              const tickets = getTicketIds(payload);
              const sourcesById = {};
              getSources(payload).forEach(ticket => {
                const id = getTicketId(ticket);
                if (id) sourcesById[String(id)] = ticket;
              });

              const rows = [[
                'query', 'answer', 'note', 'retrieved_count', 'reranked_count', 'source_count', 'ticket_id', 'description', 'resolution'
              ]];

              (tickets.length ? tickets : ['']).forEach(id => {
                const ticket = sourcesById[String(id)] || {};
                rows.push([
                  currentSearch.query,
                  payload.answer || '',
                  payload.note || '',
                  payload.retrieved_count ?? '',
                  payload.reranked_count ?? '',
                  tickets.length,
                  id,
                  getTicketField(ticket, ['description', 'Ticket Description', 'summary', 'Summary']) || '',
                  getTicketField(ticket, ['resolution', 'Resolution', 'answer', 'Answer']) || ''
                ]);
              });

              const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'ticket-search-' + new Date().toISOString().slice(0, 10) + '.csv';
              document.body.appendChild(link);
              link.click();
              link.remove();
              URL.revokeObjectURL(url);
              showToast('CSV export downloaded.');
            }

            const sampleResponse = {
              answer: "Our standard warranty covers manufacturing defects for 12 months from the purchase date. This includes defects in materials and workmanship, but does not cover damage from misuse, accidents, or normal wear and tear.",
              note: "Verify this draft before sending it to a customer.",
              retrieved_count: 23,
              reranked_count: 4,
              source_tickets: ["TK-1023", "TK-998", "TK-1056"],
              sources: [
                { ticket_id: "TK-1023", description: "Customer asked about warranty coverage", resolution: "Explained standard 12-month warranty terms" },
                { ticket_id: "TK-998", description: "Warranty claim question", resolution: "Provided coverage details and exclusions" },
                { ticket_id: "TK-1056", description: "Extended warranty inquiry", resolution: "Offered information about extended warranty options" }
              ]
            };

            function renderAnswer(payload, query = queryEl.value, remember = true) {
              const tickets = getTicketIds(payload);

              ticketCache = {};
              getSources(payload).forEach(t => {
                const id = getTicketId(t);
                if (!id) return;
                ticketCache[String(id)] = {
                  description: getTicketField(t, ['description', 'Ticket Description', 'summary', 'Summary']),
                  resolution: getTicketField(t, ['resolution', 'Resolution', 'answer', 'Answer'])
                };
              });

              currentSearch = normalizeSearch(query, payload);

              document.getElementById('answerText').textContent = payload.answer || 'No answer was returned for this query.';
              document.getElementById('answerNote').textContent = payload.note || 'Verify this draft before sending it to a customer.';
              document.getElementById('statRetrieved').textContent = payload.retrieved_count ?? '—';
              document.getElementById('statReranked').textContent = payload.reranked_count ?? '—';
              document.getElementById('statSources').textContent = tickets.length || '—';
              document.getElementById('sourceList').innerHTML = tickets.length
                ? tickets.map(id => \`<button type="button" class="source-ticket" data-ticket="\${escapeHtml(id)}" aria-expanded="false" aria-controls="ticketDetail">Ticket \${escapeHtml(id)}</button>\`).join('')
                : '<span class="source-ticket">None cited</span>';
              renderInsights(query, payload, tickets);
              exportCsvBtn.disabled = false;
              closeDetail();
              placeholder.style.display = 'none';
              shell.classList.add('visible');
              if (remember) saveRecentSearch(currentSearch);
            }

            let ticketCache = {};
            const detailEl = document.getElementById('ticketDetail');
            let openTicketId = null;

            function closeDetail() {
              openTicketId = null;
              detailEl.classList.remove('visible');
              detailEl.innerHTML = '';
              document.querySelectorAll('button.source-ticket').forEach(b => b.setAttribute('aria-expanded', 'false'));
            }

            function renderDetail(id, ticket) {
              const description = ticket?.description;
              const resolution = ticket?.resolution;
              detailEl.innerHTML = \`
                <div class="detail-head">
                  <span class="detail-id">Ticket \${escapeHtml(id)}</span>
                  <button type="button" class="detail-close" id="detailClose">Close</button>
                </div>
                <div class="detail-field">
                  <div class="detail-label">Description</div>
                  <div class="detail-value\${description ? '' : ' empty'}">\${escapeHtml(description || 'No description recorded.')}</div>
                </div>
                <div class="detail-field">
                  <div class="detail-label">Resolution</div>
                  <div class="detail-value\${resolution ? '' : ' empty'}">\${escapeHtml(resolution || 'No resolution recorded.')}</div>
                </div>\`;
              document.getElementById('detailClose').addEventListener('click', closeDetail);
            }

            document.getElementById('sourceList').addEventListener('click', event => {
              const chip = event.target.closest('button.source-ticket');
              if (!chip) return;
              const id = chip.dataset.ticket;
              if (openTicketId === id) { closeDetail(); return; }

              closeDetail();
              openTicketId = id;
              chip.setAttribute('aria-expanded', 'true');
              detailEl.classList.add('visible');

              const ticket = ticketCache[id];
              if (ticket) {
                renderDetail(id, ticket);
              } else {
                detailEl.innerHTML = '<div class="detail-status">Full text for this ticket was not included in the response.</div>';
              }
            });

            recentList.addEventListener('click', event => {
              const item = event.target.closest('.recent-item');
              if (!item) return;
              const recent = loadRecentSearches()[Number(item.dataset.recentIndex)];
              if (!recent) return;
              queryEl.value = recent.query;
              renderAnswer(recent.payload, recent.query, false);
              showToast('Recent search restored.');
            });

            exportCsvBtn.addEventListener('click', exportCurrentSearchCsv);

            copyAnswerBtn.addEventListener('click', async () => {
              const text = document.getElementById('answerText').textContent.trim();
              if (!text) { showToast('Run a search before copying.'); return; }
              try {
                await navigator.clipboard.writeText(text);
                showToast('Draft copied to clipboard.');
              } catch {
                const temp = document.createElement('textarea');
                temp.value = text;
                document.body.appendChild(temp);
                temp.select();
                document.execCommand('copy');
                temp.remove();
                showToast('Draft copied to clipboard.');
              }
            });

            async function draftAnswer(query) {
              const clean = query.trim();
              if (!clean) { showToast('Enter the customer issue first.'); return; }
              button.disabled = true; button.textContent = 'Drafting…';
              try {
                if (modeEl.value === 'api') {
                  const endpoint = document.getElementById('apiEndpoint').value.trim();
                  const apiKey = document.getElementById('apiKey').value.trim();
                  if (!endpoint) throw new Error('Add the POST endpoint first.');
                  if (!apiKey) throw new Error('Add your Supabase anon key first.');
                  const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': apiKey,
                      'Authorization': \`Bearer \${apiKey}\`
                    },
                    body: JSON.stringify({ query: clean })
                  });
                  if (response.status === 401) throw new Error('Rejected (401). Check that the anon key is complete and belongs to this project.');
                  if (!response.ok) throw new Error(\`Request failed (\${response.status}).\`);
                  const payload = await response.json();
                  if (payload.success === false || payload.error) throw new Error(payload.error || 'The search service returned an error.');
                  renderAnswer(payload, clean);
                } else {
                  await new Promise(r => setTimeout(r, 300));
                  renderAnswer(sampleResponse, clean);
                }
              } catch (error) {
                showToast(error.message || 'Could not draft an answer.');
              } finally {
                button.disabled = false; button.textContent = 'Draft answer';
              }
            }

            document.getElementById('searchForm').addEventListener('submit', e => { e.preventDefault(); draftAnswer(queryEl.value); });
            modeEl.addEventListener('change', () => apiPanel.classList.toggle('visible', modeEl.value === 'api'));
            renderRecentSearches();

            function showToast(message) {
              let toast = document.getElementById('toast');
              if (!toast) {
                toast = document.createElement('div');
                toast.id = 'toast';
                Object.assign(toast.style, { position:'fixed', left:'50%', transform:'translateX(-50%)', bottom:'24px', zIndex:20, maxWidth:'340px', padding:'12px 16px', border:'1px solid rgba(121,213,208,.32)', borderRadius:'11px', background:'#142538', color:'#eaf1f7', fontSize:'12px', lineHeight:'1.5', boxShadow:'0 14px 40px rgba(0,0,0,.35)' });
                document.body.appendChild(toast);
              }
              toast.textContent = message;
              clearTimeout(window.__toastTimer);
              window.__toastTimer = setTimeout(() => toast.remove(), 3400);
            }
          `}} />
        </body>
      </html>
    </div>
  );
}
