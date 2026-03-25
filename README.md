# node-processwire-logger

Node.js module to log directly into the ProcessWire CMS/CMF log.

## Installation

```bash
npm install node-processwire-logger
```

## Usage

```js
// ES-Module import (ensure "type": "module" in your package.json)
import Logger from 'node-processwire-logger';

const logger = new Logger('my-logfile-name', import.meta.dirname + '/site/assets/');

// write a log entry
logger.log('Jon Doe', '/my-awesome-page', 'Hello from Node.js!');

// when done (e.g. in a cron job), close the stream
await logger.close();

// exit process if needed
process.exit();
```

### Async initialization (non-blocking)

If you need to create the logger during request handling or inside an
async context, use the static factory method to avoid blocking the
event loop:

```js
const logger = await Logger.create('my-logfile-name', import.meta.dirname + '/site/assets/');
```

## Methods

### `new Logger(logFileName, assetsPath)`

| Parameter     | Type     | Default         | Description                                              |
| ------------- | -------- | --------------- | -------------------------------------------------------- |
| `logFileName` | `string` | —               | Name of the log file (will be lowercased and sanitized)  |
| `assetsPath`  | `string` | `process.cwd()` | Absolute path to your ProcessWire `assets/` directory    |

### `Logger.create(logFileName, assetsPath)` → `Promise<Logger>`

Same parameters as the constructor. Creates the `logs/` directory
asynchronously before returning the Logger instance.

### `logger.log(userName, url, message)` → `boolean`

| Parameter  | Type     | Default    | Description                                       |
| ---------- | -------- | ---------- | ------------------------------------------------- |
| `userName` | `string` | `'nodejs'` | User to be named in the log entry                 |
| `url`      | `string` | `'?'`      | URL to be named in the log entry                  |
| `message`  | `string` | `'-'`      | Your log message                                  |

Returns `false` when the internal buffer is full (backpressure).

### `logger.close()` → `Promise<void>`

Gracefully closes the write stream. **Always `await` this before
calling `process.exit()`** to ensure all data is flushed.

### `logger.healthy` → `boolean`

Read-only property. Returns `true` if the stream is open and has not
encountered an error.

## License

MIT
