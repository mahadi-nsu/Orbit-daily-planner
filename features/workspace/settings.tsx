'use client';
import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Download,
  Upload,
  Database,
  ShieldCheck,
  HardDrive,
  ArrowUpRight,
  Check,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Button, Field, Modal, Confirm } from '@/components/ui';
import { db } from '@/lib/db';
import { DEMO_PREFERENCE, loadDemoData, removeDemoData } from '@/lib/demo-data';
import { exportBackup, validateBackup, restoreBackup, type Backup } from '@/lib/backup';
import { useUI, report } from '@/lib/store';
import type { Workspace } from '@/lib/models';
export function Settings({ data }: { data: Workspace }) {
  const file = useRef<HTMLInputElement>(null),
    [backup, setBackup] = useState<Backup | null>(null),
    [mode, setMode] = useState<'merge' | 'replace'>('merge'),
    [confirmation, setConfirmation] = useState(''),
    [removingDemo, setRemovingDemo] = useState(false),
    [busy, setBusy] = useState(false);
  const demoLoaded = useLiveQuery(
    async () => (await db.preferences.get(DEMO_PREFERENCE))?.value === 'loaded',
    [],
  );
  const notify = useUI((s) => s.notify);
  const exportData = async () => {
    setBusy(true);
    try {
      window.dispatchEvent(new Event('orbit:flush'));
      const backup = await exportBackup(),
        url = URL.createObjectURL(
          new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
        ),
        a = document.createElement('a');
      a.href = url;
      a.download = `orbit-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('Workspace exported, including your local images.');
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR SPACE. YOUR TERMS.</span>
          <h1>Keep your orbit yours.</h1>
          <p>A little care for the place your knowledge calls home.</p>
        </div>
      </div>
      <section className="settings-panel">
        <div className="settings-section-heading">
          <span className="settings-icon">
            <Sparkles size={22} />
          </span>
          <div>
            <h2>Try a little of everything.</h2>
            <p>
              Sample tasks, learning notes, resources, a routine, and focus history to explore
              ORBIT.
            </p>
          </div>
        </div>
        <div className="settings-action-row">
          <div>
            <h3>{demoLoaded ? 'Demo data is loaded' : 'Explore with demo data'}</h3>
            <p>
              {demoLoaded
                ? 'Your own entries stay in place when you remove the samples.'
                : 'Add a sample week alongside your existing workspace.'}
            </p>
          </div>
          {demoLoaded ? (
            <Button secondary disabled={busy} onClick={() => setRemovingDemo(true)}>
              <Trash2 size={15} />
              Remove demo data
            </Button>
          ) : (
            <Button
              secondary
              disabled={busy || demoLoaded === undefined}
              onClick={async () => {
                setBusy(true);
                try {
                  await loadDemoData(true);
                  notify('Demo data added across your workspace.');
                } catch (error) {
                  report(error);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Sparkles size={15} />
              Load demo data
            </Button>
          )}
        </div>
      </section>
      <section className="settings-panel">
        <div className="settings-section-heading">
          <span className="settings-icon">
            <Database size={22} />
          </span>
          <div>
            <h2>Your workspace, wherever you go.</h2>
            <p>
              One portable backup. Every task, topic, note, image, resource, routine, and focus
              session.
            </p>
          </div>
        </div>
        <div className="backup-stats">
          <span>
            <strong>{data.tasks.length}</strong> tasks
          </span>
          <span>
            <strong>{data.categories.length}</strong> categories
          </span>
          <span>
            <strong>{data.topics.length}</strong> topics
          </span>
          <span>
            <strong>{data.resources.length}</strong> resources
          </span>
          <span>
            <strong>{data.routines.length}</strong> routines
          </span>
        </div>
        <div className="settings-action-row">
          <div>
            <h3>Export workspace</h3>
            <p>Download a complete JSON backup, including uploaded images.</p>
          </div>
          <Button secondary disabled={busy} onClick={() => void exportData()}>
            {busy ? <Loader2 className="spin" size={15} /> : <Download size={15} />}Export backup
          </Button>
        </div>
        <div className="settings-action-row">
          <div>
            <h3>Restore from a backup</h3>
            <p>Preview and validate your backup before importing anything.</p>
          </div>
          <Button secondary onClick={() => file.current?.click()}>
            <Upload size={15} />
            Import backup
          </Button>
        </div>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              if (f.size > 150 * 1024 * 1024)
                throw new Error('Choose a backup smaller than 150 MB.');
              const b = validateBackup(JSON.parse(await f.text()));
              setBackup(b);
              setConfirmation('');
              setMode('merge');
            } catch (error) {
              report(error);
            }
            e.target.value = '';
          }}
        />
      </section>
      <section className="settings-panel local-settings">
        <div className="settings-section-heading">
          <span className="settings-icon cyan">
            <ShieldCheck size={22} />
          </span>
          <div>
            <h2>A private corner of the internet.</h2>
            <p>
              ORBIT saves your workspace in IndexedDB on this device. No account, no server, no
              content uploads.
            </p>
          </div>
        </div>
        <div className="privacy-detail">
          <HardDrive size={18} />
          <p>
            Data belongs to this browser and origin. Keep regular backups before clearing browser
            storage or switching devices. Your operating system's reduced-motion preference is
            respected automatically.
          </p>
        </div>
        <div className="privacy-pills">
          <span>
            <Check size={13} />
            Local image storage
          </span>
          <span>
            <Check size={13} />
            Portable backups
          </span>
          <span>
            <Check size={13} />
            No tracking
          </span>
        </div>
      </section>
      <div className="version-label">
        <span className="brand-symbol small-brand">✳</span>ORBIT{' '}
        <span>1.0 · A space for your next chapter</span>
      </div>
      {backup && (
        <Modal title="A familiar orbit, ready to return." onClose={() => setBackup(null)}>
          <div className="import-preview">
            <span className="eyebrow">
              VALID BACKUP · {new Date(backup.exportedAt).toLocaleDateString()}
            </span>
            <p>
              {backup.tasks.length} tasks · {backup.topics.length} topics · {backup.images.length}{' '}
              images · {backup.resources.length} resources · {backup.routines.length} routines ·{' '}
              {backup.studies.length} focus sessions
            </p>
          </div>
          <Field label="Import behavior">
            <select value={mode} onChange={(e) => setMode(e.target.value as 'merge' | 'replace')}>
              <option value="merge">Add to workspace — reject overlapping IDs</option>
              <option value="replace">Replace entire workspace</option>
            </select>
          </Field>
          {mode === 'replace' ? (
            <Field
              label="Type REPLACE to confirm"
              hint="All current content will be replaced by this backup. Export your current workspace first if you want to keep it."
            >
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="REPLACE"
              />
            </Field>
          ) : (
            <p className="muted small">
              Existing content stays in place. If any identifiers overlap, the entire import is
              cancelled without changing your data.
            </p>
          )}
          <div className="form-actions">
            <Button secondary onClick={() => setBackup(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy || (mode === 'replace' && confirmation !== 'REPLACE')}
              onClick={async () => {
                setBusy(true);
                try {
                  window.dispatchEvent(new Event('orbit:flush'));
                  await restoreBackup(backup, mode);
                  setBackup(null);
                  notify('Your workspace has been restored.');
                } catch (e) {
                  report(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Restoring…' : 'Restore workspace'}
              <ArrowUpRight size={14} />
            </Button>
          </div>
        </Modal>
      )}
      {removingDemo && (
        <Confirm
          title="Remove the demo data?"
          description="This removes sample tasks, notes, resources, routines, and focus history. Your own entries stay, along with any sample topics they depend on."
          action="Remove demo data"
          onClose={() => setRemovingDemo(false)}
          onConfirm={async () => {
            window.dispatchEvent(new Event('orbit:flush'));
            await removeDemoData();
            notify('Demo data removed. Your own entries are still here.');
          }}
        />
      )}
    </>
  );
}
