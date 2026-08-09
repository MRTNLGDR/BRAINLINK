type LocalDocument = {
  id: string;
  title: string;
  content: string;
};

type IndexedChunk = {
  id: string;
  docId: string;
  title: string;
  text: string;
  terms: string[];
  frequencies: Record<string, number>;
};

type WorkerRequest = {
  id: string;
  type: 'index' | 'query';
  payload: unknown;
};

let chunks: IndexedChunk[] = [];
let documentFrequency = new Map<string, number>();
let averageLength = 1;

const tokenize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(term => term.length > 1);

const splitDocument = (document: LocalDocument) => {
  const paragraphs = document.content
    .split(/\n{2,}/)
    .map(value => value.trim())
    .filter(Boolean);
  const output: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length > 900) {
      output.push(current);
      current = current.slice(-140) + '\n' + paragraph;
    } else {
      current = current ? current + '\n' + paragraph : paragraph;
    }
  }
  if (current) output.push(current);
  if (!output.length && document.title) output.push(document.title);
  return output;
};

const indexDocuments = (documents: LocalDocument[]) => {
  chunks = documents.flatMap(document =>
    splitDocument(document).map((text, index) => {
      const terms = tokenize(document.title + ' ' + text);
      const frequencies: Record<string, number> = {};
      for (const term of terms) frequencies[term] = (frequencies[term] ?? 0) + 1;
      return {
        id: document.id + ':' + index,
        docId: document.id,
        title: document.title,
        text,
        terms,
        frequencies,
      };
    })
  );

  documentFrequency = new Map();
  for (const chunk of chunks) {
    for (const term of new Set(chunk.terms)) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }
  averageLength = chunks.length
    ? chunks.reduce((total, chunk) => total + chunk.terms.length, 0) /
      chunks.length
    : 1;

  return {
    documents: documents.length,
    chunks: chunks.length,
    terms: documentFrequency.size,
  };
};

const queryIndex = (query: string, limit = 6) => {
  const terms = [...new Set(tokenize(query))];
  const totalChunks = Math.max(chunks.length, 1);
  const k1 = 1.5;
  const b = 0.75;

  const results = chunks
    .map(chunk => {
      let score = 0;
      for (const term of terms) {
        const frequency = chunk.frequencies[term] ?? 0;
        if (!frequency) continue;
        const frequencyInDocuments = documentFrequency.get(term) ?? 0;
        const inverseDocumentFrequency = Math.log(
          1 +
            (totalChunks - frequencyInDocuments + 0.5) /
              (frequencyInDocuments + 0.5)
        );
        const denominator =
          frequency +
          k1 * (1 - b + b * (chunk.terms.length / averageLength));
        score +=
          inverseDocumentFrequency *
          ((frequency * (k1 + 1)) / denominator);
      }
      if (chunk.title.toLowerCase().includes(query.toLowerCase())) score += 3;
      return { ...chunk, score };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ terms: _terms, frequencies: _frequencies, ...result }) => result);

  const fallback = results.length ? results : chunks.slice(0, Math.min(3, limit));
  const answer = fallback.length
    ? [
        'Local Worker Pro found the following evidence in this workspace:',
        '',
        ...fallback.map(
          (result, index) =>
            String(index + 1) +
            '. [' +
            result.title +
            '] ' +
            result.text.replace(/\s+/g, ' ').slice(0, 420)
        ),
        '',
        'This is an extractive local result. Start Ollama or LM Studio for a generated synthesis.',
      ].join('\n')
    : 'No indexed document contains enough local evidence to answer this question.';

  return { results: fallback, answer };
};

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;
  try {
    const result =
      type === 'index'
        ? indexDocuments(payload as LocalDocument[])
        : queryIndex(
            (payload as { query: string; limit?: number }).query,
            (payload as { query: string; limit?: number }).limit
          );
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
