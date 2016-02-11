"use strict";

const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('90s.html', {encoding: 'utf-8'});

const $ = cheerio.load(html);

const $songs = $('font[color="#ffffff"] > small');

// last entry is blank so it's sliced off
const songStrings = $songs.text().split(/\r?\n/).slice(0, -1);

const SONG_RE = /^\d+\. (.*) - (.*) \(.*\)$/;
const SONG_NO_PARENS_RE = /^\d+\. (.*) - (.*)$/;

const songs = songStrings.map((str) => {
  let match = str.match(SONG_RE);

  if (!match) {
    match = str.match(SONG_NO_PARENS_RE);
  }

  if (!match) {
    console.log(str);
  }

  return {
    artist: match[1],
    title: match[2]
  };
});

const json = JSON.stringify(songs, null, 2);

fs.writeFileSync('playlist.json', json, {encoding: 'utf-8'});
