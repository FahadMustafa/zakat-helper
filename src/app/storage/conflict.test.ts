import { describe, expect, it } from 'vitest';
import { decideOpen } from './conflict';

const ID = '6f1c2b8e-3a4d-4c5e-9f60-7a8b9c0d1e2f';
const OTHER = '11111111-2222-4333-8444-555555555555';
const meta = (revision: number, profileId = ID) => ({
  profileId,
  revision,
  savedAt: '2026-03-02T09:00:00.000Z',
});

describe('decideOpen', () => {
  it('opens straight away when nothing is in the browser', () => {
    expect(decideOpen(null, meta(3))).toBe('load-file');
  });

  it('does nothing when the file is the copy already open', () => {
    expect(decideOpen({ meta: meta(3), dirty: false }, meta(3))).toBe('same');
  });

  it('loads a newer save of the same file when nothing is unsaved', () => {
    expect(decideOpen({ meta: meta(3), dirty: false }, meta(5))).toBe('load-file');
  });

  it('asks before opening an older copy of the same file', () => {
    expect(decideOpen({ meta: meta(5), dirty: false }, meta(3))).toBe('ask-file-older');
  });

  it('asks before replacing unsaved changes, whatever the file', () => {
    expect(decideOpen({ meta: meta(3), dirty: true }, meta(3))).toBe('ask-unsaved-changes');
    expect(decideOpen({ meta: meta(3), dirty: true }, meta(9))).toBe('ask-unsaved-changes');
    expect(decideOpen({ meta: meta(3), dirty: true }, meta(1, OTHER))).toBe('ask-unsaved-changes');
  });

  it('opens a different saved profile when the open one has nothing unsaved', () => {
    expect(decideOpen({ meta: meta(3), dirty: false }, meta(1, OTHER))).toBe('load-file');
  });
});
