# Match Overlay
Match overlay is a simple set of scripts to allow for an online, multi user, multi event scoreboard that can be used collaboratively. Also it's a work in progress and a complete mess, internally.

## V2

Guts reworked using vue.js. Older pure js control panel is now in `controls-old/`

## Setup

* Clone the repo, go into server, `npm install ws` to install websockets.
* Make a copy of `config-example.js` and rename it `config.js` in both `server/` and `controls/`. Configure accordingly.
* Go into the server directory and run `node index.js`

Now you're good to go! More details will be added later.
