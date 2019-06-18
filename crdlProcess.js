'use strict';
const EventEmitter = require('events');
const ffmpeg = require('fluent-ffmpeg');
const shell = require('shelljs');

if (!shell.which('ffmpeg')) {
  const ffmpegLocation = require('ffmpeg-static'); // eslint-disable-line global-require
  ffmpeg.setFfmpegPath(ffmpegLocation.path);
}

let i = 0;

class CRDL extends EventEmitter {
  constructor (video, subtitles, path) {
    super();
    this.i = i++;
    this.tmp = shell.tempdir();
    if (!shell.test('-e', `${this.tmp}/crdl`)) shell.mkdir(`${this.tmp}/crdl`);
    if (shell.test('-e', `${this.tmp}/crdl/${this.i}`)) shell.rm('-r', `${this.tmp}/crdl/${this.i}`);
    shell.mkdir(`${this.tmp}/crdl/${this.i}`);
    this.ffmpeg = ffmpeg(video).addOption('-c copy');

    this.ffmpeg.addOutput(`${this.tmp}/crdl/${this.i}/download.mkv`);
    this.ffmpeg.on('progress', data => {
      if (data) {
        this.emit('progress', Math.min(data.percent, 100) / 100, (data.currentKbps / 100).toFixed(2));
      }
    });
    this.ffmpeg.on('end', () => {
      this.ffmpeg = ffmpeg(`${this.tmp}/crdl/${this.i}/download.mkv`);
      if (subtitles) {
        this.ffmpeg.addInput(subtitles.trim());
        this.ffmpeg.addOption('-c copy');
        this.ffmpeg.addOption('-c:s mov_text');
      }
      else this.ffmpeg.addOption('-c copy');
      this.ffmpeg.on('end', () => {
        shell.rm('-r', `${this.tmp}/crdl/${this.i}`);
        this.emit('end');
      }).save(path);
    });
  }

  start () {
    this.ffmpeg.run();
  }
}

module.exports = CRDL;