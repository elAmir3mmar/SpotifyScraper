The Spotify Playlist Scraper Project

Collect data from my spotify playlists.

NPM Libraries: 
	spotify-web-api-js library to simplify requests
	https://github.com/JMPerez/spotify-web-api-js

	broserify to bundle libraries
	
	budo for live dev testing. 
	
main files: 
	spotifyPlaylists2.js and index.html 



Start: 
	browserify spotifyPlaylists2.js > bundle.js
or 
	budo spotifyPlaylists2.js:bundle.js --live

go to:
http://192.168.2.43:9966/
