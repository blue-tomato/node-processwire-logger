# node-processwire-logger

---

Node.js module to log directly into the ProcessWire CMS/CMF log


## Installation
```bash
npm install node-processwire-logger --safe
```


## Usage
```javascript
// ES-Module import (ensure "type": "module" in your package.json)
import Logger from 'node-processwire-logger';

const logger = new Logger('my-logfile-name', __dirname + '/site/assets/');

// write a log entry
logger.log('Jon Doe', '/my-awesome-page', 'Hello from Node.js!');

// when done (e.g. in a cron job), close the stream
logger.close();

// exit process if needed
process.exit();
```


## Methods

### new Logger()

new Logger(String logFileName, String assetsPath)

* logFileName: The name of the log file. This will be lowerCased.
* assetsPath: Absolute path to you ProcessWire assets in your filesystem

### logger.write()

logger.write(String userName, String url, String message)

* userName: The user who should be named in the logs. Default is "nodejs"
* url: The URL which should be named in the logs. Default is "?",
* message: Your log message. Default is an empty string.

### logger.close()

Method to close the open filestream. E.g. Should be used in cronjobs before ```process.exit()```


# LICENCE

Copyright 2018 Blue Tomato GmbH

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
