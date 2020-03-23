console.log("setting up vars");
var fs = require('fs');
var request = require("request");
// var auth = require("./authorization_code/app.js");

var userID = "ammarelamir";
var token = "Bearer  BQCJaZKLx_FCpzBuZmLXsZF0DwbOaPuLOTDgF9OPl7v7BJU_3l-CNfDYDJ3s-pUcxAsm4lzNbcelM7ie2KSEgsPJjDa7xU1q8IR73Oi534o6SmgxCgEvoNLTRJeVpRyQPr95mOm6b02AvXNRYvLxwmwCguqFzWWbU92JjuLmNJC7qdra";
var offset = 0;
var limit = 50;
var playlistsURL = "https://api.spotify.com/v1/users/"+userID+"/playlists?limit=50&offset=0";
var nextURL = playlistsURL;
var logFile = "playlistsURL_res.txt"; 
var sampleOutFile = "sampleOutFile.txt";
var count = 0;

console.log("Starting link:    " + playlistsURL);
console.log("Next link (same): " + nextURL);

while (nextURL != null){

	console.log("Next URL: " + nextURL);
	console.log("Count:    " + count);

	count ++;
	var playlistsJSON = requestPlaylists(nextURL);
	//SO the problem here is that JS is asynchronous. 
	// the code below runs even before the function call above returns...
	console.log(playlistsJSON);
// ///////////

// 	console.log("Rquesting playlistsURL: " + playlistsURL);
// 	request({
//     url: playlistsURL,
//     headers: {
//         "Authorization": token
//     }
// 	}, function(err, res) {
//         if (err) throw err;
//         if (res) {
// 		    var logFile = "wtf.txt"; 

//             console.log(JSON.parse(res.body));
//             fs.writeFile(logFile, JSON.stringify(JSON.parse(res.body), null, 4), function (err) {
//     			if (err) throw err;
//     		  	console.log('---Saved! ' + logFile);
//     		});
//     		var playlistsJSON = JSON.parse(res.body); 
//     		console.log(playlistsJSON.total);
//             // return playlistsJSON;


// }
// }
// )
///////////////
    // console.log(playlistsJSON.total);
    // console.log(playlistsJSON.items);
    //parsePlaylistsJSON(playlistsJSON);

    // nextURL = playlistsJSON.next;
    nextURL = null;

} //END while nextURL

function requestPlaylists(playlistsURL){
	console.log("Rquesting playlistsURL: " + playlistsURL);
	request({
	    url: playlistsURL,
	    headers: {
	        "Authorization": token
	    }
		}, function(err, res) {
			console.log("func");
	        if (err) {
	        	// nextURL = null;
	        	console.log("Err here...");
	        	throw err;
	        }
	        if (res) {
	            var playlistsJSON = JSON.parse(res.body); 
	            console.log(playlistsJSON);
	    		console.log(playlistsJSON.total);
			    console.log(playlistsJSON.items.length);
	            return playlistsJSON;
	        } //END if res
		} //END function
	) // END request call
} //END function requestPlaylists

function parsePlaylistsJSON(playlistsJSON){
	var URL		= playlistsJSON.href;
	var items	= playlistsJSON.items;
	var limit	= playlistsJSON.limit;
	var next	= playlistsJSON.next;
	var offset	= playlistsJSON.offset;
	var previous= playlistsJSON.previous;
	var total	= playlistsJSON.total;

	// fs.writeFile(logFile, JSON.stringify(playlistsJSON, null, 4), function (err) {
	// 	if (err) throw err;
	//   	console.log('---Saved! ' + logFile);
	// });
	
	var firstPlaylist = playlistsJSON.items[0]; 
    var playlistURL = firstPlaylist.href;
    var playlistName = firstPlaylist.name;
    var playlistOwner = firstPlaylist.owner.display_name;

    console.log("Sample playlist URL: " + playlistURL);
    console.log("Sample playlist name: " + playlistName);
    console.log("Sample playlist owner: " + playlistOwner);
} //END function parsePlaylistsJSON

function requestTracks(playlistItem){
	console.log("Requesting tracks for playlist: " + playlistItem.name);
	var playlistURL = playlistItem.href;
	request({
		url: playlistURL, 
		headers: {
			"Authorization": token
		}
		}, function(err, res) {
	        if (res) {
	            var playlist = JSON.parse(res.body); //Single playlist
	            console.log("Reading playlist: " + playlistItem.name);
	            fs.writeFile(sampleOutFile, JSON.stringify(JSON.parse(res.body), null, 4), function (err) {
	            	if (err) throw err;
	              	console.log('---Saved! ' + sampleOutFile);
	            });

	            // playlistTracks = requestTracks(playlistItem.tracks.href);
	        }
	}) // END request call 
} // END Function requestTracks
