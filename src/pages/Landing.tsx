import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useSalon } from '@/context/SalonContext';
import heroImage from '@/assets/hero-salon.jpg';
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

  const initialForm = { name: '', phone: '', email: '', selection: '', date: '', time: '', notes: '' };
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.date || !form.time) {
      toast({ title: 'Please fill in your name, phone, date and time', variant: 'destructive' });
      return;
    }
    let serviceId: string | undefined;
    let dealId: string | undefined;
    if (form.selection.startsWith('service:')) serviceId = form.selection.slice(8);
    else if (form.selection.startsWith('deal:')) dealId = form.selection.slice(5);

    addAppointmentRequest({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      serviceId,
      dealId,
      preferredDate: form.date,
      preferredTime: form.time,
      notes: form.notes.trim() || undefined,
    });
    setSubmitted(true);
    setForm(initialForm);
    toast({ title: 'Request submitted', description: 'Our team will contact you shortly to confirm.' });
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Scissors className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-semibold">BeYou Stylin</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#services" className="hover:text-foreground transition-colors">Services</a>
            <a href="#packages" className="hover:text-foreground transition-colors">Packages</a>
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
            <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <Link to="/admin">
            <Button size="sm" variant="outline">Admin Panel</Button>
          </Link>
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
              <Link to="/admin/bookings"><Button size="lg" className="text-base px-8">Book Appointment <ArrowRight className="ml-1" /></Button></Link>
              <a href="#packages"><Button size="lg" variant="outline" className="text-base px-8">View Packages</Button></a>
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
      <section id="services" className="py-24 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm uppercase tracking-widest text-primary font-medium mb-3">What We Offer</p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">Curated Beauty, Every Detail</h2>
            <p className="text-muted-foreground">From your everyday glow-up to once-in-a-lifetime bridal moments — our services are designed to celebrate you.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map(f => (
              <div key={f.title} className="group p-8 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <f.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="font-heading text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
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
            <Link to="/admin/services" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
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
                  <Link to="/admin/bookings" className="block">
                    <Button className="w-full" variant={isPopular ? 'default' : 'outline'}>Book This Package</Button>
                  </Link>
                </div>
              );
            })}
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
              <Link to="/admin/bookings"><Button size="lg" variant="secondary" className="px-8">Book Appointment</Button></Link>
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
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Scissors className="w-4 h-4 text-primary-foreground" />
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
