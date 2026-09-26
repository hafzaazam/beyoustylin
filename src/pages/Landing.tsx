import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useSalon } from '@/context/SalonContext';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabase } from '@/integrations/supabase/client';
import { AccountButton } from '@/components/layout/PublicLayout';
import { SITE } from '@/config/site';
import { bookingRequestSchema, firstError, quoteRequestSchema } from '@/lib/validation';
import { formatDuration, formatPKR, toLocalDateKey } from '@/lib/format';
import mehndiHero from '@/assets/mehndi-hero.jpg';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import {
  Sparkles, Flower2, Crown,
  Star, MapPin, Phone, Mail,
  Instagram, Facebook, ArrowRight, Check, Send, CheckCircle2, Loader2, Menu,
} from 'lucide-react';

// The three things the studio is known for. Copy comes from the original service descriptions.
const pillars = [
  {
    icon: Crown, title: 'Bridal & party', to: '/packages', cta: 'See bridal packages', span: 'md:col-span-5',
    desc: 'Signature Barat, Walima, Nikah & Engagement makeup crafted by senior artists.',
    items: ['Barat, Walima, Nikah & Engagement looks', 'Full glam party looks, hairstyles & lashes', 'Complete bridal packages'],
  },
  {
    icon: Flower2, title: 'Mehndi', to: '/mehndi', cta: 'Explore mehndi', span: 'md:col-span-3', mehndi: true,
    desc: 'Delicate Sodani & classic mehndi artistry for your big day.',
    items: ['Bridal Sodani & classic styles', 'Party & Eid bookings welcome'],
  },
  {
    icon: Sparkles, title: 'Hair & skin', to: '/services', cta: 'Browse services', span: 'md:col-span-4',
    desc: 'Everyday care by expert stylists, for radiant, camera-ready glow.',
    items: ['Signature cuts, layers, feathers & kids styling', 'Fashion colours, rebonding, extenso & keratin', 'Hydra & 3D facials'],
  },
];

const perks = [
  { label: '10+ years experience' },
  { label: 'Certified artists' },
  { label: 'Punctual service' },
  { label: '5-star rated studio' },
];

const testimonials = [
  { name: 'Ayesha K.', role: 'Barat Bride', text: 'My Barat look was absolutely stunning. The team made me feel like royalty from start to finish.', rating: 5 },
  { name: 'Sana M.', role: 'Party Client', text: 'Best party makeup in town! The hairstyle held perfectly through the entire night. Highly recommend.', rating: 5 },
  { name: 'Hira R.', role: 'Regular Client', text: 'Their Hydra Facial is life-changing. My skin has never looked better. The ambience is so calming too.', rating: 5 },
];

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const Landing = () => {
  usePageTitle();
  const { deals, services, addAppointmentRequest, loading } = useSalon();
  const { user, isCustomer } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const featuredDeals = deals.filter(d => d.status === 'active').slice(0, 4);
  const featuredServices = services.filter(s => s.status === 'active' && s.price > 0).slice(0, 6);

  const activeServices = useMemo(() => services.filter(s => s.status === 'active'), [services]);
  const activeDeals = useMemo(() => deals.filter(d => d.status === 'active'), [deals]);

  type FormMode = 'booking' | 'quote';
  const initialBooking = { name: '', phone: '', email: '', selection: '', date: '', time: '', notes: '' };
  const initialQuote = { name: '', phone: '', email: '', selection: '', eventDate: '', budget: '', notes: '' };
  const [mode, setMode] = useState<FormMode>('booking');
  const [bookingForm, setBookingForm] = useState(initialBooking);
  const [quoteForm, setQuoteForm] = useState(initialQuote);
  const [submitted, setSubmitted] = useState<null | FormMode>(null);

  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const svc = params.get('service');
    const deal = params.get('deal');
    if (svc) {
      setMode('booking');
      setSubmitted(null);
      setBookingForm(f => ({ ...f, selection: `service:${svc}` }));
    } else if (deal) {
      setMode('booking');
      setSubmitted(null);
      setBookingForm(f => ({ ...f, selection: `deal:${deal}` }));
    } else if (params.get('mode') === 'quote') {
      setMode('quote');
      setSubmitted(null);
    }
    // Scroll to any section in the hash (links from other pages use "/#about", "/#book", …).
    const target = svc || deal ? 'book' : location.hash.slice(1);
    if (target) {
      const t = setTimeout(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [location.search, location.hash]);

  // Signed-in customers don't have to retype their details.
  useEffect(() => {
    if (!user || !isCustomer) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('profiles').select('full_name, phone, email').eq('id', user.id).maybeSingle();
      if (cancelled || !data) return;
      const fill = <T extends { name: string; phone: string; email: string }>(f: T): T => ({
        ...f,
        name: f.name || data.full_name || '',
        phone: f.phone || data.phone || '',
        email: f.email || data.email || user.email || '',
      });
      setBookingForm(fill);
      setQuoteForm(fill);
    })();
    return () => { cancelled = true; };
  }, [user, isCustomer]);


  const parseSelection = (sel: string): { serviceId?: string; dealId?: string } => {
    if (sel.startsWith('service:')) return { serviceId: sel.slice(8) };
    if (sel.startsWith('deal:')) return { dealId: sel.slice(5) };
    return {};
  };

  // Local date (not UTC) so late-night visitors in Pakistan can still pick today.
  const todayStr = toLocalDateKey(new Date());

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = bookingRequestSchema.safeParse(bookingForm);
    const problem = firstError(parsed);
    if (problem || !parsed.success) { toast.error(problem); return; }
    const when = new Date(`${parsed.data.date}T${parsed.data.time}`);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) {
      toast.error('Please choose a date and time in the future.');
      return;
    }
    const { serviceId, dealId } = parseSelection(parsed.data.selection);
    setSubmitting(true);
    const { error } = await addAppointmentRequest({
      type: 'booking',
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      serviceId,
      dealId,
      preferredDate: parsed.data.date,
      preferredTime: parsed.data.time,
      notes: parsed.data.notes || undefined,
    });
    setSubmitting(false);
    if (error) {
      toast.error(`We couldn't send your request: ${error}`, { description: `Please try again or call us on ${SITE.phoneDisplay}.` });
      return;
    }
    setSubmitted('booking');
    setBookingForm(initialBooking);
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = quoteRequestSchema.safeParse(quoteForm);
    const problem = firstError(parsed);
    if (problem || !parsed.success) { toast.error(problem); return; }
    const { serviceId, dealId } = parseSelection(parsed.data.selection ?? '');
    setSubmitting(true);
    const { error } = await addAppointmentRequest({
      type: 'quote',
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      serviceId,
      dealId,
      eventDate: parsed.data.eventDate || undefined,
      budget: parsed.data.budget || undefined,
      notes: parsed.data.notes,
    });
    setSubmitting(false);
    if (error) {
      toast.error(`We couldn't send your request: ${error}`, { description: `Please try again or call us on ${SITE.phoneDisplay}.` });
      return;
    }
    setSubmitted('quote');
    setQuoteForm(initialQuote);
  };

  // Hero price proof, from the live menu.
  const bridalFrom = useMemo(() => {
    const prices = activeDeals.map(d => d.discountedPrice).filter(p => p > 0);
    return prices.length ? Math.min(...prices) : null;
  }, [activeDeals]);
  const servicesFrom = useMemo(() => {
    const prices = activeServices.map(s => s.price).filter(p => p > 0);
    return prices.length ? Math.min(...prices) : null;
  }, [activeServices]);

  // Cheapest published mehndi service, for the "From Rs. …" badge.
  const mehndiFrom = useMemo(() => {
    const prices = activeServices
      .filter(s => /mehndi|henna/i.test(`${s.category} ${s.name}`) && s.price > 0)
      .map(s => s.price);
    return prices.length ? Math.min(...prices) : null;
  }, [activeServices]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="h-14 lg:h-16 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link to="/services" className="hover:text-foreground transition-colors">Services</Link>
            <Link to="/packages" className="hover:text-foreground transition-colors">Packages</Link>
            <Link to="/mehndi" className="hover:text-foreground transition-colors">Mehndi</Link>

            <a href="#book" className="hover:text-foreground transition-colors">Book</a>
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
            <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AccountButton className="hidden sm:block" />
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button className="md:hidden inline-flex items-center justify-center w-11 h-11 border border-border/60" aria-label="Open menu">
                  <Menu className="w-4 h-4" strokeWidth={1.25} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="font-heading font-light text-2xl text-left">{SITE.name}</SheetTitle>
                </SheetHeader>
                <div className="mt-8 flex flex-col" onClick={() => setMenuOpen(false)}>
                  {[['/services', 'Services'], ['/packages', 'Packages'], ['/mehndi', 'Mehndi']].map(([to, label]) => (
                    <Link key={to} to={to} className="py-3.5 min-h-11 border-b border-border/60 text-sm uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">{label}</Link>
                  ))}
                  {[['#book', 'Book'], ['#about', 'About'], ['#contact', 'Contact']].map(([href, label]) => (
                    <a key={href} href={href} className="py-3.5 min-h-11 border-b border-border/60 text-sm uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">{label}</a>
                  ))}
                  <div className="mt-6"><AccountButton /></div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      {/* Hero: text on the page colour, photo shown at full strength beside it.
          The placeholder photo is cropped to its right side (SITE.heroImagePosition). */}
      <section className="relative pt-16 border-b border-border/60 lg:min-h-[88vh] lg:grid lg:grid-cols-12">
        <div className="lg:col-span-7 flex items-center px-4 lg:pl-8 lg:pr-12 xl:pl-[max(2rem,calc((100vw-80rem)/2+2rem))] pt-10 pb-12 lg:py-20">
          <div className="max-w-2xl">
            <h1 className="font-heading text-[3.25rem] leading-[1] sm:text-7xl lg:text-8xl font-light tracking-tight mb-6 text-balance">
              Where every bride becomes <span className="italic text-primary">iconic.</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-6 max-w-xl leading-relaxed">
              Bridal makeup, hair, mehndi and skincare by senior artists in {SITE.city.split(',')[0]}.
            </p>

            {/* Real prices up front: computed from the live menu. */}
            <dl className="mb-8 flex flex-wrap gap-x-8 gap-y-3 min-h-[3.25rem]" aria-live="polite">
              {loading ? (
                <div className="h-12 w-72 max-w-full bg-muted/60 animate-pulse" aria-label="Loading prices" />
              ) : (
                <>
                  {bridalFrom !== null && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Bridal packages</dt>
                      <dd className="font-heading text-2xl md:text-3xl tabular-nums">from {formatPKR(bridalFrom)}</dd>
                    </div>
                  )}
                  {servicesFrom !== null && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Everyday services</dt>
                      <dd className="font-heading text-2xl md:text-3xl tabular-nums">from {formatPKR(servicesFrom)}</dd>
                    </div>
                  )}
                  {bridalFrom === null && servicesFrom === null && (
                    <p className="text-sm text-muted-foreground self-center">Prices on request. Tell us about your occasion.</p>
                  )}
                </>
              )}
            </dl>

            <div className="flex flex-col sm:flex-row gap-3">
              <a href="#book" className="sm:w-auto"><Button size="lg" className="w-full rounded-none px-8 h-12 text-xs uppercase tracking-[0.2em]">Book appointment</Button></a>
              <Link to="/packages" className="sm:w-auto"><Button size="lg" variant="outline" className="w-full rounded-none px-8 h-12 text-xs uppercase tracking-[0.2em]">See bridal packages</Button></Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              {perks.map(p => (
                <li key={p.label} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={1.5} aria-hidden />
                  {p.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="lg:col-span-5 relative h-[46vh] min-h-[280px] lg:h-auto">
          <img
            src={SITE.heroImage}
            alt={SITE.heroImageAlt}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: SITE.heroImagePosition }}
            width={1600}
            height={1024}
          />
        </div>
      </section>


      {/* What we do: three real pillars instead of a grid of same-size feature cards */}
      <section id="services" className="py-20 md:py-28 px-4 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12 md:mb-16">
            <h2 className="font-heading text-4xl md:text-6xl font-normal tracking-tight leading-[1.05]">
              Curated beauty, <span className="italic font-normal text-primary">every detail.</span>
            </h2>
            <p className="mt-6 text-muted-foreground text-base leading-relaxed max-w-md">
              From your everyday glow-up to once-in-a-lifetime bridal moments. Services designed to celebrate you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-px bg-border/60 border border-border/60">
            {pillars.map(p => (
              <Link
                key={p.title}
                to={p.to}
                className={`group flex flex-col p-8 md:p-10 transition-colors duration-500 ${p.span} ${p.mehndi ? 'text-[#f5efdf]' : 'bg-background hover:bg-muted/40'}`}
                style={p.mehndi ? { background: 'linear-gradient(180deg, #12241a, #0b1a12)' } : undefined}
              >
                <p.icon className="w-6 h-6 mb-10" strokeWidth={1} style={{ color: p.mehndi ? '#e3c47a' : undefined }} aria-hidden />
                <h3 className="font-heading text-3xl md:text-4xl font-light tracking-tight mb-4">{p.title}</h3>
                <p className={`text-sm leading-relaxed mb-6 max-w-sm ${p.mehndi ? 'text-[#dfe8db]' : 'text-muted-foreground'}`}>{p.desc}</p>
                <ul className={`space-y-2 mb-10 text-sm ${p.mehndi ? 'text-[#e8f0e5]' : 'text-foreground/85'}`}>
                  {p.items.map(item => (
                    <li key={item} className="flex gap-2.5">
                      <Check className="w-3.5 h-3.5 mt-1 shrink-0" strokeWidth={1.5} style={{ color: p.mehndi ? '#e3c47a' : 'hsl(var(--primary))' }} aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <span className={`mt-auto inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] ${p.mehndi ? 'text-[#f1dfa4]' : 'text-primary'} group-hover:gap-3 transition-all`}>
                  {p.cta}
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.25} aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>



      {/* Popular services */}
      {featuredServices.length > 0 && (
      <section className="py-24 px-4 lg:px-8 border-t border-border/60">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-14">
            <h2 className="font-heading text-4xl md:text-5xl font-light tracking-tight">Most loved services.</h2>
            <Link to="/services" className="min-h-11 text-xs uppercase tracking-[0.2em] text-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
              View all <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.25} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-border/60">
            {featuredServices.map(s => (
              <div key={s.id} className="group p-8 border-r border-b border-border/60 flex flex-col gap-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{s.category}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{formatDuration(s.duration)}</span>
                </div>
                <h3 className="font-heading text-2xl font-light tracking-tight">{s.name}</h3>
                <div className="flex items-center justify-between mt-auto pt-6 border-t border-border/60">
                  <span className="text-primary font-semibold text-sm tabular-nums">{formatPKR(s.price)}</span>
                  <Link to={`/services/${s.id}`} className="min-h-11 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-foreground/75 group-hover:text-primary transition-colors">
                    Details <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.25} aria-hidden />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Packages */}
      {featuredDeals.length > 0 && (
      <section id="packages" className="py-24 px-4 lg:px-8 border-t border-border/60">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-14">
            <h2 className="font-heading text-4xl md:text-5xl font-light tracking-tight mb-4">Complete Barat packages.</h2>
            <p className="text-muted-foreground leading-relaxed">All-inclusive bridal experiences. Everything you need for your perfect day, in one seamless package.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-l border-border/60">
            {featuredDeals.map((d, idx) => {
              const isPopular = idx === 0;
              return (
                <div key={d.id} className={`relative p-10 border-r border-b border-border/60 ${isPopular ? 'bg-muted/30' : ''}`}>
                  {isPopular && (
                    <span className="absolute top-6 right-6 text-xs uppercase tracking-[0.18em] text-primary font-semibold">Most popular</span>
                  )}
                  <h3 className="font-heading text-3xl font-light tracking-tight mb-6">{d.name}</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-heading text-4xl text-foreground tabular-nums">{formatPKR(d.discountedPrice)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-8">{formatDuration(d.totalDuration)} session</div>
                  <ul className="space-y-3 mb-10 pt-6 border-t border-border/60">
                    {d.serviceIds.map(sid => {
                      const svc = services.find(x => x.id === sid);
                      return svc ? (
                        <li key={sid} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-primary mt-1 shrink-0" strokeWidth={1.5} aria-hidden />
                          <span>{svc.name}</span>
                        </li>
                      ) : null;
                    })}
                  </ul>
                  <a href="#book" onClick={() => { setMode('booking'); setSubmitted(null); setBookingForm(f => ({ ...f, selection: `deal:${d.id}` })); }} className="block">
                    <Button className="w-full rounded-none text-xs uppercase tracking-[0.2em]" variant={isPopular ? 'default' : 'outline'}>Book this package</Button>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      )}


      {/* Mehndi highlight — henna green + gold palette */}
      <section
        id="mehndi"
        className="relative py-24 px-4 lg:px-8 overflow-hidden"
        style={{
          ['--mh-green' as string]: '#1f3a2b',
          ['--mh-green-deep' as string]: '#12241a',
          ['--mh-green-soft' as string]: '#e8f0e5',
          ['--mh-gold' as string]: '#c9a24a',
          ['--mh-gold-soft' as string]: '#f1dfa4',
          background:
            'radial-gradient(1200px 500px at 10% 0%, rgba(201,162,74,0.18), transparent 60%), radial-gradient(900px 500px at 90% 100%, rgba(45,90,61,0.55), transparent 60%), linear-gradient(180deg, #0b1a12 0%, #12241a 60%, #0b1a12 100%)',
        }}
      >
        {/* Ornamental corners */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #c9a24a, transparent)' }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #c9a24a, transparent)' }} />
        <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full blur-3xl opacity-40" style={{ background: '#1f3a2b' }} />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full blur-3xl opacity-40" style={{ background: '#c9a24a' }} />

        <div className="relative max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div className="relative order-2 md:order-1">
            <div className="absolute -inset-4 rounded-3xl blur-2xl -z-10" style={{ background: 'rgba(31,58,43,0.18)' }} />
            <div
              className="relative overflow-hidden rounded-3xl"
              style={{
                border: '1px solid rgba(201,162,74,0.55)',
                boxShadow: '0 20px 60px -20px rgba(18,36,26,0.55), inset 0 0 0 1px rgba(241,223,164,0.25)',
              }}
            >
              <img
                src={mehndiHero}
                alt="Bridal mehndi henna artistry"
                loading="lazy"
                width={1600}
                height={1024}
                className="w-full h-full object-cover aspect-[4/5]"
              />
            </div>
            <div
              className="absolute -bottom-6 -right-4 md:-right-6 rounded-2xl px-5 py-4 shadow-lg flex items-center gap-3 backdrop-blur"
              style={{ background: 'rgba(255,252,244,0.95)', border: '1px solid rgba(201,162,74,0.55)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #1f3a2b, #2d5a3d)',
                  boxShadow: '0 6px 18px -8px rgba(31,58,43,0.7), inset 0 0 0 1px rgba(241,223,164,0.6)',
                }}
              >
                <Flower2 className="w-5 h-5" style={{ color: '#f1dfa4' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: '#5f5024' }}>Mehndi artistry</p>
                <p className="font-heading font-semibold" style={{ color: '#12241a' }}>
                  {mehndiFrom !== null ? `From ${formatPKR(mehndiFrom)}` : 'Custom quotes'}
                </p>
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <h2 className="font-heading text-4xl md:text-6xl font-light mb-5 tracking-tight" style={{ color: '#f5efdf' }}>
              Delicate motifs,{' '}
              <span className="italic" style={{ color: '#e3c47a' }}>deep stain.</span>
            </h2>
            <p className="mb-6 leading-relaxed max-w-prose" style={{ color: '#d3ddcf' }}>
              From intricate Sodani bridal work to modern Arabic flow, our senior mehndi artists design every pattern around your outfit, hands and event.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Bridal Sodani, Classic & Contemporary styles',
                'Premium organic cones for rich, lasting colour',
                'Custom design consult for brides & guests',
                'Party & Eid bookings welcome',
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: '#e8f0e5' }}>
                  <span
                    className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: '#1f3a2b', boxShadow: 'inset 0 0 0 1px rgba(241,223,164,0.6)' }}
                  >
                    <Check className="w-3 h-3" style={{ color: '#f1dfa4' }} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link to="/mehndi">
                <Button
                  size="lg"
                  className="border-0 hover:opacity-95"
                  style={{
                    background: 'linear-gradient(135deg, #1f3a2b, #2d5a3d)',
                    color: '#f1dfa4',
                    boxShadow: '0 10px 30px -12px rgba(18,36,26,0.7), inset 0 0 0 1px rgba(201,162,74,0.5)',
                  }}
                >
                  Explore Mehndi <ArrowRight className="ml-1 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/?mode=quote#book" onClick={() => { setMode('quote'); setSubmitted(null); }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent hover:bg-transparent"
                  style={{ borderColor: '#c9a24a', color: '#f1dfa4' }}
                >
                  Book a Session
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* About */}
      <section id="about" className="py-24 px-4 lg:px-8 border-t border-border/60">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-heading text-4xl md:text-5xl font-light tracking-tight mb-8">Beauty meets craftsmanship.</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed font-light">
              BeYou Stylin was born from a simple idea: every woman deserves to feel iconic on her most important days. Our team of senior artists brings over a decade of experience in bridal makeup, hair styling, and skincare.
            </p>
            <p className="text-muted-foreground mb-10 leading-relaxed font-light">
              Using only premium products and modern techniques, we tailor every look to your unique features.
            </p>
            <p className="pt-6 border-t border-border/60 text-sm text-muted-foreground">
              {[['500+', 'brides styled'], ['50+', 'signature services'], ['10+', 'years of craft']].map(([n, l], i) => (
                <span key={l}>{i > 0 && ' · '}<strong className="font-semibold text-foreground tabular-nums">{n}</strong> {l}</span>
              ))}
            </p>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden">
            <img src={SITE.heroImage} alt={SITE.heroImageAlt} className="w-full h-full object-cover" style={{ objectPosition: SITE.heroImagePosition }} loading="lazy" />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 lg:px-8 border-t border-border/60">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-14">
            <h2 className="font-heading text-4xl md:text-5xl font-light tracking-tight">Loved by our clients.</h2>
          </div>
          <div className="grid md:grid-cols-3 border-t border-l border-border/60">
            {testimonials.map(t => (
              <div key={t.name} className="p-10 border-r border-b border-border/60">
                <div className="flex gap-1 mb-6" role="img" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-primary text-primary" strokeWidth={1} aria-hidden />)}
                </div>
                <p className="font-heading text-xl font-light italic leading-relaxed mb-8 text-foreground/90">"{t.text}"</p>
                <div className="pt-6 border-t border-border/60">
                  <div className="text-sm font-medium tracking-tight">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Booking Request Form */}
      <section id="book" className="py-24 px-4 lg:px-8 border-t border-border/60 scroll-mt-20">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-12 items-start">
          <div className="lg:col-span-2">
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">
              {mode === 'booking' ? 'Reserve Your Glow Session' : 'Get a Personalised Quote'}
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {mode === 'booking'
                ? 'Pick a package or service, share your preferred date, and our team will personally confirm your slot within a few hours.'
                : 'Not sure what you need? Tell us about your occasion and we\'ll craft a custom quote tailored to your event and budget.'}
            </p>
            <ul className="space-y-3 text-sm">
              {mode === 'booking' ? (
                <>
                  <li className="flex items-start gap-3"><Check className="w-4 h-4 text-primary mt-0.5" /> Personal consultation before every booking</li>
                  <li className="flex items-start gap-3"><Check className="w-4 h-4 text-primary mt-0.5" /> Confirmation via WhatsApp or phone call</li>
                  <li className="flex items-start gap-3"><Check className="w-4 h-4 text-primary mt-0.5" /> Flexible rescheduling, no hidden fees</li>
                </>
              ) : (
                <>
                  <li className="flex items-start gap-3"><Check className="w-4 h-4 text-primary mt-0.5" /> Tailored pricing for weddings, events & groups</li>
                  <li className="flex items-start gap-3"><Check className="w-4 h-4 text-primary mt-0.5" /> Custom bundles beyond our listed packages</li>
                  <li className="flex items-start gap-3"><Check className="w-4 h-4 text-primary mt-0.5" /> Quote shared within 24 hours, no obligation</li>
                </>
              )}
            </ul>
            <div className="mt-8 p-5 rounded-2xl bg-card border border-border">
              <div className="flex items-center gap-2 text-sm font-medium mb-1"><Phone className="w-4 h-4 text-primary" /> Prefer to call?</div>
              <p className="text-sm text-muted-foreground">Reach us at <a href={SITE.phoneHref} className="text-primary font-medium">{SITE.phoneDisplay}</a>, {SITE.hours}.</p>
            </div>
          </div>

          <div className="lg:col-span-3">
            {/* Mode tabs */}
            <div className="inline-flex p-1 rounded-full bg-card border border-border mb-5">
              {(['booking', 'quote'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setSubmitted(null); }}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                    mode === m ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m === 'booking' ? 'Book Appointment' : 'Request a Quote'}
                </button>
              ))}
            </div>

            {submitted ? (
              <div className="p-10 rounded-3xl border border-primary/30 bg-card text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-heading text-2xl font-bold mb-2">
                  {submitted === 'booking' ? 'Booking received' : 'Quote request received'}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {submitted === 'booking'
                    ? 'Thank you! Our team will review your appointment and reach out shortly to confirm your slot.'
                    : "Thank you! We'll review your requirements and share a personalised quote within 24 hours."}
                </p>
                <Button variant="outline" onClick={() => setSubmitted(null)}>Submit another request</Button>
              </div>
            ) : mode === 'booking' ? (
              <form onSubmit={handleBookingSubmit} className="p-6 md:p-8 rounded-3xl border border-border bg-card shadow-sm space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bk-name">Full name *</Label>
                    <Input id="bk-name" value={bookingForm.name} onChange={e => setBookingForm({ ...bookingForm, name: e.target.value })} maxLength={100} placeholder="Your name" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bk-phone">Phone *</Label>
                    <Input id="bk-phone" type="tel" value={bookingForm.phone} onChange={e => setBookingForm({ ...bookingForm, phone: e.target.value })} maxLength={20} placeholder="03XX XXXXXXX" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bk-email">Email (optional)</Label>
                  <Input id="bk-email" type="email" value={bookingForm.email} onChange={e => setBookingForm({ ...bookingForm, email: e.target.value })} maxLength={150} placeholder="you@email.com" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bk-service">Select package or service *</Label>
                  <select
                    id="bk-service"
                    value={bookingForm.selection}
                    onChange={e => setBookingForm({ ...bookingForm, selection: e.target.value })}
                    required
                    className={selectClass}
                  >
                    <option value="">Choose one</option>
                    {activeDeals.length > 0 && (
                      <optgroup label="Bridal Packages">
                        {activeDeals.map(d => (
                          <option key={d.id} value={`deal:${d.id}`}>{d.name} · {formatPKR(d.discountedPrice)}</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Services">
                      {activeServices.map(s => (
                        <option key={s.id} value={`service:${s.id}`}>
                          {s.name}{s.price > 0 ? ` · ${formatPKR(s.price)}` : ' · Custom price'}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Need something custom?{' '}
                    <button type="button" onClick={() => setMode('quote')} className="text-primary font-medium hover:underline">Request a quote instead</button>.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bk-date">Preferred date *</Label>
                    <Input id="bk-date" type="date" min={todayStr} value={bookingForm.date} onChange={e => setBookingForm({ ...bookingForm, date: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bk-time">Preferred time *</Label>
                    <Input id="bk-time" type="time" min={bookingForm.date === todayStr ? new Date().toTimeString().slice(0, 5) : undefined} value={bookingForm.time} onChange={e => setBookingForm({ ...bookingForm, time: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bk-notes">Notes (optional)</Label>
                  <Textarea id="bk-notes" value={bookingForm.notes} onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })} maxLength={500} rows={3} placeholder="Any special requests, occasion details, etc." />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit Booking Request
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Bookings are subject to availability. Our team confirms every appointment manually.
                </p>
              </form>
            ) : (
              <form onSubmit={handleQuoteSubmit} className="p-6 md:p-8 rounded-3xl border border-border bg-card shadow-sm space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="qt-name">Full name *</Label>
                    <Input id="qt-name" value={quoteForm.name} onChange={e => setQuoteForm({ ...quoteForm, name: e.target.value })} maxLength={100} placeholder="Your name" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="qt-phone">Phone *</Label>
                    <Input id="qt-phone" type="tel" value={quoteForm.phone} onChange={e => setQuoteForm({ ...quoteForm, phone: e.target.value })} maxLength={20} placeholder="03XX XXXXXXX" required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="qt-email">Email (optional)</Label>
                  <Input id="qt-email" type="email" value={quoteForm.email} onChange={e => setQuoteForm({ ...quoteForm, email: e.target.value })} maxLength={150} placeholder="you@email.com" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="qt-service">Interested in (optional)</Label>
                  <select
                    id="qt-service"
                    value={quoteForm.selection}
                    onChange={e => setQuoteForm({ ...quoteForm, selection: e.target.value })}
                    className={selectClass}
                  >
                    <option value="">Not sure yet, I need guidance</option>
                    {activeDeals.length > 0 && (
                      <optgroup label="Bridal Packages">
                        {activeDeals.map(d => (
                          <option key={d.id} value={`deal:${d.id}`}>{d.name}</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Services">
                      {activeServices.map(s => (
                        <option key={s.id} value={`service:${s.id}`}>{s.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="qt-event">Event date (optional)</Label>
                    <Input id="qt-event" type="date" min={todayStr} value={quoteForm.eventDate} onChange={e => setQuoteForm({ ...quoteForm, eventDate: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="qt-budget">Budget range (optional)</Label>
                    <Input id="qt-budget" value={quoteForm.budget} onChange={e => setQuoteForm({ ...quoteForm, budget: e.target.value })} maxLength={100} placeholder="e.g. Rs. 50,000 – 80,000" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="qt-notes">Tell us what you need *</Label>
                  <Textarea id="qt-notes" value={quoteForm.notes} onChange={e => setQuoteForm({ ...quoteForm, notes: e.target.value })} maxLength={2000} rows={4} placeholder="Describe your event, group size, services you're considering, timing preferences, etc." required />
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Request Quote
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  We'll respond within 24 hours with a personalised quote, no obligation.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="py-24 px-4 lg:px-8 border-t border-border/60">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="font-heading text-5xl md:text-6xl font-light tracking-tight mb-6">Ready to look <span className="italic text-primary">iconic?</span></h2>
          <p className="text-muted-foreground mb-10 max-w-xl mx-auto font-light leading-relaxed">
            Book your consultation today. Our artists are ready to design a look that is uniquely you.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-14">
            <a href="#book"><Button size="lg" className="rounded-none px-8 text-xs uppercase tracking-[0.2em]">Book Appointment</Button></a>
            <a href={SITE.phoneHref}><Button size="lg" variant="outline" className="rounded-none px-8 text-xs uppercase tracking-[0.2em]">Call Us</Button></a>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 text-sm text-muted-foreground pt-10 border-t border-border/60">
            <div className="flex items-center justify-center gap-2"><MapPin className="w-3.5 h-3.5 text-primary" strokeWidth={1.25} aria-hidden /> {SITE.city}</div>
            <a href={SITE.phoneHref} className="flex items-center justify-center gap-2 hover:text-foreground"><Phone className="w-3.5 h-3.5 text-primary" strokeWidth={1.25} aria-hidden /> {SITE.phoneDisplay}</a>
            <a href={`mailto:${SITE.email}`} className="flex items-center justify-center gap-2 hover:text-foreground"><Mail className="w-3.5 h-3.5 text-primary" strokeWidth={1.25} aria-hidden /> {SITE.email}</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4 lg:px-8 border-t border-border/60">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-auto" />
            <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} {SITE.name}</span>
          </div>
          <div className="flex items-center gap-5 text-muted-foreground">
            {SITE.instagramUrl && (
              <a href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-11 h-11 inline-flex items-center justify-center hover:text-primary transition-colors"><Instagram className="w-4 h-4" strokeWidth={1.25} /></a>
            )}
            {SITE.facebookUrl && (
              <a href={SITE.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-11 h-11 inline-flex items-center justify-center hover:text-primary transition-colors"><Facebook className="w-4 h-4" strokeWidth={1.25} /></a>
            )}
            <Link to="/auth" className="min-h-11 inline-flex items-center text-xs uppercase tracking-[0.16em] hover:text-primary transition-colors">Staff &amp; client sign in</Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
