var firebase = require('firebase');
var YouTube = require('youtube-node');

var youTube = new YouTube();

var config = require('./config');
youTube.setKey(config.youtube.key);
var users = {};
var botid = null;
var started = false;
var queue = [];
theDJ = null;
var table = [];
var playlimit = 2;
ignoreChats = true;
var song = {};
var playDex = 0; //where does the spotlight go? (tracks SEATS not people)

var songTimeout = null;
var configs = {
  apiKey: config.firebase.key,
  authDomain: config.firebase.auth,
  databaseURL: config.firebase.db
};
firebase.initializeApp(configs);

firebase.auth().signInWithEmailAndPassword(config.firetable.username, config.firetable.password).catch(function(error) {
  console.log(error);
});

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    console.log(user.uid);
    botid = user.uid;
    var ref0 = firebase.database().ref("users/" + user.uid + "/status");
    ref0.set(true);
    ref0.onDisconnect().set(false);
    if (!started) {
      var tpeek = firebase.database().ref("table");
      tpeek.once("value").then(function(snapshot) {
        var data = snapshot.val();
        if (data) {
          for (var key in data) {
            if (data.hasOwnProperty(key)) {
              table.push(data[key]);
            }
          }
        } else {
          console.log("no DJS");
        }
        var wpeek = firebase.database().ref("waitlist");
        wpeek.once("value").then(function(snapshot) {
          var data = snapshot.val();
          if (data) {
            for (var key in data) {
              if (data.hasOwnProperty(key)) {
                queue.push(data[key]);
              }
            }
          } else {
            console.log("no waiters");
          }
          var ppeek = firebase.database().ref("playdex");
          wpeek.once("value").then(function(snapshot) {
            var data = snapshot.val();
            if (data) {
              playDex = data;
            }
            var twopeek = firebase.database().ref("songToPlay");
            twopeek.once("value").then(function(snapshot) {
              var data = snapshot.val();
              var nownow = Date.now();
              song = data;
              theDJ = table[playDex];
              var timeSince = nownow - data.started;
              var secSince = Math.floor(timeSince / 1000);
              var timeLeft = data.duration - secSince;
              if (timeLeft <= 0) {
                nextSong();
              } else {
                songTimeout = setTimeout(function() {
                  songTimeout = null;
                  nextSong(); //NEEEEEEXT
                }, timeLeft * 1000);
              }
              updateThings();
              started = true;
            });

          });
        });
      });
    }
  }
});

var uidLookup = function(name) {
  var match = false;
  var usrs = users;
  for (var key in usrs) {
    if (usrs.hasOwnProperty(key)) {
      if (users[key].username) {
        if (users[key].username == name) {
          match = key;
        }
      }
    }
  }
  if (!match && users[name]) match = name;
  return match;
}

var talk = function(txt) {
  var chat = firebase.database().ref("chat");
  var chooto = {
    time: firebase.database.ServerValue.TIMESTAMP,
    id: botid,
    txt: txt
  };
  chat.push(chooto);
};

var updateTable = function() {
  var table2 = firebase.database().ref("table");
  table2.set(table);
};

var updateWaitlist = function() {
  var waitlist2 = firebase.database().ref("waitlist");
  waitlist2.set(queue);
};

var updateLimit = function() {
  var limit2 = firebase.database().ref("playlimit");
  var limitHere = "∞";
  if (queue.length && (table.length >= 4)) {
    limitHere = playlimit;
  }
  limit2.set(limitHere);
};

var updatePlaydex = function() {
  var playdex2 = firebase.database().ref("playdex");
  playdex2.set(playDex);
};

var updateThings = function() {
  updateTable();
  updateWaitlist();
  updatePlaydex();
  updateLimit();
};

var nextSong = function() {
  //we need to remove this song that just played to the bottom of dj's queue
  playDex++; //shift the spotlight to the right
  if (queue.length && (table.length >= 4)) {
    if (theDJ.plays >= playlimit) {
      var foundDJ = removePerson();
      if (foundDJ) {
        //re-add this DJ to waitlist
        //if we didn't find them then I assume they left mid song?idk
        queue.push(theDJ);
      }
      //now, let's fill the empty seat
      var nextUp = queue[0];
      table.push(nextUp);
      queue.shift();
    }
  }
  startSong();
};

var startSong = function() {
  console.log(table.length);
  if (!table.length) {
    console.log("no length");
    var s2p = firebase.database().ref("songToPlay");
    var now = Date.now();
    var songInfo = {
      type: 1,
      cid: 0,
      title: "Is Playing",
      started: now,
      duration: 0,
      artist: "Nothing"
    };
    song = songInfo;
    s2p.set(songInfo);
    updateThings();
    return false;
  }
  maxindex = table.length - 1;
  if (playDex > maxindex) {
    playDex = 0;
  }
  theDJ = table[playDex];
  table[playDex].plays = table[playDex].plays + 1;
  updateThings();
  var qpeek = firebase.database().ref("queues/" + theDJ.id);
  qpeek.once("value").then(function(snapshot) {
    var data = snapshot.val();
    if (data) {
      var nextSongkey = Object.keys(data)[0];
      youTube.getById(data[nextSongkey].cid, function(error, result) {
        if (error) {
          console.log(error);
          //SONG DOES NOT EXIST ON YT
          var removeThis = firebase.database().ref('queues/' + theDJ.id + '/' + nextSongkey);
          removeThis.remove()
            .then(function() {
              console.log("song remove went great.");
            })
            .catch(function(error) {
              console.log("Song Remove failed: " + error.message);
            });
          talk("@" + theDJ.name + " you tried to play a broken song, so I deleted it from your queue. Letting you play whatever is next in your queue instead... Clean up your queue please thanks.");
          setTimeout(function() {
            startSong(); //try again with SAME DJ
          }, 3000);
        } else {
          console.log(result);
          if (!result.items.length) {
            var removeThis = firebase.database().ref('queues/' + theDJ.id + '/' + song.key);
            removeThis.remove()
              .then(function() {
                console.log("song remove went great.");
              })
              .catch(function(error) {
                console.log("Song Remove failed: " + error.message);
              });
            talk("@" + theDJ.name + " you tried to play a broken song, so I deleted it from your queue. Letting you play whatever is next in your queue instead... Clean up your queue please thanks.");
            setTimeout(function() {
              startSong(); //try again with SAME DJ
            }, 3000);
          } else {
            var input = result.items[0].contentDetails.duration;
            var s2p = firebase.database().ref("songToPlay");
            var yargo = data[nextSongkey].name.split(" - ");
            var sartist = yargo[0];
            var stitle = yargo[1];

            var reptms = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
            var hours = 0,
              minutes = 0,
              seconds = 0,
              totalseconds;

            if (reptms.test(input)) {
              var matches = reptms.exec(input);
              if (matches[1]) hours = Number(matches[1]);
              if (matches[2]) minutes = Number(matches[2]);
              if (matches[3]) seconds = Number(matches[3]);
              totalseconds = hours * 3600 + minutes * 60 + seconds;
            }

            if (!stitle) {
              stitle = sartist;
              sartist = "Unknown";
            }
            var now = Date.now();
            var songInfo = {
              type: data[nextSongkey].type,
              cid: data[nextSongkey].cid,
              title: stitle,
              started: now,
              duration: totalseconds,
              artist: sartist,
              djid: theDJ.id,
              key: nextSongkey
            };
            song = songInfo;
            s2p.set(songInfo);
            var removeThis = firebase.database().ref('queues/' + theDJ.id + '/' + song.key);
            removeThis.remove()
              .then(function() {
                console.log("song remove went great.");
                var qref = firebase.database().ref('queues/' + theDJ.id);
                var sname = song.artist + " - " + song.title;
                var songBack = {
                  cid: song.cid,
                  name: sname,
                  type: song.type
                };
                qref.push(songBack);
              })
              .catch(function(error) {
                console.log("Song Remove failed: " + error.message);
              });
            // set the timeout to move forward at end of song
            if (songTimeout != null) {
              clearTimeout(songTimeout);
              songTimeout = null;
            }
            songTimeout = setTimeout(function() {
              songTimeout = null;
              nextSong(); //NEEEEEEXT
            }, totalseconds * 1000);


          }
        }
      });
    } else {
      console.log("no songs in queue... remove this DJ");
      removePerson(theDJ.id);
      nextSong();
      console.log("ok?")
    }
  });
};

var removeMe = function(id) {
  for (var i = 0; i < queue.length; i++) {
    if (queue[i].id == id) {
      queue.splice(i, 1);
      updateWaitlist();
      return true;
    }
  }
  for (var i = 0; i < table.length; i++) {
    if (table[i].id == id) {
      table.splice(i, 1);
      updateTable();
      if (id == theDJ.id) {
        nextSong();
      } else if (i < playDex) {
        //shift spotlight to the left if a dj to the left of it leaves
        playDex = playDex - 1;
        updatePlaydex();
      }
      return true;
    }
  }
  return false;
};

var removePerson = function(id) {
  for (var i = 0; i < table.length; i++) {
    if (table[i].id == id) {
      table.splice(i, 1);
      if (i < playDex) {
        //shift spotlight to the left if a dj to the left of it leaves
        playDex = playDex - 1;
      }
      return true;
    }
  }
  return false;
};

var addCheck = function(id) {
  for (var i = 0; i < queue.length; i++) {
    if (queue[i].id == id) {
      return 1;
    }
  }
  for (var i = 0; i < table.length; i++) {
    if (table[i].id == id) {
      return 2;
    }
  }
  return false;
};

var ref2 = firebase.database().ref("users");
ref2.on('value', function(dataSnapshot) {
  var okdata = dataSnapshot.val();
  users = okdata;
});
var isAlphaNumeric = function(str) {
  var code, i, len;

  for (i = 0, len = str.length; i < len; i++) {
    code = str.charCodeAt(i);
    if (!(code > 47 && code < 58) && // numeric (0-9)
      !(code > 64 && code < 91) && // upper alpha (A-Z)
      !(code > 96 && code < 123)) { // lower alpha (a-z)
      return false;
    }
  }
  return true;
};
var ref = firebase.database().ref("chat");
ref.on('child_added', function(childSnapshot, prevChildKey) {
  var chatData = childSnapshot.val();
  var namebo = chatData.id;
  if (users[chatData.id]) {
    if (users[chatData.id].username) namebo = users[chatData.id].username;
  }
  if (!ignoreChats) {
    console.log(namebo + ": " + chatData.txt);
    var matches = chatData.txt.match(/^(?:[!])(\w+)\s*(.*)/i);
    if (matches && botid !== chatData.id && started) {
      var command = matches[1].toLowerCase();
      var args = matches[2];
      if (command == "addme") {
        var check = addCheck(chatData.id);
        if (!check) {
          var pson = {
            name: namebo,
            id: chatData.id,
            plays: 0
          };
          if (table.length >= 4) {
            // table full. time to be on the waitlist now k
            queue.push(pson);
            talk(namebo + " added to waitlist. Length is now " + queue.length);
            updateWaitlist();
          } else {
            //table has room. add to table directly
            if (table.length == 0) {
              table.push(pson);
              console.log(table);
              playDex = 0;
              startSong();
            } else {
              table.push(pson);
              console.log(table);
              updateTable();
            }
          }
        } else {
          if (check == 1) {
            talk("You are already in the waitlist.");
          } else if (check == 2) {
            talk("You are already on deck.");
          }
        }
      } else if (command == "removeme") {
        var removed = removeMe(chatData.id);
        if (!removed) talk(namebo + ", you aren't even DJing...");
      } else if (command == "skip") {
        if (users[chatData.id].mod || users[chatData.id].supermod || (chatData.id == theDJ.id)) {
          nextSong();
        }
      } else if (command == "remove") {
        if (users[chatData.id].mod || users[chatData.id].supermod) {
          var prsnToRemove = uidLookup(args);
          if (prsnToRemove) {
            var removed = removeMe(prsnToRemove);
            if (!removed) talk("Can not remove " + args + " because they are not on the table or in the waitlist. Thanks.");
          } else {
            talk("who is that");
          }
        }
      } else if (command == "become") {
        if (args) {
          //SO YOU WANNA CHANGE YOUR NAME HUH?
          var testName = uidLookup(args);
          if (testName) {
            talk("Someone has that name already.");
          } else if (!isAlphaNumeric(args)) {
            talk("That is an INVALID NAME!");
          } else {
            var uref = firebase.database().ref("users/" + chatData.id + "/username");
            uref.set(args);
            talk("Ok! Welcome to being " + args + " now.");
          }
        }
      } else if (command == "wait") {
        talk("wait");
      }
    }
  }
});

setTimeout(function() {
  ignoreChats = false;
  console.log("Listening now.");
}, 5000);

setInterval(function() {
  //keep stored chat history at 20 chats.
  console.log("hi");
  var ref = firebase.database().ref("chat");
  ref.once("value").then(function(snapshot) {
    var data = snapshot.val();
    var chats = [];
    for (var key in data) {
      chats.push(key);
    }
    console.log(chats.length);
    if (chats.length > 20) {
      var shave = chats.length - 21;
      for (var i = 0; i <= shave; i++) {
        console.log(chats[i]);
        var removeThis = firebase.database().ref('chat/' + chats[i]);
        removeThis.remove()
          .then(function() {
            console.log("Remove succeeded.")
          })
          .catch(function(error) {
            console.log("Remove failed: " + error.message)
          });
      }
    }
  });
  for (var i = 0; i < table.length; i++) {
    if (!users[table[i].id].status) {
      removeMe(table[i].id);
    }
  }
  for (var i = 0; i < queue.length; i++) {
    if (!users[queue[i].id].status) {
      removeMe(queue[i].id);
    }
  }
}, 5 * 60000);
