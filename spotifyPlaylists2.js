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
    requestsPerSecond: 5,           // up to 5 request per second
    promiseImplementation: Promise  // the Promise library you are using
});


//Create Storege space
//Global variables used to pass objects around
var USER_PLAYLISTS = []
var ALL_PLAYLISTS = []
var CURR_TRACKS = []

document.getElementById("searchTracks").addEventListener("click", search);
document.getElementById("filterInput").addEventListener("click", filterPlaylists);
document.getElementById("toggleShow").addEventListener("change", toggleShow);
// document.getElementById("refresh").addEventListener("click", refreshPlaylists);
document.getElementById("clear").addEventListener("click", clearCookies);

// document.getElementById("xList").addEventListener("click", xList);
// document.getElementById("remX").addEventListener("click", removeXTracks);


function getHashParams() {
	// Copied from SP OAuth examples
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
    	load();
    }
}

async function load(){
	USER_PLAYLISTS = await getPlaylists(1);
	displayPlaylists(USER_PLAYLISTS)
}

async function getPlaylists(owned = 0){
	if (owned) {
		if (USER_PLAYLISTS.length == 0) {
			USER_PLAYLISTS = await requestUserPlaylists(0, owned);
		}
		return USER_PLAYLISTS
	} else {
		if (ALL_PLAYLISTS.length == 0) {
			ALL_PLAYLISTS = await requestUserPlaylists(0, owned);
		}
		return ALL_PLAYLISTS
	}
}

function toggleShow(){
	if(this.checked){
		showMine()
	}
	else {
		showAll()
	}
}

function showAll(){
	getPlaylists()
	.then(r => {
		displayPlaylists(ALL_PLAYLISTS)
	})
}

function showMine(){
	getPlaylists(1)
	.then(displayPlaylists(USER_PLAYLISTS))
}

async function requestUserPlaylists(count = 0, owned = 0){
	//returns an array of JSON playlist objects
	// console.log("requestUserPlaylists");

	let id = ""
	owned ? id = userId : "" 

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
	// console.log(page.items);
	playlists = page.items; 
	
	let next 	= page.next;
		count  += page.items.length;
		total 	= page.total;

		log 	= `current: ${page.href}
					\n Next: ${next}
					\ncount: ${count}
					\ntotal: ${total}\n\n
					`;
	
	move("User Playlists", count, total)

	if (next && count < total) {
		playlists = playlists.concat(await requestUserPlaylists(count, owned));
	}
	console.log("Returning playlists");
	if (owned) {
		playlists = playlists.filter(p => {
			return p.owner.id == userId
		})
	}
	return playlists;
}

async function requestPlaylistTracks(playlist, count=0) {
	//Returns an array of playlist track objects
	// console.log("requesting tracks for: " + playlistID + " curr count: " + count);
	playlistID = playlist.id
	let limit = 100;
	let playlistTracks = new Array();

	let page = await promiseThrottle.add(
		sp.getPlaylistTracks.bind(
			this,
			playlistID, 
			options={"offset":count, "limit":limit}
		)
	);
	page.err ? console.log("FAIL " + page.err) : "" ;
	playlistTracks = page.items; 
	
	let next 	= page.next;
		count  += page.items.length;
		total 	= page.total;
	

		log 	= `current: ${page.href}
					\n Next: ${next}
					\ncount: ${count}
					\ntotal: ${total}\n\n
					`;

	if (next && count < total) {
		playlistTracks = playlistTracks.concat(
			await requestPlaylistTracks(playlist, count)
			);
	}
	playlistTracks = playlistTracks.map(t=>{
		if (typeof t === "undefined" || t.track == null) return;
		
		if (t.added_at) t=t.track
		t.playlist = playlist
		return t;
	})

	updateDisplay("tracklistLog", playlist.name + " " + playlistID + " Track count: " + playlistTracks.length);
	return playlistTracks;
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

async function xList(){
	//get playlist tracks
	let query = document.getElementById("xListInput").value.toUpperCase(); 
	if(USER_PLAYLISTS.length == 0){ await getPlaylists(1) }
	let x = filterPlaylists(query, USER_PLAYLISTS)
	
	requestPlaylistTracks(x[0])
	.then(xTracks => {
		updateDisplay("tracksListTitle", xTracks.length + " Tracks in xList")
		if (xTracks.length == 0) return;
		findTracks(xTracks, USER_PLAYLISTS)
		//TODO remove all tracks from xlist if r = 0
	})
	document.getElementById("xList").style.display = "none";
	document.getElementById("remX").style.display = "block";
}

function removeXTracks(){
	//remove xTracks from all playlists
	// then remove from xList
	let tracks = []
	if (CURR_TRACKS.length==0) console.log("No Tracks Found")
	
	let playlists = mapPlaylists(CURR_TRACKS);
	
	trackIds = CURR_TRACKS.map(t => {return t.id})
	trackUris = CURR_TRACKS.map(t => {return t.uri})

	sp.removeFromMySavedTracks(trackIds).then(res => console.log(res))
	
	for (let id in playlists){
		// if(playlists[id].playlist.name.toUpperCase() == "XTHIS"){
		// 	continue;
		// }
		let uris = playlists[id].tracks.map(t => {return t.uri})
		console.log(id, uris)
		sp.removeTracksFromPlaylist(id, uris).then(res => console.log(res))
	}

	xList()
}

function mapPlaylists(tracks){
	let playlists = {}
	tracks.forEach(t=>{
		if (!(t.playlist.id in playlists)) {
			playlists[t.playlist.id] = {
				"playlist": t.playlist, 
				"tracks": []
		};
		}
		playlists[t.playlist.id].tracks.push(t)
	})
	console.log(playlists)
	return playlists;
}

async function search() {
	let query = document.getElementById("searchInput").value.toUpperCase();
	updateDisplay("tracksList", "")
	console.log("starting search for: " + query);

	let USER_PLAYLISTS = await getPlaylists(0)
	// Search for playlists
	// filterPlaylists(query, playlists);

	// Search for tracks
	incrementalSearch(query, USER_PLAYLISTS);
}

function filterPlaylists(query, playlists){
	console.log("searching for playlist: " + query);

	if(playlists.length < 1){
		console.log("ERR: Playlists needed.");
		// let playlists = await requestUserPlaylists();
	}

    let results = [];

    results = playlists.filter(function(p) {
    	let name = p.name.toUpperCase();
    	let id = p.id.toUpperCase();
    	let nameMatch = name.indexOf(query) !== -1;
    	let idMatch = (id.localeCompare(query)) == 0;
    	return ( nameMatch || idMatch );
    });
    console.log(results);

    displayPlaylists(results);
    return results;
}


//TODO change this to an incremental search 
//.. Parse through each page of the playlistTracks then request the next page
function incrementalSearch(query, playlists){

	// let results = []
	// var rCount = 0;
	
	var pCount = 0;

	playlists.forEach( p => {
		// r = await queryPlaylist(p, query)
		queryPlaylist(p, query)
		.then( r => {
			// if(r.length > 0){
				// rCount += r.length;
				// console.log(rCount); 
				// updateDisplay("tracksListTitle", rCount + " Match query.");
				// console.log(r)
				// displayAppend(r);
			// }
			move("playlists", ++pCount, playlists.length)
		
		})

	})
}

async function queryPlaylist(p, query) {
	let results = []
	let rCount = 0;
	let tracks = await requestPlaylistTracks(p);
	tracks.forEach(t => {
		if (typeof t === "undefined") return;
		name = t.name.toUpperCase();
		if(name.indexOf(query) !== -1){
			console.log(`found ${name} in ${p.name}`)
			// t.playlist = p
			// results.push(t)
			updateDisplay("tracksListTitle", ++rCount + " Match query.");
			displayAppend([t])

		}
	})
	// return results;
}

function sameTrack(t1, t2){
	//Check the type of the track object 
	//(PlaylistTrack vs Track)
	if (t1.track == null || t2.track == null) { return false; }
	if (t1.track.name) t1 = t1.track;
	if (t2.track.name) t2 = t2.track;
	return t1.id == t2.id;
}

function filterTracks(source, filter){
	let r = []
	filter.forEach(fT => {
		r = r.concat(
			source.filter(function(sT) {
				if (sameTrack(sT, fT)) {
					fT.found = true
					return true 
				} else {
					return false
				}
			})
		)
	})
	return r;
}

function findTracks(tracks, playlists){
	CURR_TRACKS = []
	updateDisplay("tracksList", "");

	let pCount = 0;
	playlists.forEach(p => {
		if (p.name.toUpperCase() == "XTHIS") {return;}
		requestPlaylistTracks(p)
		.then(pT => {
			// console.log(pT)
			// pT = pT.map(t => {/*console.log(t);*/ return t.track})
			let r = filterTracks(pT, tracks)
			rCount += r.length
			updateDisplay("playlistLog", `${p.name} ${p.id} ${r.length}`)
			r.forEach(t => {
				t.playlist = p
				displayAppend([t])
				CURR_TRACKS.push(t)
			})
			move("playlists", ++pCount, playlists.length)
		})
	})
}

function updateDisplay(displayID, content){
	document.getElementById(displayID).innerText = content;

}

function displayPlaylists(playlists){
	//Takes an array of JSON playlist objects 
	if(!playlists){
		console.log(playlists)
		throw "Playlists Required"
	}
	let title = document.getElementById("playlistTitle");
	title.innerHTML = playlists.length + " Playlists Found";

	let list = document.getElementById("playlistsList");
	list.innerHTML = "";

	playlists.forEach(function(p) {
		let div = document.createElement("div");
		
		let button = document.createElement("button");
		let ptext = p.name + " - " + p.owner.id;
		button.innerText = ptext;
		button.id = p.id;
		button.onclick = viewPlaylist;

		div.append(button);
		list.append(div);
	})

}

async function viewPlaylist() {
	//loads the tracks for the select playlist

	console.log("called from: " + this.id)
	console.log("This:")
	console.log(this)
	let thisId = this.id
	let playlist = await getPlaylists()
	playlist = playlist.filter(p => {return thisId == p.id})

	let playlistTracks = await requestPlaylistTracks(playlist[0]);
	console.log("found playlist Tracks to view. Now display...");
	displayAppend(playlistTracks);
}

// function displayTracks(tracks, source=""){
// 	console.log("Display tracks:")
// 	console.log(tracks);

// 	updateDisplay("tracksListTitle", tracks.length + " Match query.");
	
// 	let list = document.getElementById("tracksList");
// 	list.innerHTML = "";

// 	tracks.forEach(t => {
// 		if (typeof t === 'undefined') return;
// 		if(t.added_at) t = t.track
// 		console.log(t);
// 		div = document.createElement("div");
// 		text 	= `${t.name} - ${t.artists[0].name} in ${t.playlist.name}\n`;
// 		if (t.inPlaylists) {
// 			text += ` In Playlists: ${t.playlist.name}\n`;
// 		}

// 		div.className = "trackItem";
// 		div.id = t.id;

// 		div.innerText = text;
// 		list.append(div);
// 	})
// }

//TODO update to react
/* Updates a display list realtime.
	Takes a destination and a list of items (tracks with playlists) to display.
*/
function displayAppend(tracks) {
	let destination="tracksList";
	let list = document.getElementById(destination);

	updateDisplay("tracksListTitle", tracks.length + " Match query.");

	tracks.forEach( t => {
		if (typeof t === 'undefined') return;
		if(t.added_at) t = t.track
		console.log(t)
		div = document.createElement("div");
		text 	= `${t.name}, ${t.artists[0].name}, ${t.playlist.name}\n`;
		div.className = "trackItem";
		div.id = t.id;
		div.data = t;
		div.dataset.playlistId = t.playlist.id;
		div.dataset.playlistName = t.playlist.name;
		div.innerText = text;
		div.onclick = function(){console.log(this.data)}
		list.append(div);	
		div.scrollIntoView({behavior: "smooth"});
	})
}

function move(label, count, total) {
	// console.log(label, count, total)
  var elem = document.getElementById("progressBar");   
  var width = 0;
  var id = setInterval(frame, 100);
  function frame() {
    if (width >= 100) {
      clearInterval(id);
      // document.getElementById("myP").className = "w3-text-green w3-animate-opacity";
      // document.getElementById("myP").innerHTML = "Successfully uploaded 10 photos!";
      elem.innerHTML = "Checked all " + count + " " + label;
    } else {
    	while(width < (count/total)*100){
    		// console.log(count/total)
	      width++; 
	      elem.style.width = width + '%'; 
	      var num = width * 1 / 10;
	      num = num.toFixed(0)
	      document.getElementById("progressBar").innerHTML = `${count}/${total}`;

    	}	
    }
  }
}