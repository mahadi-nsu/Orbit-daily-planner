'use client';
import { Clock3, Layers3, CircleCheck, CalendarDays, ArrowUpRight } from 'lucide-react';
import { SectionTitle, Empty } from '@/components/ui';
import { localDate, addDays, readableTime, type Workspace } from '@/lib/models';
export function Progress({ data, onOpen }: { data: Workspace; onOpen: (id: string) => void }) {
  const total = data.studies.reduce((sum, s) => sum + s.duration, 0),
    today = localDate(),
    week = Array.from({ length: 7 }, (_, i) => addDays(today, -6 + i)),
    mins = week.map((d) =>
      data.studies
        .filter((s) => localDate(new Date(s.startedAt)) === d)
        .reduce((sum, s) => sum + s.duration / 60, 0),
    ),
    max = Math.max(60, ...mins),
    topics = data.topics.filter((t) => !t.archived);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">THE QUIET POWER OF SHOWING UP</span>
          <h1>Small steps add up.</h1>
          <p>A simple look at the time and attention you've invested.</p>
        </div>
      </div>
      <div className="progress-stats">
        {[
          { icon: Clock3, value: `${(total / 3600).toFixed(1)} hrs`, label: 'Total study time' },
          {
            icon: Layers3,
            value: topics.filter((t) => t.status === 'learning').length,
            label: 'Topics in progress',
          },
          {
            icon: CircleCheck,
            value: topics.filter((t) => t.status === 'done').length,
            label: 'Completed topics',
          },
          {
            icon: CalendarDays,
            value: data.routines
              .flatMap((routine) => routine.targets || [])
              .flatMap((target) => target.items)
              .filter((item) => item.status === 'done').length,
            label: 'Routine topics completed',
          },
        ].map((s) => (
          <div key={s.label}>
            <s.icon size={20} />
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <section className="activity-panel">
        <SectionTitle eyebrow="YOUR WEEK, IN FOCUS" title="A rhythm of your own" />
        <div className="activity-chart">
          {week.map((d, i) => (
            <div key={d}>
              <span className="chart-value">{Math.round(mins[i])} min</span>
              <div className="chart-bar-track">
                <div
                  style={{ height: `${Math.max(2, (mins[i] / max) * 100)}%` }}
                  className={d === today ? 'current' : ''}
                />
              </div>
              <span>
                {new Date(`${d}T12:00`).toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
              <small>{new Date(`${d}T12:00`).getDate()}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="history-section">
        <SectionTitle title="Your focus journal" />
        {data.studies.length === 0 ? (
          <Empty
            icon={<Clock3 size={24} />}
            title="Good work starts with a little focus."
            description="Start a focus timer inside any topic. Your completed sessions and actual study time will appear here."
          />
        ) : (
          <div className="focus-history-table">
            <div className="history-table-head">
              <span>TOPIC</span>
              <span>SESSION NOTE</span>
              <span>DATE</span>
              <span>FOCUS TIME</span>
            </div>
            {[...data.studies]
              .sort((a, b) => b.startedAt - a.startedAt)
              .map((s) => (
                <button key={s.id} onClick={() => onOpen(s.topicId)}>
                  <strong>
                    {data.topics.find((t) => t.id === s.topicId)?.title}
                    <ArrowUpRight size={12} />
                  </strong>
                  <span>{s.note || 'A little further.'}</span>
                  <span>
                    {new Date(s.startedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span>{readableTime(s.duration)}</span>
                </button>
              ))}
          </div>
        )}
      </section>
    </>
  );
}
