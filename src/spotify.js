import path from 'path';
import {writeFileSync} from 'fs';
import SpotifyWebApi from 'spotify-web-api-node';
import express from 'express';
import {chunk, sortBy} from 'lodash';

const secret = require('../secret.json');

const playlistPath = path.join(__dirname, '../playlist.json');
const playlist = require('../playlist.json');

const spotifyApi = new SpotifyWebApi({
  clientId: secret.clientId,
  clientSecret: secret.clientSecret,
  redirectUri: `${secret.host}/auth`
});

function sleep(sec) {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000);
  });
}

async function main() {
  const scopes = ['playlist-modify-public'];

  const authorizeUrl = spotifyApi.createAuthorizeURL(scopes);

  console.log('*** Visit below to log in:');
  console.log(authorizeUrl);
  console.log('');

  startServer();
}

async function afterAuth() {
  // only search songs that haven't been searched yet
  const songsToSearch = playlist.filter((song) => song.result === undefined);

  for (let song of songsToSearch) {
    console.log(`*** Searching ${song.artist} - ${song.title}`);

    const data = await spotifyApi.searchTracks(`artist:${song.artist} title:${song.title}`);
    const track = data.body.tracks.items[0];

    if (!track) {
      song.result = null;

    } else {
      song.result = {
        album: track.album.name,
        artist: track.artists[0].name,
        name: track.name,
        uri: track.uri,
      };
    }

    writeFileSync(playlistPath, JSON.stringify(playlist, null, 2), {encoding: 'utf-8'});

    await sleep(1);
  }

  const playlistData = await spotifyApi.createPlaylist(secret.userId, 'BARONS DOPE PLAYLIST', {'public': true});
  const playlistId = playlistData.body.id;

  const songsOnSpotify = playlist.filter((song) => song.result !== null);
  const sortedSongs = sortBy(songsOnSpotify, (song) => song.artist);
  const songChunks = chunk(sortedSongs, 50);

  for (let idx = 0; idx < songChunks.length; idx++) {
    console.log(`*** Adding song chunk ${idx + 1} of ${songChunks.length}`);

    const chunk = songChunks[idx];
    const ids = chunk.map((chunk) => chunk.result.uri);
    await spotifyApi.addTracksToPlaylist(secret.userId, playlistId, ids);
  }

  console.log('*** all done!');
}

async function authCallback(req, res) {
  const code = req.query.code;

  const data = await spotifyApi.authorizationCodeGrant(code);

  // TODO:we could store this somehow so we don't do as many auths...
  const accessToken = data.body['access_token'];
  const refreshToken = data.body['refresh_token'];

  spotifyApi.setAccessToken(accessToken);
  spotifyApi.setRefreshToken(refreshToken);

  console.log('*** Logged in!');

  res.send('You logged in');

  stopServer();

  afterAuth();
}

let server;
function startServer() {
  const app = express();
  app.get('/auth', authCallback);
  server = app.listen(4000);
}

function stopServer() {
  server.close();
}

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

main();
