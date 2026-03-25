import { mkdirSync, createWriteStream } from 'node:fs';
import { join, basename } from 'node:path';
import { finished } from 'node:stream/promises';

export default class Logger {
  #stream;
  #closed = false;

  /**
   * Maximum length for a single log field value.
   * Prevents excessive memory usage from oversized input.
   * @type {number}
   */
  static #MAX_FIELD_LENGTH = 4096;

  /**
   * Creates a new Logger instance.
   *
   * Note: The constructor uses synchronous I/O (mkdirSync) to create the
   * logs directory. This is acceptable for one-time startup initialization
   * but should not be called during request handling. For lazy initialization,
   * consider using the static Logger.create() factory method instead.
   *
   * @param {string} logFileName - Name of the log file (will be sanitized)
   * @param {string} [assetsPath=process.cwd()] - Absolute path to the ProcessWire assets directory
   */
  constructor(logFileName, assetsPath = process.cwd()) {
    if (typeof logFileName !== 'string' || logFileName.trim() === '') {
      throw new TypeError('logFileName must be a non-empty string');
    }

    const logsDir = join(assetsPath, 'logs');
    mkdirSync(logsDir, { recursive: true });

    const safeFileName = basename(logFileName)
      .toLowerCase()
      .replace(/\.[^.]+$/, '')           // strip existing extension
      .replace(/[^a-z0-9._-]+/g, '_');   // restrict to safe characters

    if (!safeFileName) {
      throw new TypeError('logFileName resolves to an empty name after sanitization');
    }

    const filePath = join(logsDir, `${safeFileName}.txt`);

    this.#stream = createWriteStream(filePath, {
      flags: 'a',
      encoding: 'utf8',
      flush: true,
    });

    this.#stream.on('error', (err) => {
      console.error('[Logger] Stream error:', err);
    });
  }

  /**
   * Async factory method — creates the logs directory without blocking
   * the event loop. Preferred over the constructor when initializing
   * during request handling or in async contexts.
   *
   * @param {string} logFileName - Name of the log file (will be sanitized)
   * @param {string} [assetsPath=process.cwd()] - Absolute path to the ProcessWire assets directory
   * @returns {Promise<Logger>}
   */
  static async create(logFileName, assetsPath = process.cwd()) {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(join(assetsPath, 'logs'), { recursive: true });
    // Directory exists now — constructor's mkdirSync becomes a no-op
    return new Logger(logFileName, assetsPath);
  }

  /**
   * Whether the logger stream is still healthy and writable.
   * @returns {boolean}
   */
  get healthy() {
    return !this.#closed && !this.#stream.errored;
  }

  /**
   * Timestamp in ProcessWire-compatible format (Y-m-d H:i:s, local time).
   *
   * ProcessWire's FileLog::save() uses PHP's date("Y-m-d H:i:s") to generate
   * timestamps, and FileLog::isValidLine() validates that:
   *  - position 4 and 7 are "-"
   *  - position 10 is a space
   *  - position 19 is the tab delimiter
   *
   * JavaScript's toISOString() produces "2023-10-22T15:18:43.123Z" (24 chars)
   * which fails validation because position 10 is "T" instead of " " and the
   * tab delimiter lands at position 24 instead of 19. Using local time also
   * matches PHP's date() behavior, which defaults to the server timezone.
   *
   * @see https://github.com/processwire/processwire/blob/master/wire/core/FileLog.php
   * @returns {string}
   */
  #timestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  /**
   * Sanitizes a value for safe inclusion in a tab-separated log line.
   * Strips tabs and newlines, trims whitespace, and truncates to a
   * maximum length to prevent memory abuse.
   *
   * @param {unknown} value
   * @param {string} fallback
   * @returns {string}
   */
  #clean(value, fallback) {
    const str = String(value ?? fallback)
      .replace(/\r?\n/g, ' ')
      .replace(/\t/g, ' ')
      .trim() || fallback;

    return str.length > Logger.#MAX_FIELD_LENGTH
      ? str.slice(0, Logger.#MAX_FIELD_LENGTH) + '…'
      : str;
  }

  /**
   * Writes a single log entry.
   *
   * @param {string} [userName='nodejs'] - User associated with the log entry
   * @param {string} [url='?']          - URL associated with the log entry
   * @param {string} [msg='-']          - Log message
   * @returns {boolean} false if the internal buffer is full (backpressure)
   */
  log(userName = 'nodejs', url = '?', msg = '-') {
    if (this.#closed) {
      throw new Error('Logger is already closed');
    }

    const line = [
      this.#timestamp(),
      this.#clean(userName, 'nodejs'),
      this.#clean(url, '?'),
      this.#clean(msg, '-'),
    ].join('\t') + '\n';

    return this.#stream.write(line);
  }

  /**
   * Gracefully closes the underlying write stream.
   * Waits for all buffered data to be flushed before resolving.
   *
   * @returns {Promise<void>}
   */
  async close() {
    if (this.#closed) return;
    this.#closed = true;
    this.#stream.end();
    await finished(this.#stream);
  }
}
