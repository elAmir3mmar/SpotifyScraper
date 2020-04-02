console.log("setting up vars");
var fs = require('fs');
var request = require("request");
// var auth = require("./authorization_code/app.js");

var userID = "ammarelamir";
var token = "Bearer  BQCzzQrH7S0DvJhseIlUBQRV1F1kafBGU8xHRkr149FqsgPplJnbX-4FX2vywCXqldnmMysNeCcYXdUn6tA6ADymZH9Hqu5CD6ibkQc6D0i1B_BiTpLERQTfdkplDNM6v9FNTlt_4Hg_prNswZc6TCdZRgThQvNY35vr2u454poWFecC4AJqZw";
var offset = 0;
var limit = 50;
var playlistsURL = "https://api.spotify.com/v1/users/"+userID+"/playlists?limit=50&offset=0";
var nextURL = playlistsURL;
var dateID = Date.now(); 
var logDir = "./playlistsLogs_"+dateID+"/";
var playlistsLog = "playlists_res_"+dateID+".txt"; 
var logFile = logDir + "consoleLog_"+dateID+".txt"
var count = 0;


fs.mkdir(logDir, function(err) { 

	if (err) {
		console.log("err creating DIR")
	}
	else{
		console.log("Created DIR: " + logDir)
	}
});

while (nextURL != null){

	// console.log("Next URL: " + nextURL);
	// console.log("Count:    " + count);

	count ++;
	//TODO Make this call async
	//This func will update nextURL when it finishes
	requestPlaylists(nextURL);
	nextURL = null;
} //END while nextURL

function requestPlaylists(playlistsURL){
	fileLog(logFile,"Rquesting playlistsURL: " + playlistsURL);
	request({
		url: playlistsURL,
		headers: {
			"Authorization": token
		}
		}, function(err, res) {
			if (err) {
				// nextURL = null;
				console.log("Err here...");
				throw err;
			}
			if (res) {
				var playlistsJSON = JSON.parse(res.body); 
				// console.log(playlistsJSON.total);

				fs.writeFile(logDir+playlistsLog, JSON.stringify(playlistsJSON, null, 4), function (err) {
					if (err) throw err;
					fileLog(logFile, '---Saved! ' + playlistsLog);
				});
				// console.log(playlistsJSON.items);

				for (i=0; i < playlistsJSON.items.length; i++) {
					playlistItem = playlistsJSON.items[i];
					// console.log(playlistItem);

					var playlistObj = new Object();
					playlistObj.name = playlistItem.name;
					playlistObj.url = playlistItem.href;
					playlistObj.id = playlistItem.id;
					playlistObj.owner = playlistItem.owner;
					playlistObj.tracks = null;
					
					//TODO Update this to async then write to file
					requestTracks(playlistObj)
										
				} //END for playlistItem
			
				nextURL = playlistsJSON.next; 
				// console.log(nextURL);

			} //END if res playlistsJSON 
		} //END function
	) // END request call
} //END function requestPlaylists


function requestTracks(playlistObj){
	fileLog(logFile, "Requesting tracks for Playlist: " + playlistObj.name);
	request({
		url: playlistObj.url+"/tracks", 
		headers: {
			"Authorization": token
		}
		}, function(err, res) {
			if (err) {
				// nextURL = null;
				console.log("Err here...");
				throw err;
			}
			if (res) {
				var tracks = JSON.parse(res.body); //Single Playlist

				playlistObj.tracks = tracks.items;

				//Write tracks to file
				var playlistName = playlistObj.name.replace(/\/| |\./g,'');
				var tracksLog = "TrackList_"+playlistName+"_"+dateID+".txt"

				fs.writeFile(logDir+tracksLog, JSON.stringify(playlistObj, null, 4), function (err) {
					if (err) throw err;
				  	fileLog(logFile, '---Saved! ' + tracksLog);
				});

			} //END if res (tracks) 
		} // END function   
	) // END request call
} // END Function requestTracks

//TODO Function parse track to clean tracks for writing
function parseTrack(rawTrackObject) {}


function fileLog(logFile, msg) {
	fs.appendFileSync(logFile, "\n"+Date.now()+" "+msg, 'utf8');
	// fs.writeFile(logFile, msg, function (err) {
	// 	if (err) throw err;
	// });
}