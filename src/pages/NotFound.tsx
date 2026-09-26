import { Link } from 'react-router-dom';
import PublicLayout from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks/usePageTitle';

const NotFound = () => {
  usePageTitle('Page not found');

  return (
    <PublicLayout>
      <section className="py-32 px-4 lg:px-8 text-center">
        <div className="max-w-lg mx-auto">
          <p className="text-[10px] uppercase tracking-[0.4em] text-primary/80 mb-6 font-medium">Error 404</p>
          <h1 className="font-heading text-5xl md:text-6xl font-light tracking-tight mb-4">
            This page has <span className="italic text-primary/80">slipped away.</span>
          </h1>
          <p className="text-muted-foreground mb-10 font-light leading-relaxed">
            The page you were looking for doesn't exist or has moved.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/"><Button className="rounded-none px-8 text-xs uppercase tracking-[0.2em]">Back to home</Button></Link>
            <Link to="/services"><Button variant="outline" className="rounded-none px-8 text-xs uppercase tracking-[0.2em]">Browse services</Button></Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};

export default NotFound;
