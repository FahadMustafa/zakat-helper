// Open and save the user's file. Chromium writes back to the same file; other browsers download a copy.

const TYPES: FilePickerType[] = [
  { description: 'Zakat Helper file', accept: { 'application/json': ['.json'] } },
];

export type PickedFile = { text: string; name: string; handle?: FileSystemFileHandle };

function pickWithInput(): Promise<PickedFile | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file.text().then((text) => {
        resolve({ text, name: file.name });
      }, reject);
    });
    input.addEventListener('cancel', () => {
      resolve(null);
    });
    input.click();
  });
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

/** Returns null when the user cancels. */
export async function pickFile(): Promise<PickedFile | null> {
  if (!window.showOpenFilePicker) return pickWithInput();
  try {
    const [handle] = await window.showOpenFilePicker({ types: TYPES });
    if (!handle) return null;
    const file = await handle.getFile();
    return { text: await file.text(), name: file.name, handle };
  } catch (err) {
    if (isAbort(err)) return null;
    throw err;
  }
}

function download(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

async function writeTo(handle: FileSystemFileHandle, text: string): Promise<void> {
  const w = await handle.createWritable();
  await w.write(text);
  await w.close();
}

/**
 * Save the text. With a handle (Chromium), write back to the same file after a permission check that
 * must run inside a click. Returns null when the user cancels.
 */
export async function saveFile(
  text: string,
  name: string,
  handle?: FileSystemFileHandle,
): Promise<{ name: string; handle?: FileSystemFileHandle } | null> {
  try {
    if (handle) {
      const ok = (await handle.requestPermission?.({ mode: 'readwrite' })) ?? 'granted';
      if (ok === 'granted') {
        await writeTo(handle, text);
        return { name: handle.name, handle };
      }
    }
    if (window.showSaveFilePicker) {
      const h = await window.showSaveFilePicker({ suggestedName: name, types: TYPES });
      await writeTo(h, text);
      return { name: h.name, handle: h };
    }
    download(text, name);
    return { name };
  } catch (err) {
    if (isAbort(err)) return null;
    throw err;
  }
}
