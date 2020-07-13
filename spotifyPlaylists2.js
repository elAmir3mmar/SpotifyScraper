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


//class Library {
	
//	constructor () {
//		this.PLAYLISTS = [];
//		this.TRACKS = [];
//	}

//	getPlaylistById(playlistID) {
//		for (var i = 0; i < this.PLAYLISTS.length; i++) {
//			let p = this.PLAYLISTS[i]
//			// if (toString(p.id) == toString(playlistID)) {
//			// if (p.id.toUpperCase().localeCompare(playlistID.toUpperCase) == 0) {
//			if (p.id.indexOf(playlistID) != -1) {
//				return p;
//			}
//		};
		
//		console.log("playlist not found!");
//		return null;
//	}

//	hasPlaylist(playlistID) {
//		if ( this.getPlaylistById(playlistID) ) {
//			return true;
//		}
//		return false;
//	}

//	addPlaylist(playlist) {
//		if ( ! playlist instanceof Playlist ) {
//			playlist = processRawPlaylist(playlist);
//		} else {
//			this.PLAYLISTS.push(playlist);
//		}

//	}

//	processRawPlaylist (rawPlaylist) {

//		if ( Array.isArray(rawPlaylist) ){
//			//if the input is an array run the function on each of the 
//			//playlists and return a list of processedPlaylists
//			return rawPlaylist.map(this.processRawPlaylist.bind(this))
//		}

//		let playlist = new Playlist(
//			rawPlaylist.name,
//			rawPlaylist.id,
//			rawPlaylist.owner,
//			);

//		// let rawTracks = rawPlaylist.tracks
//		// if (rawTracks.length > 0){
//			// console.log("processing tracks for playlist: " + playlist.id)
//			//process the tracks and add them to the playlist
//			// this.processRawTrack(rawTracks, playlist)
//		// }

//		//add processed playlist to library
//		this.addPlaylist(playlist);

		// localStorage.setItem('PLAYLISTS', JSON.stringify(myLibrary.PLAYLISTS));
		// localStorage.setItem('playlists_updated', Date().toString())

//		return playlist;
//	}

//	countProcessedPlaylists() {
//		let count = 0;
//		for (var i = 0; i < this.PLAYLISTS.length; i++) {
//			let p = this.PLAYLISTS[i]
//			if (p.getTracks().length > 0) count ++;
//		}
//		return count
//	}

//	processRawTrack (rawTrack, playlist=null) {
//		if ( Array.isArray(rawTrack) ){
//			//if the input is an array run the function on each of the 
//			//tracks and return a list of processedTracks
//			// let tracks = [];
//			for (var i = 0; i < rawTrack.length; i++) {
//				// let t = 
//				this.processRawTrack(rawTrack[i], playlist)
//			}
//		}
//		//if the input is a single track process and return it.
//		else {

//			//if the track is a playlistTrack object (as defined by spotify),
//			// retrieve the track object
//			rawTrack.added_at ? rawTrack = rawTrack.track : "" ;

//			if(! rawTrack.name) {
//				//ERROR
//				console.log("UNDEFINED TRACK...")
//				return null;
//			} else {

//				let track = new Track(
//					rawTrack.name,
//					rawTrack.artists,
//					rawTrack.album,
//					rawTrack.id,
//					rawTrack.popularity,
//					rawTrack.preview_url
//					// rawTrack.added_at,
//					// rawTrack.added_by
//					);

//				console.log(`processed track is: ${track}`)


//				if (!playlist && rawTrack.inPlaylists) {
				
//					for (var i = 0; i < rawTrack.inPlaylists.length; i++) {
//						let pID = rawTrack.inPlaylists[i]
				
//						this.getPlaylistById(pID).addTrack(track)

//					}
//				} else {
//					playlist.addTrack(track);

//				}
//				//Injest the processed track to the library
//				// console.log("pushing : "+ track )
//				// this.TRACKS.push(track);

				// localStorage.setItem('PLAYLISTS', JSON.stringify(myLibrary.PLAYLISTS));
				// localStorage.setItem('TRACKS', JSON.stringify(myLibrary.TRACKS));
//				return track;
//			}
//		}
//	}

//	getTracks (playlist=null) {
//		if (playlist instanceof Playlist) {
//			let playlistID = playlist.id
//		} if ( typeof playlist === 'string' ) {
//			let playlistID = playlist
//		}

//		let tracks = [];

//		for (var i = 0; i < this.PLAYLISTS.length; i++) {
//			tracks = tracks.concat(this.PLAYLISTS[i].getTracks())
//		}

//		return tracks;

//	}
//}
 

//class Track {

//	constructor(name, artists, album, id, popularity, preview_url, inPlaylists=new Array()){
//		this.name = name;
//		this.artists = artists;
//		this.album = album; 
//		this.id = id;
//		this.popularity = popularity; 
//		this.preview_url = preview_url; 

//		this.inPlaylists = inPlaylists;
//	}


//	getPlaylists(){
//		let list = [];
//		for (var i = 0; i < this.inPlaylists.length; i++) {
//			let pId = this.inPlaylists[i]
//			list.push(pId)
//		}
//		return list;
//	}

//	//display
//}

//class Playlist {

//	constructor(name, id, owner) {
//		this.name = name;
//		this.id = id;
//		this.owner = owner;
		
//		this.tracks = new Array();
//	}

//	hasTrack(t) {
//		/*		
//		Checks if this playlist has a given track
//		@returns Boolean
//		*/
//		for (var i = 0; i < this.tracks.length; i++) {
//			let track = this.tracks[i]
//		// } for (let track in this.tracks) {
//			if (track.id == t.id) {
//				return true;
//			}
//			else if (track.name == t.name && track.artists == t.artists) {
//				return true;
//			}
//		}

//		return false;

//	}

//	addTrack(track){
//		if(Array.isArray(track)){
//			track.map(this.addTrack.bind(this))
//		} else if ( !this.hasTrack(track) ) {
//			// console.log(`Adding ${track.name} to ${this.name}`)
//			this.tracks.push(track);
//			track.inPlaylists.push(this.id);
//		} else {
//			console.log(`${this.name} already hasTrack ${track.name}.. skipping.`)
//		}
//	}

//	async getTracks(){
//		if (this.tracks.length == 0 ) {
//			this.tracks = await requestPlaylistTracks(this.id)
//		}
//		return this.tracks;
//	}

//	//remove tracks
//	//display
//}

//const myLibrary = new Library(); // A makeshift database stored in a variable for now.
//I must update this to use IndexedDB or webstorage:
//https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Client-side_web_APIs/Client-side_storage
//Using local storage is insufficient

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


//export 
// async function loadDb() {
// 	console.log("loadDb");

// 	// local = await loadLocalPlaylists();
// 	// local ? myLibrary.processRawPlaylist(local) : myLibrary.PLAYLISTS = [] ; 
// 	// lastDate = localStorage.getItem("playlists_updated")

// 	// (myLibrary.PLAYLISTS.length > 0) && 
// 	// lastDate ? 	
// 	// 	updateDisplay("playlistLog", "loaded from: " + lastDate) 
// 	// 	: "not in local... refreshing" ;

// 	// if (!myLibrary.PLAYLISTS || myLibrary.PLAYLISTS.length == 0) {
// 		await refreshPlaylists();
// 	// }
// 	// myLibrary.TRACKS = 
// 	// await loadLocalTracks();
// 	myLibrary.PLAYLISTS ? displayPlaylists(myLibrary.PLAYLISTS) : "" ;
// }

// function loadLocalPlaylists(playlistID = ""){
// 	console.log("loadLocalPlaylists");
// 	// playlists = JSON.parse(localStorage.getItem('PLAYLISTS')) || [];
// 	playlists.length > 0 ? myLibrary.processRawPlaylist(playlists) : "" ;

// 	console.log(`found ${playlists.length} local playlists`)

// 	return playlists;
// }

// async function loadPlaylistTracks(playlistID) {
// 	//Fetch tracks if not in local storage
// 	//returns a list of tracks 
// 	console.log("loadPlaylistTracks: " + playlistID);

// 	//Get the playlist from the library
// 	// let playlist = myLibrary.getPlaylistById(playlistID);
// 	// console.log(playlist.id)
// 	//Get tracks from library if they exist
// 	// let processedTracks = playlist.getTracks();
// 	let tracks = requestPlaylistTracks(playlistID);
// 	// console.log(processedTracks)
// 	console.log(tracks)


// 	if (!processedTracks || processedTracks.length == 0) {
// 		//Fetch the tracks from the server
// 		console.log("not found in local tracks, requesting...");
// 		playlistTracks = await requestPlaylistTracks(playlistID);

// 		//Process the fetched tracks into the library
// 		console.log("requested playlists now processing... ")
// 		let processedTracks = await myLibrary.processRawTrack(playlistTracks, playlist);

// 	}

// 	return processedTracks;
// }


// function loadLocalTracks(){
// 	console.log("loadLocalTracks");
	// tracks = JSON.parse(localStorage.getItem('TRACKS'));
// 	console.log(tracks);
// 	myLibrary.processRawTrack(tracks)
// 	console.log(`found local tracks: ${myLibrary.TRACKS} `)
// 	return myLibrary.TRACKS;
// }


// async function refreshPlaylists(){
// 	updateDisplay("playlistTitle", "Loading...");
// 	updateDisplay("playlistsList", "Loading...");
// 	updateDisplay("playlistLog", "Loading...");

// 	if (this.id == "refresh"){
// 		console.log("FORCED REFRESH...")
// 	} else {
// 		console.log("auto refresh...")
// 	}
// 	// localStorage.removeItem('PLAYLISTS');
// 	// localStorage.removeItem('TRACKS');

// 	//Request playlist form server
// 	rawPlaylists = await requestUserPlaylists();
// 	console.log("refreshed playlists");

// 	//Process fetched playlists into library
// 	myLibrary.PLAYLISTS = myLibrary.processRawPlaylist(rawPlaylists);
// 	console.log(myLibrary.PLAYLISTS);
// 	displayPlaylists(myLibrary.PLAYLISTS);

// 	//Load Playlist Tracks as well
// 	// for (var i = 0; i < myLibrary.PLAYLISTS.length; i++) {
// 	// 	let p = myLibrary.PLAYLISTS[i]
// 	// 	await loadPlaylistTracks(p.id)
// 	// 	updateDisplay("tracksListTitle", `Loaded ${i++} playlists... `)
// 	// }
// 	// )
// 	// updateDisplay("playlistLog", "updated: " + localStorage.getItem('playlists_updated'))
// }



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
			// results = results.concat(r)
		}
	})
	// for (var i = 0; i < playlists.length; i++) {
	// 	p = playlists[i];
	// 	if(p.owner.id == userId){
	// 		r = await queryPlaylist(p, query)
	// 		console.log(r)
	// 		displayAppend(r);
	// 		// results = results.concat(r)
	// 	}
	// }
	// console.log("Returning reults... "+ results.length)
	// return results;

	// for p in playlists
	
	// while next {
	// 	request next page
	// 		.then(page){
	// 			results.concat(queryPage(page)) 
	// 			next = page.next
	// 		} 
	// }
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


// function queryPage(query, page){
// 	let results = []
		
// 	for track in page 
// 		if track name is query 
// 			results.push(track)

// 	return results
// }


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
