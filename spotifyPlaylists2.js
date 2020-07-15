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
// document.getElementById("searchPlaylists").addEventListener("click", search);
// document.getElementById("refresh").addEventListener("click", refreshPlaylists);
document.getElementById("clear").addEventListener("click", clearCookies);
document.getElementById("xList").addEventListener("click", xList);
document.getElementById("remX").addEventListener("click", removeXTracks);

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
		)
	);
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

	// console.log("Returning playlistTracks for " + playlistID + " count: " + playlistTracks.length);
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

async function xList(){
	//get playlist tracks
	let query = document.getElementById("xListInput").value.toUpperCase(); 
	if(USER_PLAYLISTS.length == 0){ await getPlaylists(1) }
	let x = searchPlaylists(query, USER_PLAYLISTS)
	
	requestPlaylistTracks(x[0].id)
	.then(xTracks => {
		xTracks.forEach(x=>{x.found=false})
		
		r = findTracks(xTracks, USER_PLAYLISTS)
		//TODO remove all tracks from xlist if r = 0

		console.log(xTracks); 
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
	console.log(USER_PLAYLISTS)
	// searchPlaylists(query, playlists);
	incrementalSearch(query, USER_PLAYLISTS);
}

function searchPlaylists(query, playlists){
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

	let results = []
	var rCount = 0;
	
	var pCount = 0;

	playlists.forEach( p => {
		// r = await queryPlaylist(p, query)
		queryPlaylist(p, query)
		.then( r => {
			if(r.length > 0){
				rCount += r.length;
				console.log(rCount); 
				updateDisplay("tracksListTitle", rCount + " Match query.");
				console.log(r)
				displayAppend(r);
			}
			move("playlists", ++pCount, playlists.length)
		})

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

	// let results = []
	let pCount = 0;
	playlists.forEach(p => {
		if (p.name.toUpperCase() == "XTHIS") {return;}
		requestPlaylistTracks(p.id)
		.then(pT => {
			// console.log(pT)
			pT = pT.map(t => {/*console.log(t);*/ return t.track})
			let r = filterTracks(pT, tracks)
			updateDisplay("playlistLog", `${p.name} ${p.id} ${r.length}`)
			r.forEach(t => {
				t.playlist = p
				displayAppend([t])
				CURR_TRACKS.push(t)
			})
			move("playlists", ++pCount, playlists.length)
		})
	})
	return ;// TODO return count
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
	let playlistTracks = await requestPlaylistTracks(this.id);
	console.log("found playlist Tracks to view. Now display...");
	displayTracks(playlistTracks, this);
}

function displayTracks(tracks, source=""){
	console.log("Display tracks:")
	console.log(tracks);

	updateDisplay("tracksListTitle", tracks.length + " Match query.");
	
	let list = document.getElementById("tracksList");
	list.innerHTML = "";

	tracks.forEach(function(t){
		console.log(t);
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

//TODO update to react
/* Updates a display list realtime.
	Takes a destination and a list of items (tracks with playlists) to display.
*/
function displayAppend(tracks, destination="tracksList") {
	// console.log("dAppend ", tracks)
	let list = document.getElementById(destination);

	tracks.forEach( t => {
		div = document.createElement("div");
		text 	= `${t.name}, ${t.artists[0].name}, ${t.playlist.name}\n`;
		div.className = "trackItem";
		div.id = t.id;
		div.dataset.source = t;
		div.dataset.playlistId = t.playlist.id;
		div.dataset.playlistName = t.playlist.name;
		div.innerText = text;
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