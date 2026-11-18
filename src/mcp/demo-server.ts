#!/usr/bin/env node
/**
 * Zero-dependency demonstration MCP server (stdio, newline-delimited JSON-RPC).
 * Exposes two read-only tools so a client's wiring can be verified end to end without
 * secrets, network access or file system access:
 *   - echo  { text }  → returns the text
 *   - time  {}        → returns the server's current ISO time
 */
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

export const DEMO_SERVER_NAME = 'agent-commons-demo';

const TOOLS = [
  {
    name: 'echo',
    description: 'Returns the given text unchanged (Agent Commons demo, read-only).',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] }
  },
  {
    name: 'time',
    description: 'Returns the current time on this machine (Agent Commons demo, read-only).',
    inputSchema: { type: 'object', properties: {} }
  }
];

type Message = { id?: number | string; method?: string; params?: Record<string, unknown> };

export function handleDemoMessage(msg: Message, version: string): Record<string, unknown> | null {
  if (msg.id === undefined || msg.id === null) return null; // notifications need no answer
  const reply = (result: unknown) => ({ jsonrpc: '2.0', id: msg.id, result });
  const params = msg.params ?? {};
  switch (msg.method) {
    case 'initialize':
      return reply({
        protocolVersion: typeof params['protocolVersion'] === 'string' ? params['protocolVersion'] : '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: DEMO_SERVER_NAME, version }
      });
    case 'ping':
      return reply({});
    case 'tools/list':
      return reply({ tools: TOOLS });
    case 'tools/call': {
      const args = (params['arguments'] ?? {}) as Record<string, unknown>;
      if (params['name'] === 'echo') {
        const text = typeof args['text'] === 'string' ? args['text'].slice(0, 2000) : '';
        return reply({ content: [{ type: 'text', text }] });
      }
      if (params['name'] === 'time') return reply({ content: [{ type: 'text', text: new Date().toISOString() }] });
      return reply({ content: [{ type: 'text', text: 'Unknown tool.' }], isError: true });
    }
    default:
      return { jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'Method not found' } };
  }
}

export function runDemoServer(version = '1.0.0', input: NodeJS.ReadableStream = process.stdin,
                              output: NodeJS.WritableStream = process.stdout): void {
  readline.createInterface({ input }).on('line', line => {
    let msg: Message;
    try { msg = JSON.parse(line) as Message; } catch {
      output.write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) + '\n');
      return;
    }
    const answer = handleDemoMessage(msg, version);
    if (answer) output.write(JSON.stringify(answer) + '\n');
  });
}

/** Absolute path of this compiled file, used to build a client configuration. */
export function demoServerPath(): string {
  return fileURLToPath(import.meta.url);
}

if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === path.resolve(process.argv[1]).toLowerCase()) {
  runDemoServer();
}
