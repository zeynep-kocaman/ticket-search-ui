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
            .answer-text { font-size: 16px; line-height: 1.7; }
            .answer-note { display: flex; gap: 9px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--line); color: var(--muted); font-size: 11px; line-height: 1.55; }
            .answer-note i { font-style: normal; color: var(--orange); }

            .meta-row { display: flex; flex-wrap: wrap; gap: 10px 26px; align-items: baseline; margin-top: 18px; padding: 14px 2px 0; border-top: 1px solid var(--line); }
            .meta { color: var(--subtle); font-size: 10px; text-transform: uppercase; letter-spacing: .12em; }
            .meta b { color: var(--ink); font-size: 15px; letter-spacing: -.01em; margin-right: 6px; font-weight: 650; }

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

            <div id="placeholder" style={{ marginTop: '40px' }}>
              <p style={{ color: 'var(--subtle)', fontSize: '13px', lineHeight: 1.6 }}>
                Enter a support issue above to generate an answer draft. Results will appear here with relevant ticket citations.
              </p>
            </div>

            <div id="answerShell" className="answer-shell">
              <div className="answer-panel">
                <div className="answer-header">
                  <div className="answer-title">Draft</div>
                  <span className="answer-badge">Generated Answer</span>
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

            function renderAnswer(payload) {
              const tickets = Array.isArray(payload.source_tickets) ? payload.source_tickets : [];

              ticketCache = {};
              (Array.isArray(payload.sources) ? payload.sources : []).forEach(t => {
                ticketCache[String(t.ticket_id ?? t.id)] = {
                  description: t.description ?? t['Ticket Description'] ?? null,
                  resolution: t.resolution ?? t['Resolution'] ?? null
                };
              });

              document.getElementById('answerText').textContent = payload.answer || 'No answer was returned for this query.';
              document.getElementById('answerNote').textContent = payload.note || 'Verify this draft before sending it to a customer.';
              document.getElementById('statRetrieved').textContent = payload.retrieved_count ?? '—';
              document.getElementById('statReranked').textContent = payload.reranked_count ?? '—';
              document.getElementById('statSources').textContent = tickets.length || '—';
              document.getElementById('sourceList').innerHTML = tickets.length
                ? tickets.map(id => \`<button type="button" class="source-ticket" data-ticket="\${escapeHtml(id)}" aria-expanded="false" aria-controls="ticketDetail">Ticket \${escapeHtml(id)}</button>\`).join('')
                : '<span class="source-ticket">None cited</span>';
              closeDetail();
              placeholder.style.display = 'none';
              shell.classList.add('visible');
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
                  renderAnswer(payload);
                } else {
                  await new Promise(r => setTimeout(r, 300));
                  renderAnswer(sampleResponse);
                }
              } catch (error) {
                showToast(error.message || 'Could not draft an answer.');
              } finally {
                button.disabled = false; button.textContent = 'Draft answer';
              }
            }

            document.getElementById('searchForm').addEventListener('submit', e => { e.preventDefault(); draftAnswer(queryEl.value); });
            modeEl.addEventListener('change', () => apiPanel.classList.toggle('visible', modeEl.value === 'api'));

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
