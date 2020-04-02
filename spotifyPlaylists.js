console.log("setting up vars");
var fs = require('fs');
var request = require("request");
// var rimraf = require("rimraf");
// var auth = require("./authorization_code/app.js");

var userID = "ammarelamir";
var token = "Bearer  BQD5nCK4BjsKJ-uB6EqFPOw-DgCYnsjKOiEjIJrdFJnbGDe_qE_8pOahvp_RLZabibCTIn7xIqE4MYJ1l5c-fJV5dEIBaisPcgRfIpXcWVLTRz1Zk6VbOScAiflJviwgLt8acJi8zBLV_KpwTt-pb0p1eKoqpDFwuVgfViOMeNLFCTVOLohw3w";
var offset = 0;
var limit = 50;
var playlistsURL = "https://api.spotify.com/v1/users/"+userID+"/playlists?offset=0&limit=50";
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

// try {
	// console.log("try");
requestPlaylists(playlistsURL);
// } catch(err) {
// 	console.log("Caught err here...");
// 	rimraf.sync(logDir);
// 	console.log("Cleaned DIR: " + logDir);
// }


function requestPlaylists(playlistsURL){
	fileLog("Rquesting playlistsURL: " + playlistsURL);
	console.log("Rquesting playlistsURL: " + playlistsURL);
	console.log("curr count: " + count);

	request({
		url: playlistsURL,
		headers: {
			"Authorization": token
		}
		}, function(err, res) {
			if (err) {
				// nextURL = null;
				console.log("Req err here...");
				throw err;
			}
			if (res) {
				var playlistsJSON = JSON.parse(res.body); 
				// console.log(playlistsJSON.total);

				fs.appendFileSync(logDir+playlistsLog, JSON.stringify(playlistsJSON, null, 4), function (err) {
					if (err) throw err;
					fileLog('*** Appended ' + playlistsJSON.items.length + ' playlists to ' + playlistsLog);
				});
				// console.log(playlistsJSON.items);

				//FOR each playlist .. build object request tracks (writes to file) 
				for (i=0; i < playlistsJSON.items.length; i++) {
					playlistItem = playlistsJSON.items[i];
					count++;
					// console.log(playlistItem);

					//TODO helper function cleanPlaylist
					var playlistObj = new Object();
					playlistObj.name = playlistItem.name.replace(/\/| |\./g,'_');
					playlistObj.url = playlistItem.href;
					playlistObj.id = playlistItem.id;
					playlistObj.owner = playlistItem.owner;
					playlistObj.tracks = null;
					
					//TODO Update this to async then write to file
					requestTracks(playlistObj);
									
				} //END FOR playlistItem

				if (playlistsJSON.next != null) {
					requestPlaylists(playlistsJSON.next);
				} else	{
					console.log("next is null. finishing with count: " + count);
					console.log("    ****\nDONE fetching "+count+" playlists of "+playlistsJSON.total);
					fileLog("    ****\nDONE fetching "+count+" playlists of "+playlistsJSON.total);
				}

				// console.log(nextURL);
			} //END if res playlistsJSON 
		} //END function
	) // END request call
} //END function requestPlaylists


function requestTracks(playlistObj){
	fileLog("Requesting tracks for Playlist: " + playlistObj.name);
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
				var tracksLog = "Playlist_"+playlistObj.name+"_"+dateID+".txt"

				fs.writeFile(logDir+tracksLog, JSON.stringify(playlistObj, null, 4), function (err) {
					if (err) throw err;
				  	fileLog('---Saved: ' + tracksLog);
				});

			} //END if res (tracks) 
		} // END function   
	) // END request call
} // END Function requestTracks

//TODO Function parse track to clean tracks for writing
function parseTrack(rawTrackObject) {}


function fileLog(msg, uselogFile=logFile) {
	fs.appendFileSync(uselogFile, "\n"+Date.now()+" "+msg, 'utf8');
	// fs.writeFile(logFile, msg, function (err) {
	// 	if (err) throw err;
	// });
}