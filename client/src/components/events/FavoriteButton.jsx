import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { endpoints } from '../../lib/api';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

export default function FavoriteButton({ eventId, favorite, size = 'md', className }) {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => endpoints.toggleFavorite(eventId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['events'] });
      qc.invalidateQueries({ queryKey: ['favorites'] });
      toast(data.favorite ? 'Saved to favorites' : 'Removed from favorites');
    },
    onError: () => toast.error('Log in to save events'),
  });

  const sizes = { sm: 'size-8', md: 'size-10' };
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        mutation.mutate();
      }}
      aria-pressed={favorite}
      aria-label={favorite ? 'Remove from favorites' : 'Save event'}
      className={cn(
        'grid place-items-center rounded-full bg-black/45 backdrop-blur text-white transition hover:scale-110 hover:bg-black/60',
        sizes[size],
        className
      )}
    >
      <Heart className={cn(size === 'sm' ? 'size-4' : 'size-5', favorite && 'fill-destructive text-destructive')} />
    </button>
  );
}
