// import "spotifyPlaylists.js" as sp;
// var scraper = require("spotifyPlaylists.js");
import { spFunc } from './spotifyPlaylists.js';

var start = function () {

	var logText = document.getElementById("logText");
	if (logText.innerText == "") {
		logText.innerText = "Text updated."
	} else {
		logText.innerText = ""
	}
	
	if (require.main === module) {
	    console.log('called directly');
	} else {
		console.log(spFunc());
	}
}
