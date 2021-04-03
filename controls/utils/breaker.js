const ws = new WebSocket("wss://"+window.location.hostname+":8082"); // I hate working with SSL
let ulist = [];
let lastopacity = 0; //it's... not actually opacity anynore but let's just go with that
let FullUpdate = 1; //0: Update only the score display. 1: Update score display AND controls
let mousex = 0;

let fulllist = [
    "Akai",
    "Bashe",
    "Beelzebae",
    "Bjorn",
    "Blank",
    "Brent",
    "CWheezy",
    "CaliScrub",
    "Chunks",
    "Code Monkey",
    "CuteDispenser",
    "Dasterin",
    "Dekodere",
    "Ectogasm",
    "FUTT",
    "Grey",
    "Imp Retro",
    "Kayin",
    "Kayladoscopes",
    "Knux",
    "Krackatoa",
    "Licareo",
    "Lofo",
    "Mapachito",
    "Miko",
    "Nanoot",
    "Patito",
    "Princess Kiss",
    "RTW",
    "Roth",
    "Ruby",
    "Ryyudo",
    "Sage",
    "Satchamobob",
    "Sev",
    "Shawn",
    "Shay",
    "Smiler",
    "Sol Arcana",
    "Syd",
    "Taikuando",
    "Theophrastus",
    "Trumpet",
    "TuxJam",
    "Tuxdev",
    "WillGallant",
    "Winter",
    "Zerker",
    "Zwei",
];

plistbuild(fulllist); // Initialize Player List
document.getElementById("username").value = getUniqueID(); //Generate a Unique ID. This will get overwritten either by Local Storage or the Server

function getUniqueID() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }
    return s4() + s4();
};


ws.addEventListener("open", () => {
    console.log("We are connected!");
});


ws.addEventListener("message", ({ data }) => {
    console.log(data);
    const sbparse = JSON.parse(data);
    const sbupdate = sbparse.main;

    // Check to see if there is a name stored in Local Storage. If so, ignore the server giving you a name
    // and send it the stored one.d

    if (sbparse.meta.type == "name"){
        if (localStorage.getItem("name") == null) {
            console.log("Server Renaming me to: " + sbparse.meta.name);
            document.getElementById("username").value = sbparse.meta.name;
        } else {
            console.log("Telling Server Name Is: " + sbparse.meta.name);
            document.getElementById("username").value = localStorage.getItem("name");
                     
            const payload = {
                'meta': {
                    'name': localStorage.getItem("name"),
                    'type': "rename" 
                }
            }

            const json_text = JSON.stringify(payload);
            ws.send(json_text);
        }
    }

    // Collect user inputs and throw tem at the server

    if (sbparse.meta.type == "update" || sbparse.meta.type == "ulist"){
        sbupdate.type = sbparse.meta.type; // Maybe I should have thought about my data structure better...
        console.log(sbupdate);
        refreshScore(sbupdate);
        updateUserList(sbparse.meta.userlist, sbparse.meta.last)
    };

    if (sbparse.meta.type == "playerlist"){plistbuild(sbparse.meta.playerlist);};
});

// Send Updated Score to the Server
function updateScore() {
    const meta_data = {
        'name': document.getElementById("username").value,
        'type': "update"
    };

    const score_data = {
        'p1name': document.getElementById('p1name').value,
        'p2name': document.getElementById('p2name').value,
        'p1score': document.getElementById('p1score').value,
        'p2score': document.getElementById('p2score').value,
        'title': document.getElementById('title').value
    };

    const payload = {
        'meta': meta_data,
        'main': score_data,
    };
    localStorage.setItem('name', document.getElementById("username").value);
    const json_text = JSON.stringify(payload);
    ws.send(json_text);
}

// Update local scoreboard with data from the Server
function refreshScore(data) {
    console.log(data);
    const score = data;

    document.getElementById("p1namebig").innerHTML = score.p1name;
    document.getElementById("p2namebig").innerHTML = score.p2name;

    document.getElementById("p1scorebig").innerHTML = score.p1score;
    document.getElementById("p2scorebig").innerHTML = score.p2score;

    document.getElementById("title").value = score.title;

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
    const score = data;

    document.getElementById("p1name").value = score.p1name;
    document.getElementById("p2name").value = score.p2name;

    document.getElementById("p1score").value = score.p1score;
    document.getElementById("p2score").value = score.p2score;

    document.getElementById("title").value = score.title;
}

// When doing a full update, info is pulled from the 'scoreboard' up top and not the
function syncInputs() {
    document.getElementById("p1name").value = document.getElementById("p1namebig").innerHTML;
    document.getElementById("p2name").value = document.getElementById("p2namebig").innerHTML;

    document.getElementById("p1score").value = document.getElementById("p1scorebig").innerHTML;
    document.getElementById("p2score").value = document.getElementById("p2scorebig").innerHTML;
    document.getElementById("refresh").classList.remove("red");
}

// Update Userlist with serverside information
function updateUserList(uList, uLast) {

    document.getElementById("userlist").innerHTML = ''; // Destroy previous Userlist
    uList.forEach(element => {
        var div = document.createElement("div");
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
        lastopacity = 7;
        lastFadeFunction();
    }
};

// Make the Red Flash fade
function lastFadeFunction() {
    if (lastopacity<187) {
        lastopacity += 15;
        setTimeout(function(){lastFadeFunction()},100);
   }
   document.getElementById('last').style.color = "rgba(187," + lastopacity + "," + lastopacity + ",1)";
};

// Swaps sides for Scores and Names
function swap(){
    var tmp = document.getElementById("p1score").value;
    document.getElementById("p1score").value = document.getElementById("p2score").value;
    document.getElementById("p2score").value = tmp;

    var tmp = document.getElementById("p1name").value;
    document.getElementById("p1name").value = document.getElementById("p2name").value;
    document.getElementById("p2name").value = tmp;
    FullUpdate = 1;
    updateScore()
};


const meta_data = {
    'name': document.getElementById("username").value,
    'type': "update"
};

const score_data = {
    'p1name': document.getElementById('p1name').value,
    'p2name': document.getElementById('p2name').value,
    'p1score': document.getElementById('p1score').value,
    'p2score': document.getElementById('p2score').value,
    'title': document.getElementById('title').value
};

const payload = {
    'meta': meta_data,
    'main': score_data,
};
// Update the List of signed up players
function plistupdate(){
    const id = document.getElementById("tid").value;
    console.log(id);

    // If value says Full, just use the premade list of every player.
    if (id == "full"){
        plistbuild(fulllist);
    } else {
        const meta_data = {
            'type': "challonge",
            'tid' : id
        };
        
        const payload = {
            'meta': meta_data
        };
        const json_text = JSON.stringify(payload);
        ws.send(json_text);
    };
    /* Backup of PHP Method
    } else {
        const url = "challonge.php?id=" + id;
        const response = fetch(url)
        .then(response => response.json())
        .then(data => {
            data = data.sort();
            console.log(data);
            plistbuild(data);
        });
    }*/
}

// Actually Build the Lis
function plistbuild(plist){
    document.getElementById("players").innerHTML = ''; // Destroy Data
    plist.forEach(element =>{
        var option = document.createElement("option");
        option.value = element;
        console.log("adding " + element);
        document.getElementById("players").appendChild(option);
    });
}

function clearall(){
    console.log("Clearing");
    document.getElementById("p1name").value = '';
    document.getElementById("p2name").value = '';
    document.getElementById("p1score").value = '0';
    document.getElementById("p2score").value = '0';
}

//
// Button Scripts
//

// Any of these buttons immedaitely updates everything
document.getElementById("update").addEventListener("click", () => {
    FullUpdate = 1;
    updateScore()
});

document.getElementById("p1score").addEventListener("change", () => {
    FullUpdate = 1;
    updateScore()
});

document.getElementById("p2score").addEventListener("change", () => {
    FullUpdate = 1;
    updateScore()
});

// For the Popout Button
function openwindow(url){
    NewWindow=window.open(url,'newWin','width=500,height=245,left=20,top=20,toolbar=No,location=No,scrollbars=no,status=No,resizable=no,fullscreen=No');  NewWindow.focus(); void(0);  }