const schema = require('./schema.json');
const Ajv = require("ajv");
const ajv = new Ajv();
const validate = ajv.compile(schema)

const WebSocket = require("ws");
const fs = require('fs');

// Half of the stuff for getting SSL to work is Cargo Cult Code
const config = require('./config');

let wss = [];
let wss2 = [];

const https = require('https');

if (config.privateKey !== ""){
    console.log("Has Certs: Starting with WSS")
    const privateKey = fs.readFileSync(config.privateKey, 'utf8');
    const certificate = fs.readFileSync(config.certificate, 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    
    // For Score Boards
    let httpsServer = https.createServer(credentials);
    httpsServer.listen(8083);

    let WebSocketServer = require('ws').Server;
    wss2 = new WebSocketServer({
        server: httpsServer
    });

    // For Control Boards
    let httpsServer2 = https.createServer(credentials);
    httpsServer2.listen(8082);

    wss = new WebSocketServer({
        server: httpsServer2
    });
} else {
    console.log("No Certs: Starting with WS")

    wss  = new WebSocket.Server({ port: 8082}); // For Control Boards
    wss2 = new WebSocket.Server({ port: 8083}); // For Score Displays
}


// Default Info
let scoreboard = {};
sbCheck("default");
let lastclient = "";

//Challonge API Info
const apikey  = config.apikey;

// For Controller Connections
wss.on("connection", ws => {
    console.log("New Connection, waiting for introduction");    

    ws.on("message", data => {
        console.log(`Client has sent us: ${data}`);

        try { 
            dataj = JSON.parse(data);
        }
        catch(err) {
            console.log(err)
            console.log("Client Sent non-JSON Data. Terminating Connection");
            ws.close();
            return;
        }

        const valid = validate(dataj)
        if (!valid) {
            console.log(validate.errors)
            console.log("Client Sent Invalid JSON Data. Terminating Connection");
            ws.close();
            return;
        }
        
        const sbidold = ws.sbid;
        const sbid = dataj.meta.sbid
        sbCheck(sbid);
        ws.id = dataj.meta.name;
        ws.sbid = dataj.meta.sbid;     


        //Message Type is a Scoreboard update
        if (dataj.meta.type == "update"){
            scoreboard[sbid].p1name = dataj.main.p1name;
            scoreboard[sbid].p2name = dataj.main.p2name;
            scoreboard[sbid].p1score = dataj.main.p1score;
            scoreboard[sbid].p2score = dataj.main.p2score;
            scoreboard[sbid].title = dataj.main.title;

            ws.id = dataj.meta.name;
            lastclient = ws.id;
            console.log("Package Type: Update")
            console.log(clientlist(sbid));
            // "Update" type packets broadcast userlist and scoreboard info
            wss.broadcast(sbUpdate("update",sbid),sbid);
            wss2.broadcast(sbUpdate("update",sbid),sbid);  
            console.log(scoreboard);
        }

        if (dataj.meta.type == "pl"){
            scoreboard[sbid].pl = dataj.meta.pl;
            console.log("Package Type: Player List")
            console.log(scoreboard[sbid].pl);
            wss.broadcast(sbUpdate("update",sbid),sbid);
        }

        //Rename Request
        if (dataj.meta.type == "rename"){
            console.log("Package Type: Rename")
            // "ulist" type broadcasts only send the userlist.
            wss.broadcast(sbUpdate("ulist",sbid),sbid);
            wss.broadcast(sbUpdate("ulist",sbidold),sbidold); 
        }

        //Challonge Request
        if (dataj.meta.type == "challonge"){
            const tournid = dataj.meta.tid;
            let names = [];
            console.log("Package Type: Challonge, TID: " + tournid);
            //commid + "-" +
            const url = "https://api.challonge.com/v1/tournaments/" + tournid + "/participants.json?api_key=" + apikey;
            console.log(url);
            https.get(url, (resp) => {
                let data = '';
              
                // A chunk of data has been received.
                
                resp.on('data', (chunk) => {
                  data += chunk;
                });
              
                // The whole response has been received. Print out the result.
                resp.on('end', () => {
                    try { 
                        data = JSON.parse(data);
                        names = data.map(r => r.participant.name);
                    }
                    catch(err) {
                        console.log(err)
                        console.log("Challonge Sent Broken Data.");
                        return;
                    }

                    names = names.sort();
                    console.log("sending: " + names);
                    ws.send(plUpdate(names));
                });
              
            }).on("error", (err) => {
                console.log("Error: " + err.message);
            });

        }
        //SmashGG Request
        if (dataj.meta.type == "smashgg"){
            let tournid = dataj.meta.tid;
            let names = [];
            console.log("Package Type: Smash GG, URL: " + tournid);

            const start = "https://api."
            const end = "?expand[]=entrants"

            tournid = tournid.replace("https://", "");
            tournid = tournid.replace("/overview", "");

            const url = start + tournid + end;
            console.log(url);
            https.get(url, (resp) => {
                let data = '';
              
                // A chunk of data has been received.
                
                resp.on('data', (chunk) => {
                  data += chunk;
                });
              
                // The whole response has been received. Print out the result.
                resp.on('end', () => {
                    try {
                        //console.log(data);
                        data = JSON.parse(data);
                        data = data.entities.entrants;
                        names = data.map(r => r.name.split(" | ").pop());
                    }
                    catch(err) {
                        console.log(err)
                        console.log("Smash GG Sent Broken Data.");
                        return;
                    }

                    names = names.sort();
                    console.log("sending: " + names);
                    ws.send(plUpdate(names));
                });
              
            }).on("error", (err) => {
                console.log("Error: " + err.message);
            });
        }
    });

    ws.on("close", () => {
        wss.broadcast(sbUpdate("ulist")); 
        console.log("Client has disconnected!")
    });
});

// For Scoreboards Connections
wss2.on("connection", ws => {
    console.log("New Scoreboard Connection");
    ws.on("message", data => {
        console.log(`Client has sent us: ${data}`);
        console.log("Setting as Scoreboard ID")
        ws.sbid = data;
        wss2.broadcast(sbUpdate("update",ws.sbid),ws.sbid);
    });

    ws.on("close", () => {
        console.log("Scoreboard has disconnected!")
    });
});

function sbCheck(sbid) {
    if (scoreboard.hasOwnProperty(sbid) == false) {
        console.log("Creating Scoreboard");
        scoreboard[sbid] = {p1name:"", p2name:"",p1score:"0", p2score:"0", title:"", pl:""};
        console.log(scoreboard[sbid]);
    }
}

function sbUpdate(data, sbid) {
    let uType = data;
    const meta_data = {
        'userlist': clientlist(sbid),
        'last': lastclient,
        'type': uType
    };

    if (uType == "ulist") {
        meta_data.last = "none";
    };

    const payload = {
        'meta': meta_data,
        'main': scoreboard[sbid]
    };

    return JSON.stringify(payload);
}

function plUpdate(data) {
    const payload = {
        'meta':  {
            'playerlist':data,
            'type': "playerlist" 
        }
    }

    return JSON.stringify(payload);
}

// We virtually always want to send every update to every client.
wss.broadcast = function(data, sbid) {
    wss.clients.forEach(client => {
        // Send Only to Connections on the same Scoreboard ID
        if (client.sbid == sbid){
            client.send(data);
        }
    });
};

wss2.broadcast = function(data, sbid) {
    wss2.clients.forEach(client => {
        // Send Only to Connections on the same Scoreboard ID
        if (client.sbid == sbid){
            client.send(data);
        }
    }); 
};

function clientlist(sbid) {
    let clist = [];
    
    wss.clients.forEach(function each(client) {
        if (client.sbid == sbid) {
            clist.push(client.id);
        }
    });

    return clist;
};