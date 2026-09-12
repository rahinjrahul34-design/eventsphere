import { useOutletContext } from 'react-router-dom';
import SmartQueueConsole from '../../../components/waitlist/SmartQueueConsole';

export default function SmartQueueTab() {
  const { event } = useOutletContext();

  return (
    <div className="space-y-6">
      <SmartQueueConsole eventId={event._id} />
    </div>
  );
}
