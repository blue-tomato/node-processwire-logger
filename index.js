"use strict";

const fs = require('fs');
const format = require('date-fns/format');

class Logger {

  constructor(logFileName, assetsRootPath) {
    this.openFileStream(logFileName, assetsRootPath);
  }

  openFileStream(logFileName, assetsRootPath) {
    this.fileStream = fs.createWriteStream(`${assetsRootPath}logs/${logFileName.toLowerCase()}.txt`, {
      flags: 'a' // 'a' means appending (old data will be preserved)
    });
  }

  write(userName = 'nodejs', url = '?',  msg = '-', callback = function() {}) {
    let data = [
      format(new Date(), 'YYYY-MM-DD HH:mm:ss'),
      userName,
      url,
      msg
    ];
    data = data.join("\t") + '\n';
    this.fileStream.write(data);
    callback();
  }

  close() {
    this.fileStream.end();
  }

}

module.exports = Logger;
