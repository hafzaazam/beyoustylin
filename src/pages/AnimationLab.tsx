import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { animate, motion, useInView, useMotionValue, useScroll, useTransform } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { RotateCcw } from 'lucide-react';
import MehndiScrollStory from '@/components/MehndiScrollStory';
import heroImg from '@/assets/hero-salon.jpg';
import mehndi1 from '@/assets/mehndi-1.jpg';
import mehndi2 from '@/assets/mehndi-2.jpg';
import mehndi3 from '@/assets/mehndi-3.jpg';

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Temporary playground comparing the animation libraries side by side.
 * Not linked from the site; open /animation-lab directly. Delete this file
 * and its route once we've picked a library.
 */

const services = [
  { name: 'Bridal Makeup', img: heroImg },
  { name: 'Party Mehndi', img: mehndi1 },
  { name: 'Hair Styling', img: mehndi2 },
  { name: 'Skin Glow Facial', img: mehndi3 },
];

const Section = ({ id, lib, install, children, onReplay }: {
  id: string;
  lib: string;
  install: string;
  children: ReactNode;
  onReplay?: () => void;
}) => (
  <section id={id} className="border-t border-border py-16 md:py-24">
    <div className="mx-auto max-w-5xl px-4">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-montserrat text-xs uppercase tracking-[0.25em] text-primary">{install}</p>
          <h2 className="mt-2 font-heading text-4xl md:text-5xl">{lib}</h2>
        </div>
        {onReplay && (
          <button
            onClick={onReplay}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
          >
            <RotateCcw className="h-4 w-4" /> Replay
          </button>
        )}
      </div>
      {children}
    </div>
  </section>
);

/* ---------------------------------------------------------------- Motion */

const Counter = ({ to, suffix }: { to: number; suffix: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const value = useMotionValue(0);
  const rounded = useTransform(value, v => `${Math.round(v)}${suffix}`);
  useEffect(() => {
    if (inView) animate(value, to, { duration: 1.6, ease: 'easeOut' });
  }, [inView, to, value]);
  return <motion.span ref={ref}>{rounded}</motion.span>;
};

const MotionDemo = () => {
  const [run, setRun] = useState(0);
  const imgRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: imgRef, offset: ['start end', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);

  return (
    <Section id="motion" lib="Motion" install="npm install motion" onReplay={() => setRun(r => r + 1)}>
      <div key={run} className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <motion.h3
            className="font-heading text-5xl leading-tight"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            Your day,{' '}
            <motion.span
              className="italic text-primary"
              initial={{ opacity: 0, filter: 'blur(8px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              iconic.
            </motion.span>
          </motion.h3>
          <div className="mt-8 flex gap-10 font-heading text-4xl">
            <div><Counter to={10} suffix="+" /><p className="font-body text-sm text-muted-foreground">years</p></div>
            <div><Counter to={2500} suffix="+" /><p className="font-body text-sm text-muted-foreground">brides</p></div>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="mt-8 rounded-full bg-primary px-7 py-3 text-primary-foreground"
          >
            Book Appointment
          </motion.button>
        </div>
        <div ref={imgRef} className="overflow-hidden rounded-2xl">
          <motion.img src={heroImg} alt="" style={{ scale }} className="aspect-[4/5] w-full object-cover" />
        </div>
      </div>

      <div key={`cards-${run}`} className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
        {services.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            whileHover={{ y: -6 }}
            className="overflow-hidden rounded-xl bg-card shadow-sm"
          >
            <img src={s.img} alt="" className="aspect-square w-full object-cover" />
            <p className="p-3 font-heading text-lg">{s.name}</p>
          </motion.div>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Heading fade-up, blur-in word, counting numbers, hover/tap button, scroll-linked image zoom, staggered cards.
      </p>
    </Section>
  );
};

/* ------------------------------------------------------------------ GSAP */

const GsapDemo = () => {
  const [run, setRun] = useState(0);
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const split = SplitText.create('.gsap-title', { type: 'chars' });
      gsap.from(split.chars, {
        opacity: 0, y: 40, rotateX: -90, stagger: 0.035, duration: 0.6, ease: 'back.out(1.7)',
        scrollTrigger: { trigger: '.gsap-title', start: 'top 85%' },
      });
      gsap.utils.toArray<HTMLElement>('.gsap-layer').forEach((el, i) => {
        gsap.to(el, {
          yPercent: -20 * (i + 1),
          ease: 'none',
          scrollTrigger: { trigger: '.gsap-parallax', start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });
      gsap.from('.gsap-line', {
        scaleX: 0, transformOrigin: 'left', duration: 1.2, ease: 'power3.out',
        scrollTrigger: { trigger: '.gsap-line', start: 'top 90%' },
      });
    }, root);
    return () => ctx.revert();
  }, [run]);

  return (
    <Section id="gsap" lib="GSAP" install="npm install gsap" onReplay={() => setRun(r => r + 1)}>
      <div ref={root} key={run}>
        <h3 className="gsap-title font-heading text-5xl md:text-7xl" style={{ perspective: 600 }}>
          Mehndi that tells a story
        </h3>
        <div className="gsap-line mt-4 h-px w-full bg-primary" />
        <div className="gsap-parallax relative mt-12 grid h-[420px] grid-cols-3 gap-4 overflow-hidden">
          {[mehndi1, mehndi2, mehndi3].map((src, i) => (
            <img key={src} src={src} alt="" className="gsap-layer h-[520px] w-full rounded-xl object-cover" style={{ marginTop: i * 40 }} />
          ))}
        </div>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        Letter-by-letter 3D text reveal, drawn underline, three-speed parallax images tied to scroll.
      </p>
    </Section>
  );
};

/* ------------------------------------------------------------------- AOS */

const AosDemo = () => {
  useEffect(() => {
    AOS.init({ once: true, duration: 700, easing: 'ease-out-cubic' });
    AOS.refresh();
  }, []);

  const effects = ['fade-up', 'fade-right', 'zoom-in', 'flip-left', 'fade-down', 'zoom-in-up'];

  return (
    <Section id="aos" lib="AOS (Animate On Scroll)" install="npm install aos">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {effects.map((fx, i) => (
          <div
            key={fx}
            data-aos={fx}
            data-aos-delay={i * 80}
            className="grid aspect-[4/3] place-items-center rounded-xl bg-card text-center shadow-sm"
          >
            <div>
              <p className="font-heading text-2xl">{fx}</p>
              <code className="text-xs text-muted-foreground">data-aos="{fx}"</code>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        No JavaScript per element. Just add an attribute. Scroll up and back down won't replay (once: true).
      </p>
    </Section>
  );
};

/* ----------------------------------------------------------- AutoAnimate */

const AutoAnimateDemo = () => {
  const [parent] = useAutoAnimate();
  const [items, setItems] = useState(['Bridal Makeup', 'Party Mehndi']);
  const extras = ['Hair Styling', 'Skin Glow Facial', 'Nail Art', 'Saree Draping'];

  const add = () => {
    const next = extras.find(e => !items.includes(e));
    if (next) setItems([...items, next]);
  };

  return (
    <Section id="autoanimate" lib="AutoAnimate" install="npm install @formkit/auto-animate">
      <div className="flex flex-wrap gap-3">
        <button onClick={add} className="rounded-full bg-primary px-5 py-2 text-primary-foreground">Add service</button>
        <button onClick={() => setItems([...items].sort())} className="rounded-full border border-border px-5 py-2">Sort A–Z</button>
        <button onClick={() => setItems([...items].reverse())} className="rounded-full border border-border px-5 py-2">Reverse</button>
      </div>
      <ul ref={parent} className="mt-6 max-w-md space-y-2">
        {items.map(item => (
          <li key={item} className="flex items-center justify-between rounded-lg bg-card px-4 py-3 shadow-sm">
            {item}
            <button onClick={() => setItems(items.filter(i => i !== item))} className="text-sm text-muted-foreground hover:text-foreground">
              Remove
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-muted-foreground">
        One hook on the list. Adding, removing and reordering animate automatically. Good for booking steps and carts.
      </p>
    </Section>
  );
};

/* ------------------------------------------- Copy-paste CSS (Magic UI / Animista style) */

const CssDemo = () => (
  <Section id="css" lib="Copy-paste CSS" install="Magic UI · Aceternity · Animista (no install)">
    <style>{`
      @keyframes lab-shimmer { from { background-position: 200% 0 } to { background-position: -200% 0 } }
      @keyframes lab-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
      @keyframes lab-pulse-ring { 0% { box-shadow: 0 0 0 0 hsl(var(--primary) / .5) } 100% { box-shadow: 0 0 0 18px hsl(var(--primary) / 0) } }
      .lab-shimmer-btn { background: linear-gradient(110deg, hsl(var(--primary)) 40%, hsl(var(--primary-bright, var(--primary))) 50%, hsl(var(--primary)) 60%); background-size: 200% 100%; animation: lab-shimmer 2.5s linear infinite; }
      .lab-shimmer-text { background: linear-gradient(90deg, hsl(var(--foreground)) 30%, hsl(var(--primary)) 50%, hsl(var(--foreground)) 70%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: lab-shimmer 4s linear infinite; }
      .lab-marquee { animation: lab-marquee 25s linear infinite; }
      .lab-pulse { animation: lab-pulse-ring 1.8s ease-out infinite; }
      @media (prefers-reduced-motion: reduce) { .lab-shimmer-btn, .lab-shimmer-text, .lab-marquee, .lab-pulse { animation: none } }
    `}</style>
    <div className="space-y-12">
      <div className="flex flex-wrap items-center gap-6">
        <button className="lab-shimmer-btn rounded-full px-7 py-3 text-primary-foreground">Book Appointment</button>
        <button className="lab-pulse rounded-full bg-primary px-7 py-3 text-primary-foreground">WhatsApp us</button>
      </div>
      <h3 className="lab-shimmer-text font-heading text-5xl italic">iconic.</h3>
      <div className="overflow-hidden border-y border-border py-4">
        <div className="lab-marquee flex w-max gap-12 font-heading text-2xl">
          {[...Array(2)].flatMap((_, k) =>
            ['Bridal', 'Mehndi', 'Hair', 'Skin', 'Nails', 'Party Makeup'].map(w => (
              <span key={`${k}-${w}`} className="whitespace-nowrap">{w} <span className="text-primary">✦</span></span>
            )),
          )}
        </div>
      </div>
    </div>
    <p className="mt-6 text-sm text-muted-foreground">
      Shimmer button, pulsing call button, shimmering word, endless marquee. Pure CSS, zero JavaScript, zero bundle size.
    </p>
  </Section>
);

/* ------------------------------------------------------------------ Page */

const AnimationLab = () => (
  <main className="min-h-screen bg-background font-body text-foreground">
    <header className="mx-auto max-w-5xl px-4 py-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to site</Link>
      <h1 className="mt-6 font-heading text-6xl">Animation Lab</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        The same salon content animated with each library. Scroll slowly and compare.
      </p>
      <nav className="mt-6 flex flex-wrap gap-2 text-sm">
        {[['mehndi', 'Mehndi story'], ['motion', 'Motion'], ['gsap', 'GSAP'], ['aos', 'AOS'], ['autoanimate', 'AutoAnimate'], ['css', 'CSS']].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-border px-4 py-1.5 hover:bg-muted">{label}</a>
        ))}
      </nav>
    </header>
    <MehndiScrollStory id="mehndi" />
    <MotionDemo />
    <GsapDemo />
    <AosDemo />
    <AutoAnimateDemo />
    <CssDemo />
  </main>
);

export default AnimationLab;
