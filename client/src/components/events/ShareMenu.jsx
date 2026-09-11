import { Share2, Link2, MessageCircle, Linkedin, Twitter } from 'lucide-react';
import { Dropdown, MenuItem } from '../ui/misc';
import { toast } from 'sonner';

export default function ShareMenu({ event, className }) {
  const url = `${window.location.origin}/events/${event.slug}`;
  const text = encodeURIComponent(`Join me at ${event.title} on EventSphere!`);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Event link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };
  const native = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, text: event.shortDescription, url });
        return;
      } catch {
        /* cancelled */
      }
    }
    copy();
  };

  return (
    <Dropdown
      trigger={
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!navigator.share) return; // native handled in dropdown
          }}
          className={`inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-semibold hover:bg-secondary transition ${className || ''}`}
          aria-label="Share event"
        >
          <Share2 className="size-4" /> <span className="hidden sm:inline">Share</span>
        </button>
      }
    >
      {(close) => (
        <div>
          <MenuItem icon={Link2} onClick={() => { copy(); close(); }}>Copy link</MenuItem>
          <a href={`https://wa.me/?text=${text}%20${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">
            <MenuItem icon={MessageCircle}>WhatsApp</MenuItem>
          </a>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">
            <MenuItem icon={Linkedin}>LinkedIn</MenuItem>
          </a>
          <a href={`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer">
            <MenuItem icon={Twitter}>X / Twitter</MenuItem>
          </a>
        </div>
      )}
    </Dropdown>
  );
}
