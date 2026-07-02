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
    className={cn('object-contain', className)}
  />
);

export default Logo;
