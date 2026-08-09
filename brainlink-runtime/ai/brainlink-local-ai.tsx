import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
} from '@affine/core/modules/workbench';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { useService } from '@toeverything/infra';
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type ProviderKind = 'worker' | 'ollama' | 'lmstudio' | 'openai-compatible';

type ProviderConfig = {
  kind: ProviderKind;
  endpoint: string;
  model: string;
  allowExternal: boolean;
};

type Source = {
  id: string;
  docId: string;
  title: string;
  text: string;
  score: number;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  sources?: Source[];
  engine?: string;
};

type IndexStats = {
  documents: number;
  chunks: number;
  terms: number;
};

const CONFIG_KEY = 'brainlink:ai:provider:v1';
const defaultConfig: ProviderConfig = {
  kind: 'ollama',
  endpoint: 'http://127.0.0.1:11434',
  model: 'qwen2.5:7b',
  allowExternal: false,
};

const styles = `
  .bl-ai-root, .bl-ai-root * { box-sizing: border-box; }
  .bl-ai-root { width:100%;height:100%;min-height:0;display:flex;background:#121212;color:#ededed;font-family:var(--affine-font-family,"Segoe UI",sans-serif); }
  .bl-ai-header { width:100%;height:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 12px; }
  .bl-ai-header-copy { min-width:0;display:flex;align-items:center;gap:9px; }
  .bl-ai-header-copy strong { font-size:13px;font-weight:600; }
  .bl-ai-status { display:inline-flex;align-items:center;gap:6px;padding:4px 7px;border:1px solid #343434;border-radius:999px;color:#9b9b9b;font-size:9px;white-space:nowrap; }
  .bl-ai-status::before { content:'';width:6px;height:6px;border-radius:50%;background:#73cbaa; }
  .bl-ai-status[data-state="error"]::before { background:#e78686; }
  .bl-ai-header-actions { display:flex;gap:7px; }
  .bl-ai-button { min-height:31px;padding:6px 10px;color:#d2d2d2;background:#202020;border:1px solid #343434;border-radius:7px;font:inherit;font-size:11px;cursor:pointer; }
  .bl-ai-button:hover { background:#272727;color:#fff; }
  .bl-ai-button:disabled { opacity:.45;cursor:not-allowed; }
  .bl-ai-button[data-primary="true"] { color:#111815;background:#a8ddce;border-color:#a8ddce;font-weight:650; }
  .bl-ai-layout { width:100%;height:100%;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 296px; }
  .bl-ai-layout[data-settings="false"] { grid-template-columns:minmax(0,1fr); }
  .bl-ai-chat { min-width:0;min-height:0;display:flex;flex-direction:column;border-right:1px solid #2f2f2f; }
  .bl-ai-messages { flex:1;min-height:0;overflow:auto;padding:34px max(24px,calc((100% - 820px)/2)) 18px;scrollbar-width:thin; }
  .bl-ai-welcome { max-width:700px;margin:8vh auto 0;text-align:center; }
  .bl-ai-mark { width:44px;height:44px;margin:0 auto 17px;display:grid;place-items:center;border:1px solid #3e3e3e;border-radius:12px;background:#1b1b1b;font-size:12px;font-weight:750; }
  .bl-ai-welcome h1 { margin:0;font-size:28px;font-weight:620;letter-spacing:-.035em; }
  .bl-ai-welcome p { max-width:560px;margin:10px auto 24px;color:#8d8d8d;font-size:12px;line-height:1.65; }
  .bl-ai-suggestions { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;text-align:left; }
  .bl-ai-suggestion { padding:12px;color:#bbb;background:#181818;border:1px solid #303030;border-radius:9px;font:inherit;font-size:11px;line-height:1.45;cursor:pointer; }
  .bl-ai-suggestion:hover { color:#eee;background:#202020;border-color:#414141; }
  .bl-ai-message { max-width:820px;margin:0 auto 18px;display:grid;grid-template-columns:28px minmax(0,1fr);gap:11px; }
  .bl-ai-avatar { width:28px;height:28px;display:grid;place-items:center;border:1px solid #3b3b3b;border-radius:8px;color:#aaa;background:#1d1d1d;font-size:8px;font-weight:700; }
  .bl-ai-message[data-role="assistant"] .bl-ai-avatar { color:#8fd3bf; }
  .bl-ai-message-copy { min-width:0;padding-top:3px; }
  .bl-ai-message-meta { display:flex;align-items:center;gap:7px;margin-bottom:6px; }
  .bl-ai-message-meta strong { font-size:11px;font-weight:600; }
  .bl-ai-message-meta span { color:#727272;font-size:8px; }
  .bl-ai-message-text { color:#d4d4d4;font-size:12px;line-height:1.68;white-space:pre-wrap;word-break:break-word; }
  .bl-ai-sources { display:flex;flex-wrap:wrap;gap:6px;margin-top:10px; }
  .bl-ai-source { max-width:220px;padding:5px 7px;color:#999;background:#191919;border:1px solid #303030;border-radius:6px;font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
  .bl-ai-composer-wrap { padding:10px max(20px,calc((100% - 840px)/2)) 18px;background:linear-gradient(180deg,transparent,#121212 22%); }
  .bl-ai-composer { padding:10px;background:#1b1b1b;border:1px solid #373737;border-radius:11px;box-shadow:0 10px 30px rgba(0,0,0,.22); }
  .bl-ai-composer:focus-within { border-color:#505050; }
  .bl-ai-composer textarea { width:100%;min-height:48px;max-height:180px;padding:3px 4px;color:#eee;background:transparent;border:0;outline:0;resize:vertical;font:inherit;font-size:12px;line-height:1.55; }
  .bl-ai-composer-footer { display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px; }
  .bl-ai-engine { display:flex;align-items:center;gap:6px;color:#818181;font-size:9px; }
  .bl-ai-engine-dot { width:5px;height:5px;border-radius:50%;background:#73cbaa; }
  .bl-ai-settings { min-width:0;overflow:auto;padding:18px 14px;background:#151515; }
  .bl-ai-settings h2 { margin:0 0 4px;font-size:14px;font-weight:600; }
  .bl-ai-settings > p { margin:0 0 18px;color:#7f7f7f;font-size:10px;line-height:1.55; }
  .bl-ai-panel { margin-bottom:12px;padding:12px;background:#191919;border:1px solid #2e2e2e;border-radius:9px; }
  .bl-ai-panel h3 { margin:0 0 10px;color:#bbb;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em; }
  .bl-ai-field { display:block;margin-top:9px; }
  .bl-ai-field > span { display:block;margin-bottom:5px;color:#808080;font-size:9px; }
  .bl-ai-field input,.bl-ai-field select { width:100%;height:33px;padding:0 8px;color:#ddd;background:#131313;border:1px solid #333;border-radius:6px;outline:0;font:inherit;font-size:10px; }
  .bl-ai-field input:focus,.bl-ai-field select:focus { border-color:#505050; }
  .bl-ai-toggle { display:flex;align-items:flex-start;gap:8px;margin-top:10px;color:#aaa;font-size:9px;line-height:1.45; }
  .bl-ai-toggle input { margin:1px 0 0;accent-color:#83cdb8; }
  .bl-ai-metrics { display:grid;grid-template-columns:repeat(3,1fr);gap:5px; }
  .bl-ai-metric { padding:8px 4px;text-align:center;background:#141414;border-radius:6px; }
  .bl-ai-metric strong { display:block;font-size:15px;font-weight:600; }
  .bl-ai-metric span { display:block;margin-top:2px;color:#747474;font-size:8px; }
  .bl-ai-notice { margin-top:9px;padding:8px;color:#8f8f8f;background:#151515;border-radius:6px;font-size:9px;line-height:1.5; }
  .bl-ai-error { max-width:820px;margin:0 auto 12px;padding:9px 11px;color:#e9a0a0;background:rgba(231,134,134,.06);border:1px solid rgba(231,134,134,.2);border-radius:7px;font-size:10px; }
  @media(max-width:900px){.bl-ai-layout{grid-template-columns:minmax(0,1fr) 250px}.bl-ai-messages{padding-inline:20px}.bl-ai-composer-wrap{padding-inline:16px}}
  @media(max-width:680px){.bl-ai-layout,.bl-ai-layout[data-settings="false"]{display:block;overflow:auto}.bl-ai-chat{min-height:70vh}.bl-ai-settings{border-top:1px solid #303030}.bl-ai-suggestions{grid-template-columns:1fr}.bl-ai-header-copy .bl-ai-status{display:none}}
`;

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const readConfig = (): ProviderConfig => {
  try {
    return { ...defaultConfig, ...JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}') };
  } catch {
    return defaultConfig;
  }
};

const isLocalEndpoint = (value: string) => {
  try {
    const hostname = new URL(value).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
};

const providerLabel = (kind: ProviderKind) => ({
  worker: 'Local Worker Pro',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  'openai-compatible': 'OpenAI-compatible',
})[kind];

const endpointFor = (kind: ProviderKind) => {
  if (kind === 'ollama') return 'http://127.0.0.1:11434';
  if (kind === 'lmstudio') return 'http://127.0.0.1:1234/v1';
  if (kind === 'openai-compatible') return 'http://127.0.0.1:1234/v1';
  return '';
};

const modelFor = (kind: ProviderKind) => {
  if (kind === 'ollama') return 'qwen2.5:7b';
  if (kind === 'lmstudio') return 'local-model';
  if (kind === 'openai-compatible') return 'local-model';
  return 'bm25-extractive';
};

const readStreamLines = async (
  response: Response,
  onLine: (line: string) => void
) => {
  if (!response.body) throw new Error('Provider returned no response stream.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) onLine(line.trim());
  }
  if (buffer.trim()) onLine(buffer.trim());
};

export const BrainlinkLocalAI = () => {
  const workspaceService = useService(WorkspaceService);
  const docDisplayMetaService = useService(DocDisplayMetaService);
  const workspaceId = workspaceService.workspace.id;
  const messageKey = 'brainlink:ai:messages:' + workspaceId;
  const [config, setConfig] = useState<ProviderConfig>(readConfig);
  const [apiKey, setApiKey] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(messageKey) ?? '[]') as ChatMessage[];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [providerState, setProviderState] = useState<'ready' | 'checking' | 'error'>('ready');
  const [providerDetail, setProviderDetail] = useState('Local-first guard active');
  const [indexStats, setIndexStats] = useState<IndexStats>({ documents: 0, chunks: 0, terms: 0 });
  const [indexing, setIndexing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<string, { resolve: (value: any) => void; reject: (reason: Error) => void }>());
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const askWorker = useCallback((type: 'index' | 'query', payload: unknown) => {
    const worker = workerRef.current;
    if (!worker) return Promise.reject(new Error('Local Worker Pro is not ready.'));
    const id = makeId();
    return new Promise<any>((resolve, reject) => {
      pendingRef.current.set(id, { resolve, reject });
      worker.postMessage({ id, type, payload });
    });
  }, []);

  const reindex = useCallback(async () => {
    setIndexing(true);
    setError('');
    try {
      const handles = Array.from(workspaceService.workspace.docCollection.docs.values());
      const documents = handles.flatMap(handle => {
        const store = handle.getStore();
        if (!store) return [];
        store.load();
        const content = store
          .getAllModels()
          .flatMap(model => {
            const candidate = model as unknown as {
              text?: { toString?: () => string };
              title?: { toString?: () => string };
            };
            const values = [candidate.title?.toString?.(), candidate.text?.toString?.()];
            return values.filter((value): value is string => Boolean(value?.trim()));
          })
          .join('\n\n');
        const title = docDisplayMetaService.title$(store.id).value || 'Untitled';
        return [{ id: store.id, title, content: content || title }];
      });
      const stats = (await askWorker('index', documents)) as IndexStats;
      setIndexStats(stats);
      setProviderDetail(stats.documents + ' local documents indexed');
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : String(reason);
      if (detail !== 'Local Worker Pro stopped.') setError(detail);
    } finally {
      setIndexing(false);
    }
  }, [askWorker, docDisplayMetaService, workspaceService]);

  useEffect(() => {
    const worker = new Worker(new URL('./brainlink-local-worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = event => {
      const pending = pendingRef.current.get(event.data.id);
      if (!pending) return;
      pendingRef.current.delete(event.data.id);
      if (event.data.ok) pending.resolve(event.data.result);
      else pending.reject(new Error(event.data.error));
    };
    void reindex();
    return () => {
      worker.terminate();
      workerRef.current = null;
      for (const pending of pendingRef.current.values()) {
        pending.reject(new Error('Local Worker Pro stopped.'));
      }
      pendingRef.current.clear();
    };
  }, [reindex]);

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(messageKey, JSON.stringify(messages.slice(-80)));
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageKey, messages]);

  const sourceContext = (sources: Source[]) =>
    sources
      .map((source, index) => '[Source ' + (index + 1) + ': ' + source.title + ']\n' + source.text)
      .join('\n\n');

  const streamProvider = async (
    question: string,
    sources: Source[],
    onChunk: (chunk: string) => void,
    signal: AbortSignal
  ) => {
    if (!isLocalEndpoint(config.endpoint) && !config.allowExternal) {
      throw new Error('External provider blocked. Enable explicit external access first.');
    }
    const context = sourceContext(sources);
    const system = [
      'You are Brainlink Local AI running inside an AFFiNE workspace.',
      'Use only the supplied local documentation context for factual claims.',
      'Cite document titles in square brackets. Say when evidence is insufficient.',
      'Help improve documentation, summarize, find contradictions and propose actionable edits.',
      'Never claim that a remote action or document mutation occurred.',
    ].join(' ');
    const history = messages.slice(-8).map(message => ({ role: message.role, content: message.content }));
    const prompt = 'LOCAL WORKSPACE CONTEXT\n\n' + context + '\n\nUSER REQUEST\n' + question;
    const base = config.endpoint.replace(/\/$/, '');

    if (config.kind === 'ollama') {
      const response = await fetch(base + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          stream: true,
          messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: prompt }],
          options: { temperature: 0.2 },
        }),
        signal,
      });
      if (!response.ok) throw new Error('Ollama returned HTTP ' + response.status + '.');
      await readStreamLines(response, line => {
        if (!line) return;
        const packet = JSON.parse(line) as { message?: { content?: string }; error?: string };
        if (packet.error) throw new Error(packet.error);
        if (packet.message?.content) onChunk(packet.message.content);
      });
      return;
    }

    const response = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: 'Bearer ' + apiKey } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        stream: true,
        temperature: 0.2,
        messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: prompt }],
      }),
      signal,
    });
    if (!response.ok) throw new Error('Provider returned HTTP ' + response.status + '.');
    await readStreamLines(response, line => {
      if (!line.startsWith('data:')) return;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') return;
      const packet = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
      const content = packet.choices?.[0]?.delta?.content;
      if (content) onChunk(content);
    });
  };

  const send = useCallback(async (value?: string) => {
    const question = (value ?? input).trim();
    if (!question || busy) return;
    setInput('');
    setBusy(true);
    setError('');
    const userMessage: ChatMessage = { id: makeId(), role: 'user', content: question, createdAt: new Date().toISOString() };
    const assistantId = makeId();
    setMessages(previous => [...previous, userMessage, { id: assistantId, role: 'assistant', content: '', createdAt: new Date().toISOString(), engine: providerLabel(config.kind) }]);
    try {
      const retrieval = (await askWorker('query', { query: question, limit: 6 })) as { results: Source[]; answer: string };
      const updateAssistant = (content: string, append = true) => {
        setMessages(previous => previous.map(message => message.id === assistantId ? { ...message, content: append ? message.content + content : content, sources: retrieval.results } : message));
      };
      if (config.kind === 'worker') {
        updateAssistant(retrieval.answer, false);
      } else {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        try {
          await streamProvider(question, retrieval.results, chunk => updateAssistant(chunk), abortRef.current.signal);
        } catch (providerError) {
          const detail = providerError instanceof Error ? providerError.message : String(providerError);
          updateAssistant('Local inference provider unavailable: ' + detail + '\n\n' + retrieval.answer, false);
          setProviderState('error');
          setProviderDetail('Worker fallback active');
        }
      }
    } catch (reason) {
      const detail = reason instanceof Error ? reason.message : String(reason);
      setMessages(previous => previous.map(message => message.id === assistantId ? { ...message, content: 'Local AI failed safely: ' + detail } : message));
      setError(detail);
    } finally {
      setBusy(false);
    }
  }, [askWorker, busy, config, input, messages]);

  const testProvider = async () => {
    if (config.kind === 'worker') {
      setProviderState('ready');
      setProviderDetail(indexStats.chunks + ' local chunks ready');
      return;
    }
    if (!isLocalEndpoint(config.endpoint) && !config.allowExternal) {
      setProviderState('error');
      setProviderDetail('External endpoint blocked');
      return;
    }
    setProviderState('checking');
    setProviderDetail('Checking provider');
    try {
      const base = config.endpoint.replace(/\/$/, '');
      const url = config.kind === 'ollama' ? base + '/api/tags' : base + '/models';
      const response = await fetch(url, { headers: apiKey ? { Authorization: 'Bearer ' + apiKey } : {} });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      setProviderState('ready');
      setProviderDetail(providerLabel(config.kind) + ' connected');
    } catch (reason) {
      setProviderState('error');
      setProviderDetail(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const suggestions = useMemo(() => [
    'Summarize the important decisions in this workspace.',
    'Find contradictions or outdated information in the documentation.',
    'Propose a clearer structure for the current knowledge base.',
    'List open actions, owners and missing evidence.',
  ], []);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send();
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <>
      <style>{styles}</style>
      <ViewTitle title="Brainlink AI" />
      <ViewIcon icon="ai" />
      <ViewHeader>
        <div className="bl-ai-header">
          <div className="bl-ai-header-copy"><strong>Brainlink AI</strong><span className="bl-ai-status" data-state={providerState}>{providerDetail}</span></div>
          <div className="bl-ai-header-actions">
            <button className="bl-ai-button" onClick={() => void reindex()} disabled={indexing}>{indexing ? 'Indexing' : 'Reindex docs'}</button>
            <button className="bl-ai-button" onClick={() => setSettingsOpen(value => !value)}>{settingsOpen ? 'Hide providers' : 'Providers'}</button>
          </div>
        </div>
      </ViewHeader>
      <ViewBody>
        <div className="bl-ai-root">
          <div className="bl-ai-layout" data-settings={settingsOpen}>
            <section className="bl-ai-chat">
              <div className="bl-ai-messages">
                {messages.length === 0 ? <div className="bl-ai-welcome">
                  <div className="bl-ai-mark">BL</div>
                  <h1>Ask your workspace</h1>
                  <p>Local-first AI for AFFiNE documentation. Retrieval runs in a browser worker and only selected evidence is sent to the configured inference provider.</p>
                  <div className="bl-ai-suggestions">{suggestions.map(suggestion => <button className="bl-ai-suggestion" key={suggestion} onClick={() => void send(suggestion)}>{suggestion}</button>)}</div>
                </div> : messages.map(message => <article className="bl-ai-message" data-role={message.role} key={message.id}>
                  <div className="bl-ai-avatar">{message.role === 'assistant' ? 'BL' : 'YOU'}</div>
                  <div className="bl-ai-message-copy">
                    <div className="bl-ai-message-meta"><strong>{message.role === 'assistant' ? 'Brainlink AI' : 'You'}</strong><span>{message.engine ?? 'Local workspace'}</span></div>
                    <div className="bl-ai-message-text">{message.content || (busy ? 'Reading local documentation...' : '')}</div>
                    {message.sources?.length ? <div className="bl-ai-sources">{message.sources.map(source => <span className="bl-ai-source" key={source.id} title={source.text}>[{source.title}]</span>)}</div> : null}
                  </div>
                </article>)}
                {error ? <div className="bl-ai-error">{error}</div> : null}
                <div ref={bottomRef} />
              </div>
              <form className="bl-ai-composer-wrap" onSubmit={onSubmit}>
                <div className="bl-ai-composer">
                  <textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={onComposerKeyDown} placeholder="Ask about your documents, improve a page, or find missing evidence..." disabled={busy} />
                  <div className="bl-ai-composer-footer">
                    <span className="bl-ai-engine"><span className="bl-ai-engine-dot" />{providerLabel(config.kind)} / local retrieval</span>
                    <button className="bl-ai-button" data-primary="true" disabled={busy || !input.trim()}>{busy ? 'Working' : 'Send'}</button>
                  </div>
                </div>
              </form>
            </section>

            {settingsOpen ? <aside className="bl-ai-settings">
              <h2>AI providers</h2>
              <p>Local-first is enforced. Network access is limited to loopback endpoints unless explicitly unlocked.</p>
              <div className="bl-ai-panel">
                <h3>Inference</h3>
                <label className="bl-ai-field"><span>Provider</span><select value={config.kind} onChange={event => { const kind = event.target.value as ProviderKind; setConfig(previous => ({ ...previous, kind, endpoint: endpointFor(kind), model: modelFor(kind) })); }}><option value="worker">Local Worker Pro</option><option value="ollama">Ollama</option><option value="lmstudio">LM Studio</option><option value="openai-compatible">OpenAI-compatible</option></select></label>
                {config.kind !== 'worker' ? <><label className="bl-ai-field"><span>Endpoint</span><input value={config.endpoint} onChange={event => setConfig(previous => ({ ...previous, endpoint: event.target.value }))} /></label><label className="bl-ai-field"><span>Model</span><input value={config.model} onChange={event => setConfig(previous => ({ ...previous, model: event.target.value }))} /></label>{config.kind === 'openai-compatible' ? <label className="bl-ai-field"><span>Session API key, never persisted</span><input type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} autoComplete="off" /></label> : null}</> : null}
                <button className="bl-ai-button" style={{ marginTop: 10 }} onClick={() => void testProvider()}>Test provider</button>
                <label className="bl-ai-toggle"><input type="checkbox" checked={config.allowExternal} onChange={event => setConfig(previous => ({ ...previous, allowExternal: event.target.checked }))} /><span>Allow non-local endpoints. Document context can leave this device when enabled.</span></label>
              </div>
              <div className="bl-ai-panel">
                <h3>Local Worker Pro</h3>
                <div className="bl-ai-metrics"><div className="bl-ai-metric"><strong>{indexStats.documents}</strong><span>docs</span></div><div className="bl-ai-metric"><strong>{indexStats.chunks}</strong><span>chunks</span></div><div className="bl-ai-metric"><strong>{indexStats.terms}</strong><span>terms</span></div></div>
                <div className="bl-ai-notice">BM25 indexing and retrieval run inside a dedicated browser worker. Raw workspace documents are not uploaded for indexing.</div>
              </div>
              <div className="bl-ai-panel">
                <h3>AFFiNE provider</h3>
                <div className="bl-ai-notice">The original AFFiNE cloud AI remains available as an optional provider. It is never selected by default.</div>
                <button className="bl-ai-button" style={{ marginTop: 10 }} disabled={!config.allowExternal} onClick={() => { const url = new URL(window.location.href); url.searchParams.set('provider', 'affine-cloud'); window.location.assign(url); }}>Open AFFiNE Cloud AI</button>
              </div>
            </aside> : null}
          </div>
        </div>
      </ViewBody>
    </>
  );
};
