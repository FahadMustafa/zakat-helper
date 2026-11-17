import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { decrypt, deriveKey, encrypt, fromBase64, type SessionKey } from '../../engine/crypto';
import { openFile, readProfile, serialise, stamp } from '../../engine/file';
import { CURRENT_VERSION, type Profile, type Settings } from '../../engine/schema';
import { applyChange } from './applyChange';
import { decideOpen } from './conflict';
import { downloadText, pickFile, saveFile, type PickedFile } from './fileAccess';
import {
  SessionContext,
  type Notice,
  type Prompt,
  type Session,
  type SessionApi,
} from './sessionContext';
import {
  clearCopy,
  loadCopy,
  loadHandle,
  requestPersistence,
  saveCopy,
  saveHandle,
  type StoredCopy,
} from './workingCopy';

type Open = { profile: Profile; dirty: boolean; key?: SessionKey; fileName?: string };
type Pending = { picked: PickedFile; profile?: Profile; key?: SessionKey };
type Failure = Extract<Session, { kind: 'error' }>;

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

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState<Open | null>(null);
  // The latest open profile, readable from async callbacks without stale closures.
  const openRef = useRef<Open | null>(null);
  const [status, setStatus] = useState<'loading' | 'welcome' | 'locked' | 'open' | 'error'>(
    'loading',
  );
  const [failure, setFailure] = useState<Failure>({
    kind: 'error',
    reason: 'unexpected',
    details: '',
  });
  const [lockedCopy, setLockedCopy] = useState<Extract<StoredCopy, { kind: 'encrypted' }> | null>(
    null,
  );
  const [lockError, setLockError] = useState<'wrong-passphrase' | undefined>();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const pending = useRef<Pending | null>(null);
  const handle = useRef<FileSystemFileHandle | undefined>(undefined);

  const setOpen = useCallback((next: Open | null) => {
    openRef.current = next;
    setOpenState(next);
  }, []);

  const failWith = useCallback((reason: Failure['reason'], details: string) => {
    setFailure({ kind: 'error', reason, details });
    setStatus('error');
  }, []);

  /** Open a profile read from the browser's copy, or show a recoverable error. */
  const openFromCopy = useCallback(
    (raw: unknown, copy: StoredCopy, key?: SessionKey) => {
      const r = readProfile(raw);
      switch (r.kind) {
        case 'ok':
          setOpen({
            profile: r.profile,
            dirty: copy.dirty,
            ...(key ? { key } : {}),
            ...(copy.fileName ? { fileName: copy.fileName } : {}),
          });
          setStatus('open');
          return;
        case 'newer-version':
          failWith('newer-version', `format ${r.version}`);
          return;
        case 'invalid':
          failWith('unreadable', r.issues.join('\n'));
      }
    },
    [setOpen, failWith],
  );

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
      openFromCopy(copy.profile, copy);
    })().catch((err: unknown) => {
      failWith('unexpected', messageOf(err));
    });
  }, [openFromCopy, failWith]);

  // Keep the working copy in step with every change (encrypted when the profile is).
  // A failure here must not stop the app: the profile is still in memory and can be saved to a file.
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
    })().catch(() => {
      setNotice({ kind: 'copy-failed' });
    });
  }, [open]);

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

  const adopt = useCallback(
    (p: Pending) => {
      if (!p.profile) return;
      handle.current = p.picked.handle;
      void saveHandle(p.picked.handle ?? null).catch(() => undefined);
      setOpen({
        profile: p.profile,
        dirty: false,
        fileName: p.picked.name,
        ...(p.key ? { key: p.key } : {}),
      });
      setLockedCopy(null);
      setLockError(undefined);
      setStatus('open');
      setPrompt(null);
      pending.current = null;
    },
    [setOpen],
  );

  const decide = useCallback(
    (p: Pending & { profile: Profile }) => {
      const current = openRef.current;
      const decision = decideOpen(
        current ? { meta: current.profile.meta, dirty: current.dirty } : null,
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
    [adopt],
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
        session = failure;
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
      notice,
      dismissNotice: () => {
        setNotice(null);
      },
      startNew: (settings) => {
        setOpen({ profile: newProfile(settings), dirty: true });
        setStatus('open');
      },
      openFromDisk: async () => {
        try {
          const picked = await pickFile();
          if (picked) await handleOpened(picked);
        } catch (err) {
          setPrompt({ kind: 'file-problem', fileName: '', issues: [messageOf(err)] });
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
        let raw: unknown;
        try {
          raw = JSON.parse(text);
        } catch {
          failWith('unreadable', 'The decrypted copy is not valid JSON.');
          return;
        }
        setLockedCopy(null);
        setLockError(undefined);
        openFromCopy(raw, lockedCopy, key);
      },
      update: (change) => {
        const current = openRef.current;
        if (!current) return;
        const r = applyChange(current.profile, change);
        if (r.ok) setOpen({ ...current, profile: r.profile, dirty: true });
        else setNotice({ kind: 'change-refused', issues: r.issues });
      },
      save: async () => {
        const current = openRef.current;
        if (!current) return;
        const stamped = stamp(current.profile, new Date().toISOString());
        const text = await serialise(stamped, current.key);
        const name = current.fileName ?? suggestedName();
        let saved: { name: string; handle?: FileSystemFileHandle } | null;
        try {
          saved = await saveFile(text, name, handle.current);
        } catch {
          // The remembered file may have moved or its drive is gone. Forget it and save a new copy.
          handle.current = undefined;
          void saveHandle(null).catch(() => undefined);
          try {
            saved = await saveFile(text, name);
          } catch {
            downloadText(text, name);
            saved = { name };
          }
          setNotice({ kind: 'save-fallback' });
        }
        if (!saved) return;
        handle.current = saved.handle;
        void saveHandle(saved.handle ?? null).catch(() => undefined);
        // Edits made while the save dialog was open stay unsaved.
        const latest = openRef.current ?? current;
        const unchanged = latest.profile === current.profile;
        setOpen({
          ...latest,
          profile: { ...latest.profile, meta: stamped.meta },
          dirty: !unchanged,
          fileName: saved.name,
        });
      },
      setPassphrase: async (passphrase) => {
        if (!openRef.current) return;
        const key = passphrase ? await deriveKey(passphrase) : undefined;
        const latest = openRef.current;
        const { key: _old, ...rest } = latest;
        setOpen(key ? { ...rest, key, dirty: true } : { ...rest, dirty: true });
      },
      startOver: async () => {
        await clearCopy().catch(() => undefined);
        await saveHandle(null).catch(() => undefined);
        handle.current = undefined;
        setOpen(null);
        setLockedCopy(null);
        setLockError(undefined);
        setNotice(null);
        setStatus('welcome');
      },
      downloadBrowserCopy: async () => {
        const copy = await loadCopy();
        if (!copy) return;
        const body =
          copy.kind === 'plain' ? copy.profile : { format: 'zakat-helper', encrypted: copy.blob };
        downloadText(JSON.stringify(body, null, 2), 'zakat-browser-copy.json');
      },
    };
  }, [
    status,
    open,
    prompt,
    notice,
    lockError,
    lockedCopy,
    failure,
    adopt,
    handleOpened,
    openFromCopy,
    failWith,
    setOpen,
  ]);

  return <SessionContext value={api}>{children}</SessionContext>;
}
