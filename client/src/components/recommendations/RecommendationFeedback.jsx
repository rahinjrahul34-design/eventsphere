import { useState } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react';
import { endpoints } from '../../lib/api';

export default function RecommendationFeedback({ eventId, onFeedbackDone }) {
  const [submitted, setSubmitted] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleFeedback = async (type, reason = '') => {
    try {
      await endpoints.recommendationFeedback({
        eventId,
        feedbackType: type,
        feedbackReason: reason,
      });
      setSubmitted(true);
      setShowOptions(false);
      onFeedbackDone?.(type);
    } catch (err) {
      console.warn('Feedback submission failed:', err);
    }
  };

  if (submitted) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success dark:text-success">
        <CheckCircle2 className="size-3.5" /> Feedback saved
      </span>
    );
  }

  return (
    <div className="relative flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground">Relevant?</span>
      <button
        type="button"
        onClick={() => handleFeedback('like')}
        title="Yes, relevant"
        className="grid size-6 place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-success transition"
      >
        <ThumbsUp className="size-3" />
      </button>
      <button
        type="button"
        onClick={() => setShowOptions(!showOptions)}
        title="Not for me"
        className="grid size-6 place-items-center rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition"
      >
        <ThumbsDown className="size-3" />
      </button>

      {showOptions && (
        <div className="absolute z-20 mt-8 rounded-xl border bg-card p-2 shadow-lg text-[11px] space-y-1">
          {['Not interested', 'Too far', 'Already attended', 'Wrong topic'].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleFeedback('dislike', r)}
              className="block w-full text-left px-2 py-1 rounded hover:bg-secondary transition"
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
