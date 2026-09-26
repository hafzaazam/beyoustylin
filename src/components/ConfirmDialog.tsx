import { useState, ReactNode } from 'react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<unknown> | unknown;
}

/**
 * Promise-free confirm dialog: `const { confirm, dialog } = useConfirm();`
 * render `{dialog}` once and call `confirm({...})` from any handler.
 */
export const useConfirm = () => {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = useState(false);

  const dialog = (
    <AlertDialog open={!!opts} onOpenChange={o => { if (!o && !busy) setOpts(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{opts?.title}</AlertDialogTitle>
          {opts?.description && <AlertDialogDescription>{opts.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className={opts?.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            onClick={async e => {
              e.preventDefault();
              if (!opts) return;
              setBusy(true);
              try { await opts.onConfirm(); } finally { setBusy(false); setOpts(null); }
            }}
          >
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {opts?.confirmLabel ?? 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm: setOpts, dialog };
};
