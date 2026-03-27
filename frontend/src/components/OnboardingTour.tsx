import { useState } from 'react';
import { X, ChevronRight, Briefcase, MessageSquare, User, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';

const STEPS = [
  {
    icon: Briefcase,
    title: 'Find or post jobs',
    description: 'Students can browse and apply to jobs. Clients can post new job listings with budget, deadline, and required skills.',
    highlight: 'Browse the Job Board to get started!',
  },
  {
    icon: MessageSquare,
    title: 'Chat in real-time',
    description: 'Once connected through a job, you can chat instantly with the other party. Share files, images, and discuss project details.',
    highlight: 'Head to Messages after applying or accepting!',
  },
  {
    icon: LayoutDashboard,
    title: 'Track everything',
    description: 'Your Dashboard shows all your jobs, applications, and their statuses. You\'ll get notifications for every important update.',
    highlight: 'Check your Dashboard regularly!',
  },
  {
    icon: User,
    title: 'Build your profile',
    description: 'Add your skills, portfolio, and bio. Get verified with your school email or ID to stand out. Leave reviews after completing jobs.',
    highlight: 'Visit your Profile to get started!',
  },
];

export default function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const { updateUser } = useAuth();

  const handleComplete = async () => {
    try {
      await authApi.completeOnboarding();
      updateUser({ hasCompletedOnboarding: true });
    } catch {
      // Still complete locally even if API fails
      updateUser({ hasCompletedOnboarding: true });
    }
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleSkip} />

      {/* Card */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Progress bar */}
        <div className="h-1 bg-cream-dark">
          <div
            className="h-full bg-navy transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Close/Skip */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-stone-muted hover:text-foreground transition-colors"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="p-8 pt-6">
          <div className="flex items-center gap-2 text-xs text-stone-muted mb-6 font-medium">
            Step {step + 1} of {STEPS.length}
          </div>

          <div className="w-12 h-12 rounded-xl bg-navy/10 flex items-center justify-center mb-5">
            <Icon size={24} className="text-navy" />
          </div>

          <h2 className="text-xl font-bold text-foreground mb-2">{current.title}</h2>
          <p className="text-sm text-stone-muted leading-relaxed">{current.description}</p>

          <div className="mt-4 p-3 bg-cream rounded-lg border border-stone-border">
            <p className="text-xs font-medium text-navy">{current.highlight}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-xs text-stone-muted hover:text-foreground transition-colors"
          >
            Skip tour
          </button>

          <button
            onClick={() => {
              if (isLast) {
                handleComplete();
              } else {
                setStep((s) => s + 1);
              }
            }}
            className="flex items-center gap-1.5 bg-navy text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-navy-light transition-colors"
          >
            {isLast ? 'Get started' : 'Next'}
            {!isLast && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
