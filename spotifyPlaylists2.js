console.log("setting up vars");
// var fs = require('fs');
// var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
// var request = require("request");
// var fetch = require("fetch").fetchUrl;
// var React = require('react');
// var ReactDom = require('react-dom');

// import { authEndpoint, clientId, redirectUri, scopes } from "./config.mjs";
// import hash from "./hash.mjs";
// var hash = require('./hash.mjs');
var Spotify = require('spotify-web-api-js');
var sp = new Spotify();

// var token = "";
// var userID = "ammarelamir";
// var token = "Bearer  " + token;
// var offset = 0;
// var limit = 50;
// var playlistsURL = "https://api.spotify.com/v1/users/"+userID+"/playlists?offset=0&limit=50";
// var playlistsURL = "https://api.spotify.com/v1/me/playlists?limit=50&offset=0";
// var dateID = Date.now();

var PLAYLISTS;
var TRACKS;

// Copied from SP OAuth examples
function getHashParams() {
	console.log("GETTING HASH PARAMS")
    var hashParams = {};
    var e, r = /([^&;=]+)=?([^&;]*)/g,
        q = window.location.hash.substring(1);
    e = r.exec(q)
    while (e) {
       hashParams[e[1]] = decodeURIComponent(e[2]);
       e = r.exec(q);
    }
    return hashParams;
  }


if (require.main === module) {
	console.log('called directly');
	spFunc();

} else {
	console.log("loading in browser");

	//On Load get params
	var params = getHashParams();
    if (params.error) {
      alert('There was an error during the authentication');
    }
    if (params.access_token) {
		console.log("got hash params: ");
		console.log(params);

	    setCookie("accessToken", params.access_token);
	    setCookie("refreshToken", params.refresh_token, 999999999);
	    console.log(document.cookie);
		sp.setAccessToken(params.access_token);
		document.getElementById('login').style.display = "none"; 
    
    } else {
		aT = getCookie("accessToken");
		console.log("got cookie: "+ aT);
		if (aT) {
			sp.setAccessToken(aT);
			document.getElementById('login').style.display = "none"; 
			document.getElementById('buttons').style.display = "block"; 

		} else {
			console.log("Please log in.");
		}
    }

    if (sp.getAccessToken()){
    	console.log("Token found.. Starting Automatically");
    	loadDb();
    }


    // var access_token = params.access_token,
    //     refresh_token = params.refresh_token,
    //     error = params.error;


	// console.log(loggedIn);
}
function setCookie(cname, cvalue, exhrs=1) {
  var d = new Date();
  d.setTime(d.getTime() + (exhrs*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

document.getElementById("start").addEventListener("click", loadDb);
document.getElementById("search").addEventListener("click", search);
document.getElementById("refresh").addEventListener("click", refreshPlaylists);

//export 
async function loadDb() {
	console.log("loadDb");

	PLAYLISTS = loadLocalPlaylists();
	TRACKS = loadLocalTracks();
	if (!PLAYLISTS || PLAYLISTS.length == 0) {
		await refreshPlaylists();
	}
	PLAYLISTS ? displayPlaylists(PLAYLISTS) : "" ;

}



async function refreshPlaylists(){
	let list = document.getElementById("playlistsList").innerText = "LOADING... ";
	localStorage.removeItem('PLAYLISTS');
	localStorage.removeItem('TRACKS');


	PLAYLISTS = await requestUserPlaylists();
	console.log("refreshed playlists");
	console.log(PLAYLISTS);
	localStorage.setItem('PLAYLISTS', JSON.stringify(PLAYLISTS));

	// let TRACKS = [];
	// PLAYLISTS.forEach(function(p){
	// 	playlistTracks = requestPlaylistTracks(p.id);
		
	// 	let playlist = {};
		
	// 	playlist.name 	= p.name;
	// 	playlist.id 	= p.id;
	// 	playlist.tracks = playlistTracks;

	// 	TRACKS.push(playlist);
	// })

	// localStorage.setItem('TRACKS', JSON.stringify(TRACKS));
	// // refreshTracks();
	
	displayPlaylists(PLAYLISTS);
}

async function loadPlaylistTracks(playlistID) {
	//Fetch tracks if not in local storage
	//returns playlistTracks object
	console.log("loadPlaylistTracks");
	let TRACKS = loadLocalTracks();
	let playlistTracks;
	if (TRACKS){
		playlistTracks = TRACKS.filter(function(pT){
			return pT.id == playlistID;
		})[0]; 
	}

	if (!playlistTracks || playlistTracks.length == 0) {
		console.log("not found in local tracks, refreshing...");
		playlistTracks = await refreshPlaylistTracks(playlistID);	
	}
	console.log("found select playlist tracks: ");
	console.log(playlistTracks);
	return playlistTracks;
}

async function refreshPlaylistTracks(playlistID){
	console.log("refreshPlaylistTracks")
	console.log("get the playlist to refresh")
	let p = loadLocalPlaylists(playlistID)[0];
	console.log(p);
	console.log("get the playlist tracks...")
	playlistTracks = await requestPlaylistTracks(playlistID);
	
	let playlist = {};
	
	playlist.name 	= p.name;
	playlist.id 	= p.id;
	playlist.tracks = playlistTracks;
	console.log("created playlist obj:")
	console.log(playlist);
	//Append to local storage
	addLocalTracks(playlist);


	return playlist;

}

function loadLocalPlaylists(playlistID = ""){
	console.log("loadLocalPlaylists");
	PLAYLISTS = JSON.parse(localStorage.getItem('PLAYLISTS'));
	// PLAYLISTS ? displayPlaylists(PLAYLISTS) : "" ;
	
	if (playlistID) {
		let filtered = PLAYLISTS.filter(function(p){
			return p.id == playlistID;
		});

		return filtered;
	}

	return PLAYLISTS;
}

function loadLocalTracks(){
	console.log("loadLocalTracks");
	TRACKS = JSON.parse(localStorage.getItem('TRACKS'));
	console.log("LOADED TRACKS: ");
	console.log(TRACKS);
	// TRACKS && display ? displayTracks(TRACKS) : "" ;
	return TRACKS
}

function addLocalTracks(playlist) {
	//Takes a custom playlist tracks object
	//Adds it to local tracks if exists in store
	console.log("add to local tracks...")
	console.log("	first get local tracks")
	let TRACKS = loadLocalTracks();
	if (TRACKS) {
		console.log("FOUND TRACKS: ");
		console.log(TRACKS);
	} else {
		console.log("not tracks - create new store");
		TRACKS = [];
	} 
	console.log("	push playlist to tracks")
	TRACKS.push(playlist);

	console.log("	TRACKS UPdated:")
	console.log(TRACKS)
	console.log("storing TRACKS as: ");
	console.log(TRACKS);
	// console.log(JSON.stringify(TRACKS));
	localStorage.setItem('TRACKS', JSON.stringify(TRACKS)); //somehing here? 


}

function download(text, filename){
	var a = document.createElement('a');
  	a.setAttribute('href', 'data:text/plain;charset=utf-8,'+encodeURIComponent(text));
  	a.setAttribute('download', filename);
  	a.click()

  	// Call it:
  	// var obj = {a: "Hello", b: "World"};
  	// saveText( JSON.stringify(obj), "filename.json" );
}

// function store(text, name){
// 	// var obj = { a : 1, b : 2};
// 	// JSON.stringify(obj)
// 	localStorage.setItem(name, text);
	
// 	// get:
// 	// var obj2 = JSON.parse(localStorage.getItem('myObj'));
// }


async function requestUserPlaylists(count = 0){
	//returns an array of JSON playlist objects
	console.log("requestUserPlaylists");

	// fileLog("Rquesting playlistsURL: " + playlistsURL);
	let limit = 50;
	let playlists = new Array();
	// console.log("curr count: " + count);

	let page = await sp.getUserPlaylists(options={"offset":count, "limit":limit});
	page.err ? console.log("FAIL " + page.err) : "" ;
	console.log(page.items);
	playlists = page.items; 
	
	let next 	= page.next;
		count  += page.items.length;
		total 	= page.total;

		log 	= `current: ${page.href}
					\n Next: ${next}
					\ncount: ${count}
					\ntotal: ${total}\n\n
					`;

	if (next && count < total) {
		playlists = playlists.concat(await requestUserPlaylists(count));
	}
	console.log("Returning playlists");
	return playlists;
}

function search() {
	let query = document.getElementById("seachInput").value;
	console.log("starting search for: " + query);

	let playlistsFound = searchPlaylists(PLAYLISTS, query);
	let tracksFound = searchTracks(PLAYLISTS, query);
}

function searchPlaylists(playlists, query){
	console.log("searching for playlists");

    var results;
    query = query.toUpperCase();
    results = playlists.filter(function(p) {
    	return p.name.toUpperCase().indexOf(query) !== -1;
    });
    console.log(results);
    displayPlaylists(results);
    return results;
}

function searchTracks(playlists, query){
	console.log("searching for tracks");
	
	var results = [];
    query = query.toUpperCase();

    playlists.length < 1 ? playlists = loadLocalPlaylists() : "" ; 
    
	playlists.forEach(function(p){
		// tracks = await requestPlaylistTracks(p.id);

		TRACKS = loadLocalTracks();
		
		results = results.concat(
			TRACKS.filter(function(t) {
					console.log(t);
				if (t.tracks.track.name.toUpperCase().indexOf(query) !== -1) {
					// t.inPlaylists = `${p.name} | `;
					return t;
				}
			})
		)
		if (results.length>0) { 
			console.log(results);
			displayTracks(results);
			return results;
		} 
		
	})
	alert("THIS SHOULD NOT RUN len: " + results.length);
	console.log(results);
	displayTracks(results);
	return results;
}

function displayPlaylists(playlists){
	//Takes an array of JSON playlist objects 
	let title = document.getElementById("playlistTitle");
	title.innerHTML = playlists.length + " Playlists Found";

	let list = document.getElementById("playlistsList");
	list.innerHTML = "";

	playlists.forEach(function(p) {
		let div = document.createElement("div");
		// let a = document.createElement("a");
		// a.className = "playlist-item";
		// a.id = p.name + " link";
		// a.onclick = viewPlaylist;
		
		let button = document.createElement("button");
		let ptext = p.name + " - " + p.owner.id;
		button.innerText = ptext;
		// button.id = p.name + " button";
		button.id = p.id;
		button.onclick = viewPlaylist;

		// a.append(button);
		// div.append(a);
		div.append(button);
		list.append(div);
	})


	// playlists.forEach(p => s+="<p onClick={requestPlaylistTracks}>"+p.name+"</p>"+"<br>");
	// return s;
}

async function viewPlaylist() {
	//loads the tracks for the select playlist

	console.log("called from: " + this.id)
	console.log("This:")
	console.log(this)
	let playlistTracks = await loadPlaylistTracks(this.id);
	// let playlistTracks = loadLocalTracks().filter(function(pT){
	// 	return pT.id == this.id;
	// let tracks = await requestPlaylistTracks(this.id);
	// console.log("returned playlistTracks");
	console.log("found playlist Tracks to view. Now display...");
	console.log(playlistTracks);
	console.log(playlistTracks.name);
	console.log(playlistTracks.id);
	console.log(playlistTracks.tracks);
	displayTracks(playlistTracks.tracks, this);
}

function displayTracks(tracks, source){
	console.log("Display tracks:")
	console.log(tracks);

	let title = document.getElementById("tracksListTitle");
	title.innerHTML = tracks.length + " Tracks in: " + source.innerText;

	let list = document.getElementById("tracksList");
	list.innerHTML = "";

	tracks.forEach(function(t){
		// console.log(t);
		let tInfo = parsePlaylistTrack(t); 
			div = document.createElement("div");
			text 	= `${tInfo.name} - ${tInfo.artist}
					Added by ${tInfo.addedBy}
					Add Date: ${tInfo.addDate}\n
					`;
			if (tInfo.inPlaylists) {
				text += `In Playlists: ${tInfo.inPlaylists}\n`;
			}

		div.className = "trackItem";
		div.id = tInfo.id;

		div.innerText = text;
		// console.log(tInfo);
		list.append(div);
	})
}

function parsePlaylistTrack(playlistTrack) {
	return {
		name 	: playlistTrack.track.name,
		album	: playlistTrack.track.album.name,
		artist 	: playlistTrack.track.artists[0].name,
		id 		: playlistTrack.track.id,
		addDate : new Date(playlistTrack.added_at),
		addedBy	: playlistTrack.added_by.id,
	}

}
async function requestPlaylistTracks(playlistID, count=0) {
	//Returns an array of playlist track objects
	console.log("requesting tracks for: " + playlistID);
	
	let limit = 100;
	let playlistTracks = new Array();
	console.log("curr count: " + count);

	let page = await sp.getPlaylistTracks(
						playlistID, 
						options={"offset":count, "limit":limit},
						//function(err, res){
						// 	if (err) {
						// 		console.log(err);
						// 	} else {
						// 		console.log(res)
						// 	}
						// }

						);
	page.err ? console.log("FAIL " + page.err) : "" ;
	console.log(page.items);
	playlistTracks = page.items; 
	
	let next 	= page.next;
		count  += page.items.length;
		total 	= page.total;

	// 	log 	= `current: ${page.href}
	// 				\n Next: ${next}
	// 				\ncount: ${count}
	// 				\ntotal: ${total}\n\n
	// 				`;
	// console.log(log);

	if (next && count < total) {
		await setTimeout(() => { console.log("............stalling")}, 500);
		playlistTracks = playlistTracks.concat(
			await requestPlaylistTracks(playlistID, count)
			);
	}

	console.log("Returning playlistTracks");
	return playlistTracks;
}


// function fileLog(msg, uselogFile=logFile) {
// 	fs.appendFileSync(uselogFile, "\n"+Date.now()+" "+msg, 'utf8');
// }

