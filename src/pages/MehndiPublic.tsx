import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PublicLayout from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import mehndiHero from '@/assets/mehndi-hero.jpg';
import mehndi1 from '@/assets/mehndi-1.jpg';
import mehndi2 from '@/assets/mehndi-2.jpg';
import mehndi3 from '@/assets/mehndi-3.jpg';
const productImages = [mehndi1, mehndi2, mehndi3];
import { Flower2, Crown, Clock, ArrowRight, Check, Palette, Sparkles, Moon, Star } from 'lucide-react';

/* ─────────────── Royal palette ─────────────── */
const C = {
  ink: '#06120c',        // deepest green-black
  green: '#0e2a1c',      // sultan green
  greenSoft: '#123521',
  greenLine: 'rgba(201,162,74,0.35)',
  gold: '#c9a24a',
  goldSoft: '#f1dfa4',
  goldGlow: 'rgba(241,223,164,0.85)',
  parchment: '#f5efdf',
  mute: 'rgba(232,225,199,0.72)',
};

/* ─────────────── Arabesque ornaments ─────────────── */
const Arabesque = ({ className = '', flip = false }: { className?: string; flip?: boolean }) => (
  <svg
    viewBox="0 0 400 40"
    className={className}
    style={{ transform: flip ? 'scaleX(-1)' : undefined }}
    aria-hidden
  >
    <g fill="none" stroke={C.gold} strokeWidth="1" strokeLinecap="round">
      <path d="M0 20 H160" opacity="0.5" />
      <path d="M240 20 H400" opacity="0.5" />
      <circle cx="200" cy="20" r="9" />
      <circle cx="200" cy="20" r="4" fill={C.gold} stroke="none" />
      <path d="M170 20 q10 -12 20 0 q10 12 20 0 q10 -12 20 0" />
      <path d="M182 8 q6 6 0 12" />
      <path d="M218 8 q-6 6 0 12" />
    </g>
  </svg>
);

const StarPattern = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} aria-hidden>
    <defs>
      <pattern id="mp-stars" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
        <g fill="none" stroke={C.gold} strokeWidth="0.6" opacity="0.55">
          <polygon points="20,4 24,16 36,16 26,24 30,36 20,28 10,36 14,24 4,16 16,16" />
          <circle cx="20" cy="20" r="14" />
        </g>
      </pattern>
    </defs>
    <rect width="200" height="200" fill="url(#mp-stars)" />
  </svg>
);

/* ─────────────── Data ─────────────── */
const styles = [
  {
    icon: Crown,
    name: 'Bridal Sodani',
    price: 'From Rs. 25,000',
    duration: '4 – 6 hrs',
    desc: 'Ultra-fine Sodani artistry for hands, feet and forearms — the signature bridal ritual.',
    features: ['Full hands & feet', 'Detailed forearm work', 'Deep-stain aftercare', 'Complimentary touch-ups'],
    highlight: true,
  },
  {
    icon: Flower2,
    name: 'Classic Bridal',
    price: 'From Rs. 15,000',
    duration: '3 – 4 hrs',
    desc: 'Traditional motifs — paisleys, florals and jaali — perfect for Mayoun and Mehndi nights.',
    features: ['Full hands & feet', 'Classic Indo-Pak motifs', 'Rich colour aftercare kit'],
    highlight: false,
  },
  {
    icon: Sparkles,
    name: 'Party & Guest',
    price: 'From Rs. 2,500',
    duration: '30 – 60 min',
    desc: 'Elegant one-hand or two-hand designs for wedding guests, engagements and Eid.',
    features: ['One or two hands', 'Modern minimal or traditional', 'Quick-drying premium cones'],
    highlight: false,
  },
  {
    icon: Palette,
    name: 'Arabic & Khaleeji',
    price: 'From Rs. 5,000',
    duration: '1 – 2 hrs',
    desc: 'Bold flowing Arabic vines, negative-space compositions and khaleeji-inspired details.',
    features: ['Custom design consult', 'Optional gold/glitter accents', 'Statement finger detailing'],
    highlight: false,
  },
];

const ritual = [
  { step: '01', title: 'Consultation', desc: 'Share your event, outfit and design inspirations with our lead mehndi artist.' },
  { step: '02', title: 'Design Preview', desc: 'A custom motif plan is sketched around your hands, dress detailing and skin tone.' },
  { step: '03', title: 'Artistry Session', desc: 'Applied with premium organic cones in a calm, unhurried studio setting.' },
  { step: '04', title: 'Aftercare Ritual', desc: 'Take-home aftercare kit so your mehndi peaks in richness on your event day.' },
];

/* ─────────────── Page ─────────────── */
type MehndiService = {
  id: string;
  name: string;
  category: string | null;
  duration: number | null;
  price: number | null;
  description: string | null;
};

const MehndiPublic = () => {
  const [mehndiServices, setMehndiServices] = useState<MehndiService[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('services')
        .select('id,name,category,duration,price,description,status')
        .eq('status', 'active')
        .or('category.ilike.%mehndi%,category.ilike.%henna%,name.ilike.%mehndi%,name.ilike.%henna%')
        .order('price', { ascending: true });
      if (data) setMehndiServices(data as MehndiService[]);
    })();
  }, []);

  return (
    <PublicLayout>
      <div style={{ background: C.ink, color: C.parchment }}>
        {/* HERO — royal arch */}
        <section
          className="relative overflow-hidden"
          style={{
            background: `radial-gradient(1200px 700px at 50% 0%, ${C.greenSoft} 0%, ${C.green} 45%, ${C.ink} 100%)`,
          }}
        >
          {/* faint tile pattern */}
          {/* gold hairlines */}
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${C.gold},transparent)` }} />
          <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${C.gold},transparent)` }} />

          <div className="relative max-w-6xl mx-auto px-4 lg:px-8 pt-24 pb-28 text-center">
            {/* crescent + star */}

            <p className="uppercase tracking-[0.42em] text-[11px] font-semibold mb-5" style={{ color: C.gold }}>
              Bismillah · Mehndi Atelier
            </p>

            <h1
              className="font-heading font-bold leading-[0.95] tracking-tight mb-6 text-6xl md:text-7xl lg:text-8xl"
              style={{ color: C.parchment }}
            >
              The Art of the{' '}
              <span
                className="italic bg-clip-text text-transparent block md:inline"
                style={{ backgroundImage: `linear-gradient(90deg, ${C.gold}, ${C.goldSoft}, ${C.gold})` }}
              >
                Royal Hand
              </span>
            </h1>

            <Arabesque className="w-64 md:w-96 h-8 mx-auto my-8" />

            <p className="max-w-2xl mx-auto text-lg leading-relaxed" style={{ color: C.mute }}>
              A quiet studio in the Mughal tradition — where every motif is drawn slowly, by hand, in reverence to your day.
              Sodani, khaleeji, jaali and floral vines composed for the modern bride.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link to="/services?category=Mehndi">
                <Button
                  size="lg"
                  className="border-0 rounded-full px-8"
                  style={{
                    background: `linear-gradient(135deg, ${C.gold}, ${C.goldSoft})`,
                    color: C.ink,
                    boxShadow: `0 12px 40px -12px ${C.goldGlow}`,
                  }}
                >
                  Reserve Your Session <ArrowRight className="ml-1 w-4 h-4" />
                </Button>
              </Link>
              <a href="#styles">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 bg-transparent hover:bg-transparent"
                  style={{ borderColor: C.gold, color: C.goldSoft }}
                >
                  View the Menu
                </Button>
              </a>
            </div>

          </div>
        </section>

        {/* STYLES */}
        <section id="styles" className="relative py-28 px-4 lg:px-8" style={{ background: C.ink }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="uppercase tracking-[0.4em] text-[11px] font-semibold mb-4" style={{ color: C.gold }}>
                The Menu
              </p>
              <h2 className="font-heading text-4xl md:text-5xl font-bold" style={{ color: C.parchment }}>
                Four Ways to Wear{' '}
                <span
                  className="italic bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(90deg, ${C.gold}, ${C.goldSoft})` }}
                >
                  Henna
                </span>
              </h2>
              <Arabesque className="w-56 h-6 mx-auto mt-6" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {styles.map((s) => (
                <div
                  key={s.name}
                  className="relative p-8 rounded-3xl overflow-hidden transition-transform hover:-translate-y-1"
                  style={{
                    background: `linear-gradient(180deg, ${C.greenSoft} 0%, ${C.green} 100%)`,
                    border: `1px solid ${s.highlight ? C.gold : C.greenLine}`,
                    boxShadow: s.highlight
                      ? `0 30px 80px -30px rgba(0,0,0,0.7), inset 0 0 0 1px ${C.gold}55`
                      : '0 20px 60px -30px rgba(0,0,0,0.5)',
                  }}
                >
                  {/* corner ornaments */}
                  <span className="absolute top-3 left-3 w-6 h-6" style={{ borderTop: `1px solid ${C.gold}`, borderLeft: `1px solid ${C.gold}` }} />
                  <span className="absolute top-3 right-3 w-6 h-6" style={{ borderTop: `1px solid ${C.gold}`, borderRight: `1px solid ${C.gold}` }} />
                  <span className="absolute bottom-3 left-3 w-6 h-6" style={{ borderBottom: `1px solid ${C.gold}`, borderLeft: `1px solid ${C.gold}` }} />
                  <span className="absolute bottom-3 right-3 w-6 h-6" style={{ borderBottom: `1px solid ${C.gold}`, borderRight: `1px solid ${C.gold}` }} />

                  {s.highlight && (
                    <div
                      className="absolute -top-3 left-8 px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.28em] font-bold"
                      style={{ background: `linear-gradient(135deg, ${C.gold}, ${C.goldSoft})`, color: C.ink }}
                    >
                      Signature
                    </div>
                  )}

                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                    style={{
                      background: `linear-gradient(135deg, ${C.gold}, ${C.goldSoft})`,
                      boxShadow: `inset 0 0 0 1px ${C.goldSoft}, 0 10px 30px -10px ${C.goldGlow}`,
                    }}
                  >
                    <s.icon className="w-6 h-6" style={{ color: C.ink }} />
                  </div>

                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-heading text-2xl font-bold" style={{ color: C.parchment }}>
                      {s.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-xs shrink-0 mt-2" style={{ color: C.mute }}>
                      <Clock className="w-3.5 h-3.5" /> {s.duration}
                    </span>
                  </div>
                  <p className="font-heading text-lg mb-4" style={{ color: C.gold }}>
                    {s.price}
                  </p>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: C.mute }}>
                    {s.desc}
                  </p>
                  <ul className="space-y-2.5 mb-8">
                    {s.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: C.parchment }}>
                        <span
                          className="mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: C.gold }}
                        >
                          <Check className="w-2.5 h-2.5" style={{ color: C.ink }} />
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/services?category=Mehndi">
                    <Button
                      className="w-full rounded-full border-0"
                      style={
                        s.highlight
                          ? {
                              background: `linear-gradient(135deg, ${C.gold}, ${C.goldSoft})`,
                              color: C.ink,
                            }
                          : {
                              background: 'transparent',
                              color: C.goldSoft,
                              border: `1px solid ${C.gold}`,
                            }
                      }
                    >
                      Enquire & Book
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ALL MEHNDI PRODUCTS (from database) */}
        <section id="mehndi-products" className="relative py-28 px-4 lg:px-8" style={{ background: C.green }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <p className="uppercase tracking-[0.4em] text-[11px] font-semibold mb-4" style={{ color: C.gold }}>
                Full Catalogue
              </p>
              <h2 className="font-heading text-4xl md:text-5xl font-bold" style={{ color: C.parchment }}>
                All Mehndi{' '}
                <span
                  className="italic bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(90deg, ${C.gold}, ${C.goldSoft})` }}
                >
                  Offerings
                </span>
              </h2>
              <Arabesque className="w-56 h-6 mx-auto mt-6" />
            </div>

            {mehndiServices.length === 0 ? (
              <p className="text-center text-sm" style={{ color: C.mute }}>
                No mehndi services published yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {mehndiServices.map((svc, idx) => (
                  <div
                    key={svc.id}
                    className="relative rounded-2xl overflow-hidden transition-transform hover:-translate-y-1"
                    style={{
                      background: `linear-gradient(180deg, ${C.greenSoft} 0%, ${C.ink} 100%)`,
                      border: `1px solid ${C.greenLine}`,
                      boxShadow: '0 20px 50px -30px rgba(0,0,0,0.6)',
                    }}
                  >
                    {/* image */}
                    <div className="relative w-full aspect-[4/3] overflow-hidden">
                      <img
                        src={productImages[idx % productImages.length]}
                        alt={svc.name}
                        loading="lazy"
                        width={1024}
                        height={1024}
                        className="w-full h-full object-cover"
                      />
                      <div
                        className="absolute inset-0"
                        style={{ background: `linear-gradient(180deg, transparent 40%, ${C.ink} 100%)` }}
                      />
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.28em] font-semibold"
                        style={{ background: `${C.ink}cc`, color: C.gold, border: `1px solid ${C.gold}55` }}>
                        {svc.category || 'Mehndi'}
                      </span>
                    </div>

                    <div className="relative p-6">
                    <span className="absolute top-2 left-2 w-4 h-4" style={{ borderTop: `1px solid ${C.gold}`, borderLeft: `1px solid ${C.gold}` }} />
                    <span className="absolute top-2 right-2 w-4 h-4" style={{ borderTop: `1px solid ${C.gold}`, borderRight: `1px solid ${C.gold}` }} />
                    <span className="absolute bottom-2 left-2 w-4 h-4" style={{ borderBottom: `1px solid ${C.gold}`, borderLeft: `1px solid ${C.gold}` }} />
                    <span className="absolute bottom-2 right-2 w-4 h-4" style={{ borderBottom: `1px solid ${C.gold}`, borderRight: `1px solid ${C.gold}` }} />


                    <h3 className="font-heading text-xl font-bold mb-2" style={{ color: C.parchment }}>
                      {svc.name}
                    </h3>

                    {svc.description && (
                      <p className="text-sm mb-4 leading-relaxed" style={{ color: C.mute }}>
                        {svc.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: `1px solid ${C.greenLine}` }}>
                      <span className="font-heading text-lg" style={{ color: C.gold }}>
                        Rs. {Number(svc.price ?? 0).toLocaleString('en-PK')}
                      </span>
                      {svc.duration != null && (
                        <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: C.mute }}>
                          <Clock className="w-3.5 h-3.5" /> {svc.duration} min
                        </span>
                      )}
                    </div>

                    <Link to="/services?category=Mehndi" className="block mt-5">
                      <Button
                        className="w-full rounded-full border-0"
                        style={{ background: 'transparent', color: C.goldSoft, border: `1px solid ${C.gold}` }}
                      >
                        Book Now <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* RITUAL */}

        <section
          className="relative py-28 px-4 lg:px-8 overflow-hidden"
          style={{
            background: `linear-gradient(180deg, ${C.ink} 0%, ${C.green} 50%, ${C.ink} 100%)`,
          }}
        >
          <div className="relative max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <p className="uppercase tracking-[0.4em] text-[11px] font-semibold mb-4" style={{ color: C.gold }}>
                The Ritual
              </p>
              <h2 className="font-heading text-4xl md:text-5xl font-bold" style={{ color: C.parchment }}>
                Four Movements, One Ceremony
              </h2>
              <Arabesque className="w-56 h-6 mx-auto mt-6" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ritual.map((p, i) => (
                <div
                  key={p.step}
                  className="relative p-8 rounded-2xl"
                  style={{
                    background: 'rgba(6,18,12,0.55)',
                    border: `1px solid ${C.greenLine}`,
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <div className="flex items-baseline justify-between mb-6">
                    <span className="font-heading text-5xl font-bold" style={{ color: C.gold, opacity: 0.5 }}>
                      {p.step}
                    </span>
                    <span
                      className="text-[10px] uppercase tracking-[0.3em]"
                      style={{ color: C.gold }}
                    >
                      Movement {i + 1}
                    </span>
                  </div>
                  <h3 className="font-heading text-xl font-semibold mb-2" style={{ color: C.parchment }}>
                    {p.title}
                  </h3>
                  <div className="h-px w-10 mb-3" style={{ background: C.gold }} />
                  <p className="text-sm leading-relaxed" style={{ color: C.mute }}>
                    {p.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CLOSING CTA — royal decree */}
        <section className="relative py-28 px-4 lg:px-8" style={{ background: C.ink }}>
          <div className="max-w-4xl mx-auto text-center relative">
            <div
              className="pointer-events-none absolute -inset-10 rounded-[3rem] blur-3xl opacity-40"
              style={{ background: `radial-gradient(closest-side, ${C.gold}55, transparent)` }}
            />
            <div
              className="relative rounded-3xl px-8 py-16 overflow-hidden"
              style={{
                background: `linear-gradient(180deg, ${C.greenSoft} 0%, ${C.green} 100%)`,
                border: `1px solid ${C.gold}`,
                boxShadow: `inset 0 0 0 6px ${C.ink}, inset 0 0 0 7px ${C.gold}55`,
              }}
            >

              <div className="relative flex items-center justify-center gap-3 mb-6" style={{ color: C.gold }}>
                <span className="h-px w-12" style={{ background: `linear-gradient(90deg,transparent,${C.gold})` }} />
                <Crown className="w-5 h-5" />
                <span className="h-px w-12" style={{ background: `linear-gradient(90deg,${C.gold},transparent)` }} />
              </div>

              <p
                className="relative uppercase tracking-[0.42em] text-[11px] font-semibold mb-5"
                style={{ color: C.gold }}
              >
                By Appointment
              </p>
              <h2
                className="relative font-heading text-3xl md:text-5xl font-bold mb-4 leading-tight"
                style={{ color: C.parchment }}
              >
                Reserve Your{' '}
                <span
                  className="italic bg-clip-text text-transparent"
                  style={{ backgroundImage: `linear-gradient(90deg, ${C.gold}, ${C.goldSoft})` }}
                >
                  Mehndi Date
                </span>
              </h2>
              <p className="relative max-w-xl mx-auto mb-8" style={{ color: C.mute }}>
                Bridal dates fill quickly through wedding season. Secure your slot with a quick enquiry — we respond within a day.
              </p>
              <Link to="/services?category=Mehndi" className="relative inline-block">
                <Button
                  size="lg"
                  className="rounded-full px-10 border-0"
                  style={{
                    background: `linear-gradient(135deg, ${C.gold}, ${C.goldSoft})`,
                    color: C.ink,
                    boxShadow: `0 14px 40px -12px ${C.goldGlow}`,
                  }}
                >
                  Book Now <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
};

export default MehndiPublic;
