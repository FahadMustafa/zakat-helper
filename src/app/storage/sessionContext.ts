import { createContext, useContext } from 'react';
import type { Profile, Settings } from '../../engine/schema';

export type Session =
  | { kind: 'loading' }
  | { kind: 'welcome' }
  | { kind: 'locked'; error?: 'wrong-passphrase' }
  | { kind: 'open'; profile: Profile; dirty: boolean; encrypted: boolean; fileName?: string }
  | { kind: 'error'; reason: 'newer-version' | 'unreadable' | 'unexpected'; details: string };

/** Something the user should know that does not stop the app. */
export type Notice =
  | { kind: 'change-refused'; issues: string[] }
  | { kind: 'save-fallback' }
  | { kind: 'copy-failed' };

/** A dialog the user must answer before the app can go on. */
export type Prompt =
  | { kind: 'file-passphrase'; fileName: string; error?: 'wrong-passphrase' }
  | { kind: 'conflict'; reason: 'file-older' | 'unsaved-changes'; fileName: string }
  | { kind: 'file-problem'; fileName: string; issues: string[] };

export type SessionApi = {
  session: Session;
  prompt: Prompt | null;
  notice: Notice | null;
  dismissNotice: () => void;
  startOver: () => Promise<void>;
  downloadBrowserCopy: () => Promise<void>;
  startNew: (settings: Settings) => void;
  openFromDisk: () => Promise<void>;
  submitFilePassphrase: (passphrase: string) => Promise<void>;
  resolveConflict: (keep: 'browser' | 'file') => void;
  dismissPrompt: () => void;
  unlock: (passphrase: string) => Promise<void>;
  update: (change: (p: Profile) => Profile) => void;
  save: () => Promise<void>;
  setPassphrase: (passphrase: string | null) => Promise<void>;
};

export const SessionContext = createContext<SessionApi | null>(null);

export function useSession(): SessionApi {
  const api = useContext(SessionContext);
  if (!api) throw new Error('useSession must be used inside <SessionProvider>');
  return api;
}

/** Narrow to an open profile; screens that need one call this. */
export function useOpenProfile(): Extract<Session, { kind: 'open' }> & Omit<SessionApi, 'session'> {
  const { session, ...api } = useSession();
  if (session.kind !== 'open')
    throw new Error(`Expected an open profile, session is ${session.kind}`);
  return { ...session, ...api };
}
