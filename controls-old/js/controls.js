// Checks for URL param to skip SSL. Should only be used for local testing
let ws = [];
const urlParams = new URLSearchParams(window.location.search);
const nossl = urlParams.get('nossl');
console.log("nossl: " + nossl);
if (nossl == "1"){
    console.log("Attempting without SSL")
	ws = new WebSocket("ws://" + window.location.hostname + ":8082");
} else {
    console.log("Attempting with SSL")
	ws = new WebSocket("wss://" + window.location.hostname + ":8082");
}

let sblocation = window.location.href.replace("controls/", "");

const wbP1Name = document.getElementById('p1name');
const wbP2Name = document.getElementById('p2name');
const wbP1Score = document.getElementById('p1score');
const wbP2Score = document.getElementById('p2score');
const wbTitle = document.getElementById('title');

let ulist = [];
let colorfader = 0; // Fades color when User Names flash
let FullUpdate = 1; // 0: Update only the score display. 1: Update score display AND controls

document.getElementById("username").value = slugify(localStorage.getItem('name') || getUniqueID()); //Generate a Unique ID or pull from Local Stoage
let uname = document.getElementById("username").value
let sbid = "default"; // Declare Early due to Type Issues

console.log("id: " + getUrlParam('id'));
// URL IDs overwrite Local Storage when setting the SB ID
if (getUrlParam('id') == undefined){
    console.log("generating unique ID")
    sbid = slugify(localStorage.getItem('sbid') || getUniqueID());
} else {
    console.log("Default")
    sbid = getUrlParam('id','default');
}

document.getElementById("sbid").value = sbid //Generate a Unique Scoreboard ID or pull from Local Stoage
sblinkupdate(); // Updates URL and Link for the Scoreboard

ws.addEventListener("open", () => {
    console.log("We are connected!");
    sendName();
});

ws.onerror = function(event) {
	console.log("FAILURE");
	if (nossl !== "1"){
		window.location.search = window.location.search + "&nossl=1";
        // Lets Try taht without SSL...
	}
}

ws.addEventListener("message", ({ data }) => {
    console.log(data);
    const sbparse = JSON.parse(data);
    const sbupdate = sbparse.main;

    // Collect user inputs and throw tem at the server

    if (sbparse.meta.type == "update" || sbparse.meta.type == "ulist"){
        sbupdate.type = sbparse.meta.type; // Maybe I should have thought about my data structure better...
        console.log(sbupdate);
        refreshScore(sbupdate);
        updateUserList(sbparse.meta.userlist, sbparse.meta.last)
        plCheck(sbparse.main.pl);
    };

    if (sbparse.meta.type == "playerlist"){
        plistbuild(sbparse.meta.playerlist);
        plToWork(sbparse.meta.playerlist);
    };
});

// Send Updated Score to the Server
function updateScore() {
    const meta_data = {
        'name': document.getElementById("username").value,
        'type': "update",
        'sbid': sbid
    };

    const score_data = {
        'p1name': wbP1Name.value,
        'p2name': wbP2Name.value,
        'p1score': wbP1Score.value,
        'p2score': wbP2Score.value,
        'title': wbTitle.value
    };

    const payload = {
        'meta': meta_data,
        'main': score_data,
    };
    document.getElementById("refresh").classList.remove("red");

    userIdSync();
    const json_text = JSON.stringify(payload);
    ws.send(json_text);
}

function sendName() {
    userIdSync();
    sblinkupdate()
    
    console.log("Telling Server Name Is: " + uname);
    const payload = {
        'meta': {
            'name': uname,
            'type': "rename",
            'sbid': sbid
        }
    }

    const json_text = JSON.stringify(payload);
    ws.send(json_text);
}

function userIdSync() {
    localStorage.setItem('name', slugify(document.getElementById("username").value));
    localStorage.setItem('sbid', slugify(document.getElementById("sbid").value));
    sbid =  localStorage.getItem("sbid");
    uname =  localStorage.getItem("name");

    document.getElementById("sbid").value = sbid;
    document.getElementById("username").value = uname;
}

// Update local scoreboard with data from the Server
function refreshScore(data) {
    console.log(data);
    const score = data;

    document.getElementById("p1namebig").innerHTML = score.p1name;
    document.getElementById("p2namebig").innerHTML = score.p2name;

    document.getElementById("p1scorebig").innerHTML = score.p1score;
    document.getElementById("p2scorebig").innerHTML = score.p2score;

    wbTitle.value = score.title;
    sblinkupdate();
    if (FullUpdate == 1){ 
        refreshInputs(score);
        FullUpdate = 0;
    } else {
        console.log("Reddening Refresh")
        document.getElementById("refresh").classList.add("red");
    }
    
    // If the update is just a userlist, we don't need to redden anything
    // (Yes I tried to work this up into the above statement and it never worked right)
    if (score.type == "ulist"){
        console.log("De-Reddening Refresh")
        document.getElementById("refresh").classList.remove("red");
    }  
}

// Update Local Inputs with data from the Local Scoreboard
function refreshInputs(data) {
    sblinkupdate();
    const score = data;

    wbP1Name.value = score.p1name;
    wbP2Name.value = score.p2name;

    wbP1Score.value = score.p1score;
    wbP2Score.value = score.p2score;

    wbTitle.value = score.title;
}

// When doing a full update, info is pulled from the 'scoreboard' up top and not the
function syncInputs() {
    if (sbid !== document.getElementById("sbid").value) {
        console.log(sbid + " : " + document.getElementById("sbid").value);
        sendName(); 
    }

    wbP1Name.value = document.getElementById("p1namebig").innerHTML;
    wbP2Name.value = document.getElementById("p2namebig").innerHTML;

    wbP1Score.value = document.getElementById("p1scorebig").innerHTML;
    wbP2Score.value = document.getElementById("p2scorebig").innerHTML;
    document.getElementById("refresh").classList.remove("red");
}

// Update Userlist with serverside information
function updateUserList(uList, uLast) {
    document.getElementById("userlist").innerHTML = ''; // Destroy previous Userlist
    uList.forEach(element => {
        let div = document.createElement("div");
        div.id = element;
        div.classList = "users";
        div.innerHTML = element;

        // Check if name already exists. If it does, just add a + to the end of the name
        // to show how many concurrent connections there are by one username.
        const idcheck = document.getElementById(element);
        if(idcheck){document.getElementById(element).innerHTML = document.getElementById(element).innerHTML + "+"} 
        else {document.getElementById("userlist").appendChild(div);}
    });

    // Use uLast to determine which user last a sent an update so their name can flash
    if (uLast !== "none") {
        document.getElementById(uLast).id = "last";
        colorfader = 7;
        lastFadeFunction();
    }
};

// Make the Red Flash fade
function lastFadeFunction() {
    if (colorfader<187) {
        colorfader += 15;
        setTimeout(function(){lastFadeFunction()},100);
   }
   document.getElementById('last').style.color = "rgba(187," + colorfader + "," + colorfader + ",1)";
};

// Swaps sides for Scores and Names
function swap(){
    let tmp = wbP1Score.value;
    wbP1Score.value = wbP2Score.value;
    wbP2Score.value = tmp;

    tmp = wbP1Name.value;
    wbP1Name.value = wbP2Name.value;
    wbP2Name.value = tmp;
    FullUpdate = 1;
    updateScore()
};


const meta_data = {
    'name': document.getElementById("username").value,
    'type': "update",
    'sbid': sbid
};

const score_data = {
    'p1name': wbP1Name.value,
    'p2name': wbP2Name.value,
    'p1score': wbP1Score.value,
    'p2score': wbP2Score.value,
    'title': wbTitle.value
};

const payload = {
    'meta': meta_data,
    'main': score_data,
};


function clearall(){
    console.log("Clearing");
    wbP1Name.value = '';
    wbP2Name.value = '';
    wbP1Score.value = '0';
    wbP2Score.value = '0';
}

function sblinkupdate(){
    document.getElementById('sblink').innerHTML = sblocation;
    document.getElementById('sblink').href = sblocation;
    seturlparam();
}

document.getElementById("update").addEventListener("click", () => {
    FullUpdate = 1;
    updateScore()
});

function refreshplist() {
    plist.forEach(element => {
        console.log("aaaa");
    });
}