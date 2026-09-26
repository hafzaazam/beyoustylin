import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const EmptyState = ({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) => (
  <div className={`text-center py-14 px-6 border border-dashed rounded-2xl bg-card/60 ${className}`}>
    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
      <Icon className="w-5 h-5" />
    </div>
    <p className="font-heading text-lg font-semibold">{title}</p>
    {description && <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
