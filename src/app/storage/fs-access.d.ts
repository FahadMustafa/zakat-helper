// File System Access API pieces that lib.dom does not declare (Chromium only).
interface FilePickerType {
  description?: string;
  accept: Record<string, string[]>;
}
interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: FilePickerType[];
}
interface OpenFilePickerOptions {
  types?: FilePickerType[];
  multiple?: boolean;
}
interface Window {
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  showOpenFilePicker?: (options?: OpenFilePickerOptions) => Promise<FileSystemFileHandle[]>;
}
interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}
interface FileSystemHandle {
  queryPermission?: (d?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>;
  requestPermission?: (d?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>;
}
