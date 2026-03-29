import { useState, type FormEvent } from 'react';
import { Star } from 'lucide-react';
import { reviewsApi } from '../api';
import { Button } from './ui/button';

interface ReviewFormProps {
  jobId: string;
  jobTitle: string;
  revieweeId: string;
  revieweeName: string;
  onSubmitted: () => void;
}

export default function ReviewForm({ jobId, jobTitle, revieweeId, revieweeName, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await reviewsApi.create({ jobId, revieweeId, rating, comment: comment.trim() || undefined });
      onSubmitted();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-stone-border rounded-lg p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Review {revieweeName}
      </h3>
      <p className="text-xs text-stone-muted mb-4">for "{jobTitle}"</p>

      {/* Star rating */}
      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="transition-colors"
          >
            <Star
              size={24}
              className={`${
                star <= (hover || rating)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-stone-300'
              } transition-colors`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="text-xs text-stone-muted ml-2">{rating}/5</span>
        )}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write a comment (optional)..."
        rows={3}
        maxLength={2000}
        className="w-full bg-cream border border-stone-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-navy resize-none"
      />

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      <div className="flex justify-end mt-3">
        <Button type="submit" disabled={loading || rating === 0}>
          {loading ? 'Submitting...' : 'Submit Review'}
        </Button>
      </div>
    </form>
  );
}
