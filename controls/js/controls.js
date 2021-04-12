window.useLocalStorage;

let ws = [];
const urlParams = new URLSearchParams(window.location.search);
const nossl = urlParams.get('nossl');
console.log("nossl: " + nossl);
if (nossl == "1") {
    console.log("Attempting without SSL")
    ws = new WebSocket("ws://" + config.ServerUrl + ":8082");
} else {
    console.log("Attempting with SSL")
    ws = new WebSocket("wss://" + config.ServerUrl + ":8082");
}

const sblocation = window.location.href.replace("controls/", "");

let accordion = {
    props: [
        'title'
    ],
    data() {
        return {
            active: true,
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

Vue.component('users', {
    props: ['user', 'last'],
    template: `<div class="users" :id="user.name" :class="{ 'last' : last == user.name}">{{user.name}}</div>`
})

Vue.component('playerlist', {
    props: ['player'],
    template: `<option :value="player.name"></option>`
})

let app = new Vue({
    el: '#app',
    data: {
        scoreboard: {
            p1Name: "",
            p2Name: "",
            p1Score: 0,
            p2Score: 0,
            title: "",
        },

        workboard: {
            p1Name: "",
            p2Name: "",
            p1Score: 0,
            p2Score: 0,
            title: "",
        },

        playerlist: {
            players: [],
            work: localStorage.getItem('pl') || "",
            chcid: localStorage.getItem('chcid') || "",
            chtid: localStorage.getItem('chtid') || "",
            smashgg: localStorage.getItem('smashurl') || "",
            subox: true,
        },

        userlist: [],
        userlast: "",

        idleTimer: 0,
        idleThreshhold: 10,

        name: localStorage.getItem('name') || getUniqueID(),
        sbid: urlParams.get('id') || localStorage.getItem('sbid') || "default",
        urlbase: config.ScoreboardUrl,
        sync: -1
    },

    components: {
        accordion
    },
})

let plDiff = plToArray(app.playerlist.work);

loadSmashgg();
loadChallonge();
plWorkToPl();
sblinkupdate(); // Updates URL and Link for the Scoreboard

ws.onopen = () => {
    console.log("We are connected!");
    sendName();
}

ws.onerror = (e) => {
    console.log("FAILURE");
    console.log(e);
    if (nossl !== "1") {
        window.location.search = window.location.search + "&nossl=1";
        // Lets Try taht without SSL...
    }
}

ws.onmessage = ({ data }) => {
    console.log(data);
    const sbparse = JSON.parse(data);
    const sbupdate = sbparse.main;

    // Collect user inputs and throw tem at the server

    if (sbparse.meta.type == "update" || sbparse.meta.type == "ulist") {
        sbupdate.type = sbparse.meta.type; // Maybe I should have thought about my data structure better...
        updateScoreboard(sbupdate);
        updateUserList(sbparse.meta.userlist, sbparse.meta.last)
        plCheck(sbparse.main.pl);
    };

    if (sbparse.meta.type == "playerlist") {
        plistbuild(sbparse.meta.playerlist);
        plToWork(sbparse.meta.playerlist);
    };
}

// Send Updated Score to the Server
function sendScore() {
    const meta_data = {
        'name': app.name,
        'type': "update",
        'sbid': app.sbid
    };

    const score_data = {
        'p1name': app.workboard.p1Name,
        'p2name': app.workboard.p2Name,
        'p1score': app.workboard.p1Score,
        'p2score': app.workboard.p2Score,
        'title': app.workboard.title
    };

    const payload = {
        'meta': meta_data,
        'main': score_data,
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

    app.scoreboard.p1Name = data.p1name;
    app.scoreboard.p2Name = data.p2name;
    app.scoreboard.p1Score = data.p1score;
    app.scoreboard.p2Score = data.p2score;
    app.scoreboard.title = data.title;

    sblinkupdate();
    syncCheck();
}

// Update Local Inputs with data from the Local Scoreboard
function syncWorkboard() {
    console.log("Syncing Workboard with Scoreboard")

    app.workboard.p1Name = app.scoreboard.p1Name;
    app.workboard.p2Name = app.scoreboard.p2Name;
    app.workboard.p1Score = app.scoreboard.p1Score;
    app.workboard.p2Score = app.scoreboard.p2Score;
    app.workboard.title = app.scoreboard.title;
    app.sync = 1;
}

function syncCheck() {
    const a = JSON.stringify(app.workboard);
    const b = JSON.stringify(app.scoreboard);


    if (a == b) {
        console.log('Boards are the Same')
        app.sync = 1;
    } else if (app.sync == -1 || app.idleTimer > app.idleThreshhold) {
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
    document.getElementById('serverupdate').checked = app.playerlist.subox;

    console.log("Swapping Sides...");
    [app.workboard.p1Name, app.workboard.p2Name, app.workboard.p1Score, app.workboard.p2Score] = [app.workboard.p2Name, app.workboard.p1Name, app.workboard.p2Score, app.workboard.p1Score];
    sendScore();
};

function clearall() {
    console.log("Clearing");
    app.workboard.p1Name = '';
    app.workboard.p2Name = '';
    app.workboard.p1Score = '0';
    app.workboard.p2Score = '0';
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

// For the Popout Button
//function openwindow(url) {
//    NewWindow = window.open(url, 'newWin', 'width=600,height=301,left=20,top=20,toolbar=No,location=No,scrollbars=no,status=No,resizable=no,fullscreen=No'); NewWindow.focus(); void (0);
//}

//let idleTimer = 0;
//let idleThreshhold = 10;

function activityWatcher() {
    setInterval(function () {
        app.idleTimer++;
        //console.log(idleTimer + ' seconds since the user was last active');
        if (app.idleTimer > app.idleThreshhold && app.sync == 0) {
            console.log('Auto Refreshing');
            syncWorkboard();
        }
    }, 1000);

    // Reset Timer with Actvity
    function activity() {
        app.idleTimer = 0;
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