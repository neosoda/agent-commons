import fs from 'node:fs';

/**
 * Creates a directory link that a standard (non-admin, no Developer Mode) Windows
 * account can create: an NTFS junction on win32, a symlink elsewhere.
 */
export function linkDirectory(target: string, linkPath: string): void {
  fs.symlinkSync(target, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
}

/**
 * Creates a file symlink, returning false when the OS refuses it (Windows without
 * SeCreateSymbolicLinkPrivilege / Developer Mode) so callers can skip that assertion.
 */
export function tryLinkFile(target: string, linkPath: string): boolean {
  try {
    fs.symlinkSync(target, linkPath, 'file');
    return true;
  } catch (err) {
    if (process.platform === 'win32' && (err as NodeJS.ErrnoException).code === 'EPERM') return false;
    throw err;
  }
}
