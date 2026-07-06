import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface Props {
  className?: string;
}

const ThemeToggle = ({ className = '' }: Props) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current = mounted ? (resolvedTheme || theme) : 'light';
  const isDark = current === 'dark';

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full border border-primary/20 bg-card/70 text-foreground hover:bg-primary/10 hover:text-primary transition-colors backdrop-blur-sm ${className}`}
    >
      <Sun className={`w-4 h-4 transition-all ${isDark ? 'scale-0 -rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'}`} />
      <Moon className={`w-4 h-4 absolute transition-all ${isDark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-90 opacity-0'}`} />
    </button>
  );
};

export default ThemeToggle;
