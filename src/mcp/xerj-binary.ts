/**
 * Pinned official XERJ release artifacts. No installation during discovery.
 * Only the named executable is extracted from a SHA-256 verified archive.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync, inflateRawSync} from 'node:zlib';

export const XERJ_RELEASE = '1.0.0-rc.104';
type Artifact = {target:string; extension:'.zip'|'.tar.gz'; sha256:string};
const artifacts: Record<string,Artifact> = {
  'win32-x64': {target:'x86_64-pc-windows-msvc',extension:'.zip',sha256:'8c4e2dea8aaf0dbfdbf470e8521a27e31c355e2a63991788c4aa9615fcbbabfa'},
  'win32-arm64': {target:'aarch64-pc-windows-msvc',extension:'.zip',sha256:'0fd1aa7c6b1b68c3eaf87e4a003eec8634ec5be8edd91143a5a718295486cd7a'},
  'linux-x64': {target:'x86_64-unknown-linux-musl',extension:'.tar.gz',sha256:'1628ee401a9a121156cc380950f9d48923e6e856458ae1e6648f0ef18db7b693'},
  'linux-arm64': {target:'aarch64-unknown-linux-musl',extension:'.tar.gz',sha256:'cd3acf3b37d7f942157bebb05efa4221651b25f07b18a85beeacb5757647ea4f'},
  'darwin-x64': {target:'x86_64-apple-darwin',extension:'.tar.gz',sha256:'e2642528fb8ef568ff92b0166a4a10b509ad265568e848b575ab4d9ef13a2c64'},
  'darwin-arm64': {target:'aarch64-apple-darwin',extension:'.tar.gz',sha256:'5f16b17dcf46abb566ec33a0f4733b459c0fbc229fcd0f58a9e6ad698f37d58e'}
};
const MAX_ARCHIVE=80*1024*1024;
const MAX_BINARY=200*1024*1024;
const digest=(bytes:Uint8Array)=>crypto.createHash('sha256').update(bytes).digest('hex');
function safeName(name:string,executable:string):boolean {
  return !name.startsWith('/') && !name.includes('\\') &&
    name.split('/').every(p=>p!=='.'&&p!=='..') && name.split('/').at(-1)===executable;
}
function extractTar(data:Buffer,executable:string):Buffer {
  const tar=gunzipSync(data,{maxOutputLength:MAX_BINARY+8*1024*1024});
  let found:Buffer|null=null;
  for(let offset=0;offset+512<=tar.length;){
    const name=tar.toString('utf8',offset,offset+100).split('\0')[0]??'';
    if(!name)break;
    const raw=tar.toString('ascii',offset+124,offset+136).replace(/\0.*$/,'').trim();
    if(!/^[0-7]+$/.test(raw))throw new Error('Invalid XERJ tar header.');
    const size=parseInt(raw,8),start=offset+512;
    if(!Number.isSafeInteger(size)||size<0||start+size>tar.length)throw new Error('Invalid XERJ tar entry.');
    if(safeName(name,executable)&&tar[offset+156]===48){
      if(found||size>MAX_BINARY)throw new Error('Ambiguous or oversized XERJ binary.');
      found=Buffer.from(tar.subarray(start,start+size));
    }
    offset=start+Math.ceil(size/512)*512;
  }
  if(!found)throw new Error('XERJ executable missing in official archive.');
  return found;
}
function extractZip(data:Buffer,executable:string):Buffer {
  // Read the central directory rather than trusting local-header size fields.
  let found:Buffer|null=null;
  let count=0;
  for(let offset=0;offset+46<=data.length;offset++){
    if(data.readUInt32LE(offset)!==0x02014b50)continue;
    const flags=data.readUInt16LE(offset+8),method=data.readUInt16LE(offset+10);
    const compressed=data.readUInt32LE(offset+20),uncompressed=data.readUInt32LE(offset+24);
    const nameSize=data.readUInt16LE(offset+28),extra=data.readUInt16LE(offset+30),comment=data.readUInt16LE(offset+32);
    const localOffset=data.readUInt32LE(offset+42);
    if(offset+46+nameSize+extra+comment>data.length)throw new Error('Invalid XERJ ZIP directory.');
    const name=data.toString('utf8',offset+46,offset+46+nameSize);
    if(safeName(name,executable)){
      count++;
      if(count>1||flags&1||uncompressed>MAX_BINARY||compressed>MAX_ARCHIVE||
        ![0,8].includes(method)||localOffset+30>data.length||
        data.readUInt32LE(localOffset)!==0x04034b50)
        throw new Error('Invalid XERJ ZIP executable.');
      const nameLen=data.readUInt16LE(localOffset+26),extraLen=data.readUInt16LE(localOffset+28);
      const start=localOffset+30+nameLen+extraLen;
      if(start+compressed>data.length)throw new Error('Invalid XERJ ZIP payload.');
      const packed=data.subarray(start,start+compressed);
      const output=method===8?inflateRawSync(packed,{maxOutputLength:MAX_BINARY}):Buffer.from(packed);
      if(output.length!==uncompressed)throw new Error('XERJ ZIP size mismatch.');
      found=output;
    }
    offset+=45+nameSize+extra+comment;
  }
  if(!found)throw new Error('XERJ executable missing in official archive.');
  return found;
}
/** Read-only detection; does not run or adopt untrusted binaries. */
export function findExistingXerj(platform:NodeJS.Platform):string|null {
  const exe=platform==='win32'?'xerj.exe':'xerj';
  for(const folder of (process.env['PATH']??'').split(path.delimiter)){
    if(!path.isAbsolute(folder))continue;
    const filename=path.join(folder,exe);
    try{if(fs.lstatSync(filename).isFile())return filename;}catch{ /* not installed */ }
  }
  return null;
}
export function xerjArtifact(platform:NodeJS.Platform,arch:string=process.arch) {
  const artifact=artifacts[platform+'-'+arch];
  if(!artifact)throw new Error('No reviewed XERJ release for this OS/CPU.');
  const filename='xerj-'+XERJ_RELEASE+'-'+artifact.target+artifact.extension;
  return {...artifact,filename,url:'https://github.com/xerj-org/xerj/releases/download/v'+XERJ_RELEASE+'/'+filename};
}
/** Used by the existing MCP Extension Manager's staging/rollback transaction. */
export async function stageXerjBinary(folder:string,platform:NodeJS.Platform,
  arch:string=process.arch,download:typeof fetch=fetch):Promise<void> {
  const release=xerjArtifact(platform,arch);
  const response=await download(release.url,{signal:AbortSignal.timeout(180000)});
  if(!response.ok||Number(response.headers.get('content-length')??0)>MAX_ARCHIVE)
    throw new Error('XERJ release download failed or exceeded size limit.');
  const archive=Buffer.from(await response.arrayBuffer());
  if(archive.length>MAX_ARCHIVE||digest(archive)!==release.sha256)
    throw new Error('XERJ release SHA-256 verification failed.');
  const binary=release.extension==='.zip'?extractZip(archive,'xerj.exe'):extractTar(archive,'xerj');
  const target=path.join(folder,platform==='win32'?'xerj.exe':'xerj');
  fs.writeFileSync(target,binary,{flag:'wx',mode:0o755});
  if(platform!=='win32')fs.chmodSync(target,0o755);
}
