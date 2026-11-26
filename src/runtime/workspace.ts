import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { redactSecrets } from '../security/scrubber.js';
import type { ToolExecutor, ToolRequest, ToolResult } from './mission.js';

const BLOCKED = new Set(['.git', '.env', '.agents', 'node_modules', '.ssh', '.aws', '.npmrc', '.pypirc', 'id_rsa', 'id_ed25519', 'credentials', 'secrets']);
const SAFE_FILENAME = /(?:\.(?:key|pem|p12|pfx|keystore|kdbx)|^\.env(?:\.|$))/i;
const RESERVED_DEVICE = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
const MAX_FILE = 128 * 1024;
const MAX_WRITE = 64 * 1024;
const MAX_OUTPUT = 12_000;
const own = (v: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(v, key);
// Trailing dots/spaces: Win32 tools strip them, so `.env ` would later open `.env`.
const isProtectedPart = (p: string) => BLOCKED.has(p.toLowerCase()) || SAFE_FILENAME.test(p) || RESERVED_DEVICE.test(p) || /[. ]$/.test(p);
/** Fixed tool-visible messages: raw Node errors embed absolute private paths. */
const SYSTEM_ERRORS: Record<string, string> = {
  ENOENT: 'Path not found', EACCES: 'Permission denied', EPERM: 'Permission denied',
  EISDIR: 'Expected a file path', ENOTDIR: 'Expected a directory path', EBUSY: 'File is busy'
};
function toolError(err: unknown): string {
  const code = (err as NodeJS.ErrnoException | null)?.code;
  if (typeof code === 'string') return SYSTEM_ERRORS[code] ?? 'Filesystem operation failed';
  return err instanceof Error ? redactSecrets(err.message).slice(0, 200) : 'Operation failed';
}

function runFixed(command: string, args: string[], cwd: string, timeout: number): Promise<{ code: number; output: string }> {
  return new Promise(resolve => {
    let output = '';
    let done = false;
    const child = spawn(command, args, {
      cwd, shell: process.platform === 'win32' && command === 'npm', windowsHide: true,
      env: Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','HOME','USERPROFILE','APPDATA','LOCALAPPDATA','PATHEXT'].filter(k => process.env[k]).map(k => [k, process.env[k]])),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const timer = setTimeout(() => child.kill(), timeout);
    const append = (chunk: Buffer) => { if (output.length < MAX_OUTPUT) output += chunk.toString('utf8').slice(0, MAX_OUTPUT - output.length); };
    child.stdout.on('data', append); child.stderr.on('data', append);
    child.on('error', () => { if (!done) { done = true; clearTimeout(timer); resolve({code:-1, output:'Executable unavailable'}); } });
    child.on('close', (code) => { if (!done) { done = true; clearTimeout(timer); resolve({code:code ?? -1, output:redactSecrets(output)}); } });
  });
}

/** Small, explicit set of operations confined to one physical Git checkout. */
export class WorkspaceTools implements ToolExecutor {
  private readonly root: string;
  /** OS-canonical root (long names, on-disk case) used for containment checks. */
  private readonly canonicalRoot: string;
  readonly workspaceId: string;
  private readonly seen = new Set<string>();
  private revision = 0;
  constructor(workspace: string, private readonly allowWrites: boolean, private readonly allowTests: boolean) {
    const selected = path.resolve(workspace);
    const st = fs.lstatSync(selected);
    // macOS exposes its system temporary directory as /var -> /private/var.
    // Canonicalize trusted ancestor aliases without accepting a linked checkout itself.
    if (!st.isDirectory() || st.isSymbolicLink()) throw new Error('Use an existing physical Git checkout');
    this.root = fs.realpathSync(selected);
    if (!fs.existsSync(path.join(this.root, '.git'))) throw new Error('Use an existing physical Git checkout');
    // realpath.native can fail on some virtual volumes (RAM disks); the JS form still bounds the checkout.
    try { this.canonicalRoot = fs.realpathSync.native(selected); } catch { this.canonicalRoot = this.root; }
    // Identity stays derived from the historical root so queued jobs keep their checkpoints.
    this.workspaceId = crypto.createHash('sha256').update(this.root).digest('hex');
  }
  private safe(input: unknown, file = false): string {
    if (typeof input !== 'string' || input.length > 512 || path.isAbsolute(input) || input.includes('\0') || input.includes(':')) throw new Error('Invalid relative path');
    const parts = input.replace(/\\/g, '/').split('/');
    if (parts.some(p => p === '..' || p === '.' || isProtectedPart(p))) throw new Error('Protected path');
    const resolved = path.resolve(this.root, input || '.');
    if (resolved !== this.root && !resolved.startsWith(this.root + path.sep)) throw new Error('Path escapes workspace');
    let current = this.root;
    for (const part of path.relative(this.root, resolved).split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('Symlinks are excluded');
    }
    if (file && resolved === this.root) throw new Error('Expected a file path');
    // The lexical check above sees the name as typed. Windows also resolves 8.3 aliases
    // (GIT~1 -> .git, ENV~1 -> .env) and case variants, so re-check the OS-canonical
    // form of the deepest existing ancestor; not-yet-existing tail names are created literally.
    let existing = resolved;
    const tail: string[] = [];
    while (existing !== this.root && !fs.existsSync(existing)) {
      tail.unshift(path.basename(existing));
      existing = path.dirname(existing);
    }
    const canonical = path.join(fs.realpathSync.native(existing), ...tail);
    const relative = path.relative(this.canonicalRoot, canonical);
    if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error('Path escapes workspace');
    if (relative.split(path.sep).some(p => p && isProtectedPart(p))) throw new Error('Protected path');
    return canonical;
  }
  async execute(call: ToolRequest): Promise<ToolResult> {
    const a = call.arguments;
    if (!a || typeof a !== 'object' || Array.isArray(a)) return {ok:false,progress:false,output:'Invalid tool arguments'};
    try {
      if (call.name === 'list_files') {
        if (Object.keys(a).some(k => k !== 'path')) throw new Error('Unexpected argument');
        const dir = this.safe(a['path'] ?? '');
        const entries = fs.readdirSync(dir, {withFileTypes:true}).filter(x => !BLOCKED.has(x.name.toLowerCase()) && !SAFE_FILENAME.test(x.name) && !RESERVED_DEVICE.test(x.name) && !x.isSymbolicLink()).slice(0,150).map(x => `${x.isDirectory() ? 'dir' : 'file'} ${x.name}`);
        const key = `list:${dir}:${this.revision}`; const progress = !this.seen.has(key); this.seen.add(key);
        return {ok:true,progress,output:entries.join('\n')};
      }
      if (call.name === 'read_file') {
        if (!own(a,'path') || Object.keys(a).some(k => !['path','start_line','max_lines'].includes(k))) throw new Error('Expected path, optional start_line and max_lines');
        const file = this.safe(a['path'], true);
        if (fs.statSync(file).size > MAX_FILE) throw new Error('File exceeds read limit');
        const start = a['start_line'] ?? 1; const max = a['max_lines'] ?? 120;
        if (!Number.isSafeInteger(start) || Number(start)<1 || Number(start)>100000 ||
            !Number.isSafeInteger(max) || Number(max)<1 || Number(max)>250) throw new Error('Invalid line range');
        const lines = fs.readFileSync(file,'utf8').split('\n');
        const content = redactSecrets(lines.slice(Number(start)-1,Number(start)-1+Number(max))
          .map((line,i)=>`${Number(start)+i}: ${line}`).join('\n'));
        const key = `read:${file}:${Number(start)}:${Number(max)}:${crypto.createHash('sha256').update(content).digest('hex')}`;
        const progress = !this.seen.has(key); this.seen.add(key);
        return {ok:true,progress,output:`Lines ${start}-${Math.min(lines.length,Number(start)+Number(max)-1)} of ${lines.length}\n${content.slice(0, MAX_OUTPUT)}${content.length>MAX_OUTPUT?'\n[TRUNCATED: request fewer lines]':''}`};
      }
      if (call.name === 'write_file') {
        if (!this.allowWrites) return {ok:false,progress:false,output:'Writes require --allow-write'};
        if (!own(a,'path') || !own(a,'content') || Object.keys(a).length!==2 || typeof a['content']!=='string') throw new Error('Expected path and content');
        if (Buffer.byteLength(a['content']) > MAX_WRITE) throw new Error('File exceeds write limit');
        const file = this.safe(a['path'],true);
        const parent = path.dirname(file);
        if (!fs.statSync(parent).isDirectory()) throw new Error('Parent must already exist');
        const old = fs.existsSync(file) ? fs.readFileSync(file) : null;
        if (old && old.equals(Buffer.from(a['content']))) return {ok:true,progress:false,output:'No change'};
        const mode = old ? fs.statSync(file).mode & 0o777 : 0o600;
        const tmp = path.join(parent, `.${path.basename(file)}.${crypto.randomBytes(5).toString('hex')}.tmp`);
        try {
          fs.writeFileSync(tmp, a['content'], {flag:'wx',mode});
          fs.renameSync(tmp,file);
        } finally { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); }
        this.revision++;
        return {ok:true,progress:true,changed:true,output:'Workspace file changed (not committed)'};
      }
      if (call.name === 'verify') {
        if (Object.keys(a).some(k=>k!=='check')) throw new Error('Unexpected argument');
        const check = a['check'];
        if (check !== 'diff' && check !== 'test' && check !== 'typecheck') throw new Error('Unknown verification');
        if (check !== 'diff' && !this.allowTests) return {ok:false,progress:false,output:'Project scripts require --allow-tests'};
        const command = check === 'diff' ? 'git' : 'npm';
        const args = check === 'diff' ? ['diff','--check'] : ['run', check === 'test' ? 'test' : 'typecheck'];
        const result = await runFixed(command,args,this.root,check === 'diff' ? 15000 : 120000);
        const key = `verify:${check}:${this.revision}`; const progress = result.code === 0 && !this.seen.has(key); this.seen.add(key);
        return {ok:result.code===0,progress,tested:result.code===0 && check==='test',output:result.code === 0 ? `${check}: passed` : `${check}: failed; ${result.output.slice(0,2000)}`};
      }
      throw new Error('Unknown tool');
    } catch (err) { return {ok:false,progress:false,output:toolError(err)}; }
  }
}
