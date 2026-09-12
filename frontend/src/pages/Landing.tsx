import { useRef, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Palette, Megaphone, Code, BarChart2, Smartphone } from 'lucide-react';
import Footer from '../components/Footer';
import { useScrollY, useParallax, useStickyProgress, useInView } from '../hooks/useParallax';
import { HeroScene } from '../components/3d/HeroScene';
import { IsolatedErrorBoundary } from '../components/IsolatedErrorBoundary';

const CATEGORIES = [
  {
    title: 'Cybersecurity',
    description: 'Penetration testing, compliance audits, and security consulting from students who live and breathe infosec.',
    icon: Shield,
    image: null as string | null,
  },
  {
    title: 'Graphic Design',
    description: 'Brand identity, illustration, and visual storytelling from creatives building their portfolios.',
    icon: Palette,
    image: null as string | null,
  },
  {
    title: 'Marketing',
    description: 'Social media strategy, content marketing, and growth campaigns driven by fresh perspectives.',
    icon: Megaphone,
    image: null as string | null,
  },
];

const MORE_CATEGORIES = [
  { label: 'Web Development', icon: Code },
  { label: 'Data Science', icon: BarChart2 },
  { label: 'Mobile Apps', icon: Smartphone },
];

function ParallaxOrb({
  size, top, left, right, color, speed, blur = 80, opacity = 0.18,
}: {
  size: number; top?: string; left?: string; right?: string;
  color: string; speed: number; blur?: number; opacity?: number;
}) {
  const transform = useParallax(speed);
  return (
    <div
      aria-hidden
      className="absolute pointer-events-none rounded-full"
      style={{
        width: size, height: size,
        top, left, right,
        background: color,
        filter: `blur(${blur}px)`,
        opacity,
        transform,
        willChange: 'transform',
      }}
    />
  );
}

function LazySection({
  children,
  className = '',
  delay = 0,
  translateY = 36,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  translateY?: number;
}) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.12 });
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0px)' : `translateY(${translateY}px)`,
        transition: `opacity 0.65s ease ${delay}s, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}

function LazyCard({ children, delay, className = '' }: { children: ReactNode; delay: number; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.1 });
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0px) scale(1)' : 'translateY(48px) scale(0.97)',
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}

function StickyHero() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progress   = useStickyProgress(wrapperRef as RefObject<HTMLElement>);
  const scrollY    = useScrollY();

  const contentScale   = 1 - progress * 0.08;
  const contentOpacity = 1 - progress * 2.2;
  const contentBlur    = progress * 8;
  const heroTextY      = (scrollY * 0.18).toFixed(2);

  return (
    <div ref={wrapperRef} style={{ height: '150vh' }} className="relative">
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-cream">

        {/* App-like translucent circle backdrop */}
        <div aria-hidden className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-28 w-130 h-130 rounded-full bg-sand-light opacity-55" />
          <div className="absolute -top-36 -right-24 w-115 h-115 rounded-full bg-cream-dark opacity-70" />
          <div className="absolute top-32 -right-20 w-90 h-90 rounded-full bg-sand opacity-30" />
          <div className="absolute -bottom-40 left-12 w-130 h-130 rounded-full bg-sand-light opacity-45" />
        </div>

        <ParallaxOrb size={480} top="-60px"  left="-100px" color="radial-gradient(circle, #1C3A28 0%, transparent 70%)" speed={0.15} opacity={0.12} blur={100} />
        <ParallaxOrb size={340} top="80px"   right="-60px" color="radial-gradient(circle, #BDD0B4 0%, transparent 70%)" speed={0.30} opacity={0.14} blur={90}  />
        <ParallaxOrb size={220} top="160px"  left="40%"    color="radial-gradient(circle, #C4622A 0%, transparent 70%)" speed={0.50} opacity={0.06} blur={80}  />

        <div
          className="relative z-10 animate-fade-up"
          style={{
            transform: `translateY(${heroTextY}px) scale(${contentScale.toFixed(4)})`,
            opacity: Math.max(0, contentOpacity),
            filter: `blur(${contentBlur.toFixed(2)}px)`,
            willChange: 'transform, opacity, filter',
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-muted mb-4">
            For Cordians, by Cordians
          </p>
          <h1 className="mx-auto text-4xl md:text-5xl lg:text-6xl font-black text-foreground leading-tight max-w-2xl animate-fade-up animate-fade-up-delay-1">
            Connecting Skills<br className="hidden sm:block" /> to Every Need.
          </h1>
          <p className="mx-auto mt-5 text-sm md:text-base text-stone-muted max-w-md leading-relaxed animate-fade-up animate-fade-up-delay-2">
            A dedicated space for Cordians to find work, gain experience, and help each other.
          </p>

          <div className="mx-auto mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto justify-center animate-fade-up animate-fade-up-delay-3">
            <Link
              to="/register?role=student"
              className="bg-navy hover:bg-navy-light text-white text-sm font-medium px-7 py-2.5 rounded-lg text-center transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              Be a Freelancer
            </Link>
            <Link
              to="/register?role=client"
              className="bg-white border border-stone-border hover:border-navy/20 text-foreground text-sm font-medium px-7 py-2.5 rounded-lg text-center transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5"
            >
              Hire a Freelancer
            </Link>
          </div>
        </div>

        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
          style={{ opacity: Math.max(0, 1 - progress * 8), transition: 'opacity 0.3s' }}
        >
          <span className="text-[10px] uppercase tracking-widest text-stone-muted">Scroll</span>
          <div className="w-px h-8 bg-linear-to-b from-stone-300 to-transparent animate-pulse" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-cream to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-cream flex flex-col overflow-x-hidden">
      <StickyHero />

      {/* Interactive 3D Physics Talent Hub */}
      <section className="relative max-w-5xl mx-auto w-full px-6 py-10 -mt-10 z-20">
        <div className="rounded-3xl border border-stone-border bg-white/80 backdrop-blur-md overflow-hidden shadow-sm p-6 md:p-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-md">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-muted bg-sand-light/70 border border-stone-border/70 px-3 py-1 rounded-full">
                Interactive Physics & Talent Network
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-foreground mt-3.5 tracking-tight">
                Cordian Skills Connected in Motion
              </h2>
              <p className="text-sm text-stone-muted mt-2.5 leading-relaxed">
                Interact with our real-time 3D physics network. Drag, tilt, and explore dynamic nodes connecting student freelancers with verified clients.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-stone-muted">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-navy" /> Web & Code
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-sand" /> Graphic Design
                </span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent" /> Growth Marketing
                </span>
              </div>
            </div>
            <div className="w-full lg:w-120 h-80 rounded-2xl bg-cream-dark/30 border border-stone-border/60 overflow-hidden relative shadow-inner">
              <IsolatedErrorBoundary fallbackTitle="3D Scene Unavailable" fallbackMessage="Your browser or device does not currently support WebGL rendering.">
                <HeroScene />
              </IsolatedErrorBoundary>
            </div>
          </div>
        </div>
      </section>

      {/* Category cards */}
      <section className="relative max-w-5xl mx-auto w-full px-6 pb-20 bg-cream">
        <LazySection className="mb-8" delay={0}>
          <h2 className="text-xl font-bold text-foreground">Browse by category</h2>
          <p className="text-sm text-stone-muted mt-1">Find talent across the skills you need most</p>
        </LazySection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CATEGORIES.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <LazyCard key={cat.title} delay={i * 0.1}>
                <div className="bg-white border border-stone-border rounded-lg overflow-hidden h-full hover:border-navy/20 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
                  {/* Image area — replace with <img> when ready */}
                  <div className="h-44 bg-navy relative">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                          <Icon size={24} className="text-white/60" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-foreground text-sm mb-1.5">{cat.title}</h3>
                    <p className="text-xs text-stone-muted leading-relaxed">{cat.description}</p>
                  </div>
                </div>
              </LazyCard>
            );
          })}
        </div>

        <LazySection className="mt-6 flex flex-wrap gap-2.5 items-center justify-center" delay={0.2}>
          {MORE_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.label}
                to={`/jobs?skill=${encodeURIComponent(cat.label)}`}
                className="flex items-center gap-2 text-sm text-stone-muted hover:text-foreground bg-white border border-stone-border px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5"
              >
                <Icon size={14} />
                {cat.label}
              </Link>
            );
          })}
          <Link
            to="/jobs"
            className="flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover transition-colors ml-1"
          >
            View all
            <ArrowRight size={14} />
          </Link>
        </LazySection>
      </section>

      {/* Stats */}
      <section className="relative border-t border-stone-border overflow-hidden py-14 bg-cream">
        <ParallaxOrb size={280} top="-50px" left="-30px"  color="radial-gradient(circle, #1C3A28 0%, transparent 70%)" speed={0.5} opacity={0.04} blur={80} />
        <ParallaxOrb size={200} top="-20px" right="8%"    color="radial-gradient(circle, #BDD0B4 0%, transparent 70%)" speed={0.7} opacity={0.06} blur={70} />

        <div className="relative z-10 max-w-3xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
          {[
            { value: '500+', label: 'Active Students' },
            { value: '120+', label: 'Open Gigs' },
            { value: '40+',  label: 'Skill Categories' },
          ].map((stat, i) => (
            <LazySection key={stat.label} delay={i * 0.1} translateY={24}>
              <p className="text-2xl md:text-3xl font-bold text-navy">{stat.value}</p>
              <p className="text-xs text-stone-muted mt-1">{stat.label}</p>
            </LazySection>
          ))}
        </div>
      </section>

      {/* CTA */}
      <LazySection translateY={0}>
        <section className="relative bg-navy py-16 px-6 text-center overflow-hidden">
          <ParallaxOrb size={350} top="-70px" left="-60px"  color="radial-gradient(circle, #274F37 0%, transparent 70%)" speed={0.25} opacity={0.4} blur={90} />
          <ParallaxOrb size={250} top="-30px" right="-30px" color="radial-gradient(circle, #274F37 0%, transparent 70%)" speed={0.45} opacity={0.3} blur={80} />

          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white max-w-lg mx-auto leading-tight">
              Start building your portfolio today.
            </h2>
            <p className="text-sm text-white/40 mt-3 max-w-sm mx-auto">
              Join hundreds of Cordians already finding work and gaining experience.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 mt-7 bg-white text-navy text-sm font-medium px-8 py-3 rounded-lg transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            >
              Get Started Free
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>
      </LazySection>

      <Footer />
    </div>
  );
}
