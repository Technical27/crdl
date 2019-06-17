#!/usr/bin/env node
'use strict';

const fetch = require('node-fetch');
const cli = require('commander');
const term = require('terminal-kit').terminal;
const CRDL = require('./crdlProcess');
const shell = require('shelljs');

cli.version('1.0.0', '-v,--version');
cli.usage('<urls...> <path>');
cli.parse(process.argv);

term.grabInput();
term.hideCursor();

term.on('key', key => {
  if (key === 'CTRL_C' || key === 'q') {
    term.hideCursor(false);
    term.processExit(0);
  }
});

const parseMedia = media => JSON.parse(media.trim().replace('vilos.config.media = ', '').replace(';', ''));

const getMedia = url => {
  return fetch(url)
    .then(x => x.text())
    .then(html => {
      const lines = html.split('\n');
      let config, link;
      for (const line of lines) if (line.includes('vilos.config.media')) config = parseMedia(line);
      if (!config) return null;
      for (const stream of config.streams) if (stream.format === 'adaptive_hls' && stream.hardsub_lang === null) link = stream.url;
      const subtitle = config.subtitles[0].url;
      return {link, subtitle};
    });
};

if (cli.args.length <= 2) {
  const [, path] = cli.args;
  getMedia(cli.args[0])
    .then(res => {
      if (!res) return term.error.red('No download link found');
      const {link, subtitle} = res;
      const crdl = new CRDL(link, subtitle, path);
      const bar = term.progressBar({
        width: 80,
        title: 'Download progress:',
        eta: true,
        percent: true,
        barStyle: term.green,
        percentStyle: term.bold
      });
      crdl.on('progress', percent => bar.update(percent));
      crdl.start();
      crdl.on('end', () => {
        shell.rm('-r', `${crdl.tmp}/crdl`);
        term.hideCursor(false);
        term.processExit(0);
      });
    });
}