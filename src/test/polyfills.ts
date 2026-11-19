import { performance } from 'node:perf_hooks';
import {
  ReadableStream,
  TransformStream,
  WritableStream,
} from 'node:stream/web';
import {
  clearImmediate,
  clearInterval,
  clearTimeout,
  setImmediate,
  setInterval,
  setTimeout,
} from 'node:timers';
import { TextDecoder, TextEncoder } from 'node:util';
import {
  BroadcastChannel,
  MessageChannel,
  MessagePort,
} from 'node:worker_threads';
import type * as Undici from 'undici';

Object.assign(globalThis, {
  TextDecoder,
  TextEncoder,
  ReadableStream,
  WritableStream,
  TransformStream,
  BroadcastChannel,
  MessageChannel,
  MessagePort,
  clearImmediate,
  setImmediate,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
});
Object.defineProperty(globalThis, 'performance', {
  value: performance,
  configurable: true,
});
// undici reads TextEncoder/streams at import time; load it after the globals above.
const { fetch, Headers, Request, Response, FormData }: typeof Undici =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('undici');
Object.assign(globalThis, { fetch, Headers, Request, Response, FormData });
