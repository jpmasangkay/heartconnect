import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-cream border-t border-stone-border mt-24">
      {/* Trust strip */}
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <p className="text-sm text-stone-muted mb-10 tracking-wide">
          Drop some names with confidence
        </p>
        <div className="flex items-center justify-center gap-10 flex-wrap opacity-40">
          {/* Placeholder logos rendered as text in various styles */}
          <span className="text-xs font-bold tracking-widest uppercase">Accenture</span>
          <span className="text-xs font-bold tracking-widest uppercase">Deloitte</span>
          <span className="text-xs font-bold tracking-widest uppercase">Cognizant</span>
          <span className="text-xs font-bold tracking-widest uppercase">IBM</span>
          <span className="text-xs font-bold tracking-widest uppercase">Infosys</span>
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
