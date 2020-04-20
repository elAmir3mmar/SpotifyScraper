
var rep = function () {

	var logText = document.getElementById("logText");
	if (logText.innerText == "") {
		logText.innerText = "Text updated."
	} else {
		logText.innerText = ""
	}
}