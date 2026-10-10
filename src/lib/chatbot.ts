import {
  ChatAnswer, ChatData, FALLBACK, GREETING, GREETING_WORDS, KNOWLEDGE, KnowledgeEntry,
  STARTERS, STOPWORDS, SYNONYMS, THANKS_WORDS,
} from '@/config/chatbot';
import { formatDuration, formatPKR } from '@/lib/format';
import type { Service } from '@/types/salon';

/**
 * Rule-based answer engine for the website assistant. No AI and no network:
 * it scores the visitor's words against the knowledge in config/chatbot.ts
 * and the live service menu, so it can only ever repeat facts the salon
 * published.
 */

export type ChatReply = ChatAnswer & {
  /** Knowledge entry ids to offer as follow-up chips. */
  suggestions?: string[];
  /** What produced the reply; used by tests and handy when debugging. */
  source: string;
};

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9؀-ۿ]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

const canonical = (word: string) => SYNONYMS[word] ?? word;

/** Meaningful words, with synonyms folded onto one spelling. */
export const tokenize = (text: string) =>
  words(text).filter(w => !STOPWORDS.has(w)).map(canonical);

const levenshtein = (a: string, b: string) => {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
};

const singular = (w: string) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w);

/** Same word, allowing plurals and a small typo in longer words. */
const same = (a: string, b: string) => {
  if (a === b || singular(a) === singular(b)) return true;
  const len = Math.min(a.length, b.length);
  if (len < 4) return false;
  return levenshtein(a, b) <= (len >= 7 ? 2 : 1);
};

const has = (tokens: string[], word: string) => tokens.some(t => same(t, word));

// "price" and "book" (appointment) appear in many questions, so on their own
// they should not outweigh a more specific word like "bridal" or "reschedule".
const weight = (word: string) => (word === 'price' || word === 'book' ? 0.6 : 1);

/** Strongest matching keyword, plus a little for each further match. */
const scoreEntry = (entry: KnowledgeEntry, tokens: string[]) => {
  const scores = entry.keywords.flatMap(keyword => {
    const parts = tokenize(keyword);
    if (!parts.length || !parts.every(p => has(tokens, p))) return [];
    const base = parts.reduce((sum, p) => sum + weight(p), 0);
    return [parts.length > 1 ? base * 1.5 : base];
  });
  return scores.length ? Math.max(...scores) + 0.1 * (scores.length - 1) : 0;
};

/** Words that describe a kind of question rather than a particular service. */
const GENERIC = new Set(['price', 'book', 'bridal', 'mehndi', 'package', 'hours', 'location', 'contact', 'service', 'services']);

const matchServices = (services: Service[], tokens: string[]) =>
  services
    .map(service => {
      const name = tokenize(service.name);
      const hits = name.filter(w => has(tokens, w));
      const specific = hits.filter(w => !GENERIC.has(w));
      const score = name.length ? hits.length / name.length : 0;
      return { service, score: specific.length || score === 1 ? score : 0 };
    })
    .filter(m => m.score >= 0.5)
    .sort((a, b) => b.score - a.score);

const describeServices = (list: Service[], intro?: string): ChatAnswer => {
  if (list.length === 1) {
    const s = list[0];
    return {
      text: `${s.name}: ${formatPKR(s.price)}, takes about ${formatDuration(s.duration)}.${s.description ? `\n\n${s.description}` : ''}`,
      links: [{ label: 'Book this', to: `/?service=${s.id}#book` }, { label: 'Details', to: `/services/${s.id}` }],
    };
  }
  const lines = list.slice(0, 6).map(s => `• ${s.name}: ${formatPKR(s.price)} (${formatDuration(s.duration)})`);
  return {
    text: `${intro ?? 'Here’s what I found:'}\n${lines.join('\n')}`,
    links: [{ label: 'Full price list', to: '/services' }, { label: 'Book appointment', to: '/#book' }],
  };
};

const resolve = (entry: KnowledgeEntry, data: ChatData): ChatAnswer =>
  typeof entry.answer === 'function' ? entry.answer(data) : entry.answer;

const byId = (id: string) => KNOWLEDGE.find(e => e.id === id);

export const starterAnswer = (id: string, data: ChatData): ChatReply | null => {
  const entry = byId(id);
  return entry ? { ...resolve(entry, data), source: entry.id } : null;
};

export function reply(question: string, data: ChatData): ChatReply {
  const raw = words(question);
  const tokens = tokenize(question);

  if (!raw.length) return { text: GREETING, suggestions: STARTERS, source: 'empty' };
  if (raw.every(w => GREETING_WORDS.includes(w) || STOPWORDS.has(w))) {
    return { text: GREETING, suggestions: STARTERS, source: 'greeting' };
  }
  if (raw.every(w => THANKS_WORDS.includes(w) || GREETING_WORDS.includes(w) || STOPWORDS.has(w))) {
    return { text: 'You’re welcome! Anything else I can help with?', suggestions: ['book', 'prices'], source: 'thanks' };
  }

  const active = data.services.filter(s => s.status === 'active');
  const services = matchServices(active, tokens);
  const ranked = KNOWLEDGE
    .map(entry => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];

  // A named service answers questions about itself (price, booking), but not
  // "can I cancel my facial", which belongs to the cancellation answer.
  const aboutService = !best || best.score < 1 || ['prices', 'packages', 'mehndi', 'book'].includes(best.entry.id);

  // 1. A service named in full ("facial", "party makeup price").
  const exact = services.filter(m => m.score === 1).map(m => m.service);
  if (exact.length && aboutService) return { ...describeServices(exact), source: 'service' };

  // 2. A whole category ("hair", "skin care prices").
  const categories = [...new Set(active.map(s => s.category))];
  const category = categories.find(c => tokenize(c).some(w => !GENERIC.has(w) && has(tokens, w)));
  if (category && aboutService) {
    const list = active.filter(s => s.category === category);
    return { ...describeServices(list, `Our ${category.toLowerCase()} services:`), source: `category:${category}` };
  }

  // 3. A question from the knowledge file.
  if (best && best.score >= 0.6) {
    return {
      ...resolve(best.entry, data),
      suggestions: ranked.slice(1, 3).map(r => r.entry.id),
      source: best.entry.id,
    };
  }

  // 4. A service named in part ("keratin" for "Keratin Treatment").
  if (services.length && aboutService) return { ...describeServices(services.map(m => m.service)), source: 'service-partial' };

  return { ...FALLBACK, suggestions: STARTERS.slice(0, 4), source: 'fallback' };
}
