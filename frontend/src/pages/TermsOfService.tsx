import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import TermsContent from '../components/TermsContent';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <main className="max-w-3xl mx-auto w-full px-6 flex-1 py-12">
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">Terms of Service</h1>
        <p className="text-xs text-stone-muted mb-8">Last updated: March 26, 2026</p>

        <TermsContent />

        <div className="mt-10 pt-6 border-t border-stone-border">
          <Link to="/privacy" className="text-sm text-accent hover:underline">
            Read our Privacy Policy →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
