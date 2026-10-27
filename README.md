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
- firebase ^7.9.1
- youtube-node ^1.3.3
- node-soundcloud 0.0.6
- node-vibrant ^3.0.0

## mod commands for other DJs
- `!remove name` / `!add name` take someone off or put them on the deck
- `!removeafter name` has them step down after their next song; `!dontremove name` cancels it
  (without a name, both work on yourself, as before)

## timing
Song start times (`songToPlay/started`) use the database's clock (`.info/serverTimeOffset`), the same clock firetable-user uses, so every listener's position and timers line up even when this server's clock drifts.

## database rules
`firebase-rules.json` is applied separately (Firebase console → Realtime Database → Rules); updating the bot doesn't change them.
