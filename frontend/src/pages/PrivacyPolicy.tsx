import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import PrivacyContent from '../components/PrivacyContent';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <main className="max-w-3xl mx-auto w-full px-6 flex-1 py-12">
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-xs text-stone-muted mb-8">Last updated: March 26, 2026</p>

        <PrivacyContent />

        <div className="mt-10 pt-6 border-t border-stone-border">
          <Link to="/terms" className="text-sm text-accent hover:underline">
            Read our Terms of Service →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
