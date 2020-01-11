console.log("setting up vars");
var fs = require('fs');

var request = require("request");
var userID = "ammarelamir";
var token = "Bearer BQByOl9BWY7VYk9Bg4R7jiljQLQXKncQYUFS12WKxEiTRqqn6IcMTjHhdUtvtNuakcEz8Ctm5mMZzsRmFQJqCriaLB5_rIZa3FeCBXz9_1eOHR-ov33ICpyg8d9pfil2B-YbgRTGipLU5xybZ62a3gCJ1DkmempVKFw-GjQJDWnMoo-TGssHvA";
var playlistsURL = "https://api.spotify.com/v1/users/"+userID+"/playlists";

console.log(playlistsURL);

request({
    url: playlistsURL,
    headers: {
        "Authorization": token
    }
	}, function(err, res) {
        if (err) throw err;
        if (res) {
		    var logFile = "playlistsURL_res.txt"; 
            
            // console.log(JSON.parse(res.body));

    		fs.writeFile(logFile, JSON.stringify(JSON.parse(res.body), null, 4), function (err) {
    			if (err) throw err;
    		  	console.log('---Saved! ' + logFile);
    		});
		
            var playlists = JSON.parse(res.body); //Full list of playlists
            var playlistURL = playlists.items[0].href;
            var playlistName = playlists.items[0].name;
            var playlistOwner = playlists.items[0].owner.display_name;

            console.log(playlistURL);
            console.log(playlistName);
            console.log(playlistOwner);

            request({
            	url: playlistURL, 
            	headers: {
            		"Authorization": token
            	}
            	}, function(err, res) {
                    if (res) {
                        var playlist = JSON.parse(res.body); //Single playlist
                        console.log("playlist " + playlist.name);
                        playlist.tracks.forEach(function(track) {
                            console.log(track.track.name);
                        })
                    }
            })
        }
	}
)

            