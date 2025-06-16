import { EventsCard } from "./events-card";
import { StateEventsCard } from "./state-events-card";
import { ValueCard } from "./value-card";

interface EventColumnProps<TEvent, TValue> {
  title: string;
  value: TValue;
  events: TEvent[];
  stateEvents: unknown;
  emptyMessage?: string;
  className?: string;
}

export function EventColumn<TEvent, TValue>({
  title,
  value,
  events,
  stateEvents,
  emptyMessage,
  className = "",
}: EventColumnProps<TEvent, TValue>) {
  return (
    <div className={`lg:col-span-1 space-y-4 ${className}`}>
      <ValueCard title={`${title} Value`} value={value} />
      <EventsCard<TEvent>
        title={title}
        events={events}
        emptyMessage={emptyMessage}
      />
      <StateEventsCard title={`State ${title}`} stateEvents={stateEvents} />
    </div>
  );
}
