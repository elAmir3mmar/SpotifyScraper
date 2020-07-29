The Spotify Playlist Scraper Project

Collect data from my spotify playlists.

NPM Libraries: 
	spotify-web-api-js library to simplify requests
	https://github.com/JMPerez/spotify-web-api-js

	broserify to bundle libraries
	
	nodemon for live dev testing. 
	
Main Files: 
	./server.js is the starting point. It handles authorization and routing.  
	./public/client.js is the main js code that handles the interface and the API requests.
	./public/bundle.js is the compiled code for the browser
	./.env the secret file storing the API Client ID and Secret

Web Files:
	./public/index.html
	./css/main.css

Start:
	browserify ./public/client.js>./public/bundle.js
then:
	ndoemon server.js

go to:
http://192.168.2.43:8888/

