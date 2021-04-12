//const plwork = document.getElementById('playerlist');
//plwork.value = localStorage.getItem('pl') || "";
//plWorkToPl(); // Initialize Player List

function plLocalSave() {
    localStorage.setItem('pl', app.playerlist.work);
    console.log(localStorage.getItem('pl'));
}

function plLocalLoad() {
    app.playerlist.work = localStorage.getItem('pl');
    console.log("loading... " + localStorage.getItem('pl'));
    console.log("vue... " + app.playerlist.work);
}

function saveChallonge() {
    localStorage.setItem('chtid', app.playerlist.chtid);
    localStorage.setItem('chcid', app.playerlist.chcid);
}

function loadChallonge() {
    app.playerlist.chcid = localStorage.getItem('chcid');
    app.playerlist.chtid = localStorage.getItem('chtid');
}

function saveSmashgg() {
    localStorage.setItem('smashurl', app.playerlist.smashgg);
}

function loadSmashgg() {
    console.log("aaaaaaaaaaa" + app.playerlist.chtid);
    app.playerlist.smashgg = localStorage.getItem('smashurl') || "";
}

function plToArray(data) {
    console.log(data);
    const pl = data.split("\n");
    return pl;
}

function plToText(data) {
    const pl = data.toString();
    return pl.replaceAll(",", "\n");
}

function plWorkToPl() {
    let pl = [];
    pl = plToArray(app.playerlist.work);
    console.log("Updating Player List: " + pl);
    app.playerlist.players = keyedList(pl);
}

function plToWork(data) {
    app.playerlist.work = plToText(data);
}

function plPush() {
    const meta_data = {
        'name': app.name,
        'type': "pl",
        'sbid': app.sbid,
        'pl': plToArray(app.playerlist.work)
    };
        
    const payload = {
        'meta': meta_data,
    };
    const json_text = JSON.stringify(payload);
    ws.send(json_text);
}

function plCheck(data) {
    if (JSON.stringify(data) == JSON.stringify(plDiff)) {
        console.log("Same Playerlist");
    } else {
        
        if (data !== "" && app.playerlist.subox == true){
            console.log("Conditions met. Updating");
            plDiff = data;
            plWorkToPl(plToWork(data));
        }
    }
}

// Update the List of signed up players
function plistChallonge(){
    const tid = app.playerlist.chtid;
    const cid = app.playerlist.chcid;
    let id = "";

    if (cid !== "") { id = cid + "-";}
    id = id + tid;

    console.log("Requesting Challonge List: " + id);

    const meta_data = {
        'type': "challonge",
        'tid' : id,
        'sbid': app.sbid
    };
        
    const payload = {
        'meta': meta_data
    };
    const json_text = JSON.stringify(payload);
    ws.send(json_text);
}

// Update the List of signed up players
function plistSmashgg(){
    const id = app.playerlist.smashgg;

    console.log("Requesting Challonge List: " + id);

    const meta_data = {
        'type': "smashgg",
        'tid' : id,
        'sbid': app.sbid
    };
        
    const payload = {
        'meta': meta_data
    };
    const json_text = JSON.stringify(payload);
    ws.send(json_text);
}