import { createWriteStream, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export default class Logger {
  #stream;

  /**
   * @param {string} logFileName - Name der Log-Datei (ohne Pfad)
   * @param {string} [assetsRootPath=process.cwd()] - Root-Verzeichnis für Logs
   */
  constructor(logFileName, assetsRootPath = process.cwd()) {
    const logsDir = join(assetsRootPath, 'logs');
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }
    this.#stream = createWriteStream(
      join(logsDir, `${logFileName.toLowerCase()}.txt`),
      { flags: 'a' }
    );
  }

  /**
   * Schreibt eine Zeile ins Log
   * @param {string} [userName='nodejs']
   * @param {string} [url='?']
   * @param {string} [msg='-']
   */
  log(userName = 'nodejs', url = '?', msg = '-') {
    const timestamp = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).format(new Date()).replace('T', ' ');

    const line = `${timestamp}\t${userName}\t${url}\t${msg}\n`;
    this.#stream.write(line);
  }

  /**
   * Schliesst den Stream
   */
  close() {
    this.#stream.end();
  }
}
