import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ADMIN_SHORTCUTS } from '@/hooks/useAdminShortcuts';

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Key = ({ children }: { children: string }) => (
  <kbd className="inline-flex min-w-[1.75rem] h-7 items-center justify-center rounded-md border border-border bg-muted px-1.5 font-sans text-xs font-semibold text-foreground shadow-[0_1px_0_hsl(var(--border))]">
    {children}
  </kbd>
);

const ShortcutsDialog = ({ open, onOpenChange }: ShortcutsDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="font-heading text-2xl">Keyboard shortcuts</DialogTitle>
        <DialogDescription>Work the front desk without the mouse. Letters are ignored while you type in a field.</DialogDescription>
      </DialogHeader>
      <dl className="divide-y divide-border">
        {ADMIN_SHORTCUTS.map(s => (
          <div key={s.label} className="flex items-center justify-between gap-4 py-2.5">
            <dt className="text-sm text-foreground">{s.label}</dt>
            <dd className="flex items-center gap-1 text-xs text-muted-foreground">
              {s.keys.map((k, i) => (
                <span key={k} className="flex items-center gap-1">
                  {i > 0 && <span>then</span>}
                  <Key>{k}</Key>
                </span>
              ))}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="text-sm text-foreground">Search (anywhere)</dt>
          <dd className="flex items-center gap-1"><Key>⌘</Key><Key>K</Key></dd>
        </div>
      </dl>
    </DialogContent>
  </Dialog>
);

export default ShortcutsDialog;
