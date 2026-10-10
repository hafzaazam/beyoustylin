import { lazy, Suspense, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { ChatMessage } from './ChatPanel';

const ChatPanel = lazy(() => import('./ChatPanel'));

/** Routes where the assistant would get in the way. */
const HIDDEN = [/^\/admin/, /^\/auth/, /^\/reset-password/];

/**
 * Floating "Ask us" button for the public site. The panel and its answer
 * engine load on first open, so visitors who never chat download nothing.
 * The conversation lives here so it survives closing and reopening.
 */
const ChatWidget = () => {
  const { pathname } = useLocation();
  const { isStaff } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const launcher = useRef<HTMLButtonElement>(null);

  if (isStaff || HIDDEN.some(r => r.test(pathname))) return null;

  const close = () => {
    setOpen(false);
    launcher.current?.focus();
  };

  return (
    <>
      {open && (
        <Suspense fallback={null}>
          <ChatPanel messages={messages} setMessages={setMessages} onClose={close} />
        </Suspense>
      )}
      {!open && (
        <button
          ref={launcher}
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none sm:bottom-6 sm:right-6"
          aria-haspopup="dialog"
        >
          <MessageCircle className="h-5 w-5" aria-hidden />
          <span>Ask us</span>
        </button>
      )}
    </>
  );
};

export default ChatWidget;
