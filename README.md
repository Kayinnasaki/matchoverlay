# Match Overlay
Match overlay is a simple set of scripts to allow for an online, multi user, multi event scoreboard that can be used collaboratively. Also it's a work in progress and a complete mess, internally.

## V2

Guts reworked using vue.js. Older pure js control panel is now in `controls-old/`

## Manual Setup

### Node JS Backend

* Clone repo, go into the `server/` directory:
  * `npm install ws` to install websockets.
  * Make a copy of `config-example.js` and rename it `config.js` . Configure accordingly.
  * Run `node index.js` (Use node 14 or higher)

### Web Files

* Copy the contents of `web/` into your webserver's docroot directory.
* IMPORTANT: Be sure to set access controls on the `web/controls/` directory, otherwise anyone will be able to update the scoreboard.
  * We recommend .htpasswd and .htaccess files, to use HTTP Basic Authentication, as long as your webserver supports TLS (which it should!).
    * Directions on how to do this are easily google-able.


## Docker Setup

### Node JS Backend

* `docker build .` in the server directory.
* The resulting image will run (without TLS) as is.

#### TLS Setup

(Currently untested)

* Pass the environment variable `WEBSOCKET_TLS=1` to the container (any value works, as long as it's defined) to enable TLS.
* This requires using Docker bind mounts to allow the container to access your TLS files.
  * These files are placed at (in-container paths):
    * /usr/src/app/node.key
    * /usr/src/app/node.crt
  * Example: docker run --mount 'type=bind,src=/path/to/key,dst=/usr/src/app/node.key' --mount 'type=bind,src=/path/to/cert,dst=/usr/src/app/node.crt'

### Web Frontend

* `docker build .` in the web directory.
* The resulting image requires the following Environment Variables
  * `HTTP_AUTH_USER`
  * `HTTP_AUTH_PASSWORD`
* You can also set `WEBSOCKET_HOST` to the hostname of your Node JS Backend, if it differs from localhost.
* If the Node JS Backend is listening on TLS, set `SERVER_PROTOCOL` to `wss`
* `CONTROL_PORT` (default 8082) and `SCOREBOARD_PORT` (default 8083) can also be set to the appropriate values from your Node JS Backend, if using non-defaults values on that server.
* `SCOREBOARD_URL` should be set to the full URL of your scoreboard page, example: https://kayin.moe/scoreboard

#### TLS Setup

(Currently untested)

* Pass the environment variable `NGINX_TLS=1` to the container (any value works, as long as it's defined) to enable TLS.
* This requires using Docker bind mounts to allow the container to access your TLS files.
  * These files are placed at (in-container paths):
    * /usr/share/nginx/nginx.key
    * /usr/share/nginx/nginx.crt
  * Example: docker run --mount 'type=bind,src=/path/to/key,dst=/usr/share/nginx/nginx.key' --mount 'type=bind,src=/path/to/cert,dst=/usr/share/nginx/nginx.crt'