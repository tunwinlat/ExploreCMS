const { TextDecoder, TextEncoder } = require('util');
const { ReadableStream, TransformStream, WritableStream } = require('node:stream/web');
const { MessageChannel, MessagePort } = require('worker_threads');

global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
global.ReadableStream = ReadableStream;
global.TransformStream = TransformStream;
global.WritableStream = WritableStream;
global.MessageChannel = MessageChannel;
global.MessagePort = MessagePort;

const { Request, Response, Headers, fetch, FormData, File } = require('undici');

if (typeof global.Request === 'undefined') {
  global.Request = Request;
  global.Response = Response;
  global.Headers = Headers;
  global.fetch = fetch;
  global.FormData = FormData;
  global.File = File;
}

require('@testing-library/jest-dom');
