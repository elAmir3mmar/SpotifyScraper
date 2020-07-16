The Spotify Playlist Scraper Project

Collect data from my spotify playlists.

NPM Libraries: 
	spotify-web-api-js library to simplify requests
	https://github.com/JMPerez/spotify-web-api-js

	broserify to bundle libraries
	
	budo for live dev testing. 
	

Authorization Code:
	The authorization_code/ directory is cloned from the 
	spotify OAuth example code. 


Main Files: 
	spotifyPlaylists2.js 
	index.html
	css/main.css
	authorization_code/. (as cloned from Spotify)



Start:
	browserify spotifyPlaylists2.js > bundle.js
or 
	budo spotifyPlaylists2.js:bundle.js --live

and:
	node ./authorization_code/app.js

go to:
http://192.168.2.43:9966/

