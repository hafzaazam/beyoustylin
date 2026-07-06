import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useSalon } from '@/context/SalonContext';
import heroImage from '@/assets/hero-salon.jpg';
import mehndiHero from '@/assets/mehndi-hero.jpg';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import {
  Scissors, Sparkles, Flower2, Palette, Crown, HeartHandshake,
  Star, Calendar, Award, ShieldCheck, Clock, MapPin, Phone, Mail,
  Instagram, Facebook, ArrowRight, Check, Send, CheckCircle2
} from 'lucide-react';

const featureCards = [
  { icon: Crown, title: 'Bridal Specialists', desc: 'Signature Barat, Walima, Nikah & Engagement makeup crafted by senior artists.' },
  { icon: Sparkles, title: 'Hydra & 3D Facials', desc: 'Advanced skincare treatments for radiant, camera-ready glow.' },
  { icon: Scissors, title: 'Precision Hair Cutting', desc: 'Signature cuts, layers, feathers & kids styling by expert stylists.' },
  { icon: Palette, title: 'Hair Colour & Keratin', desc: 'Fashion colours, rebonding, extenso & keratin smoothing treatments.' },
  { icon: Flower2, title: 'Bridal Mehndi', desc: 'Delicate Sodani & classic mehndi artistry for your big day.' },
  { icon: HeartHandshake, title: 'Party Packages', desc: 'Full glam party looks, hairstyles & lashes for every occasion.' },
];

const perks = [
  { icon: Award, label: '10+ Years Experience' },
  { icon: ShieldCheck, label: 'Certified Artists' },
  { icon: Clock, label: 'Punctual Service' },
  { icon: Star, label: '5-Star Rated Studio' },
];

const testimonials = [
  { name: 'Ayesha K.', role: 'Barat Bride', text: 'My Barat look was absolutely stunning. The team made me feel like royalty from start to finish.', rating: 5 },
  { name: 'Sana M.', role: 'Party Client', text: 'Best party makeup in town! The hairstyle held perfectly through the entire night. Highly recommend.', rating: 5 },
  { name: 'Hira R.', role: 'Regular Client', text: 'Their Hydra Facial is life-changing. My skin has never looked better. The ambience is so calming too.', rating: 5 },
];

const Landing = () => {
  const { deals, services, addAppointmentRequest } = useSalon();
  const { toast } = useToast();
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
      setBookingForm(f => ({ ...f, selection: `service:${svc}` }));
    } else if (deal) {
      setMode('booking');
      setBookingForm(f => ({ ...f, selection: `deal:${deal}` }));
    }
    if ((svc || deal) || location.hash === '#book') {
      setTimeout(() => {
        document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [location.search, location.hash]);


  const parseSelection = (sel: string): { serviceId?: string; dealId?: string } => {
    if (sel.startsWith('service:')) return { serviceId: sel.slice(8) };
    if (sel.startsWith('deal:')) return { dealId: sel.slice(5) };
    return {};
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.name.trim() || !bookingForm.phone.trim() || !bookingForm.date || !bookingForm.time) {
      toast({ title: 'Please fill in your name, phone, date and time', variant: 'destructive' });
      return;
    }
    if (!bookingForm.selection) {
      toast({ title: 'Please select a package or service', description: 'For custom inquiries, switch to "Request a Quote".', variant: 'destructive' });
      return;
    }
    const { serviceId, dealId } = parseSelection(bookingForm.selection);
    addAppointmentRequest({
      type: 'booking',
      name: bookingForm.name.trim(),
      phone: bookingForm.phone.trim(),
      email: bookingForm.email.trim() || undefined,
      serviceId,
      dealId,
      preferredDate: bookingForm.date,
      preferredTime: bookingForm.time,
      notes: bookingForm.notes.trim() || undefined,
    });
    setSubmitted('booking');
    setBookingForm(initialBooking);
    toast({ title: 'Booking request submitted', description: 'Our team will contact you shortly to confirm.' });
  };

  const handleQuoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteForm.name.trim() || !quoteForm.phone.trim() || !quoteForm.notes.trim()) {
      toast({ title: 'Please fill in your name, phone and describe what you need', variant: 'destructive' });
      return;
    }
    const { serviceId, dealId } = parseSelection(quoteForm.selection);
    addAppointmentRequest({
      type: 'quote',
      name: quoteForm.name.trim(),
      phone: quoteForm.phone.trim(),
      email: quoteForm.email.trim() || undefined,
      serviceId,
      dealId,
      eventDate: quoteForm.eventDate || undefined,
      budget: quoteForm.budget.trim() || undefined,
      notes: quoteForm.notes.trim(),
    });
    setSubmitted('quote');
    setQuoteForm(initialQuote);
    toast({ title: 'Quote request submitted', description: "We'll get back to you with a personalised quote soon." });
  };

  const todayStr = new Date().toISOString().slice(0, 10);

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
            <Link to="/admin">
              <Button size="sm" variant="outline">Admin Panel</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 min-h-[100vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="BeYou Stylin luxury salon" className="w-full h-full object-cover" width={1600} height={1024} />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-20 w-full">
          <div className="max-w-2xl animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Premium Bridal & Beauty Studio
            </div>
            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
              Where Every Bride Becomes <span className="text-primary italic">Iconic</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl">
              Signature bridal makeup, hair styling, mehndi and skincare — thoughtfully crafted for your most beautiful moments.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#book"><Button size="lg" className="text-base px-8">Book Appointment <ArrowRight className="ml-1" /></Button></a>
              <Link to="/packages"><Button size="lg" variant="outline" className="text-base px-8">View Packages</Button></Link>
            </div>
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {perks.map(p => (
                <div key={p.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <p.icon className="w-4 h-4 text-primary shrink-0" />
                  <span>{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="services" className="relative py-28 px-4 lg:px-8 overflow-hidden">
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-accent/40 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <p className="text-[11px] uppercase tracking-[0.25em] text-primary font-semibold">What We Offer</p>
            </div>
            <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold mb-5 tracking-tight">
              Curated Beauty,{' '}
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'var(--gradient-primary)' }}>
                Every Detail
              </span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">From your everyday glow-up to once-in-a-lifetime bridal moments — our services are designed to celebrate you.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((f, i) => (
              <div
                key={f.title}
                className="group relative p-8 rounded-3xl border border-border/60 bg-card/80 backdrop-blur-sm hover:border-primary/40 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_hsl(328_85%_55%/0.35)] transition-all duration-300 overflow-hidden"
              >
                {/* Hover gradient wash */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-0" style={{ background: 'linear-gradient(135deg, hsl(335 85% 96%), transparent 60%)' }} />
                {/* Number badge */}
                <span className="absolute top-6 right-6 font-heading text-5xl font-bold text-primary/10 group-hover:text-primary/20 transition-colors">
                  0{i + 1}
                </span>
                <div
                  className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-[0_8px_24px_-10px_hsl(328_85%_55%/0.5)] ring-1 ring-primary/20 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300"
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  <f.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="relative font-heading text-xl font-semibold mb-3 tracking-tight">{f.title}</h3>
                <p className="relative text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                {/* Bottom accent line */}
                <div className="relative mt-6 pt-5 border-t border-border/50 flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                  <span className="text-xs font-semibold uppercase tracking-wider">Explore</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Popular services */}
      <section className="py-24 px-4 lg:px-8 bg-muted/40">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-12">
            <div>
              <p className="text-sm uppercase tracking-widest text-primary font-medium mb-3">Signature Menu</p>
              <h2 className="font-heading text-4xl md:text-5xl font-bold">Most Loved Services</h2>
            </div>
            <Link to="/services" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              View all services <ArrowRight className="w-4 h-4" />
            </Link>

          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredServices.map(s => (
              <div key={s.id} className="bg-card p-6 rounded-2xl border border-border flex flex-col gap-3 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{s.category}</span>
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <h3 className="font-heading text-lg font-semibold">{s.name}</h3>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
                  <span className="text-primary font-bold text-lg">Rs. {s.price.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">{s.duration} min</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="py-24 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm uppercase tracking-widest text-primary font-medium mb-3">Bridal Packages</p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">Complete Barat Packages</h2>
            <p className="text-muted-foreground">All-inclusive bridal experiences — everything you need for your perfect day, in one seamless package.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredDeals.map((d, idx) => {
              const isPopular = idx === 0;
              return (
                <div key={d.id} className={`relative p-8 rounded-3xl border-2 transition-all ${isPopular ? 'border-primary bg-primary/5 shadow-xl' : 'border-border bg-card hover:border-primary/40'}`}>
                  {isPopular && (
                    <div className="absolute -top-3 left-8 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      Most Popular
                    </div>
                  )}
                  <h3 className="font-heading text-2xl font-bold mb-2">{d.name}</h3>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-4xl font-heading font-bold text-primary">Rs. {d.discountedPrice.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground">/ package</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-4">≈ {Math.round(d.totalDuration / 60)} hours session</div>
                  <ul className="space-y-2.5 mb-8">
                    {d.serviceIds.map(sid => {
                      const svc = services.find(x => x.id === sid);
                      return svc ? (
                        <li key={sid} className="flex items-start gap-2.5 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <span>{svc.name}</span>
                        </li>
                      ) : null;
                    })}
                  </ul>
                  <a href="#book" onClick={() => { setMode('booking'); setBookingForm(f => ({ ...f, selection: `deal:${d.id}` })); }} className="block">
                    <Button className="w-full" variant={isPopular ? 'default' : 'outline'}>Book This Package</Button>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

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
                <p className="text-xs" style={{ color: '#7a6a3a' }}>Bridal Sodani</p>
                <p className="font-heading font-semibold" style={{ color: '#12241a' }}>From Rs. 25,000</p>
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <p
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] font-semibold mb-4 px-3 py-1 rounded-full"
              style={{
                color: '#f1dfa4',
                background: 'linear-gradient(90deg, rgba(201,162,74,0.22), rgba(201,162,74,0.05))',
                border: '1px solid rgba(201,162,74,0.55)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#c9a24a' }} />
              Mehndi Artistry
            </p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-5 tracking-tight" style={{ color: '#f5efdf' }}>
              Delicate Motifs,{' '}
              <span
                className="italic bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #c9a24a, #f1dfa4, #c9a24a)' }}
              >
                Deep Stain
              </span>
            </h2>
            <p className="mb-6 leading-relaxed" style={{ color: 'rgba(232,240,229,0.75)' }}>
              From intricate Sodani bridal work to modern Arabic flow — our senior mehndi artists design every pattern around your outfit, hands and event.
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
              <Link to="/services?category=Mehndi">
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
      <section id="about" className="py-24 px-4 lg:px-8 bg-muted/40">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-sm uppercase tracking-widest text-primary font-medium mb-3">Our Story</p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">Beauty Meets Craftsmanship</h2>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              BeYou Stylin was born from a simple idea — that every woman deserves to feel iconic on her most important days. Our team of senior artists brings over a decade of experience in bridal makeup, hair styling, and skincare.
            </p>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Using only premium products and modern techniques, we tailor every look to your unique features, so you don't just look beautiful — you look like the best version of yourself.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="font-heading text-3xl font-bold text-primary">500+</div>
                <div className="text-xs text-muted-foreground mt-1">Brides Styled</div>
              </div>
              <div>
                <div className="font-heading text-3xl font-bold text-primary">50+</div>
                <div className="text-xs text-muted-foreground mt-1">Signature Services</div>
              </div>
              <div>
                <div className="font-heading text-3xl font-bold text-primary">10+</div>
                <div className="text-xs text-muted-foreground mt-1">Years of Craft</div>
              </div>
            </div>
          </div>
          <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl">
            <img src={heroImage} alt="BeYou Stylin studio interior" className="w-full h-full object-cover" loading="lazy" />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm uppercase tracking-widest text-primary font-medium mb-3">Kind Words</p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold">Loved by Our Clients</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="p-8 rounded-2xl border border-border bg-card">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-primary text-primary" />)}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">"{t.text}"</p>
                <div className="pt-4 border-t border-border">
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking Request Form */}
      <section id="book" className="py-24 px-4 lg:px-8 bg-muted/40 scroll-mt-20">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-10 items-start">
          <div className="lg:col-span-2">
            <p className="text-sm uppercase tracking-widest text-primary font-medium mb-3">
              {mode === 'booking' ? 'Book Appointment' : 'Request a Quote'}
            </p>
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
                  <li className="flex items-start gap-3"><Check className="w-4 h-4 text-primary mt-0.5" /> Flexible rescheduling — no hidden fees</li>
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
              <p className="text-sm text-muted-foreground">Reach us at <a href="tel:+923001234567" className="text-primary font-medium">+92 300 1234567</a> — Mon–Sat, 10am–8pm.</p>
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
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">— Choose one —</option>
                    {activeDeals.length > 0 && (
                      <optgroup label="Bridal Packages">
                        {activeDeals.map(d => (
                          <option key={d.id} value={`deal:${d.id}`}>{d.name} — Rs. {d.discountedPrice.toLocaleString()}</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Services">
                      {activeServices.map(s => (
                        <option key={s.id} value={`service:${s.id}`}>
                          {s.name}{s.price > 0 ? ` — Rs. ${s.price.toLocaleString()}` : ' — Custom price'}
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
                    <Input id="bk-time" type="time" value={bookingForm.time} onChange={e => setBookingForm({ ...bookingForm, time: e.target.value })} required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bk-notes">Notes (optional)</Label>
                  <Textarea id="bk-notes" value={bookingForm.notes} onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })} maxLength={500} rows={3} placeholder="Any special requests, occasion details, etc." />
                </div>

                <Button type="submit" size="lg" className="w-full">
                  <Send className="w-4 h-4" /> Submit Booking Request
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
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Not sure — need guidance</option>
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
                    <Input id="qt-budget" value={quoteForm.budget} onChange={e => setQuoteForm({ ...quoteForm, budget: e.target.value })} maxLength={50} placeholder="e.g. Rs. 50,000 – 80,000" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="qt-notes">Tell us what you need *</Label>
                  <Textarea id="qt-notes" value={quoteForm.notes} onChange={e => setQuoteForm({ ...quoteForm, notes: e.target.value })} maxLength={1000} rows={4} placeholder="Describe your event, group size, services you're considering, timing preferences, etc." required />
                </div>

                <Button type="submit" size="lg" className="w-full">
                  <Send className="w-4 h-4" /> Request Quote
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  We'll respond within 24 hours with a personalised quote — no obligation.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="contact" className="py-24 px-4 lg:px-8">
        <div className="max-w-5xl mx-auto rounded-3xl p-10 md:p-16 bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary-foreground blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-primary-foreground blur-3xl" />
          </div>
          <div className="relative">
            <Calendar className="w-12 h-12 mx-auto mb-6 opacity-90" />
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">Ready to Look Iconic?</h2>
            <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">Book your consultation today. Our artists are ready to design a look that's uniquely you.</p>
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              <a href="#book"><Button size="lg" variant="secondary" className="px-8">Book Appointment</Button></a>
              <a href="tel:+923001234567"><Button size="lg" variant="outline" className="px-8 bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">Call Us</Button></a>
            </div>
            <div className="grid sm:grid-cols-3 gap-6 text-sm opacity-90 pt-8 border-t border-primary-foreground/20">
              <div className="flex items-center justify-center gap-2"><MapPin className="w-4 h-4" /> Karachi, Pakistan</div>
              <div className="flex items-center justify-center gap-2"><Phone className="w-4 h-4" /> +92 300 1234567</div>
              <div className="flex items-center justify-center gap-2"><Mail className="w-4 h-4" /> hello@beyoustylin.com</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white ring-1 ring-primary/20 flex items-center justify-center overflow-hidden">
              <Logo className="w-8 h-8" />
            </div>
            <span className="font-heading font-semibold">BeYou Stylin</span>
            <span className="text-xs text-muted-foreground ml-2">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors"><Instagram className="w-4 h-4" /></a>
            <a href="#" className="hover:text-primary transition-colors"><Facebook className="w-4 h-4" /></a>
            <Link to="/admin" className="text-sm hover:text-primary transition-colors ml-2">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
