import { IncomingMessage, ServerResponse } from 'http';
import { Socket } from 'net';
import { URL } from 'url';
import app from '../../src/app.js';

const buildUrl = (event) => {
  if (event.rawUrl) {
    return new URL(event.rawUrl);
  }

  const scheme = event.headers['x-forwarded-proto'] || 'https';
  const host = event.headers.host || 'localhost';
  const path = event.path || '/';
  const query = event.rawQuery || '';
  return new URL(`${scheme}://${host}${path}${query ? `?${query}` : ''}`);
};

const toRawHeaders = (headers = {}) => {
  const raw = [];
  Object.entries(headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => raw.push(key, v));
    } else if (value !== undefined) {
      raw.push(key, value);
    }
  });
  return raw;
};

export const handler = async (event, context) => {
  return await new Promise((resolve, reject) => {
    const url = buildUrl(event);
    const socket = new Socket();
    const req = new IncomingMessage(socket);

    req.url = url.pathname + url.search;
    req.method = event.httpMethod;
    req.headers = event.headers || {};
    req.rawHeaders = toRawHeaders(event.multiValueHeaders || event.headers);
    req.connection = req.socket = socket;
    req.httpVersionMajor = 1;
    req.httpVersionMinor = 1;
    req.httpVersion = '1.1';

    if (event.body) {
      const bodyBuffer = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64')
        : Buffer.from(event.body);
      req.push(bodyBuffer);
    }
    req.push(null);

    const res = new ServerResponse(req);
    res.assignSocket(socket);

    const responseChunks = [];

    const cleanup = () => {
      res.detachSocket(socket);
      socket.destroy();
    };

    res.on('finish', () => {
      cleanup();
      const bodyBuffer = Buffer.concat(responseChunks);
      resolve({
        statusCode: res.statusCode || 200,
        headers: res.getHeaders(),
        body: bodyBuffer.toString('base64'),
        isBase64Encoded: true,
      });
    });

    res.on('error', (err) => {
      cleanup();
      reject(err);
    });

    const originalWrite = res.write.bind(res);
    res.write = (chunk, encoding, cb) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
      responseChunks.push(buffer);
      return originalWrite(chunk, encoding, cb);
    };

    const originalEnd = res.end.bind(res);
    res.end = (chunk, encoding, cb) => {
      if (chunk) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
        responseChunks.push(buffer);
      }
      return originalEnd(chunk, encoding, cb);
    };

    try {
      app.handle(req, res);
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
};
