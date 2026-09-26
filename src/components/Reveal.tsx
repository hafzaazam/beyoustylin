import { CSSProperties, ElementType, ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Fades and lifts its children in the first time they scroll into view.
 * Content is visible straight away when motion is reduced, or when the
 * browser has no IntersectionObserver (tests, very old browsers), so nothing
 * can end up stuck invisible.
 */
const Reveal = ({ as: Tag = 'div', children, className, delay = 0, style, ...rest }: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  /** Milliseconds; use small steps (60–120) to stagger items in a grid. */
  delay?: number;
}) => {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(
    () => typeof window === 'undefined'
      || !('IntersectionObserver' in window)
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (shown || !ref.current) return;
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        setShown(true);
        io.disconnect();
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [shown]);

  return (
    <Tag
      {...rest}
      ref={ref}
      style={delay ? { ...style, transitionDelay: `${delay}ms` } : style}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none',
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        className,
      )}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
