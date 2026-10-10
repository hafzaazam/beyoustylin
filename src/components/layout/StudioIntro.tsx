import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown } from 'lucide-react';
export default function StudioIntro({ title, children, image, imageAlt, target, action }: {
  title: ReactNode; children: ReactNode; image: string; imageAlt: string; target: string; action: string;
}) {
  return (
    <section className="studio-intro">
      <div className="studio-intro-copy">
        <Link to="/" className="studio-breadcrumb">BeYou Stylin /</Link>
        <h1>{title}</h1>
        <div className="studio-intro-description">{children}</div>
        <a href={target} className="studio-text-link">{action}<ArrowDown size={17} /></a>
      </div>
      <div className="studio-intro-image"><img src={image} alt={imageAlt} width={1600} height={1024} /></div>
    </section>
  );
}
