import { spawnSync, type ChildProcess } from 'node:child_process';

/**
 * Spawn option for tool processes: on POSIX each one leads its own process group, so
 * that stopping the tool also stops what it started.
 */
export const OWN_PROCESS_GROUP = process.platform !== 'win32';

const signalGroup = (pid: number, signal: NodeJS.Signals): void => {
  try { process.kill(-pid, signal); } catch { /* the group is already empty */ }
};

/**
 * Stops a tool process and its descendants, escalating after `graceMs`.
 *
 * Limits: a descendant that starts its own session (setsid) leaves the group, and on
 * Windows `taskkill /T` can only walk the tree while the direct child is still alive.
 * Neither is a sandbox.
 */
export async function terminateProcessTree(child: ChildProcess, exited: Promise<void>, graceMs = 2000): Promise<void> {
  const pid = child.pid;
  if (!pid) return;
  const running = () => child.exitCode === null && child.signalCode === null;
  if (process.platform === 'win32') {
    if (running()) spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  } else {
    signalGroup(pid, 'SIGTERM');
  }
  let timer: NodeJS.Timeout | undefined;
  await Promise.race([exited, new Promise<void>(resolve => { timer = setTimeout(resolve, graceMs); })]);
  clearTimeout(timer);
  // Always sweep the group: the leader may have exited while a descendant ignored SIGTERM.
  if (process.platform !== 'win32') signalGroup(pid, 'SIGKILL');
}
