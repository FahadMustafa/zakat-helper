/** Which screen is showing. Local UI state, not part of the saved file. */
export type View =
  | { kind: 'home' }
  | { kind: 'settings' }
  | { kind: 'checkpoint'; checkpointId: string }
  | { kind: 'year'; checkpointId: string };
