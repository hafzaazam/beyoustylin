import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight } from 'lucide-react';
import hand1 from '@/assets/mehndi-style-1.jpg';
import hand2 from '@/assets/mehndi-style-2.jpg';
import hand3 from '@/assets/mehndi-style-3.jpg';
import hand4 from '@/assets/mehndi-style-4.jpg';

gsap.registerPlugin(ScrollTrigger);

const GOLD = '#c9a24a';
const GOLD_SOFT = '#f1dfa4';

const hands = [
  { src: hand1, alt: 'Bridal mehndi on both hands' },
  { src: hand2, alt: 'Fine Arabic mehndi design' },
  { src: hand3, alt: 'Floral mehndi on the back of the hand' },
  { src: hand4, alt: 'Detailed full-hand mehndi' },
];

const around = (count: number) => Array.from({ length: count }, (_, i) => (360 / count) * i);

const polar = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [+(r * Math.cos(a)).toFixed(2), +(r * Math.sin(a)).toFixed(2)];
};

// Scalloped ring: a run of shallow arcs between two radii.
const scallops = (r: number, peak: number, count: number) => {
  const step = 360 / count;
  return around(count).map(a => {
    const [x1, y1] = polar(r, a);
    const [cx, cy] = polar(peak, a + step / 2);
    const [x2, y2] = polar(r, a + step);
    return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
  });
};

/**
 * Mandala in the style of a henna centrepiece. Paths are listed centre-out
 * so drawing them in DOM order looks like a cone working outwards.
 */
const MehndiMandala = () => (
  <svg viewBox="-200 -200 400 400" className="h-full w-full" fill="none" stroke={GOLD} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle className="mh-stroke" r="8" strokeWidth="1.5" />
    <circle className="mh-stroke" r="16" strokeWidth="1" />
    {around(8).map(a => (
      <g key={`p1-${a}`} transform={`rotate(${a})`}>
        <path className="mh-stroke" strokeWidth="1.4" d="M0,-20 C11,-36 11,-52 0,-68 C-11,-52 -11,-36 0,-20Z" />
        <path className="mh-stroke" strokeWidth="0.8" d="M0,-28 L0,-58" />
      </g>
    ))}
    <circle className="mh-stroke" r="76" strokeWidth="1.2" />
    <circle className="mh-stroke" r="80" strokeWidth="0.6" />
    {around(16).map(a => (
      <path key={`p2-${a}`} transform={`rotate(${a + 11.25})`} className="mh-stroke" strokeWidth="1.1" d="M0,-84 C6,-93 6,-101 0,-112 C-6,-101 -6,-93 0,-84Z" />
    ))}
    {scallops(116, 132, 24).map(d => <path key={d} className="mh-stroke" strokeWidth="1.2" d={d} />)}
    {around(24).map(a => {
      const [x, y] = polar(140, a + 7.5);
      return <circle key={`d-${a}`} className="mh-dot" cx={x} cy={y} r="2.6" fill={GOLD_SOFT} stroke="none" />;
    })}
    {around(12).map(a => (
      <g key={`p3-${a}`} transform={`rotate(${a})`}>
        <path className="mh-stroke" strokeWidth="1.4" d="M0,-148 C20,-162 22,-178 0,-196 C-22,-178 -20,-162 0,-148Z" />
        <path className="mh-stroke" strokeWidth="0.8" d="M0,-156 C8,-166 8,-176 0,-186" />
        <path className="mh-stroke" strokeWidth="0.8" d="M0,-156 C-8,-166 -8,-176 0,-186" />
      </g>
    ))}
    {around(12).map(a => (
      <path key={`v-${a}`} transform={`rotate(${a + 15})`} className="mh-stroke" strokeWidth="0.9" d="M0,-150 C6,-158 2,-166 -4,-170 C-8,-172 -10,-168 -7,-165" />
    ))}
  </svg>
);

/**
 * Pinned scroll scene: a gold mandala draws itself, then fades back as real
 * mehndi hands rise in. The markup's resting state is the finished scene, so
 * visitors with reduced motion (or no JS) see the design and photos as-is.
 */
const MehndiScrollStory = ({ id }: { id?: string }) => {
  const root = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      { motion: '(prefers-reduced-motion: no-preference)', mobile: '(max-width: 767px)' },
      ctx => {
        const { motion, mobile } = ctx.conditions as { motion: boolean; mobile: boolean };
        if (!motion || !root.current) return;
        const q = gsap.utils.selector(root);

        const strokes = gsap.utils.toArray<SVGGeometryElement>('.mh-stroke', root.current);
        strokes.forEach(el => {
          const len = el.getTotalLength();
          gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
        });
        gsap.set(q('.mh-art'), { opacity: 1, scale: 1 });

        gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: mobile ? '+=100%' : '+=150%',
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
          },
        })
          .to(strokes, { strokeDashoffset: 0, duration: 1, stagger: { amount: 3 } })
          .from(q('.mh-dot'), { scale: 0, transformOrigin: '50% 50%', duration: 0.4, stagger: { amount: 0.6 } }, '-=1')
          .to(q('.mh-art'), { opacity: 0.16, scale: 0.6, duration: 1.2, ease: 'power1.inOut' })
          .from(q('.mh-photo'), { opacity: 0, y: 80, scale: 0.9, duration: 1, stagger: 0.25, ease: 'power2.out' }, '<0.3')
          .from(q('.mh-copy > *'), { opacity: 0, y: 24, duration: 0.6, stagger: 0.15, ease: 'power2.out' }, '-=0.5');
      },
    );
    return () => mm.revert();
  }, []);

  return (
    <section
      ref={root}
      id={id}
      aria-label="Mehndi artistry"
      className="relative flex h-[100svh] min-h-[600px] flex-col items-center justify-center overflow-hidden px-4"
      style={{
        background:
          'radial-gradient(900px 500px at 50% 45%, rgba(201,162,74,0.16), transparent 65%), linear-gradient(180deg, #0b1a12 0%, #12241a 55%, #0b1a12 100%)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="mh-art h-[min(84vw,84vh)] w-[min(84vw,84vh)]" style={{ opacity: 0.16, transform: 'scale(0.6)' }}>
          <MehndiMandala />
        </div>
      </div>

      <div className="mh-copy relative z-10 mb-8 text-center md:mb-12">
        <p className="font-montserrat text-[11px] uppercase tracking-[0.3em]" style={{ color: GOLD }}>Mehndi by BeYou</p>
        <h2 className="mt-3 font-heading text-4xl italic md:text-6xl" style={{ color: GOLD_SOFT }}>Mehndi that tells a story</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/70 md:text-base">
          Bridal, Arabic and party designs, drawn by hand with natural henna.
        </p>
      </div>

      <div className="relative z-10 grid w-full max-w-xs items-start grid-cols-2 gap-3 md:max-w-4xl md:grid-cols-4 md:gap-5">
        {hands.map((h, i) => (
          <div
            key={h.src}
            className={`mh-photo overflow-hidden rounded-2xl ${i % 2 ? 'md:mt-8' : ''}`}
            style={{
              border: '1px solid rgba(201,162,74,0.5)',
              boxShadow: '0 20px 50px -20px rgba(0,0,0,0.6)',
            }}
          >
            <img src={h.src} alt={h.alt} loading="lazy" className="aspect-square w-full object-cover md:aspect-[3/4]" />
          </div>
        ))}
      </div>

      <div className="mh-copy relative z-10 mt-8 md:mt-12">
        <Link
          to="/mehndi"
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-7 py-3 text-xs uppercase tracking-[0.2em]"
          style={{ background: GOLD, color: '#12241a' }}
        >
          Explore Mehndi <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
};

export default MehndiScrollStory;
