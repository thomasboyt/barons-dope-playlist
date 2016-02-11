"use strict";

const playlist = require('../playlist.json');

let count = 0;
for (let song of playlist) {
  if (!song.result) {
    count += 1;
    console.log(`${song.artist} - ${song.title}`);
  }
}

console.log(`*** Total missing: ${count}`);
