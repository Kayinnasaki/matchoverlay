if (localStorage.getItem("suBox") === null) {localStorage.setItem('suBox', "true");}
suBoxCheck();
const plwork = document.getElementById('playerlist');
plwork.value = localStorage.getItem('pl') || "";
plWorkToPl(); // Initialize Player List

let plDiff = plToArray(plwork.value);

loadSmashgg();
loadChallonge();

function plLocalSave() {
    localStorage.setItem('pl', plwork.value);
}

function plLocalLoad() {
    plwork.value = localStorage.getItem('pl');
}

function saveChallonge() {
    localStorage.setItem('chtid', document.getElementById("chtid").value);
    localStorage.setItem('chcid', document.getElementById("chcid").value);
}

function loadChallonge() {
    document.getElementById("chcid").value = localStorage.getItem('chcid');
    document.getElementById("chtid").value = localStorage.getItem('chtid');
}

function saveSmashgg() {
    localStorage.setItem('smashurl', document.getElementById("sggurl").value);
}

function loadSmashgg() {
    document.getElementById("sggurl").value = localStorage.getItem('smashurl');
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
    const pl = plToArray(plwork.value);
    console.log("Updating Player List: " + pl);
    plistbuild(pl);
}

function plToWork(data) {
    plwork.value = plToText(data);
}

function plPush() {
    const meta_data = {
        'name': document.getElementById("username").value,
        'type': "pl",
        'sbid': sbid,
        'pl': plToArray(plwork.value)
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
        console.log("New Playerlist! Update Status? " + document.getElementById('serverupdate').checked);
        if (data !== "" && document.getElementById('serverupdate').checked == true){
            console.log("Conditions met. Updating");
            plDiff = data;
            plWorkToPl(plToWork(data));
        }
    }
}

// Update the List of signed up players
function plistChallonge(){
    const tid = document.getElementById("chtid").value;
    const cid = document.getElementById("chcid").value;
    let id = "";

    if (cid !== "") { id = cid + "-";}
    id = id + tid;

    console.log("Requesting Challonge List: " + id);

    const meta_data = {
        'type': "challonge",
        'tid' : id,
        'sbid': sbid
    };
        
    const payload = {
        'meta': meta_data
    };
    const json_text = JSON.stringify(payload);
    ws.send(json_text);
}

// Update the List of signed up players
function plistSmashgg(){
    const id = document.getElementById("sggurl").value;

    console.log("Requesting Challonge List: " + id);

    const meta_data = {
        'type': "smashgg",
        'tid' : id,
        'sbid': sbid
    };
        
    const payload = {
        'meta': meta_data
    };
    const json_text = JSON.stringify(payload);
    ws.send(json_text);
}

// Actually Build the Lis
function plistbuild(plist){
    document.getElementById("players").innerHTML = ''; // Destroy Data

    plwork.value = plToText(plist);
    plist.forEach(element =>{
        var option = document.createElement("option");
        option.value = element;
        console.log("adding " + element);
        document.getElementById("players").appendChild(option);
    });
}

function suBoxChange() {
    localStorage.setItem('suBox', document.getElementById('serverupdate').checked);
    console.log("Checkbox: " + localStorage.getItem('suBox'));
}

function suBoxCheck() {
    let isTrueSet = (localStorage.getItem('suBox') == 'true');
    document.getElementById('serverupdate').checked = isTrueSet; 
}