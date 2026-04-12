import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-cream border-t border-stone-border mt-24">
      {/* Trust strip */}
      <div className="max-w-7xl mx-auto px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-8 md:gap-14 flex-wrap">
          <img src="/logos/logo1.png" alt="Partner Logo 1" className="h-20 md:h-24 w-auto max-w-[200px] object-contain hover:scale-105 transition-transform duration-300" />
          <img src="/logos/logo2.png" alt="Partner Logo 2" className="h-16 md:h-20 w-auto max-w-[160px] object-contain hover:scale-105 transition-transform duration-300" />
          <img src="/logos/logo3.png" alt="Partner Logo 3" className="h-16 md:h-20 w-auto max-w-[200px] object-contain hover:scale-105 transition-transform duration-300" />
          <img src="/logos/logo4.png" alt="Partner Logo 4" className="h-20 md:h-24 w-auto max-w-[200px] object-contain hover:scale-105 transition-transform duration-300" />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-stone-border">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" className="text-sm font-bold tracking-widest uppercase text-navy">
            HEARTCONNECT
          </Link>
          <div className="flex items-center gap-6 text-xs text-stone-muted">
            <Link to="/jobs" className="hover:text-navy transition-colors">Find Work</Link>
            <Link to="/register" className="hover:text-navy transition-colors">Hire Talent</Link>
            <span>© {new Date().getFullYear()} HeartConnect. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
