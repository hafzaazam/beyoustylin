import { cn } from '@/lib/utils';
import brandLogo from '@/assets/logo.png';

interface LogoProps {
  className?: string;
  alt?: string;
}

/**
 * Reusable transparent BeYou Stylin brand logo.
 * Use `className` to control size (e.g. "h-10 w-auto" or "w-12 h-12").
 */
const Logo = ({ className, alt = 'BeYou Stylin' }: LogoProps) => (
  <img
    src={brandLogo}
    alt={alt}
    className={cn(
      'object-contain',
      // Ensure brand colors stay legible on dark backgrounds
      'dark:bg-white/95 dark:rounded-xl dark:p-1 dark:ring-1 dark:ring-primary/20',
      className,
    )}
  />
);

export default Logo;
