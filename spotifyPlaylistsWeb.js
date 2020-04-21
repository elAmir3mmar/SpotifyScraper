console.log("setting up vars");
// var fs = require('fs');
// var request = require("request");
// var rimraf = require("rimraf");
// var auth = require("./authorization_code/app.js");

// Read input args (should be one access token )
// argv == [node, script path, ... ]
// console.log(process.argv)
// process.argv.forEach(function (val, index, array) {
// 	console.log(index + ': ' + val);
// });

// https://developer.spotify.com/console/get-playlists/?user_id=ammarelamir&limit=&offset=

var accessToken = null;
accessToken = "BQBT_STXiF8-pzpCDSC760pDjCVsGNnmb1TT3AHcLVSUEBLzHfR8XU3qO2DMhtLz747t8g6SLGnbq99DstG6LuS97YVvYhmdlAeTstm8Yjac30418Z75RcWH8uu3-63XbeGyoFv9W-gQ3ux9y5k3y44nIwbgDvw65GBkBktGisPxf_wF1DhVQ8yZwvQ";

// if (process.argv[2] != null) {
// 	console.log("Input arg: " + process.argv[2]);
// 	accessToken =  process.argv[2];

// 	fs.writeFile('curAccessToken', accessToken, function(err){
// 		if (err) throw err && console.log("Error writing access token to file.");
// 		console.log("Updated access token file.");
// 	});
// }
// else {
// 	fs.readFile('curAccessToken', (err, data) => { 
// 		if (err) throw err; 

// 		console.log("retrieved currAccessToken: " + data.toString()); 
// 		accessToken = data.toString();
// 	});
// }

var userID = "ammarelamir";
// var token = "Bearer  BQD5nCK4BjsKJ-uB6EqFPOw-DgCYnsjKOiEjIJrdFJnbGDe_qE_8pOahvp_RLZabibCTIn7xIqE4MYJ1l5c-fJV5dEIBaisPcgRfIpXcWVLTRz1Zk6VbOScAiflJviwgLt8acJi8zBLV_KpwTt-pb0p1eKoqpDFwuVgfViOMeNLFCTVOLohw3w";
var token = "Bearer  " + accessToken;
var offset = 0;
var limit = 50;
var playlistsURL = "https://api.spotify.com/v1/users/"+userID+"/playlists?offset=0&limit=50";
var dateID = Date.now(); 
var logDir = "./playlistsLogs_"+dateID+"/";
var playlistsLog = "playlists_res_"+dateID+".txt"; 
var logFile = logDir + "consoleLog_"+dateID+".txt"
var count = 0;

var logText = document.getElementById("logText");
var playlistsText = document.getElementById("playlistsList");
console.log("PT: " + playlistsText.innerText);
playlistsText.innerText = "";

var tracksText = document.getElementById("tracksList");

//export 
function spFunc() {

	// fs.mkdir(logDir, function(err) { 
	// 	if (err) {
	// 		console.log("err creating DIR")
	// 	}
	// 	else{
	// 		console.log("Created DIR: " + logDir)
	// 	}
	// });
	console.log("spFunc");
	requestPlaylists(playlistsURL);
}

function requestPlaylists(playlistsURL){
	// fileLog("Rquesting playlistsURL: " + playlistsURL);
	console.log("Rquesting playlistsURL: " + playlistsURL);
	console.log("curr count: " + count);

	// var request = new XMLHttpRequest()
	// request.open('GET', playlistsURL, true);


	fetch(playlistsURL, {
		method: 'get', headers: new Headers({

		'Accept': "application/json", 
		'Content-Type': "application/json",
		'Authorization': token
		})
	})
	  .then(response => {
	    return response.json()
	  })
	  .then(data => {
	    // Work with JSON data here
	    console.log(data)
	    playlistsJSON = data;
	    parsePlaylists(playlistsJSON);

	  })
	  .catch(err => {
	    // Do something for an error here
	  })


} //END function requestPlaylists

function parsePlaylists(playlistsJSON) {


	//add playlists to playlistsText
	playlistsText.innerText = playlistsText.innerText + JSON.stringify(playlistsJSON, null, 4)


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
		
		playlistsText.innerText = playlistsText.innerText + "\n" + playlistObj.name;

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

}

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

// if (require.main === module) {
//     console.log('called directly');
//     spFunc();
// } else {
// 	console.log("clicked");

// }