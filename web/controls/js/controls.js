// Defining Websocket Connection
const urlParams = new URLSearchParams(window.location.search);
const server = config.ServerSSL + "://" + config.ServerUrl + ":" + config.ControlPort;
const ws = new WebSocket(server);
console.log("Connecting to:" + server)

// Defining Components

// Used for foldout menus
let accordion = {
    props: ['title'],
    data() {
        return {
            active: false,
        }
    },
    template: `
            <div class="">
                <div class="collapsible">
                    <a href="#" class="colltitle" @click.prevent="active = !active">
                        <strong>{{title}}</strong>
                        <span class="down-Arrow" v-show="!active">&#9650;</span>
                        <span class="up-Arrow" v-show="active">&#9660;</span>
                    </a>
                </div>
                <div class="content" v-show="active"><slot /></div>            
            </div>`
}

let userlist = {
    props: ['user', 'last'],
    template: `<div class="users" :id="user.name" :class="{ 'last' : last == user.name}">{{user.name}}</div>`
}

let playerlist = {
    props: ['player'],
    template: `<option :value="player.name"></option>`
}

let app = new Vue({
    el: '#app',
    data: {
        // Data displayed on the on-stream scoreboard
        scoreboard: {
            p1name: "",
            p2name: "",
            p1score: 0,
            p2score: 0,
            title: "",
        },

        // Data that has not yet been sent to the scoreboard.
        workboard: {
            p1name: "",
            p2name: "",
            p1score: 0,
            p2score: 0,
            title: "",
        },

        // Variables related to the playerlist pulldown meny.
        playerlist: {
            players: [],
            work: localStorage.getItem('pl') || "",
            chcid: localStorage.getItem('chcid') || "", // Challonge Community ID
            chtid: localStorage.getItem('chtid') || "", // Challonge Tournament ID
            smashgg: localStorage.getItem('smashurl') || "",
            subox: true, // Server Update Override checkbox. Functionality disabled, currently.
        },

        userlist: [], // List of Scoreboard Controls Users on the current SBID
        userlast: "", // Last User to send an update. Used to flash their name red.

        idletimer: 0, // Simple idle timer.
        idlethreshhold: 10, // After 10 seconds of inactivity, workboard auto syncs with scoreboard.

        name: localStorage.getItem('name') || getUniqueID(), // Generates a random name if one isn't saved.
        sbid: urlParams.get('id') || localStorage.getItem('sbid') || "default", // Scoreboard ID. Same as above, but can be overridden by the URL
        urlbase: config.ScoreboardUrl, // For the scoreboard link at the bottom of the board.
        sync: -1 // Sync state of scoreboard. -1: Force Update. 0: Unsynced. 1: Synced
    },

    components: {
        accordion,
        userlist,
        playerlist
    },
})

// Used to check the sync state of the workboard
let plDiff = plToArray(app.playerlist.work);

// Loads info from local storage if available
loadSmashgg();
loadChallonge();

plWorkToPl();
sblinkupdate(); // Updates URL and Link for the Scoreboard

ws.onopen = () => {
    console.log("We are connected!");
    sendName();
}

ws.onerror = (e) => {
    console.log(e);
}

ws.onmessage = ({ data }) => {
    console.log(data);
    data = JSON.parse(data);
    const scoreupdate = data.main;

    // Collect user inputs and throw tem at the server

    if (data.meta.type == "update" || data.meta.type == "ulist") {
        scoreupdate.type = data.meta.type; // Maybe I should have thought about my data structure better...
        updateScoreboard(scoreupdate);
        updateUserList(data.meta.userlist, data.meta.last)
        plCheck(data.main.pl);
    };

    if (data.meta.type == "playerlist") {
        console.log(data.meta.playerlist);
        app.playerlist.players = keyedList(data.meta.playerlist);
        plToWork(data.meta.playerlist);
    };
}

// Send Updated Score to the Server
function sendScore() {
    const meta_data = {
        'name': app.name,
        'type': "update",
        'sbid': app.sbid
    };

    const payload = {
        'meta': meta_data,
        'main': app.workboard,
    };
    console.log("Sending:")
    const json_text = JSON.stringify(payload);
    ws.send(json_text);
}

// Send Name and Scoreboard ID to Server
function sendName() {
    localStorage.setItem('name', slugify(app.name));
    localStorage.setItem('sbid', slugify(app.sbid));
    sblinkupdate()

    console.log("Telling Server Name Is: " + app.name + " and my Scoreboard is: " + app.sbid);
    const payload = {
        'meta': {
            'name': app.name,
            'type': "rename",
            'sbid': app.sbid
        }
    }

    const json_text = JSON.stringify(payload);
    ws.send(json_text);
}

// Update local Scoreboard with data from the Server
function updateScoreboard(data) {
    app.scoreboard = data;
    sblinkupdate();
    syncCheck();
}

// Update Local Inputs with data from the Local Scoreboard
function syncWorkboard() {
    console.log("Syncing Workboard with Scoreboard")
    app.workboard = app.scoreboard;
    app.sync = 1;
}

function syncCheck() {
    const a = JSON.stringify(app.workboard);
    const b = JSON.stringify(app.scoreboard);

    if (a == b) {
        console.log('Boards are the Same')
        app.sync = 1;
    } else if (app.sync == -1 || app.idletimer > app.idlethreshhold) {
        console.log('Force Refresh')
        syncWorkboard();
    } else {
        console.log('Boards Mismatch')
        app.sync = 0;
    }
}

// Turns a simple array into an iteratable object in Vue
function keyedList(data) {
    let i = 0;
    let list = [];
    data.forEach(element => {
        object = { id: i, name: element };
        list.push(object);
        i++;
    });

    return list;
}

function updateUserList(uList, uLast) {
    uList = [...new Set(uList)];
    app.userlast = "";
    app.userlist = keyedList(uList);

    // Makes the Input Flash work again
    setTimeout(() => { app.userlast = uLast; }, 50);
};

// Swaps sides for Scores and Names
function swap() {
    console.log("Swapping Sides...");
    [app.workboard.p1name, app.workboard.p2name, app.workboard.p1score, app.workboard.p2score] = [app.workboard.p2name, app.workboard.p1name, app.workboard.p2score, app.workboard.p1score];
    sendScore();
};

function clearall() {
    console.log("Clearing");
    app.workboard.p1name = '';
    app.workboard.p2name = '';
    app.workboard.p1score = '0';
    app.workboard.p2score = '0';
}

function wbIncrement(num, id) {
    app.workboard[id] = String(parseInt(app.workboard[id]) + num);
    sendScore();
}

function getUniqueID() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4();
}

function sblinkupdate() {
    window.history.pushState('', '', window.location.origin + window.location.pathname + "?id=" + app.sbid);
}

function slugify(text) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

function activityWatcher() {
    setInterval(function () {
        app.idletimer++;
        if (app.idletimer > app.idlethreshhold && app.sync == 0) {
            console.log('Auto Refreshing');
            syncWorkboard();
        }
    }, 1000);

    // Reset Timer with Actvity
    function activity() {
        app.idletimer = 0;
    }

    let activityEvents = [
        'mousedown', 'mousemove', 'keydown',
        'scroll', 'touchstart'
    ];

    activityEvents.forEach(function (eventName) {
        document.addEventListener(eventName, activity, true);
    });
}

activityWatcher();

// For the Popout Button
//function openwindow(url) {
//    NewWindow = window.open(url, 'newWin', 'width=600,height=301,left=20,top=20,toolbar=No,location=No,scrollbars=no,status=No,resizable=no,fullscreen=No'); NewWindow.focus(); void (0);
//}