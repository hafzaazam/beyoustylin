import { Link } from 'react-router-dom';
import PublicLayout from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import mehndiHero from '@/assets/mehndi-hero.jpg';
import { Flower2, Sparkles, Crown, Clock, ArrowRight, Check, Palette, HeartHandshake } from 'lucide-react';

const styles = [
  {
    icon: Crown,
    name: 'Bridal Sodani',
    price: 'From Rs. 25,000',
    duration: '4 – 6 hrs',
    desc: 'Ultra-fine Sodani artistry for both hands, feet and forearms — the signature bridal ritual.',
    features: ['Full hands & feet', 'Detailed forearm work', 'Deep stain finish', 'Complimentary touch-ups'],
    highlight: true,
  },
  {
    icon: Flower2,
    name: 'Classic Bridal',
    price: 'From Rs. 15,000',
    duration: '3 – 4 hrs',
    desc: 'Traditional bridal motifs — paisleys, florals and jaali — perfect for Mayoun and Mehndi nights.',
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
    name: 'Arabic & Contemporary',
    price: 'From Rs. 5,000',
    duration: '1 – 2 hrs',
    desc: 'Bold flowing Arabic patterns, negative space designs and contemporary glitter accents.',
    features: ['Custom design consult', 'Optional gold/glitter', 'Statement finger detailing'],
    highlight: false,
  },
];

const process = [
  { step: '01', title: 'Consultation', desc: 'Share your event, outfit and design inspirations with our lead mehndi artist.' },
  { step: '02', title: 'Design Preview', desc: 'We sketch a custom motif plan tailored to your hands, dress detailing and skin tone.' },
  { step: '03', title: 'Artistry Session', desc: 'Applied with premium organic cones in a calm, unhurried studio setting.' },
  { step: '04', title: 'Aftercare', desc: 'Take-home aftercare kit and rich-stain ritual so your mehndi peaks on your event day.' },
];

const MehndiPublic = () => {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={mehndiHero}
            alt="Bridal mehndi henna artistry on hands"
            className="w-full h-full object-cover"
            width={1600}
            height={1024}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/30" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-20 w-full">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
              <Flower2 className="w-3.5 h-3.5" />
              Bridal Mehndi Artistry
            </div>
            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
              Stories Written in <span className="text-primary italic">Henna</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl">
              From delicate Sodani bridal work to modern Arabic patterns — our senior mehndi artists design every motif around you.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/services?category=Mehndi"><Button size="lg" className="text-base px-8">Book Your Session <ArrowRight className="ml-1" /></Button></Link>
              <a href="#styles"><Button size="lg" variant="outline" className="text-base px-8">View Styles</Button></a>
            </div>
          </div>
        </div>
      </section>

      {/* Styles */}
      <section id="styles" className="py-24 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-sm uppercase tracking-widest text-primary font-medium mb-3">Mehndi Menu</p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">Choose Your Style</h2>
            <p className="text-muted-foreground">Every hand tells a different story — pick the artistry that suits your moment.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {styles.map((s) => (
              <div
                key={s.name}
                className={`relative p-8 rounded-3xl border-2 transition-all ${
                  s.highlight
                    ? 'border-primary bg-primary/5 shadow-xl'
                    : 'border-border bg-card hover:border-primary/40 hover:shadow-md'
                }`}
              >
                {s.highlight && (
                  <div className="absolute -top-3 left-8 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    Signature
                  </div>
                )}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-primary/20 shadow-[0_8px_24px_-10px_hsl(328_85%_55%/0.5)]"
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  <s.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-heading text-2xl font-bold">{s.name}</h3>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0 mt-1.5">
                    <Clock className="w-3.5 h-3.5" /> {s.duration}
                  </span>
                </div>
                <p className="text-primary font-semibold mb-4">{s.price}</p>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5">{s.desc}</p>
                <ul className="space-y-2 mb-6">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/services?category=Mehndi">
                  <Button className="w-full" variant={s.highlight ? 'default' : 'outline'}>
                    Enquire & Book
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-24 px-4 lg:px-8 bg-muted/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-sm uppercase tracking-widest text-primary font-medium mb-3">The Ritual</p>
            <h2 className="font-heading text-4xl md:text-5xl font-bold mb-4">How Your Mehndi Session Unfolds</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {process.map((p) => (
              <div key={p.step} className="p-6 rounded-2xl bg-card border border-border">
                <span className="font-heading text-4xl font-bold text-primary/30">{p.step}</span>
                <h3 className="font-heading text-lg font-semibold mt-3 mb-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 lg:px-8">
        <div
          className="max-w-5xl mx-auto rounded-3xl px-8 py-14 md:py-16 text-center relative overflow-hidden ring-1 ring-primary/20 shadow-[0_20px_60px_-20px_hsl(328_85%_55%/0.35)]"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-primary-foreground/20 blur-3xl" />
          <HeartHandshake className="w-10 h-10 mx-auto mb-4 text-primary-foreground" />
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
            Reserve Your Mehndi Date
          </h2>
          <p className="text-primary-foreground/90 max-w-xl mx-auto mb-8">
            Bridal dates fill fast during wedding season. Secure your slot with a quick enquiry.
          </p>
          <Link to="/services?category=Mehndi">
            <Button size="lg" variant="secondary" className="rounded-full font-semibold shadow-lg hover:shadow-xl">
              Book Now <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
};

export default MehndiPublic;
