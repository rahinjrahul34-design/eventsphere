import RecommendationCard from './RecommendationCard';

/**
 * Desktop: responsive grid. Mobile: snap carousel (no nested-page overflow).
 */
export default function RecRail({ events = [], debug = false, onDismiss }) {
  if (!events.length) return null;

  return (
    <div className="-mx-4 overflow-x-auto no-scrollbar px-4 sm:mx-0 sm:overflow-visible sm:px-0">
      <div className="flex snap-x snap-mandatory gap-4 sm:grid sm:snap-none sm:grid-cols-2 lg:grid-cols-4">
        {events.map((e, i) => (
          <div key={e._id} className="w-[78vw] max-w-sm shrink-0 snap-start sm:w-auto sm:max-w-none">
            <RecommendationCard event={e} index={i} debug={debug} onDismiss={onDismiss} />
          </div>
        ))}
      </div>
    </div>
  );
}
