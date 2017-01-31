# firetable-hostbot
node.js "chatbot" back end for firetable, a virtual music listening room powered by firebase.

pairs with a client side front end ([firetable-user](https://github.com/mxew/firetable-user)).

## install
- `git clone https://github.com/mxew/firetable-hostbot.git`
- cd to created directory and `npm install` to get dependencies
- make copy of SAMPLEconfig.js, rename to config.js, add in your api keys and the bot's firetable login credentials
- `node app.js` to run

## dependencies
- node.js
- firebase ^3.6.7
- youtube-node ^1.3.0
