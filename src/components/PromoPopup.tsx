import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { PROMO } from '@/config/promo';

const storageKey = `promo-dismissed:${PROMO.id}`;

/** True if the visitor closed this campaign within the snooze window. */
const recentlyDismissed = () => {
  try {
    const at = Number(localStorage.getItem(storageKey));
    return at > 0 && Date.now() - at < PROMO.snoozeDays * 86_400_000;
  } catch {
    return false; // storage blocked: fall back to once per page load
  }
};

const remember = () => {
  try { localStorage.setItem(storageKey, String(Date.now())); } catch { /* private mode */ }
};

/**
 * Campaign popup for the public site. Opens after a delay or halfway down the
 * page, once per visitor per snooze window, and never for signed-in staff.
 */
const PromoPopup = () => {
  const { pathname } = useLocation();
  const { isStaff } = useAuth();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  const eligible = PROMO.enabled && !isStaff && !done && !(PROMO.hideOn as readonly string[]).includes(pathname);

  useEffect(() => {
    if (!eligible || recentlyDismissed()) return;
    const show = () => setOpen(true);
    const timer = window.setTimeout(show, PROMO.delayMs);
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max > 0.5) show();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [eligible]);

  const close = () => {
    remember();
    setDone(true);
    setOpen(false);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO.code);
      toast.success('Code copied');
    } catch {
      toast.info(`Your code: ${PROMO.code}`);
    }
  };

  if (!eligible) return null;

  return (
    <Dialog open={open} onOpenChange={o => (o ? setOpen(true) : close())}>
      <DialogContent className="max-w-md rounded-none border-border/60 p-0 overflow-hidden gap-0">
        <div className="h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" aria-hidden />
        <div className="p-8 sm:p-10 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80 mb-5 font-medium">{PROMO.eyebrow}</p>
          <DialogTitle className="font-heading text-3xl sm:text-4xl font-light tracking-tight leading-tight mb-4">
            {PROMO.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground font-light leading-relaxed">
            {PROMO.body}
          </DialogDescription>

          {PROMO.code && (
            <button
              type="button"
              onClick={copyCode}
              className="mt-6 inline-flex items-center gap-3 border border-dashed border-primary/50 px-5 py-2.5 font-mono text-sm tracking-widest hover:bg-muted/50 transition-colors"
              aria-label={`Copy code ${PROMO.code}`}
            >
              {PROMO.code}
              <Copy className="w-3.5 h-3.5 text-primary/80" strokeWidth={1.5} />
            </button>
          )}

          <div className="mt-8 flex flex-col gap-3">
            <Button asChild className="rounded-none text-[10px] uppercase tracking-[0.2em] h-11">
              <Link to={PROMO.ctaHref} onClick={close}>{PROMO.ctaLabel}</Link>
            </Button>
            <button
              type="button"
              onClick={close}
              className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromoPopup;
