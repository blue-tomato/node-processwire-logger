import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import Logger from '../index.js';

/**
 * Helper: create a fresh temp directory for each test.
 */
function makeTmpDir() {
  return mkdtempSync(join(tmpdir(), 'pw-logger-test-'));
}

/**
 * Helper: read the log file content from a temp assets dir.
 */
function readLog(assetsPath, fileName) {
  const safeName = fileName
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9._-]+/g, '_');
  return readFileSync(join(assetsPath, 'logs', `${safeName}.txt`), 'utf8');
}

// Collect temp dirs for cleanup
const tmpDirs = [];
afterEach(() => {
  for (const dir of tmpDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
  tmpDirs.length = 0;
});

// --- Constructor -----------------------------------------------------------

describe('constructor', () => {
  it('should create the logs directory and log file', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('app', tmp);
    logger.log();
    await logger.close();

    assert.ok(existsSync(join(tmp, 'logs', 'app.txt')));
  });

  it('should throw on empty logFileName', () => {
    assert.throws(() => new Logger(''), {
      name: 'TypeError',
      message: /non-empty string/,
    });
  });

  it('should throw on non-string logFileName', () => {
    assert.throws(() => new Logger(123), {
      name: 'TypeError',
      message: /non-empty string/,
    });
  });

  it('should throw when sanitized name is empty', () => {
    assert.throws(() => new Logger('.hidden', makeTmpDir()), {
      name: 'TypeError',
      message: /empty name after sanitization/,
    });
  });
});

// --- File name sanitization ------------------------------------------------

describe('file name sanitization', () => {
  it('should lowercase the file name', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('MyLog', tmp);
    logger.log();
    await logger.close();

    assert.ok(existsSync(join(tmp, 'logs', 'mylog.txt')));
  });

  it('should strip existing extension', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('data.log', tmp);
    logger.log();
    await logger.close();

    assert.ok(existsSync(join(tmp, 'logs', 'data.txt')));
  });

  it('should replace unsafe characters with underscores', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('my log file!', tmp);
    logger.log();
    await logger.close();

    assert.ok(existsSync(join(tmp, 'logs', 'my_log_file_.txt')));
  });

  it('should strip path traversal via basename', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('../../etc/passwd', tmp);
    logger.log();
    await logger.close();

    // basename extracts "passwd", which is safe
    assert.ok(existsSync(join(tmp, 'logs', 'passwd.txt')));
  });
});

// --- log() -----------------------------------------------------------------

describe('log()', () => {
  it('should write a tab-separated line with timestamp, user, url, msg', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('test', tmp);
    logger.log('admin', '/dashboard', 'page viewed');
    await logger.close();

    const content = readLog(tmp, 'test');
    const parts = content.trim().split('\t');

    assert.equal(parts.length, 4);
    // ISO 8601 timestamp
    assert.doesNotThrow(() => new Date(parts[0]).toISOString());
    assert.equal(parts[1], 'admin');
    assert.equal(parts[2], '/dashboard');
    assert.equal(parts[3], 'page viewed');
  });

  it('should use default values when called without arguments', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('test', tmp);
    logger.log();
    await logger.close();

    const parts = readLog(tmp, 'test').trim().split('\t');
    assert.equal(parts[1], 'nodejs');
    assert.equal(parts[2], '?');
    assert.equal(parts[3], '-');
  });

  it('should append multiple log entries', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('test', tmp);
    logger.log('a', '/1', 'first');
    logger.log('b', '/2', 'second');
    await logger.close();

    const lines = readLog(tmp, 'test').trim().split('\n');
    assert.equal(lines.length, 2);
  });

  it('should return a boolean (backpressure signal)', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('test', tmp);
    const result = logger.log('user', '/', 'msg');
    await logger.close();

    assert.equal(typeof result, 'boolean');
  });

  it('should throw when called after close', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('test', tmp);
    await logger.close();

    assert.throws(() => logger.log(), {
      message: /already closed/,
    });
  });
});

// --- Input sanitization (#clean) -------------------------------------------

describe('input sanitization', () => {
  it('should strip newlines from values', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('test', tmp);
    logger.log('user', '/path', 'line1\nline2\r\nline3');
    await logger.close();

    const content = readLog(tmp, 'test');
    const lines = content.trim().split('\n');
    assert.equal(lines.length, 1, 'newlines in msg should be replaced');
  });

  it('should strip tabs from values', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('test', tmp);
    logger.log('user', '/path', 'col1\tcol2');
    await logger.close();

    const parts = readLog(tmp, 'test').trim().split('\t');
    // Should still be exactly 4 fields (timestamp, user, url, msg)
    assert.equal(parts.length, 4);
  });

  it('should use fallback for null/undefined values', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('test', tmp);
    logger.log(null, undefined, null);
    await logger.close();

    const parts = readLog(tmp, 'test').trim().split('\t');
    assert.equal(parts[1], 'nodejs');
    assert.equal(parts[2], '?');
    assert.equal(parts[3], '-');
  });

  it('should truncate values exceeding MAX_FIELD_LENGTH', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const longMsg = 'x'.repeat(5000);
    const logger = new Logger('test', tmp);
    logger.log('user', '/', longMsg);
    await logger.close();

    const parts = readLog(tmp, 'test').trim().split('\t');
    // 4096 chars + ellipsis character
    assert.ok(parts[3].length <= 4097);
    assert.ok(parts[3].endsWith('…'));
  });

  it('should coerce non-string values to strings', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('test', tmp);
    logger.log(42, true, { key: 'val' });
    await logger.close();

    const parts = readLog(tmp, 'test').trim().split('\t');
    assert.equal(parts[1], '42');
    assert.equal(parts[2], 'true');
    assert.equal(parts[3], '[object Object]');
  });
});

// --- healthy ---------------------------------------------------------------

describe('healthy', () => {
  it('should be true on a fresh logger', () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('test', tmp);
    assert.equal(logger.healthy, true);
  });

  it('should be false after close', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('test', tmp);
    await logger.close();

    assert.equal(logger.healthy, false);
  });
});

// --- close() ---------------------------------------------------------------

describe('close()', () => {
  it('should be idempotent (calling twice does not throw)', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('test', tmp);
    await logger.close();
    await logger.close(); // should not throw
  });

  it('should flush all buffered data', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = new Logger('test', tmp);
    for (let i = 0; i < 100; i++) {
      logger.log('user', '/', `msg-${i}`);
    }
    await logger.close();

    const lines = readLog(tmp, 'test').trim().split('\n');
    assert.equal(lines.length, 100);
  });
});

// --- static create() -------------------------------------------------------

describe('Logger.create()', () => {
  it('should return a working Logger instance', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = await Logger.create('async-test', tmp);
    assert.ok(logger instanceof Logger);
    assert.equal(logger.healthy, true);

    logger.log('user', '/async', 'created via factory');
    await logger.close();

    const content = readLog(tmp, 'async-test');
    assert.ok(content.includes('created via factory'));
  });

  it('should create the logs directory asynchronously', async () => {
    const tmp = makeTmpDir();
    tmpDirs.push(tmp);

    const logger = await Logger.create('test', tmp);
    assert.ok(existsSync(join(tmp, 'logs')));
    await logger.close();
  });
});
