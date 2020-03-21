console.log("setting up vars");
var fs = require('fs');

var request = require("request");
var userID = "ammarelamir";
var token = "Bearer BQDm-sm5G6mEregvIYJ_004GNv5Y2w9XB0GS7MdqpYZUju0xyF-MBezEEEvEEBscCPAS3r_1JVuOAK_9wAFUnadmHoO2eJAiYmBwJOLJnJ0sOlqTUBw4VWCkg1Q9-COr2hWbz4wj2zCDkWRuGYmtluUZs3dx26CdZUuzV80_-mCIuhbi4cj6sg";
var offset = 0;
var limit = 50;
var playlistsURL = "https://api.spotify.com/v1/users/"+userID+"/playlists?offset="+offset+"&limit="+limit+"'";
var nextURL = playlistsURL;
var logFile = "playlistsURL_res.txt"; 
var sampleOutFile = "sampleOutFile.txt";
var count = 0;

console.log("Starting link:    " + playlistsURL);
console.log("Next link (same): " + nextURL);

while (nextURL != null){

	console.log("Next URL :" + nextURL);
	console.log("Count :   " + count);

	count ++;
	requestPlaylists(nextURL);


}

function parsePlaylistsJSON(playlistsJSON){
	var URL		= playlistsJSON.href;
	var items	= playlistsJSON.items;
	var limit	= playlistsJSON.limit;
	var next	= playlistsJSON.next;
	var offset	= playlistsJSON.offset;
	var previous= playlistsJSON.previous;
	var total	= playlistsJSON.total
} //END function parsePlaylistsJSON

function requestPlaylists(playlistsURL){
	console.log("Rquesting playlistsURL: " + playlistsURL)
	request({
	    url: playlistsURL,
	    headers: {
	        "Authorization": token
	    }
		}, function(err, res) {
	        if (err) {
	        	nextURL = null;
	        	console.log("Err here...")
	        	throw err;
	        }
	        if (res) {
	            var playlistsJSON = JSON.parse(res.body); 
	            console.log(playlistsJSON);
	            
	            parsePlaylistsJSON(playlistsJSON);

	    		fs.writeFile(logFile, JSON.stringify(playlistsJSON, null, 4), function (err) {
	    			if (err) throw err;
	    		  	console.log('---Saved! ' + logFile);
	    		});
				
				var firstPlaylist = playlistsJSON.items[0]; 
	            var playlistURL = firstPlaylist.href;
	            var playlistName = firstPlaylist.name;
	            var playlistOwner = firstPlaylist.owner.display_name;

	            console.log("Sample playlist URL: " + playlistURL);
	            console.log("Sample playlist name: " + playlistName);
	            console.log("Sample playlist owner: " + playlistOwner);

	            console.log("Next URL: " + playlistsJSON.next);
	            nextURL = playlistsJSON.next;
	        }
		}
	) // END request call
} //END function requestPlaylists

function requestTracks(playlistItem){
	console.log("Requesting tracks for playlist: " + playlistItem.name)
	var playlistURL = playlistItem.href
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
