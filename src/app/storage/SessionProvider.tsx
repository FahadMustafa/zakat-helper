import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { decrypt, deriveKey, encrypt, fromBase64, type SessionKey } from '../../engine/crypto';
import { openFile, serialise, stamp } from '../../engine/file';
import { CURRENT_VERSION, parseProfile, type Profile, type Settings } from '../../engine/schema';
import { decideOpen } from './conflict';
import { pickFile, saveFile, type PickedFile } from './fileAccess';
import { SessionContext, type Prompt, type Session, type SessionApi } from './sessionContext';
import {
  loadCopy,
  loadHandle,
  requestPersistence,
  saveCopy,
  saveHandle,
  type StoredCopy,
} from './workingCopy';

type Open = { profile: Profile; dirty: boolean; key?: SessionKey; fileName?: string };
type Pending = { picked: PickedFile; profile?: Profile; key?: SessionKey };

function newProfile(settings: Settings): Profile {
  return {
    format: 'zakat-helper',
    version: CURRENT_VERSION,
    meta: { profileId: crypto.randomUUID(), revision: 0, savedAt: null },
    settings,
    holdings: [],
    checkpoints: [],
    payments: [],
    recipients: [],
  };
}

function suggestedName(): string {
  return `zakat-${new Date().getFullYear()}.json`;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const [status, setStatus] = useState<'loading' | 'welcome' | 'locked' | 'open' | 'error'>(
    'loading',
  );
  const [lockedCopy, setLockedCopy] = useState<Extract<StoredCopy, { kind: 'encrypted' }> | null>(
    null,
  );
  const [lockError, setLockError] = useState<'wrong-passphrase' | undefined>();
  const [errorMessage, setErrorMessage] = useState('');
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const pending = useRef<Pending | null>(null);
  const handle = useRef<FileSystemFileHandle | undefined>(undefined);

  const fail = useCallback((err: unknown) => {
    setErrorMessage(err instanceof Error ? err.message : String(err));
    setStatus('error');
  }, []);

  // Load the working copy once.
  useEffect(() => {
    void (async () => {
      void requestPersistence();
      handle.current = await loadHandle();
      const copy = await loadCopy();
      if (!copy) {
        setStatus('welcome');
        return;
      }
      if (copy.kind === 'encrypted') {
        setLockedCopy(copy);
        setStatus('locked');
        return;
      }
      const parsed = parseProfile(copy.profile);
      if (!parsed.ok)
        throw new Error(
          `The copy saved in this browser cannot be read: ${parsed.issues.join('; ')}`,
        );
      setOpen({
        profile: parsed.profile,
        dirty: copy.dirty,
        ...(copy.fileName ? { fileName: copy.fileName } : {}),
      });
      setStatus('open');
    })().catch(fail);
  }, [fail]);

  // Keep the working copy in step with every change (encrypted when the profile is).
  useEffect(() => {
    if (!open) return;
    void (async () => {
      const base = {
        meta: open.profile.meta,
        dirty: open.dirty,
        ...(open.fileName ? { fileName: open.fileName } : {}),
      };
      const copy: StoredCopy = open.key
        ? {
            ...base,
            kind: 'encrypted',
            blob: await encrypt(open.key, JSON.stringify(open.profile)),
          }
        : { ...base, kind: 'plain', profile: open.profile };
      await saveCopy(copy);
    })().catch(fail);
  }, [open, fail]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!open?.dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [open?.dirty]);

  const adopt = useCallback((p: Pending) => {
    if (!p.profile) return;
    handle.current = p.picked.handle;
    void saveHandle(p.picked.handle ?? null);
    setOpen({
      profile: p.profile,
      dirty: false,
      fileName: p.picked.name,
      ...(p.key ? { key: p.key } : {}),
    });
    setStatus('open');
    setPrompt(null);
    pending.current = null;
  }, []);

  const decide = useCallback(
    (p: Pending & { profile: Profile }) => {
      const decision = decideOpen(
        open ? { meta: open.profile.meta, dirty: open.dirty } : null,
        p.profile.meta,
      );
      switch (decision) {
        case 'same':
        case 'load-file':
          adopt(p);
          return;
        case 'ask-file-older':
        case 'ask-unsaved-changes':
          pending.current = p;
          setPrompt({
            kind: 'conflict',
            reason: decision === 'ask-file-older' ? 'file-older' : 'unsaved-changes',
            fileName: p.picked.name,
          });
      }
    },
    [open, adopt],
  );

  const handleOpened = useCallback(
    async (picked: PickedFile, passphrase?: string) => {
      const r = await openFile(picked.text, passphrase);
      switch (r.kind) {
        case 'ok':
          decide({ picked, profile: r.profile, ...(r.key ? { key: r.key } : {}) });
          return;
        case 'needs-passphrase':
        case 'wrong-passphrase':
          pending.current = { picked };
          setPrompt({
            kind: 'file-passphrase',
            fileName: picked.name,
            ...(r.kind === 'wrong-passphrase' ? { error: 'wrong-passphrase' as const } : {}),
          });
          return;
        case 'newer-version':
          setPrompt({
            kind: 'file-problem',
            fileName: picked.name,
            issues: [
              `This file was saved by a newer version of Zakat Helper (format ${r.version}). Reload the page to update the app, then open it again.`,
            ],
          });
          return;
        case 'invalid':
          setPrompt({ kind: 'file-problem', fileName: picked.name, issues: r.issues });
      }
    },
    [decide],
  );

  const api = useMemo<SessionApi>(() => {
    let session: Session;
    switch (status) {
      case 'loading':
        session = { kind: 'loading' };
        break;
      case 'welcome':
        session = { kind: 'welcome' };
        break;
      case 'locked':
        session = lockError ? { kind: 'locked', error: lockError } : { kind: 'locked' };
        break;
      case 'error':
        session = { kind: 'error', message: errorMessage };
        break;
      case 'open':
        session = open
          ? {
              kind: 'open',
              profile: open.profile,
              dirty: open.dirty,
              encrypted: open.key !== undefined,
              ...(open.fileName ? { fileName: open.fileName } : {}),
            }
          : { kind: 'loading' };
    }

    return {
      session,
      prompt,
      startNew: (settings) => {
        setOpen({ profile: newProfile(settings), dirty: true });
        setStatus('open');
      },
      openFromDisk: async () => {
        try {
          const picked = await pickFile();
          if (picked) await handleOpened(picked);
        } catch (err) {
          fail(err);
        }
      },
      submitFilePassphrase: async (passphrase) => {
        const p = pending.current;
        if (!p) return;
        await handleOpened(p.picked, passphrase);
      },
      resolveConflict: (keep) => {
        const p = pending.current;
        if (keep === 'file' && p) adopt(p);
        else {
          setPrompt(null);
          pending.current = null;
        }
      },
      dismissPrompt: () => {
        setPrompt(null);
        pending.current = null;
      },
      unlock: async (passphrase) => {
        if (!lockedCopy) return;
        const key = await deriveKey(
          passphrase,
          fromBase64(lockedCopy.blob.salt),
          lockedCopy.blob.iterations,
        );
        let text: string;
        try {
          text = await decrypt(key.key, lockedCopy.blob);
        } catch {
          setLockError('wrong-passphrase');
          return;
        }
        const parsed = parseProfile(JSON.parse(text) as unknown);
        if (!parsed.ok) {
          fail(
            new Error(`The copy saved in this browser cannot be read: ${parsed.issues.join('; ')}`),
          );
          return;
        }
        setOpen({
          profile: parsed.profile,
          dirty: lockedCopy.dirty,
          key,
          ...(lockedCopy.fileName ? { fileName: lockedCopy.fileName } : {}),
        });
        setLockedCopy(null);
        setLockError(undefined);
        setStatus('open');
      },
      update: (change) => {
        setOpen((o) => (o ? { ...o, profile: change(o.profile), dirty: true } : o));
      },
      save: async () => {
        if (!open) return;
        try {
          const stamped = stamp(open.profile, new Date().toISOString());
          const text = await serialise(stamped, open.key);
          const saved = await saveFile(text, open.fileName ?? suggestedName(), handle.current);
          if (!saved) return;
          handle.current = saved.handle;
          await saveHandle(saved.handle ?? null);
          setOpen({ ...open, profile: stamped, dirty: false, fileName: saved.name });
        } catch (err) {
          fail(err);
        }
      },
      setPassphrase: async (passphrase) => {
        if (!open) return;
        const { key: _old, ...rest } = open;
        setOpen(
          passphrase
            ? { ...rest, key: await deriveKey(passphrase), dirty: true }
            : { ...rest, dirty: true },
        );
      },
    };
  }, [status, open, prompt, lockError, lockedCopy, errorMessage, adopt, handleOpened, fail]);

  return <SessionContext value={api}>{children}</SessionContext>;
}
