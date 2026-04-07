import { useState } from 'react';
import { reportsApi } from '../api';
import type { ReportReason, ReportTargetType } from '../types';

interface ReportModalProps {
  targetType: ReportTargetType;
  targetId: string;
  title?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const REASON_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate', label: 'Inappropriate Content' },
  { value: 'fraud', label: 'Fraud / Scam' },
  { value: 'other', label: 'Other' },
];

export default function ReportModal({ targetType, targetId, title, onClose, onSuccess, onError }: ReportModalProps) {
  const [reason, setReason] = useState<ReportReason>('spam');
  const [description, setDescription] = useState('');

  const handleSubmit = async () => {
    try {
      await reportsApi.create({ targetType, targetId, reason, description: description || undefined });
      onSuccess('Report submitted. Thank you.');
      onClose();
      setDescription('');
    } catch {
      onError('Failed to submit report.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-foreground mb-4">{title ?? `Report ${targetType === 'user' ? 'User' : 'Job'}`}</h3>
        <label className="block text-sm text-foreground font-medium mb-1">Reason</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as ReportReason)}
          className="w-full border border-stone-border rounded-lg px-3 py-2 text-sm mb-3 bg-white"
        >
          {REASON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <label className="block text-sm text-foreground font-medium mb-1">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell us more about the issue..."
          className="w-full border border-stone-border rounded-lg px-3 py-2 text-sm mb-4 min-h-[80px] resize-y"
          maxLength={2000}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-sm text-stone-muted hover:text-foreground px-4 py-2 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="text-sm bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
