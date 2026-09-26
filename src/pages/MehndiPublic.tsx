import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import PublicLayout from '@/components/layout/PublicLayout';
import { useSalon } from '@/context/SalonContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatPKR } from '@/lib/format';
import mehndi1 from '@/assets/mehndi-1.jpg';
import mehndi2 from '@/assets/mehndi-2.jpg';
import mehndi3 from '@/assets/mehndi-3.jpg';
import style1 from '@/assets/mehndi-style-1.jpg';
import style2 from '@/assets/mehndi-style-2.jpg';
import style3 from '@/assets/mehndi-style-3.jpg';
import style4 from '@/assets/mehndi-style-4.jpg';

/* ─────────────── Royal palette (locked) ─────────────── */
const C = {
  ink: '#06120c',
  green: '#0e2a1c',
  greenSoft: '#123521',
  gold: '#c9a24a',
  goldSoft: '#f1dfa4',
  parchment: '#f5efdf',
};

const productImages = [mehndi1, mehndi2, mehndi3];

const styles = [
  { code: 'ST-01', name: 'Bridal Sodani', tag: 'Signature', img: style1 },
  { code: 'ST-02', name: 'Classic Bridal', tag: 'Heritage', img: style2 },
  { code: 'ST-03', name: 'Party & Guest', tag: 'Delicate', img: style3 },
  { code: 'ST-04', name: 'Arabic & Khaleeji', tag: 'Contemporary', img: style4 },
];

const ritual = [
  { n: '01', title: 'Consultation', body: 'A private dialogue to curate patterns that echo your bridal silhouette and heirloom jewellery.' },
  { n: '02', title: 'Preparation', body: 'Skin is cleansed with rose water and primed with rare essential oils for a deep, resonant mahogany stain.' },
  { n: '03', title: 'The Application', body: 'Hours of mindful, artisanal handwork using our signature house-made, preservative-free henna paste.' },
  { n: '04', title: 'The Curing', body: 'Sealing the design and providing heritage aftercare instructions to ensure longevity and vibrance.' },
];

const isMehndi = (text: string) => /mehndi|henna/i.test(text);

const MehndiPublic = () => {
  usePageTitle('Mehndi');
  // Reuse the menu already loaded by SalonContext instead of a second query.
  const { services, loading } = useSalon();
  const mehndiServices = useMemo(
    () => services
      .filter(s => s.status === 'active' && (isMehndi(s.category) || isMehndi(s.name)))
      .sort((a, b) => a.price - b.price),
    [services],
  );

  return (
    <PublicLayout>
      <div
        className="w-full font-montserrat"
        style={{ background: C.ink, color: C.parchment }}
      >
        {/* ─── 1. HERO ─── */}
        <section className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden px-6 py-24">
          {/* radial glow */}
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 40%, ${C.gold}22 0%, transparent 55%)`,
            }}
          />
          {/* decorative arch */}
          <div
            className="absolute inset-6 md:inset-16 pointer-events-none border border-b-0 rounded-t-full"
            style={{ borderColor: `${C.gold}33` }}
          />

          <div className="relative z-10 text-center max-w-4xl">
            <span
              className="uppercase tracking-[0.2em] text-[11px] font-medium mb-8 block"
              style={{ color: C.gold }}
            >
              The House of Henna
            </span>
            <h1
              className="font-cormorant font-light italic mb-10 leading-[0.85] text-6xl md:text-8xl lg:text-9xl"
              style={{ color: C.parchment }}
            >
              The Art of <br />
              <span className="not-italic font-semibold" style={{ color: C.gold }}>
                Mehndi
              </span>
            </h1>
            <p
              className="max-w-xl mx-auto text-base md:text-lg leading-relaxed font-light"
              style={{ color: `${C.parchment}b3` }}
            >
              Bridging ancient Mughal tradition with contemporary bridal elegance. A ritual of
              patience, pattern, and poetry.
            </p>
          </div>

          <div className="absolute bottom-12 flex flex-col items-center gap-4">
            <span
              className="text-xs uppercase tracking-widest"
              style={{ color: C.gold }}
            >
              Scroll to Explore
            </span>
            <div
              className="w-px h-12"
              style={{ background: `linear-gradient(to bottom, ${C.gold}, transparent)` }}
            />
          </div>
        </section>

        {/* ─── 2. STYLES MENU ─── */}
        <section id="styles" className="py-28 md:py-32 px-6" style={{ background: C.green }}>
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 md:mb-20 gap-8">
              <div className="space-y-4">
                <h2
                  className="font-cormorant font-light text-4xl md:text-6xl leading-[1.05]"
                  style={{ color: C.parchment }}
                >
                  Curation of <span className="italic">Styles</span>
                </h2>
                <div className="w-24 h-px" style={{ background: C.gold }} />
              </div>
              <p
                className="text-xs md:text-sm uppercase tracking-widest max-w-xs md:text-right"
                style={{ color: C.gold }}
              >
                Four distinct lineages of henna artistry
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {styles.map((s, i) => (
                <a
                  key={s.code}
                  href="#mehndi-products"
                  className={`group relative aspect-[3/4] overflow-hidden border block ${
                    i % 2 === 1 ? 'md:translate-y-12' : ''
                  }`}
                  style={{ borderColor: `${C.gold}1a` }}
                >
                  <img
                    src={s.img}
                    alt={s.name}
                    loading="lazy"
                    width={1024}
                    height={1024}
                    className="w-full h-full object-cover grayscale scale-110 transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-100"
                  />
                  <div
                    className="absolute inset-0 opacity-80"
                    style={{
                      background: `linear-gradient(to top, ${C.ink} 0%, ${C.ink}33 40%, transparent 100%)`,
                    }}
                  />
                  <div className="absolute bottom-0 p-5 md:p-7 w-full">
                    <p
                      className="text-xs mb-2 tracking-widest"
                      style={{ color: C.gold }}
                    >
                      {s.code} · {s.tag}
                    </p>
                    <h3
                      className="font-cormorant font-light text-xl md:text-2xl"
                      style={{ color: C.parchment }}
                    >
                      {s.name}
                    </h3>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 3. THE CATALOGUE (from DB) ─── */}
        <section id="mehndi-products" className="py-32 md:py-40 px-6" style={{ background: C.ink }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20 md:mb-24">
              <h2
                className="font-cormorant font-light text-4xl md:text-5xl mb-6"
                style={{ color: C.parchment }}
              >
                The Catalogue
              </h2>
              <p
                className="text-xs md:text-sm uppercase tracking-[0.18em]"
                style={{ color: C.gold }}
              >
                Artisanal Collections
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" aria-busy="true" aria-label="Loading catalogue">
                {[0, 1, 2].map(i => (
                  <div key={i} className="aspect-[4/5] animate-pulse" style={{ background: C.greenSoft }} />
                ))}
              </div>
            ) : mehndiServices.length === 0 ? (
              <p
                className="text-center text-sm"
                style={{ color: `${C.parchment}80` }}
              >
                Our mehndi menu is being updated. <Link to="/?mode=quote#book" className="underline" style={{ color: C.gold }}>Ask for a quote</Link>.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 md:gap-x-12 gap-y-16 md:gap-y-20">
                {mehndiServices.map((svc, idx) => (
                  <Link
                    key={svc.id}
                    to={`/services/${svc.id}`}
                    className="group block space-y-5"
                  >
                    <div
                      className="relative aspect-[4/5] overflow-hidden border"
                      style={{
                        background: C.greenSoft,
                        borderColor: `${C.gold}0d`,
                      }}
                    >
                      <img
                        src={productImages[idx % productImages.length]}
                        alt={svc.name}
                        loading="lazy"
                        width={1024}
                        height={1024}
                        className="w-full h-full object-cover transition duration-700 mix-blend-luminosity group-hover:mix-blend-normal group-hover:scale-105"
                      />
                      <div className="absolute top-4 left-4">
                        <span
                          className="text-xs px-3 py-1 border tracking-widest uppercase font-medium"
                          style={{
                            background: C.ink,
                            borderColor: `${C.gold}4d`,
                            color: C.parchment,
                          }}
                        >
                          {svc.category || 'Mehndi'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-baseline gap-4">
                      <h4
                        className="font-cormorant italic font-light text-xl md:text-2xl transition-colors group-hover:opacity-80"
                        style={{ color: C.parchment }}
                      >
                        {svc.name}
                      </h4>
                      <span
                        className="text-sm font-medium whitespace-nowrap"
                        style={{ color: C.gold }}
                      >
                        {svc.price > 0 ? formatPKR(svc.price) : 'On request'}
                      </span>
                    </div>
                    {svc.description && (
                      <p
                        className="text-sm leading-relaxed font-light"
                        style={{ color: `${C.parchment}80` }}
                      >
                        {svc.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ─── 4. RITUAL TIMELINE (parchment) ─── */}
        <section
          className="py-28 md:py-32 px-6"
          style={{ background: C.parchment, color: C.ink }}
        >
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-20 md:mb-24">
              <h2 className="font-cormorant font-light text-4xl md:text-5xl mb-4">
                The Ritual
              </h2>
              <p
                className="text-[11px] uppercase tracking-widest font-medium"
                style={{ color: `${C.green}99` }}
              >
                Four Acts of Tradition
              </p>
            </div>

            <div>
              {ritual.map((r, i) => (
                <div
                  key={r.n}
                  className="grid grid-cols-[60px_1fr] md:grid-cols-[140px_1fr] gap-8 md:gap-12 py-10 md:py-12 group"
                  style={{
                    borderBottom: i === ritual.length - 1 ? 'none' : `1px solid ${C.ink}1a`,
                  }}
                >
                  <span
                    className="font-cormorant text-4xl md:text-5xl italic opacity-40 group-hover:opacity-100 transition-opacity"
                    style={{ color: C.gold }}
                  >
                    {r.n}
                  </span>
                  <div>
                    <h5
                      className="mb-3 font-semibold tracking-[0.2em] uppercase text-[11px]"
                      style={{ color: C.ink }}
                    >
                      {r.title}
                    </h5>
                    <p
                      className="font-cormorant leading-relaxed text-lg md:text-xl"
                      style={{ color: `${C.ink}b3` }}
                    >
                      {r.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── 5. RESERVE CTA ─── */}
        <section className="py-32 md:py-40 px-6" style={{ background: C.ink }}>
          <div className="max-w-4xl mx-auto p-10 md:p-24 text-center relative overflow-hidden">
            {/* subtle pinstripe texture via CSS gradient */}
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                background: `repeating-linear-gradient(45deg, ${C.gold} 0 1px, transparent 1px 6px)`,
              }}
            />
            {/* double border */}
            <div
              className="absolute inset-4 pointer-events-none"
              style={{ border: `1px solid ${C.gold}4d` }}
            />
            <div
              className="absolute inset-2 pointer-events-none"
              style={{ border: `1px solid ${C.gold}1a` }}
            />

            <div className="relative z-10">
              <h2
                className="font-cormorant font-light italic text-5xl md:text-7xl lg:text-8xl mb-8 md:mb-10 leading-[0.95]"
                style={{ color: C.parchment }}
              >
                Reserve Your Date
              </h2>
              <p
                className="mb-12 md:mb-14 max-w-md mx-auto leading-relaxed text-sm md:text-base font-light"
                style={{ color: `${C.parchment}99` }}
              >
                Limited appointments available for the upcoming wedding season. Secure your
                private session today.
              </p>
              <Link to="/?mode=quote#book" className="inline-block group">
                <span
                  className="relative inline-block px-10 md:px-12 py-4 md:py-5 uppercase tracking-[0.2em] text-[11px] md:text-xs font-bold transition-all"
                  style={{ background: C.gold, color: C.ink }}
                >
                  Inquire Now
                  <span
                    className="absolute -inset-2 pointer-events-none scale-95 group-hover:scale-100 transition-transform duration-500"
                    style={{ border: `1px solid ${C.gold}33` }}
                  />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
};

export default MehndiPublic;
