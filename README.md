# firetable-hostbot
node.js "chatbot" back end for firetable, a virtual music listening room powered by firebase.

pairs with a client side front end ([firetable-user](https://github.com/mxew/firetable-user)).

## install
- `git clone https://github.com/mxew/firetable-hostbot.git`
- cd to created directory and `npm install` to get dependencies
- make copy of .env.example, rename to `.env`, add in your api keys and the bot's firetable login credentials
- `node app.js` to run

## dependencies
- node.js
- dotenv ^8.2.0
- firebase ^3.6.7
- youtube-node ^1.3.0
- node-soundcloud 0.0.6
- node-vibrant ^3.0.0
