'use client';
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Pause, Play, Check, Maximize2, Timer, X } from 'lucide-react';
import { db, repository } from '@/lib/db';
import { elapsedSeconds, readableTime, type TimerState, type Topic } from '@/lib/models';
import { Button, Modal, Field, IconButton } from '@/components/ui';
import { report } from '@/lib/store';
export function FocusTimer({ topics, onOpen }: { topics: Topic[]; onOpen: (id: string) => void }) {
  const timer = useLiveQuery(
    async () => (await db.preferences.get('timer'))?.value as TimerState | null,
    [],
  );
  const [now, setNow] = useState(Date.now()),
    [expanded, setExpanded] = useState(false),
    [finishing, setFinishing] = useState(false),
    [note, setNote] = useState('');
  useEffect(() => {
    if (!timer?.runningSince) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer?.runningSince]);
  if (!timer) return null;
  const seconds = elapsedSeconds(timer, now),
    remaining = Math.max(0, timer.target - seconds),
    topic = topics.find((t) => t.id === timer.topicId);
  const finish = async () => {
    try {
      await repository.finishTimer(note);
      setFinishing(false);
      setExpanded(false);
      setNote('');
    } catch (e) {
      report(e);
    }
  };
  return (
    <>
      <div className="focus-dock">
        <span className="focus-orb">
          <Timer size={18} />
        </span>
        <button className="focus-topic" onClick={() => onOpen(timer.topicId)}>
          <small>{timer.runningSince ? 'IN FOCUS' : 'PAUSED'}</small>
          <strong>{topic?.title || 'Focus session'}</strong>
        </button>
        <span className="focus-count">{readableTime(remaining)}</span>
        <IconButton
          label={timer.runningSince ? 'Pause timer' : 'Resume timer'}
          onClick={() => void repository.toggleTimer().catch(report)}
        >
          {timer.runningSince ? <Pause size={17} /> : <Play size={17} />}
        </IconButton>
        <IconButton label="Finish focus session" onClick={() => setFinishing(true)}>
          <Check size={18} />
        </IconButton>
        <IconButton label="Expand focus timer" onClick={() => setExpanded(true)}>
          <Maximize2 size={16} />
        </IconButton>
      </div>
      {expanded && (
        <Modal title="A little space to focus" onClose={() => setExpanded(false)}>
          <div className="focus-full">
            <div
              className="timer-circle"
              style={
                {
                  '--progress': `${Math.min(100, (seconds / timer.target) * 100)}%`,
                } as React.CSSProperties
              }
            >
              <span>{readableTime(remaining)}</span>
              <small>
                {remaining === 0
                  ? 'Goal reached. Take your time.'
                  : timer.runningSince
                    ? 'ONE THING AT A TIME'
                    : 'ON PAUSE'}
              </small>
            </div>
            <h3>{topic?.title}</h3>
            <p>{readableTime(seconds)} of focused learning</p>
            <div className="form-actions">
              <Button secondary onClick={() => void repository.toggleTimer().catch(report)}>
                {timer.runningSince ? <Pause size={15} /> : <Play size={15} />}{' '}
                {timer.runningSince ? 'Pause' : 'Resume'}
              </Button>
              <Button onClick={() => setFinishing(true)}>
                <Check size={15} />
                Finish session
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {finishing && (
        <Modal title="Every minute counts." onClose={() => setFinishing(false)}>
          <p className="muted modal-description">
            You spent {readableTime(seconds)} learning {topic?.title}. Save a thought for next time.
          </p>
          <Field label="Session note (optional)">
            <textarea
              autoFocus
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What clicked? Where will you pick up?"
            />
          </Field>
          <div className="form-actions">
            <Button secondary onClick={() => setFinishing(false)}>
              Keep focusing
            </Button>
            <Button onClick={() => void finish()}>Save focus session</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function StartFocus({ topicId, onClose }: { topicId: string; onClose: () => void }) {
  const [minutes, setMinutes] = useState(25);
  return (
    <Modal title="One topic. Your full attention." onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void repository
            .startTimer(topicId, minutes * 60)
            .then(onClose)
            .catch(report);
        }}
      >
        <Field label="Focus goal (minutes)">
          <div className="segmented">
            {[15, 25, 45, 60].map((n) => (
              <button
                type="button"
                key={n}
                className={minutes === n ? 'selected' : ''}
                onClick={() => setMinutes(n)}
              >
                {n} min
              </button>
            ))}
          </div>
          <input
            aria-label="Focus minutes"
            type="number"
            min="1"
            max="240"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
        </Field>
        <p className="muted small">
          Your timer continues across reloads. Actual focused time is saved when you finish.
        </p>
        <div className="form-actions">
          <Button secondary type="button" onClick={onClose}>
            <X size={14} />
            Cancel
          </Button>
          <Button type="submit">
            <Play size={14} />
            Start focus
          </Button>
        </div>
      </form>
    </Modal>
  );
}
