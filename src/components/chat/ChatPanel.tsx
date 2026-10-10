import { Dispatch, FormEvent, SetStateAction, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, X } from 'lucide-react';
import { useSalon } from '@/context/SalonContext';
import { GREETING, KNOWLEDGE, STARTERS, type ChatLink } from '@/config/chatbot';
import { SITE } from '@/config/site';
import { reply, starterAnswer, type ChatReply } from '@/lib/chatbot';
import { cn } from '@/lib/utils';

export type ChatMessage =
  | { id: number; from: 'user'; text: string }
  | ({ id: number; from: 'bot' } & Omit<ChatReply, 'source'>);

const labelFor = (id: string) => KNOWLEDGE.find(e => e.id === id)?.label ?? id;
const REPLY_DELAY = 350;

const AnswerLink = ({ link, onNavigate }: { link: ChatLink; onNavigate: () => void }) => {
  const className = 'inline-flex min-h-9 items-center border border-primary/40 px-3 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors';
  return link.to.startsWith('/')
    ? <Link to={link.to} onClick={onNavigate} className={className}>{link.label}</Link>
    : <a href={link.to} className={className}>{link.label}</a>;
};

const ChatPanel = ({ messages, setMessages, onClose }: {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  onClose: () => void;
}) => {
  const { services, deals, loading } = useSalon();
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const nextId = useRef(messages.length + 1);

  const data = { services, deals, loading };
  const shown: ChatMessage[] = messages.length ? messages : [{ id: 0, from: 'bot', text: GREETING, suggestions: STARTERS }];

  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const ask = (text: string, answer: () => ChatReply | null) => {
    const base = messages.length ? messages : shown;
    setMessages([...base, { id: nextId.current++, from: 'user', text }]);
    setTyping(true);
    window.setTimeout(() => {
      const { source: _source, ...result } = answer() ?? reply(text, data);
      setMessages(m => [...m, { id: nextId.current++, from: 'bot', ...result }]);
      setTyping(false);
    }, REPLY_DELAY);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || typing) return;
    setDraft('');
    ask(text, () => reply(text, data));
  };

  const pick = (id: string) => {
    if (typing) return;
    ask(labelFor(id), () => starterAnswer(id, data));
  };

  return (
    <div
      role="dialog"
      aria-label={`Chat with ${SITE.name}`}
      className="fixed inset-x-2 bottom-2 z-50 flex h-[min(600px,calc(100svh-1rem))] flex-col border bg-background shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px]"
    >
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="font-heading text-xl leading-none">{SITE.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">Instant answers about our services</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center text-muted-foreground hover:text-foreground" aria-label="Close chat">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div ref={log} role="log" aria-live="polite" className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {shown.map(m => (
          <div key={m.id} className={cn('flex flex-col gap-2', m.from === 'user' ? 'items-end' : 'items-start')}>
            <p
              className={cn(
                'max-w-[85%] whitespace-pre-line px-3.5 py-2.5 text-sm leading-relaxed',
                m.from === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
              )}
            >
              {m.text}
            </p>
            {m.from === 'bot' && m.links?.length ? (
              <div className="flex flex-wrap gap-2">
                {m.links.map(l => <AnswerLink key={l.to + l.label} link={l} onNavigate={onClose} />)}
              </div>
            ) : null}
            {m.from === 'bot' && m.suggestions?.length && m.id === shown[shown.length - 1].id ? (
              <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
                {m.suggestions.map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => pick(id)}
                    className="min-h-9 rounded-full border px-3 text-xs hover:border-primary hover:text-primary"
                  >
                    {labelFor(id)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        {typing && (
          <p className="inline-flex gap-1 bg-muted px-3.5 py-3" aria-label="Typing">
            {[0, 1, 2].map(i => (
              <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </p>
        )}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t p-3">
        <label htmlFor="chat-input" className="sr-only">Your question</label>
        <input
          id="chat-input"
          ref={input}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="e.g. bridal makeup price"
          autoComplete="off"
          maxLength={200}
          className="h-11 flex-1 border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button type="submit" disabled={!draft.trim() || typing} className="grid h-11 w-11 place-items-center bg-primary text-primary-foreground disabled:opacity-50" aria-label="Send">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
