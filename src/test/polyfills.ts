import { TextDecoder, TextEncoder } from 'node:util';
import { ReadableStream, WritableStream, TransformStream } from 'node:stream/web';
import { BroadcastChannel, MessageChannel, MessagePort } from 'node:worker_threads';
import { clearImmediate, setImmediate, setTimeout, clearTimeout, setInterval, clearInterval } from 'node:timers';
import { performance } from 'node:perf_hooks';

Object.assign(globalThis, { TextDecoder, TextEncoder, ReadableStream, WritableStream, TransformStream, BroadcastChannel, MessageChannel, MessagePort, clearImmediate, setImmediate, setTimeout, clearTimeout, setInterval, clearInterval });
Object.defineProperty(globalThis, 'performance', { value: performance, configurable: true });
// undici reads TextEncoder/streams at import time; load it after the globals above.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fetch, Headers, Request, Response, FormData } = require('undici') as typeof import('undici');
Object.assign(globalThis, { fetch, Headers, Request, Response, FormData });
