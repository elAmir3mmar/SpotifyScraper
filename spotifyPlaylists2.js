// var React = require('react');
// var ReactDom = require('react-dom');

//Using Spotify Web Api to simplify spotify api requests
// https://github.com/JMPerez/spotify-web-api-js
const Spotify = require('spotify-web-api-js');
const sp = new Spotify();
var userId = "";

// Using Promise Throttle to avoid rate limits when requesting tracks
// https://github.com/JMPerez/promise-throttle
const PromiseThrottle = require('promise-throttle');
const promiseThrottle = new PromiseThrottle({
    requestsPerSecond: 1,           // up to 1 request per second
    promiseImplementation: Promise  // the Promise library you are using
});

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
	    // if found params update cookies etc
		console.log("got hash params: ");
		console.log(params);

	    setCookie("accessToken", params.access_token);
	    setCookie("refreshToken", params.refresh_token, 999999999);
	    console.log(document.cookie);
		sp.setAccessToken(params.access_token);

    } else if (getCookie("accessToken")) {
	    // if no params found check cookies 
		console.log("found access token in cookie");
			sp.setAccessToken(getCookie("accessToken"));

	} else {
	// if no access token found request a login
		console.log("Please log in.");
		//TODO use the refresh token here
		window.location.href = "http://localhost:8888";
	
    }
    if (sp.getAccessToken()){
		document.getElementById('login').style.display = "none"; 
		document.getElementById('buttons').style.display = "block"; 
    	console.log("Token found.. Starting Automatically");
    	sp.getMe().then(r =>{
    		console.log(r.id)
    		userId = r.id;
    	})
    	//loadDb();
    }
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

function clearCookies() {
    setCookie("accessToken", params.access_token, -1);
}

// document.getElementById("start").addEventListener("click", loadDb);
document.getElementById("search").addEventListener("click", search);
// document.getElementById("refresh").addEventListener("click", refreshPlaylists);
document.getElementById("clear").addEventListener("click", clearCookies);


async function requestPlaylistTracks(playlistID, count=0) {
	//Returns an array of playlist track objects
	// console.log("requesting tracks for: " + playlistID + " curr count: " + count);
	
	let limit = 100;
	let playlistTracks = new Array();
	// console.log("curr count: " + count);


	let page = await promiseThrottle.add(
		sp.getPlaylistTracks.bind(
			this,
			playlistID, 
			options={"offset":count, "limit":limit}
		));
	page.err ? console.log("FAIL " + page.err) : "" ;
	// console.log(page.items);
	playlistTracks = page.items; 
	
	let next 	= page.next;
		count  += page.items.length;
		total 	= page.total;
	

		log 	= `current: ${page.href}
					\n Next: ${next}
					\ncount: ${count}
					\ntotal: ${total}\n\n
					`;
	// console.log(log);

	if (next && count < total) {
		// await setTimeout(() => { console.log("............stalling")}, 500);
		playlistTracks = playlistTracks.concat(
			//TODO Make this sync to show real time status?
			await requestPlaylistTracks(playlistID, count)
			);
	}

	updateDisplay("tracklistLog", playlistID + " Track count: " + playlistTracks.length);

	console.log("Returning playlistTracks for " + playlistID + " count: " + playlistTracks.length);
	return playlistTracks;
	// return processedTracks;
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

async function requestUserPlaylists(count = 0){
	//returns an array of JSON playlist objects
	console.log("requestUserPlaylists");

	// fileLog("Rquesting playlistsURL: " + playlistsURL);
	let limit = 50;
	let playlists = new Array();
	// console.log("curr count: " + count);

	let page = await promiseThrottle.add(
		sp.getUserPlaylists.bind(
			this,
			options={"offset":count, "limit":limit}
		));
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


async function search() {
	//7fu2gzuVhSKKRs23aGsXvq
	let query = document.getElementById("seachInput").value.toUpperCase();
	console.log("starting search for: " + query);
	let playlists = await requestUserPlaylists(); //Store IDs and names only

	// let playlistsFound = searchPlaylists(query);
	searchPlaylists(query, playlists);
	// let tracksFound = searchTracks(query);
	// let tracksFound = await incrementalSearch(query);
	incrementalSearch(query, playlists);
	// displayTracks(tracksFound);
}

function searchPlaylists(query, playlists=[]){
	console.log("searching for playlists");

	if(playlists.length < 1){
		console.log("ERR: Playlists needed.");
	}

    let results = [];

    results = playlists.filter(function(p) {
    	let name = p.name.toUpperCase();
    	let id = p.id.toUpperCase();
    	let nameMatch = name.indexOf(query) !== -1;
    	// let idMatch = p.id.indexOf(query) !== -1;
    	console.log(id.localeCompare(query))
    	let idMatch = (id.localeCompare(query)) == 0;
    	// console.log(p.id)
    	// console.log("7fu2gzuVhSKKRs23aGsXvq")
    	if( nameMatch || idMatch ) return true;
    });
    console.log(results);

    displayPlaylists(results);
    return results;
}

//TODO change this to an incremental search 
//.. Parse through each page of the playlistTracks then request the next page
async function incrementalSearch(query, playlists=[]){

	if(playlists.length < 1){
		console.log("ERR: Playlists needed.");
	}
	let results = []

	// console.log(playlists);
	// console.log("\n");

	var rCount = 0;
	playlists.forEach( p => {
		if(p.owner.id == userId){
			// r = await queryPlaylist(p, query)
			queryPlaylist(p, query).then( r => {
				if(r.length > 0){
					rCount += r.length;
					console.log(rCount); 
					updateDisplay("tracksListTitle", rCount + " Match query.");
					console.log(r)
					displayAppend(r);
				}
			})
		}
	})

}
async function queryPlaylist(p, query) {
	let results = []
	let tracks = await requestPlaylistTracks(p.id);
	tracks.forEach(t => {
		name = t.track.name.toUpperCase();
		if(name.indexOf(query) !== -1){
			console.log(`found ${name} in ${p.name}`)
			t.track.playlist = p
			results.push(t.track)
		}
	})
	return results;
}

async function searchTracks(query, playlist=null){

	console.log("searching for tracks");
	
	var results = [];
	var rPlaylists = [];
    query = query.toUpperCase();

    // playlists.length < 1 ? playlists = loadLocalPlaylists() : "" ; 
    if (playlist) {
    	let playlists = [].push(myLibrary.getPlaylistById(playlist))
    } else {
    	let playlists = myLibrary.PLAYLISTS;
    }
    console.log(playlists)
    for (var i = 0; i < playlists.length; i++) {
    	p = playlists[i]

	// playlists.forEach(async function(p){
		console.log(p)
		console.log(typeof(p))
		// let tracks = p.getTracks();
		let tracks = await requestPlaylistTracks(p.id)

		results = results.concat(
			tracks.filter(function(t) {
				if (t.track.name.toUpperCase().indexOf(query) !== -1) {
					rPlaylists.includes(p) ? "" : rPlaylists.push(p);
					return t;
				}
			})
		)
		
	// })
    }

	if (results.length>0) { 
		console.log(results);
		displayTracks(results);
		displayPlaylists(rPlaylists);
		return results;
	} 

	alert("THIS SHOULD NOT RUN len: " + results.length);
	console.log(results);
	displayTracks(results);
	return results;
}

function updateDisplay(displayID, content){
	document.getElementById(displayID).innerText = content;
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
	let p = myLibrary.getPlaylistById(this.id);
	// let playlistTracks = p.tracks;
	// console.log(playlistTracks)
	// if (playlistTracks.length == 0) {
		// let playlistTracks = await loadPlaylistTracks(this.id);
		playlistTracks = await requestPlaylistTracks(playlistID);
	// }
	// let playlistTracks = loadLocalTracks().filter(function(pT){
	// 	return pT.id == this.id;
	// let tracks = await requestPlaylistTracks(this.id);
	// console.log("returned playlistTracks");
	console.log("found playlist Tracks to view. Now display...");
	// console.log(playlistTracks);
	// console.log(p.name);
	// console.log(p.id);
	// console.log(p.getTracks());
	displayTracks(playlistTracks, this);
}

function displayTracks(tracks, source=""){
	console.log("Display tracks:")
	console.log(tracks);

	// let title = document.getElementById("tracksListTitle");
	// title.innerHTML = tracks.length + " Tracks in: " + source.innerText;
	// updateDisplay("tracksListTitle", tracks.length + " Tracks in: " + source.innerText);
	updateDisplay("tracksListTitle", tracks.length + " Match query.");
	
	let list = document.getElementById("tracksList");
	list.innerHTML = "";

	tracks.forEach(function(t){
		// console.log(t);
		// let tInfo = parsePlaylistTrack(t); 
			div = document.createElement("div");
// 			console.log(t)
// 			console.log(t.artists)
			text 	= `${t.name} - ${t.artists[0].name} in ${t.playlist.name}\n`;
			if (t.inPlaylists) {
				text += ` In Playlists: ${t.playlist.name}\n`;
			}

		div.className = "trackItem";
		div.id = t.id;

		div.innerText = text;
		// console.log(tInfo);
		list.append(div);
	})
}

function prepDisplay() {

}

//TODO update to react
/* Updates a display list realtime.
	Takes a destination and a list of items (tracks with playlists) to display.
*/
function displayAppend(tracks, destination="tracksList") {
	let list = document.getElementById(destination);

	tracks.forEach( t => {
		div = document.createElement("div");
		text 	= `${t.name} - ${t.artists[0].name} in ${t.playlist.name}\n`;
		if (t.inPlaylists) {
			text += ` In Playlists: ${t.playlist.name}\n`;
		}

		div.className = "trackItem";
		div.id = t.id;

		div.innerText = text;
		list.append(div);	
	})
}
