require('dotenv').config({
  silent: process.env.NODE_ENV === 'production'
});
var request = require('request');
var firebase = require('firebase');
var YouTube = require('youtube-node');
var Vibrant = require('node-vibrant');
var youTube = new YouTube();
var SC = require('node-soundcloud')

youTube.setKey(process.env.YOUTUBE_KEY);
SC.init({
  id: process.env.SOUNDCLOUD_KEY,
});
var users = {};
var botid = null;
var started = false;
var queue = [];
var removalPending = {};
var queueRef = null;
theDJ = null;
var cardForGrabs = null;
var totalCards = 0;
var cardGen = false;
var colors = {
  color: "#fff",
  txt: "#fff"
};
var robotsDancing = false;
var cardGiftedThisSong = false;
var table = [];
var playlimit = 2;
var thingcopy;
var tagFixData = null;
ignoreChats = true;
var song = null;
var playDex = 0; //where does the spotlight go? (tracks SEATS not people)
var theme = null;
var songTimeout = null;
var adam_last = null;
var songtimer = null;
var cardSpecial = false;

var configs = {
  apiKey: process.env.FIREBASE_KEY,
  authDomain: process.env.FIREBASE_AUTH,
  databaseURL: process.env.FIREBASE_DB
};
firebase.initializeApp(configs);

var avatarset = "set1";
if (process.env.AVATARSET) avatarset = process.env.AVATARSET;

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    botid = user.uid;
    console.log(botid);
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
          ppeek.once("value").then(function(snapshot) {
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
              console.log(queue);
              if (data) {
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

var talk = function(txt, card) {
  var namebo2 = botid;
  if (users[botid]) {
    if (users[botid].username) namebo2 = users[botid].username;
  }
  var chatData = firebase.database().ref("chatData");
  var chatFeed = firebase.database().ref("chatFeed");
  var chooto = {
    time: firebase.database.ServerValue.TIMESTAMP,
    id: botid,
    txt: txt,
    name: namebo2
  };
  if (card) chooto.card = card;
  var chatItem = chatData.push(chooto, function() {
    var feedObj = {
      chatID: chatItem.key
    };
    var feedItem = chatFeed.push(feedObj, function() {
      chatItem.child("feedID").set(feedItem.key);
    });
  });
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

var firelevel = {
  hot: function(id, name) {
    firelevel.fires[id] = true;
    firelevel.storms[id] = false;
    var fires = firelevel.size(firelevel.fires);
    var storms = firelevel.size(firelevel.storms);
    var level = fires - storms;
    console.log(level);
    if (level <= 0) {
      talk(name + " thinks this track is h0t... doesn't seem very hot...");
    } else if (level == 1) {
      talk(name + " thinks this track is h0t! A small fire has started.");
    } else if (level <= 7) {
      talk(name + " thinks this track is h0t! Fire is burnin' :chart_with_upwards_trend:");
    } else {
      talk(name + " thinks this track is h0t! FIRE LEVEL IS OFF THE CHARTS. CHARTS ON FIRE!");
    }
  },
  storm: function(id, name) {
    firelevel.fires[id] = false;
    firelevel.storms[id] = true;
    var fires = firelevel.size(firelevel.fires);
    var storms = firelevel.size(firelevel.storms);
    var level = fires - storms;
    console.log(level);
    if (level >= 4) {
      talk(name + " is trying to put out the DJ's fire... doesn't seem to matter...");
    } else if (level >= 1) {
      talk(name + " is trying to put out the DJ's fire... maybe this track isn't so hot afterall...");
    } else if (level == 0) {
      talk("fire is out. thanks " + name);
    } else if (level == -1) {
      talk("this track has caused a storm to form around " + name + ". hard to start a fire with all this rain...");
    } else if (level >= -5) {
      talk("the storm has expanded with the help of " + name + ". certainly not a h0t track.");
    } else {
      talk(":rotating_light: :warning: SEVERE WEATHER ALERT. STAY FAR AWAY FROM THIS TRACK.");
    }
  },
  clear: function() {
    firelevel.fires = {};
    firelevel.storms = {};
  },
  fires: {},
  storms: {},
  size: function(obj) {
    var size = 0;
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (obj[key]) {
          size++;
        }
      }
    }
    return size;
  }
};

var ytVideoCheck = function(result) {
  var isBroken = false;
  if (result.items[0].contentDetails) {
    if (result.items[0].contentDetails.regionRestriction) {
      if (result.items[0].contentDetails.regionRestriction.allowed) {
        if (result.items[0].contentDetails.regionRestriction.allowed.length) {
          if (!result.items[0].contentDetails.regionRestriction.allowed.includes("US")) {
            //blocked in US.... SKIP!
            isBroken = true;
          } else {
            //not blocked in US...
          }
        }
      }
      if (result.items[0].contentDetails.regionRestriction.blocked) {
        if (result.items[0].contentDetails.regionRestriction.blocked.length) {
          //there's some BLOCKED guys
          if (result.items[0].contentDetails.regionRestriction.blocked.includes("US")) {
            //blocked in US.... SKIP!
            isBroken = true;
          } else {
            //not blocked in US...
          }
        }
      }
    }
  }
  return isBroken;
};

var ytAgeRestrictionCheck = function(result) {
  var isRestricted = false;
  if (result.items[0].contentDetails) {
    if (result.items[0].contentDetails.contentRating) {
      if (result.items[0].contentDetails.contentRating.ytRating) {
        if (result.items[0].contentDetails.contentRating.ytRating == "ytAgeRestricted") {
          isRestricted = true;
        }
      }
    }
  }
  return isRestricted;
};

var newMusicCheck = function(data) {
  var daysAgo;
  var isNew = false;
  var playcount = 0;
  if (data.playcount) playcount = parseInt(data.playcount);
  if (data) {
    var dif = Date.now() - data.postedDate;
    daysAgo = Math.floor(dif / 1000 / 60 / 60 / 24);
    if (daysAgo <= 30 && !playcount) {
      isNew = true;
    }
  }
  return isNew;
};

var updateThings = function() {
  updateTable();
  updateWaitlist();
  updatePlaydex();
  updateLimit();
};

var nextSong = function(noPrevPlay) {
  //we need to remove this song that just played to the bottom of dj's queue
  playDex++; //shift the spotlight to the right
  if (queue.length && theDJ) {
    if (theDJ.removeAfter) {
      removePerson(theDJ.id);
    } else if (theDJ.plays >= playlimit) {
      var foundDJ = removePerson(theDJ.id);
      if (foundDJ && !theDJ.removeAfter) {
        //re-add this DJ to waitlist
        //if we didn't find them then I assume they left mid song?idk
        theDJ.plays = 0;
        queue.push(theDJ);
      }
    }
  } else if (theDJ) {
    if (theDJ.removeAfter) removePerson(theDJ.id);
  }
  startSong(noPrevPlay);
};

var startSong = function(noPrevPlay) {
  console.log(table.length);
  firelevel.clear();
  var danceref = firebase.database().ref("dance");
  danceref.set(false);
  robotsDancing = false;
  cardGiftedThisSong = false;
  if (song && !noPrevPlay) {
    if (song.cid != 0) {
      var newEntry = {
        artist: song.artist,
        title: song.title,
        dj: theDJ.name,
        djid: theDJ.id,
        type: song.type,
        duration: song.duration,
        url: song.url,
        cid: song.cid,
        colors: colors,
        when: song.started,
        postedDate: song.postedDate,
        img: song.image
      };
      if (song.adamid) newEntry.adamid = song.adamid;
      if (song.playcount) newEntry.playcount = song.playcount;
      var recentz = firebase.database().ref("songHistory");
      recentz.push(newEntry);
      recentz.once("value", function(snapshot) {
        var rdata = snapshot.val();
        var allRecents = [];
        for (var okey in rdata) {
          if (rdata.hasOwnProperty(okey)) {
            allRecents.push(okey);
          }
        }
        if (allRecents.length > 500) {
          var shave = allRecents.length - 500;
          for (var ayy = 0; ayy < shave; ayy++) {
            recentz.child(allRecents[ayy]).remove();
          }
        }
      });
      var isNew = newMusicCheck(newEntry);
      if (isNew) {
        // NEW MUSIC
        var newMusic = firebase.database().ref("newMusic");
        newMusic.push(newEntry);
        newMusic.once("value", function(snapshot) {
          var rdata = snapshot.val();
          var allNew = [];
          for (var okey in rdata) {
            if (rdata.hasOwnProperty(okey)) {
              allNew.push(okey);
            }
          }
          if (allNew.length > 100) {
            var shave = allNew.length - 100;
            for (var ayy = 0; ayy < shave; ayy++) {
              newMusic.child(allNew[ayy]).remove();
            }
          }
        });
      }
    }
  }
  if (songtimer != null) {
    clearTimeout(songtimer);
    songtimer = null;
  }
  if (!table.length) {
    console.log("no length");
    var s2p = firebase.database().ref("songToPlay");
    var now = Date.now();
    var songInfo = {
      type: 1,
      cid: 0,
      title: "Nothing Is Playing",
      started: now,
      url: null,
      duration: 0,
      image: "img/idlogo.png",
      artist: "You could (should) queue something!"
    };
    song = songInfo;
    s2p.set(songInfo);
    var clrs = "#fff";
    var textcol = "#fff";
    var colref = firebase.database().ref("colors");
    var thecolors = {
      color: clrs,
      txt: textcol
    };
    colref.set(thecolors);
    colors = thecolors;
    updateThings();
    if (process.env.AUTODJ) {
      var namebo2 = botid;
      if (users[botid]) {
        if (users[botid].username) namebo2 = users[botid].username;
      }
      var check = addCheck(botid);
      if (!check) {
        var pson = {
          name: namebo2,
          id: botid,
          plays: 0
        };
        if (table.length >= 4) {
          // table full. time to be on the waitlist now k
          queue.push(pson);
          talk(namebo2 + " (that's me) added to waitlist. Length is now " + queue.length);
          updateWaitlist();
          updateLimit();
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
            updateLimit();
          }
        }
      } else {
        if (check == 1) {
          talk("I am already in the waitlist.");
        } else if (check == 2) {
          talk("I am already on deck.");
        }
      }
    }
    return false;
  };
  maxindex = table.length - 1;
  if (playDex > maxindex) {
    playDex = 0;
  }
  theDJ = table[playDex];
  table[playDex].plays = table[playDex].plays + 1;
  updateThings();
  if (users[theDJ.id].selectedList) {
    if (users[theDJ.id].selectedList == "0") {
      queueRef = firebase.database().ref("queues/" + theDJ.id);
    } else {
      queueRef = firebase.database().ref("playlists/" + theDJ.id + "/" + users[theDJ.id].selectedList + "/list");
    }
  } else {
    queueRef = firebase.database().ref("queues/" + theDJ.id);
  }

  queueRef.once("value").then(function(snapshot) {
    var data = snapshot.val();
    var goodTrack = null;
    for (var key in data) {
      if (data[key]) {
        if (!data[key].flagged) {
          goodTrack = key;
          break;
        }
      }
    }
    if (goodTrack) {
      var nextSongkey = goodTrack;
      if (data[nextSongkey].type == 1) {
        youTube.getById(data[nextSongkey].cid, function(error, result) {
          if (error || !result.items) {
            console.log(error);
            //SONG DOES NOT EXIST ON YT
            var removeThis = queueRef.child(nextSongkey);
            removeThis.remove()
              .then(function() {
                console.log("song remove went great.");
                var songBack = {
                  cid: data[nextSongkey].cid,
                  name: data[nextSongkey].name,
                  type: data[nextSongkey].type,
                  flagged: {
                    date: Date.now(),
                    code: 1
                  }
                };
                queueRef.push(songBack);
              })
              .catch(function(error) {
                console.log("Song Remove failed: " + error.message);
              });
            if (theDJ.id !== botid) talk("@" + theDJ.name + " you tried to play a broken song. Letting you play whatever is next in your queue instead... Clean up your queue please thanks.");
            setTimeout(function() {
              startSong(true); //try again with SAME DJ
            }, 3000);
          } else {
            console.log(result);
            if (!result.items.length) {
              var removeThis = queueRef.child(nextSongkey);
              removeThis.remove()
                .then(function() {
                  console.log("song remove went great.");
                  var songBack = {
                    cid: data[nextSongkey].cid,
                    name: data[nextSongkey].name,
                    type: data[nextSongkey].type,
                    flagged: {
                      date: Date.now(),
                      code: 2
                    }
                  };
                  queueRef.push(songBack);
                })
                .catch(function(error) {
                  console.log("Song Remove failed: " + error.message);
                });
              if (theDJ.id !== botid) talk("@" + theDJ.name + " you tried to play a broken song. Letting you play whatever is next in your queue instead... Clean up your queue please thanks.");
              setTimeout(function() {
                startSong(true); //try again with SAME DJ
              }, 3000);
            } else if (ytVideoCheck(result)) {
              var removeThis = queueRef.child(nextSongkey);
              removeThis.remove()
                .then(function() {
                  console.log("song remove went great.");
                  var songBack = {
                    cid: data[nextSongkey].cid,
                    name: data[nextSongkey].name,
                    type: data[nextSongkey].type,
                    flagged: {
                      date: Date.now(),
                      code: 3
                    }
                  };
                  queueRef.push(songBack);
                })
                .catch(function(error) {
                  console.log("Song Remove failed: " + error.message);
                });
              if (theDJ.id !== botid)
                if (theDJ.id !== botid) talk("Hey @" + theDJ.name + ", looks like https://www.youtube.com/watch?v=" + data[nextSongkey].cid + " is blocked in the US. Letting you play whatever is next in your queue instead.");
              setTimeout(function() {
                startSong(true); //try again with SAME DJ
              }, 3000);
            } else if (ytAgeRestrictionCheck(result)) {
              var removeThis = queueRef.child(nextSongkey);
              removeThis.remove()
                .then(function() {
                  console.log("song remove went great.");
                  var songBack = {
                    cid: data[nextSongkey].cid,
                    name: data[nextSongkey].name,
                    type: data[nextSongkey].type,
                    flagged: {
                      date: Date.now(),
                      code: 7
                    }
                  };
                  queueRef.push(songBack);
                })
                .catch(function(error) {
                  console.log("Song Remove failed: " + error.message);
                });
              if (theDJ.id !== botid) talk("Hey @" + theDJ.name + ", looks like https://www.youtube.com/watch?v=" + data[nextSongkey].cid + " is age restricted and can't be played outside of Youtube.com. Letting you play whatever is next in your queue instead.");
              setTimeout(function() {
                startSong(true); //try again with SAME DJ
              }, 3000);
            } else {

              var s2p = firebase.database().ref("songToPlay");
              var yargo = data[nextSongkey].name.split(" - ");
              var sartist = yargo[0];
              var stitle = yargo[1];


              var input = result.items[0].contentDetails.duration;

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
              } else {
                totalseconds = 10 * 60;
              }

              lastfm.duration = totalseconds;
              lastfm.songStart = Math.floor((new Date()).getTime() / 1000);
              if (songtimer != null) {
                clearTimeout(songtimer);
                songtimer = null;
              }
              songtimer = setTimeout(function() {
                songtimer = null;
                if (lastfm.key) lastfm.scrobble();
              }, (totalseconds * 1000) - 3000);
              if (!stitle) {
                stitle = sartist;
                if (result.items[0].snippet.channelTitle == "Various Artists - Topic") { // this youtube channel name is a lie...
                  sartist = "Unknown";
                } else {
                  sartist = result.items[0].snippet.channelTitle.replace(" - Topic", "");
                }
              } else if (sartist == "Unknown") {
                sartist = result.items[0].snippet.channelTitle.replace(" - Topic", "");
              }
              var thedate = new Date(result.items[0].snippet.publishedAt);
              var postedDate = thedate.getTime();
              var now = Date.now();
              var songInfo = {
                type: data[nextSongkey].type,
                cid: data[nextSongkey].cid,
                title: stitle,
                started: now,
                duration: totalseconds,
                url: "https://www.youtube.com/watch?v=" + data[nextSongkey].cid,
                artist: sartist,
                image: result.items[0].snippet.thumbnails.medium.url,
                djid: theDJ.id,
                postedDate: postedDate,
                djname: theDJ.name,
                key: nextSongkey
              };
              var clrs = "#fff";
              var textcol = "#fff";
              var moreColors = {};
              var colref = firebase.database().ref("colors");
              if (!songInfo.image) {
                songInfo.image = "img/idlogo.png";
                var clrs1 = {
                  color: clrs,
                  txt: textcol
                };
                colref.set(clrs1);
                colors = clrs1;
              } else {
                Vibrant.from(songInfo.image).getPalette(function(err, palette) {
                  // console.log(palette);
                  if (palette.Vibrant) {
                    clrs = palette.Vibrant.getHex();
                    textcol = palette.Vibrant.getBodyTextColor();
                  }
                  if (palette.LightVibrant) {
                    moreColors.lightVibrant = {
                      color: palette.LightVibrant.getHex(),
                      txt: palette.LightVibrant.getBodyTextColor()
                    };
                  }
                  if (palette.DarkVibrant) {
                    moreColors.darkVibrant = {
                      color: palette.DarkVibrant.getHex(),
                      txt: palette.DarkVibrant.getBodyTextColor()
                    };
                  }
                  if (palette.Muted) {
                    moreColors.muted = {
                      color: palette.Muted.getHex(),
                      txt: palette.Muted.getBodyTextColor()
                    };
                  }
                  if (palette.LightMuted) {
                    moreColors.lightMuted = {
                      color: palette.LightMuted.getHex(),
                      txt: palette.LightMuted.getBodyTextColor()
                    };
                  }
                  if (palette.DarkMuted) {
                    moreColors.darkMuted = {
                      color: palette.DarkMuted.getHex(),
                      txt: palette.DarkMuted.getBodyTextColor()
                    };
                  }

                  var thecolors = {
                    color: clrs,
                    txt: textcol,
                    altColors: moreColors
                  };
                  colref.set(thecolors);
                  colors = thecolors;
                });
              }
              song = songInfo;
              s2p.set(songInfo);
              if (lastfm.key) lastfm.nowPlaying();

              var removeThis = queueRef.child(song.key);
              removeThis.remove()
                .then(function() {
                  console.log("song remove went great.");
                  var sname = song.artist + " - " + song.title;
                  var songBack = {
                    cid: song.cid,
                    name: sname,
                    type: song.type
                  };
                  queueRef.push(songBack);
                  gts.np();
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

      } else if (data[nextSongkey].type == 2) {
        /*
begin sc check
        */
        request('https://api-widget.soundcloud.com/resolve?url=https%3A//api.soundcloud.com/tracks/' + data[nextSongkey].cid + '&format=json&client_id=LBCcHmRB8XSStWL6wKH2HPACspQlXg2P', function cbfunc(error, response, body) {
          //If call returned correctly, continue
          if (!error && response.statusCode == 200) {
            var tracks = [JSON.parse(body)];
            console.log(tracks);
            if (tracks) {
              if (tracks.length) {
                //exists!
                console.log(tracks[0]);
                var totalseconds = Math.floor(tracks[0].duration / 1000);
                lastfm.duration = totalseconds;
                lastfm.songStart = Math.floor((new Date()).getTime() / 1000);
                if (songtimer != null) {
                  clearTimeout(songtimer);
                  songtimer = null;
                }
                songtimer = setTimeout(function() {
                  songtimer = null;
                  if (lastfm.key) lastfm.scrobble();
                }, (totalseconds * 1000) - 3000);
                var s2p = firebase.database().ref("songToPlay");
                var yargo = data[nextSongkey].name.toString().split(" - ");
                var sartist = yargo[0];
                var stitle = yargo[1];

                if (sartist == "Unknown" && !stitle) {
                  var cutetags = tracks[0].title.toString().split(" - ");
                  var sartist = cutetags[0];
                  var stitle = cutetags[1];
                }

                if (!stitle) {
                  stitle = sartist;
                  sartist = tracks[0].user.username;
                }
                if (sartist == "Unknown") sartist = tracks[0].user.username;
                var thedate = new Date(tracks[0].created_at);
                var postedDate = thedate.getTime();
                var now = Date.now();
                var songInfo = {
                  type: data[nextSongkey].type,
                  cid: data[nextSongkey].cid,
                  title: stitle,
                  started: now,
                  url: tracks[0].permalink_url,
                  duration: totalseconds,
                  artist: sartist,
                  image: tracks[0].artwork_url,
                  postedDate: postedDate,
                  djid: theDJ.id,
                  djname: theDJ.name,
                  key: nextSongkey
                };
                var colref = firebase.database().ref("colors");
                var clrs = "#fff";
                var textcol = "#fff";
                var moreColors = {};
                var colref = firebase.database().ref("colors");
                if (!songInfo.image) {
                  songInfo.image = "img/idlogo.png";
                  var clrs1 = {
                    color: clrs,
                    txt: textcol
                  };
                  colref.set(clrs1);
                  colors = clrs1;
                } else {
                  Vibrant.from(songInfo.image).getPalette(function(err, palette) {
                    console.log(palette);
                    if (palette.Vibrant) {
                      clrs = palette.Vibrant.getHex();
                      textcol = palette.Vibrant.getBodyTextColor();
                    }
                    if (palette.LightVibrant) {
                      moreColors.lightVibrant = {
                        color: palette.LightVibrant.getHex(),
                        txt: palette.LightVibrant.getBodyTextColor()
                      };
                    }
                    if (palette.DarkVibrant) {
                      moreColors.darkVibrant = {
                        color: palette.DarkVibrant.getHex(),
                        txt: palette.DarkVibrant.getBodyTextColor()
                      };
                    }
                    if (palette.Muted) {
                      moreColors.muted = {
                        color: palette.Muted.getHex(),
                        txt: palette.Muted.getBodyTextColor()
                      };
                    }
                    if (palette.LightMuted) {
                      moreColors.lightMuted = {
                        color: palette.LightMuted.getHex(),
                        txt: palette.LightMuted.getBodyTextColor()
                      };
                    }
                    if (palette.DarkMuted) {
                      moreColors.darkMuted = {
                        color: palette.DarkMuted.getHex(),
                        txt: palette.DarkMuted.getBodyTextColor()
                      };
                    }
                    var thecolors = {
                      color: clrs,
                      txt: textcol,
                      altColors: moreColors
                    };
                    colref.set(thecolors);
                    colors = thecolors;
                  });
                }
                song = songInfo;
                s2p.set(songInfo);
                if (lastfm.key) lastfm.nowPlaying();

                var removeThis = queueRef.child(song.key);
                removeThis.remove()
                  .then(function() {
                    console.log("song remove went great.");
                    var sname = song.artist + " - " + song.title;
                    var songBack = {
                      cid: song.cid,
                      name: sname,
                      type: song.type
                    };
                    queueRef.push(songBack);
                    gts.np();
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
              } else {
                //does not exist
                var removeThis = queueRef.child(nextSongkey);
                removeThis.remove()
                  .then(function() {
                    console.log("song remove went great.");
                    var songBack = {
                      cid: data[nextSongkey].cid,
                      name: data[nextSongkey].name,
                      type: data[nextSongkey].type,
                      flagged: {
                        date: Date.now(),
                        code: 4
                      }
                    };
                    queueRef.push(songBack);
                  })
                  .catch(function(error) {
                    console.log("Song Remove failed: " + error.message);
                  });
                if (theDJ.id !== botid) talk("@" + theDJ.name + " you tried to play a broken song. Letting you play whatever is next in your queue instead... Clean up your queue please thanks.");
                setTimeout(function() {
                  startSong(true); //try again with SAME DJ
                }, 3000);
              }
            } else {
              //does not exist
              var removeThis = queueRef.child(nextSongkey);
              removeThis.remove()
                .then(function() {
                  console.log("song remove went great.");
                  var songBack = {
                    cid: data[nextSongkey].cid,
                    name: data[nextSongkey].name,
                    type: data[nextSongkey].type,
                    flagged: {
                      date: Date.now(),
                      code: 5
                    }
                  };
                  queueRef.push(songBack);
                })
                .catch(function(error) {
                  console.log("Song Remove failed: " + error.message);
                });
              if (theDJ.id !== botid) talk("@" + theDJ.name + " you tried to play a broken song. Letting you play whatever is next in your queue instead... Clean up your queue please thanks.");
              setTimeout(function() {
                startSong(true); //try again with SAME DJ
              }, 3000);
            }
          } else {
            // ERROR
            //does not exist
            var removeThis = queueRef.child(nextSongkey);
            removeThis.remove()
              .then(function() {
                console.log("song remove went great.");
                var songBack = {
                  cid: data[nextSongkey].cid,
                  name: data[nextSongkey].name,
                  type: data[nextSongkey].type,
                  flagged: {
                    date: Date.now(),
                    code: 5
                  }
                };
                queueRef.push(songBack);
              })
              .catch(function(error) {
                console.log("Song Remove failed: " + error.message);
              });
            if (theDJ.id !== botid) talk("@" + theDJ.name + " you tried to play a broken song. Letting you play whatever is next in your queue instead... There might also be a Soundcloud api issue right now...");
            setTimeout(function() {
              startSong(true); //try again with SAME DJ
            }, 3000);
          }
        });
        /*
end sc check
        */
      }

    } else {
      console.log("no songs in queue... remove this DJ");
      removePerson(theDJ.id);
      nextSong(true);
      console.log("ok?")
    }
  });
};

var printCard = function(userid) {
  if (cardGen) return;
  cardGen = userid;
  var now = Date.now();
  var cardCount = firebase.database().ref("cardCount");
  cardCount.once("value").then(function(snapshot) {
    var cdata = snapshot.val();
    if (!cdata) {
      //no cards yet
      totalCards = 1;
      cardCount.set(1);
    } else {
      totalCards = cdata + 1;
      cardCount.set(totalCards);
    }
    var thenum = Math.floor(Math.random() * 9) + 1;
    var tempWeighter = Math.floor(Math.random() * 100) + 1;
    var max;
    var min;
    if (tempWeighter <= 75) {
      max = 130;
      min = 110;
    } else if (tempWeighter <= 95) {
      max = 230;
      min = 131;
    } else {
      min = 231;
      max = 420;
    }
    var thetemp = Math.floor(Math.random() * (max - min)) + min;
    var cardData = {
      djname: theDJ.name,
      djid: theDJ.id,
      cid: song.cid,
      num: thenum,
      temp: thetemp,
      colors: colors,
      cardnum: totalCards,
      title: song.title,
      artist: song.artist,
      image: song.image,
      set: avatarset,
      date: now,
      special: cardSpecial,
      owner: false
    };

    var ref = firebase.database().ref("cards");
    var cuteCard = ref.push(cardData, function() {
      cardForGrabs = cuteCard.key;
      talk("A new trading card has been printed. Type !grab to grab it for yourself!");
    });
  });



};

var giveCard = function(id, name) {
  if (!cardForGrabs) return;
  var cardid = cardForGrabs;
  cardForGrabs = null;
  var ref = firebase.database().ref("cards/" + cardid + "/owner");
  ref.set(id);
  talk("good job @" + name + " you got the card.", cardid);
};

var themevote = {
  active: false,
  params: null,
  go: function(txt, name) {
    themevote.active = true;
    var requiredVotes = 4;
    talk("@everyone " + name + " wants to change the theme to '" + txt + "'. Needs " + requiredVotes + " vote(s) to change. Say 1 to vote yes.");
    themevote.params = {
      votes: {},
      guy: name,
      required: requiredVotes,
      votingfor: txt
    };
    setTimeout(function() {
      themevote.end();
    }, 60 * 1000);
  },
  size: function(obj) {
    var size = 0;
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) size++;
    }
    return size;
  },
  end: function() {
    var votes = themevote.size(themevote.params.votes);

    if (votes >= themevote.params.required) {
      setTheme(themevote.params.votingfor);
      talk(votes + " vote(s). The theme is now " + theme + "!");
    } else if (theme) {
      talk("Sorry. We're staying with " + theme + ".");
    } else {
      talk("Sorry. Not enough votes to set theme.");
    }

    themevote.params = null;
    themevote.active = false;
  }
};

var setTheme = function(themeIdea) {
  theme = themeIdea;
  var ref = firebase.database().ref("theme");
  ref.set(theme);
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
      if (queue.length) {
        //now, let's fill the empty seat
        var nextUp = queue[0];
        table.push(nextUp);
        queue.shift();
        updateWaitlist();
      }
      updateTable();

      if (i <= playDex) {
        //shift spotlight to the left if a dj to the left of it leaves
        playDex = playDex - 1;
        updatePlaydex();
      }
      if (id == theDJ.id) {
        nextSong();
      }
      return true;
    }
  }
  return false;
};

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

var removePerson = function(id) {
  for (var i = 0; i < table.length; i++) {
    if (table[i].id == id) {
      table.splice(i, 1);
      if (queue.length) {
        //now, let's fill the empty seat
        var nextUp = queue[0];
        table.push(nextUp);
        queue.shift();
      }
      if (i < playDex && i != 3) {
        //shift spotlight to the left if a dj to the left of it leaves
        playDex = playDex - 1;

      }
      return true;
    }
  }
  return false;
};

var addCheck = function(id, hereCheck) {
  if (!users[id].status && hereCheck) return 3;
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
  if (botid) {
    if (!okdata[botid].status) {
      var statusref = firebase.database().ref("users/" + botid + "/status");
      statusref.set(true);
    }
  }
});

var refCardSpecial = firebase.database().ref("cardSpecial");
refCardSpecial.on('value', function(dataSnapshot) {
  var resultActual = dataSnapshot.val();
  if (resultActual) {
    cardSpecial = resultActual;
  } else {
    cardSpecial = false;
  }
});

var themepeek = firebase.database().ref("theme");
themepeek.once("value").then(function(snapshot) {
  var data = snapshot.val();
  if (!data) {
    theme = null;
  } else {
    theme = data;
  }
});

var lookupChatData = function(chatID, callback) {
  var chatData = firebase.database().ref("chatData/" + chatID);
  chatData.once('value')
    .then(function(snap) {
      var data = snap.val();
      return callback(data);
    });
};

var ref = firebase.database().ref("chatFeed");
ref.on('child_added', function(childSnapshot, prevChildKey) {
  var feedData = childSnapshot.val();
  var chatID = feedData.chatID;
  if (!ignoreChats) {
    lookupChatData(chatID, function(chatData) {
      var namebo = chatData.id;
      if (users[chatData.id]) {
        if (users[chatData.id].username) namebo = users[chatData.id].username;
      }
      console.log(namebo + ": " + chatData.txt);
      var matches = chatData.txt.match(/^(?:[!])(\w+)\s*(.*)/i);
      if (matches && botid !== chatData.id && started) {
        var command = matches[1].toLowerCase();
        var args = matches[2];
        console.log("COMMAND:", command);
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
              updateLimit();
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
                updateLimit();
              }
            }

            if (process.env.AUTODJ) {
              if (addCheck(botid) && table.length > 3) {
                if (addCheck(botid) == 1) {
                  //user in waitlist
                  for (var i = 0; i < queue.length; i++) {
                    if (queue[i].id == botid) {
                      queue[i].removeAfter = true;
                      updateWaitlist();
                      break;
                    }
                  }
                } else if (addCheck(botid) == 2) {
                  //user on deck
                  if (botid == theDJ.id) {
                    // user is current dj
                    theDJ.removeAfter = true;
                  } else {
                    // user is not current dj
                  }
                  for (var i = 0; i < table.length; i++) {
                    if (table[i].id == botid) {
                      table[i].removeAfter = true
                      updateTable();
                      break;
                    }
                  }
                }
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
        } else if (command == "removemeafter" || command == "removeafter" || command == "gottacatchmybus") {
          var check = addCheck(chatData.id);
          if (!check) {
            talk(namebo + ", you aren't even DJing...");
          } else if (check == 1) {
            //user in waitlist
            for (var i = 0; i < queue.length; i++) {
              if (queue[i].id == chatData.id) {
                queue[i].removeAfter = true;
                updateWaitlist();
                talk(namebo + ", I'll remove you after your next song.");
                break;
              }
            }
          } else if (check == 2) {
            //user on deck
            if (chatData.id == theDJ.id) {
              // user is current dj
              talk(namebo + ", I'll remove you at the end of this song.");
              theDJ.removeAfter = true;
            } else {
              // user is not current dj
              talk(namebo + ", I'll remove you after your next song.");
            }
            for (var i = 0; i < table.length; i++) {
              if (table[i].id == chatData.id) {
                table[i].removeAfter = true
                updateTable();
                break;
              }
            }
          }
        } else if (command == "dontremovemeafter" || command == "dontremoveafter" || command == "dontremoveme" || command == "dontremove") {
          var check = addCheck(chatData.id);
          if (!check) {
            talk(namebo + ", you aren't even DJing...");
          } else if (check == 1) {
            //user in waitlist
            for (var i = 0; i < queue.length; i++) {
              if (queue[i].id == chatData.id) {
                queue[i].removeAfter = false;
                updateWaitlist();
                talk(namebo + ", I will be sure to not remove you after your next track.");
                break;
              }
            }
          } else if (check == 2) {
            //user on deck
            if (chatData.id == theDJ.id) {
              // user is current dj
              talk(namebo + ", I will NOT remove you after this song.");
              theDJ.removeAfter = false;
            } else {
              // user is not current dj
              talk(namebo + ", I will NOT remove you after your next song.");
            }
            for (var i = 0; i < table.length; i++) {
              if (table[i].id == chatData.id) {
                table[i].removeAfter = false;
                updateTable();
                break;
              }
            }
          }
        } else if (command == "skip") {
          if (users[chatData.id].mod || users[chatData.id].supermod || (chatData.id == theDJ.id)) {
            nextSong();
          }
        } else if (command == "theme") {
          if (theme) {
            talk("The current theme is: " + theme);
          } else {
            talk("There is no theme at the moment. `!suggest` one if you'd like.")
          }
        } else if (command == "suggest") {
          if (!themevote.active) {
            themevote.go(args, namebo);
          } else {
            talk("We are already voting for " + themevote.params.votingfor + ". Let's wait for that to finish first.");
          }
        } else if (command == "settheme") {
          if (users[chatData.id].supermod) {
            if (args == "none") {
              setTheme(null);
              talk("There is no theme.");
            } else {
              setTheme(args);
              talk("Theme has been set to: " + args);
            }
          } else {
            talk("i will absolutely not do that " + namebo);
          }
        } else if (command == "printcard") {
          if (users[chatData.id].supermod) {
            printCard();
          } else {
            talk("i will absolutely not do that " + namebo);
          }
        } else if (command == "giftcard") {
          if (chatData.card && theDJ) {
            var ccref = firebase.database().ref("cards/" + chatData.card + "/owner");
            ccref.set(theDJ.id);
            talk(":white_check_mark: Card has been transfered from " + namebo + " to @" + theDJ.name);
            if (chatData.id !== theDJ.id) cardGiftedThisSong = true;
          }
        } else if (command == "grab") {
          if (cardForGrabs) giveCard(chatData.id, namebo);
        } else if (command == "upbot") {
          if (users[chatData.id].mod || users[chatData.id].supermod) {
            var namebo2 = botid;
            if (users[botid]) {
              if (users[botid].username) namebo2 = users[botid].username;
            }
            var check = addCheck(botid);
            if (!check) {
              var pson = {
                name: namebo2,
                id: botid,
                plays: 0
              };
              if (table.length >= 4) {
                // table full. time to be on the waitlist now k
                queue.push(pson);
                talk(namebo2 + " (that's me) added to waitlist. Length is now " + queue.length);
                updateWaitlist();
                updateLimit();
              } else {
                //table has room. add to table directly
                talk("OK! I will DJ.");
                if (table.length == 0) {
                  table.push(pson);
                  console.log(table);
                  playDex = 0;
                  startSong();
                } else {
                  table.push(pson);
                  console.log(table);
                  updateTable();
                  updateLimit();
                }
              }
            } else {
              if (check == 1) {
                talk("I am already in the waitlist.");
              } else if (check == 2) {
                talk("I am already on deck.");
              }
            }

          }
        } else if (command == "downbot") {
          if (users[chatData.id].mod || users[chatData.id].supermod) {
            var removed = removeMe(botid);
            if (!removed) {
              talk(namebo + ", I am not even DJing...");
            } else {
              talk("OK! I will not DJ.");
            }
          }
        } else if (command == "screen" || command == "screendown") {
          if (users[chatData.id].mod || users[chatData.id].supermod) {
            talk("activating the screen.");
            var thescreen = firebase.database().ref("thescreen");
            thescreen.set(true);
          }
        } else if (command == "killscreen" || command == "screenup") {
          if (users[chatData.id].mod || users[chatData.id].supermod) {
            talk("ok.");
            var thescreen = firebase.database().ref("thescreen");
            thescreen.set(false)
          }

        } else if (command == "flag") {
          if (users[chatData.id].mod || users[chatData.id].supermod) {
            // do the flag thing
            var code = false;
            if (args == "broken" || args == "8") {
              code = 8;
            } else if (args == "bitrate" || args == "quality" || args == "incomplete" || args == "9") {
              code = 9;
            } else if (args == "offtheme" || args == "10") {
              code = 10;
            }

            if (song.cid && queueRef) {
              if (code) {
                var flag = {
                  date: Date.now(),
                  code: code
                };
                queueRef.orderByChild('cid').equalTo(song.cid).once("value")
                  .then(function(snapshot) {
                    var data = snapshot.val();
                    if (data) {
                      for (var key in data) {
                        if (data[key].type == song.type) {
                          newData = data[key];
                          newData.flagged = flag;
                          queueRef.child(key).set(newData);
                        }
                      }
                    }
                    talk(":triangular_flag_on_post: FLAGGED (CODE " + code + ")");
                  });
              } else {
                talk("Please specify a valid flag reason (ex: !flag broken, !flag offtheme, !flag quality)");
              }
            } else {
              talk("I just reloaded... I don't remember where in the DJ's lists I got this from.");
            }
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
        } else if (command == "add") {
          if (users[chatData.id].mod || users[chatData.id].supermod) {
            var prsnToAdd = uidLookup(args);
            if (prsnToAdd) {
              var check = addCheck(prsnToAdd, true);
              if (!check) {
                var pson = {
                  name: users[prsnToAdd].username,
                  id: prsnToAdd,
                  plays: 0
                };

                if (table.length >= 4) {
                  // table full. time to be on the waitlist now k
                  queue.push(pson);
                  talk(users[prsnToAdd].username + " added to waitlist. Length is now " + queue.length);
                  updateWaitlist();
                  updateLimit();
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
                    updateLimit();
                  }
                }

                if (process.env.AUTODJ) {
                  if (addCheck(botid) && table.length > 3) {
                    if (addCheck(botid) == 1) {
                      //user in waitlist
                      for (var i = 0; i < queue.length; i++) {
                        if (queue[i].id == botid) {
                          queue[i].removeAfter = true;
                          updateWaitlist();
                          break;
                        }
                      }
                    } else if (addCheck(botid) == 2) {
                      //user on deck
                      if (botid == theDJ.id) {
                        // user is current dj
                        theDJ.removeAfter = true;
                      } else {
                        // user is not current dj
                      }
                      for (var i = 0; i < table.length; i++) {
                        if (table[i].id == botid) {
                          table[i].removeAfter = true
                          updateTable();
                          break;
                        }
                      }
                    }
                  }
                }

              } else {
                if (check == 1) {
                  talk(users[prsnToAdd].username + " is already in the waitlist.");
                } else if (check == 2) {
                  talk(users[prsnToAdd].username + " is already on deck.");
                } else if (check == 3) {
                  talk(users[prsnToAdd].username + " is almost for sure not here.");
                }
              }

            } else {
              talk("who is that");
            }
          }
        } else if (command == "become") {
          talk("i do not remember how to do that.")
        } else if (command == "wait") {
          talk("wait");
        } else if (command == "hot") {
          firelevel.hot(chatData.id, namebo);
        } else if (command == "storm") {
          firelevel.storm(chatData.id, namebo);
        } else if (command == "link") {
          if (song) {
            if (song.url) {
              talk(song.url);
            } else {
              talk("Nothing is playing...");
            }
          }
        } else if (command == "dance") {
          if (cardGiftedThisSong) {
            if (!robotsDancing) {
              var danceref = firebase.database().ref("dance");
              danceref.set(true);
              robotsDancing = true;
              talk(":artificial_satellite: D.A.N.C.E satellite: `GLOBAL DANCE SEQUENCE NO. 1 HAS BEEN INITIATED.`");
            } else {
              talk(":artificial_satellite: D.A.N.C.E satellite: `already broadcasting dance signal thanks`");
            }
          } else {
            talk(":red_circle::satellite: unable to communicate with the D.A.N.C.E. satellite... if you gift the DJ a h0t new card, i'm sure they'll help boost your signal");
          }
        }
      } else if (chatData.txt == "🔥" || chatData.txt == ":fire:") {
        firelevel.hot(chatData.id, namebo);
      } else if (chatData.txt == "🌧" || chatData.txt == ":cloud_with_rain:") {
        firelevel.storm(chatData.id, namebo);
      } else if (chatData.txt == "1" && themevote.active) {
        themevote.params.votes[chatData.id] = 1;
      }

    });
  }
});

// GLOBAL TAG SYSTEM
var gts = {
    np: function() {
      var globalpeek = firebase.database().ref("globalTracks/" + song.type + "" + song.cid);
      globalpeek.once("value")
        .then(function(snapshot) {
          var thing = snapshot.val();
          console.log("THING START", thing);
          if (thing) {
            // NOT FIRST... LET'S MANAGE THAT
            gts.reportNp(thing);
            //update lp
            var thing2 = thing;
            thing2.last_play_date = Date.now();
            thing2.last_play_dj = song.djname;
            globalpeek.set(thing2);
          } else {
            // FIRST PLAY
            gts.reportNp({
              artist: song.artist,
              title: song.title,
              type: song.type
            });

            globalpeek.set({
              artist: song.artist,
              title: song.title,
              last_play_date: Date.now(),
              first_play_date: Date.now(),
              last_play_dj: song.djname,
              first_play_dj: song.djname,
              type: song.type
            });
          }
        });
    },
    reportNp: function(adm) {
      console.log("thing 3", adm);
      if (adm) {
        if (adm.title) {
          //if no track name, adam tags bad... dont use.
          if (adm.artist) {
            if (adm.artist !== "Unknown") {
              song.artist = adm.artist;
              song.title = adm.title;
            } else {
              // if ADAM thinks the artist's name is UNKNOWN, overwrite with whatever hostbot came up with
              //adam.fix_tags(adm.track_id, song.artist + " - " + song.title);
            }
          }
        } else {
          //NO TRACK NAME... if we have enough data, let's tell ADAM what we know
          //adam.fix_tags(adm.track_id, song.artist + " - " + song.title);
        }


        tagFixData = {
          adamData: {
            artist: song.artist,
            track_name: song.title
          },
          cid: song.cid
        };
        if (adm.last_play_dj) tagFixData.adamData.last_play_dj = adm.last_play_dj;
        if (adm.last_play_date) tagFixData.adamData.last_play = new Date(adm.last_play_date).toISOString();
        if (adm.first_play_dj) tagFixData.adamData.first_play_dj = adm.first_play_dj;
        if (adm.first_play_date) tagFixData.adamData.first_play = new Date(adm.first_play_date).toISOString();

        request('https://ws.audioscrobbler.com/2.0/?method=track.getInfo&track=' + encodeURIComponent(adm.title) + '&artist=' + encodeURIComponent(adm.artist) + '&username=' + process.env.LASTFM_USERNAME + '&api_key=' + process.env.LASTFM_APIKEY + '&format=json', function cbfunc(error, response, body) {
          //If call returned correctly, continue
          var playcount = false;
          console.log("thing 4", tagFixData);

          if (!error && response.statusCode == 200) {
            var lfm = [JSON.parse(body)];
            try {
              if (lfm[0].track.userplaycount) {
                playcount = parseInt(lfm[0].track.userplaycount);
              } else {

              }
            } catch (e) {
              console.log(e);

            }
          }

          var tagUpdate = firebase.database().ref("tagUpdate");
          if (playcount) {
            tagFixData.adamData.playcount = playcount;
            song.playcount = playcount;
          }
          // send tag update to clients
          tagUpdate.set(tagFixData);

        });


        // update the dj's playlist with updated tags
        queueRef.orderByChild('cid').equalTo(song.cid).once("value")
          .then(function(snapshot) {
            var data = snapshot.val();
            if (data) {
              for (var key in data) {
                if (data[key].type == song.type) {
                  newData = data[key];
                  newData.name = song.artist + " - " + song.title;
                  queueRef.child(key).set(newData);
                }
              }
            }
          });
      }

    }
  }
  /*
  var adam = {
    np: function(song_name, dj, link, source) {
      if (!process.env.ADAM_URL) return;
      var thesource = "youtube";
      if (source == 2) {
        thesource = "soundcloud"
      }
      var adam_data = {
        data: {
          song_name: song_name,
          dj: dj,
          link: link,
          source: thesource
        }
      };
      // try posting to ADAM
      var options = {
        method: "POST",
        url: process.env.ADAM_URL + "/new_song",
        headers: {
          "Content-Type": "text/html;charset=utf-8"
        },
        form: adam_data
      };

      request(options, function(err1, res1, body1) {
        if (err1) console.log(err1);
        console.log(body1);
        if (body1) {
          try {
            var adm = JSON.parse(body1);
            adam_last = adm;

            console.log(adm);
            if (adm) {
              if (adm.track_name) {
                //if no track name, adam tags bad... dont use.
                if (adm.artist) {
                  if (adm.artist !== "Unknown") {
                    song.artist = adm.artist;
                    song.title = adm.track_name;
                  } else {
                    // if ADAM thinks the artist's name is UNKNOWN, overwrite with whatever hostbot came up with
                    adam.fix_tags(adm.track_id, song.artist + " - " + song.title);
                  }
                }
              } else {
                //NO TRACK NAME... if we have enough data, let's tell ADAM what we know
                adam.fix_tags(adm.track_id, song.artist + " - " + song.title);
              }

              if (adm.track_id) song.adamid = adm.track_id;
              if (adm.playcount) song.playcount = adm.playcount;
              var tagUpdate = firebase.database().ref("tagUpdate");
              var tagFixData = {
                adamData: adm,
                cid: song.cid
              };

              // send tag update to clients
              tagUpdate.set(tagFixData);

              // update the dj's playlist with updated tags
              queueRef.orderByChild('cid').equalTo(song.cid).once("value")
                .then(function(snapshot) {
                  var data = snapshot.val();
                  if (data) {
                    for (var key in data) {
                      if (data[key].type == song.type) {
                        newData = data[key];
                        newData.name = song.artist + " - " + song.title;
                        queueRef.child(key).set(newData);
                      }
                    }
                  }
                });
            }
          } catch (e) {
            console.log(e);
          }
        }
      });
    },
    fix_tags: function(adamid, args) {
      var song_data = args.split(' - ')
      if (song_data.length < 2) {
        //bad format
      } else {
        var artist0 = song_data[0].replace(/&amp;/g, '&');
        var title0 = song_data[1].replace(/&amp;/g, '&');

        var adam_data = {
          data: {
            artist: artist0,
            title: title0,
            track_id: adamid
          }
        };
        var options = {
          method: "POST",
          url: "https://adam-indie-discotheque.herokuapp.com//fix_tags",
          headers: {
            "Content-Type": "text/html;charset=utf-8"
          },
          form: adam_data
        };

        request(options, function(err1, res1, body1) {
          if (err1) console.log(err1);
          console.log(body1);
          if (body1) {
            var adm = JSON.parse(body1);
            console.log("good tag fix");
          }
        });


      }
    }
  };

  */

var lastfm = {
  sk: process.env.LASTFM_SESSIONKEY, //for last.fm user tt_discotheque
  key: process.env.LASTFM_APIKEY,
  songStart: null,
  duration: null,
  scrobble: function() {
    var artist = song.artist;
    var track = song.title;

    var params = {
      artist: artist,
      track: track,
      timestamp: lastfm.songStart,
      api_key: lastfm.key,
      sk: lastfm.sk,
      method: "track.scrobble"
    };

    var sig = lastfm.getApiSignature(params);
    params.api_sig = sig;

    var request_url = 'https://ws.audioscrobbler.com/2.0/?' + serialize(params);

    var request_url = 'https://ws.audioscrobbler.com/2.0/?' + serialize(params);
    var options = {
      method: "POST",
      url: request_url
    };

    request(options, function(err1, res1, body1) {
      if (err1) console.log(err1);
      //console.log(body1);
    });
  },
  love: function() {
    var artist = song.artist;
    var track = song.title;

    var params = {
      artist: artist,
      track: track,
      api_key: lastfm.key,
      sk: lastfm.sk,
      method: "track.love"
    };

    var sig = lastfm.getApiSignature(params);
    params.api_sig = sig;

    var request_url = 'https://ws.audioscrobbler.com/2.0/?' + serialize(params);
    var options = {
      method: "POST",
      url: request_url
    };

    request(options, function(err1, res1, body1) {
      if (err1) console.log(err1);
      // console.log(body1);
    });

  },
  _onAjaxError: function(xhr, status, error) {
    console.log(xhr);
    console.log(status);
    console.log(error);
  },
  nowPlaying: function() {
    var artist = song.artist;
    var track = song.title;

    var params = {
      artist: artist,
      track: track,
      duration: lastfm.duration,
      api_key: lastfm.key,
      sk: lastfm.sk,
      method: "track.updateNowPlaying"
    };

    var sig = lastfm.getApiSignature(params);
    params.api_sig = sig;

    var request_url = 'https://ws.audioscrobbler.com/2.0/?' + serialize(params);

    var request_url = 'https://ws.audioscrobbler.com/2.0/?' + serialize(params);
    var options = {
      method: "POST",
      url: request_url
    };

    request(options, function(err1, res1, body1) {
      if (err1) console.log(err1);
      // console.log(body1);
    });

  },
  getApiSignature: function(params) {
    var i, key, keys, max, paramString;

    keys = [];
    paramString = "";

    for (key in params) {
      if (params.hasOwnProperty(key)) {
        keys.push(key);
      }
    }
    keys.sort();

    for (i = 0, max = keys.length; i < max; i += 1) {
      key = keys[i];
      paramString += key + params[key];
    }

    return calcMD5(paramString + "e036a3702ce27990966173ce591fe14c");
  }
};


setTimeout(function() {
  ignoreChats = false;
  console.log("Listening now.");
}, 5000);

setInterval(function() {
  //keep stored chat history at 20 chats.
  console.log("hi");
  var ref = firebase.database().ref("chatFeed");
  ref.once("value").then(function(snapshot) {
    var data = snapshot.val();
    var chats = [];
    for (var key in data) {
      chats.push({
        feed: key,
        data: data[key].chatID
      });
    }
    console.log(chats.length);
    if (chats.length > 20) {
      var shave = chats.length - 21;
      for (var i = 0; i <= shave; i++) {
        console.log(chats[i]);
        var removeThis = firebase.database().ref('chatFeed/' + chats[i].feed);
        var removeData = firebase.database().ref('chatData/' + chats[i].data);
        removeThis.remove();
        removeData.remove();
      }
    }
  });
}, 5 * 60000);

setInterval(function() {
  // check every two minutes to see if people in the waitlist and table are here
  // one warning if not here the first check, removed after second check.
  for (var i = 0; i < table.length; i++) {
    if (!users[table[i].id].status) {
      if (!removalPending[table[i].id]) {
        removalPending[table[i].id] = true;
        console.log(table[i].id + " removal pending.");
      } else {
        removalPending[table[i].id] = null;
        console.log(table[i].id + " removed");
        removeMe(table[i].id);
      }
    }
  }
  for (var i = 0; i < queue.length; i++) {
    if (!users[queue[i].id].status) {
      if (!removalPending[queue[i].id]) {
        removalPending[queue[i].id] = true;
        console.log(queue[i].id + " removal pending.");

      } else {
        removalPending[queue[i].id] = null;
        console.log(queue[i].id + " removed");
        removeMe(queue[i].id);
      }
    }
  }
  var pendings = removalPending;
  for (key in pendings) {
    if (pendings.hasOwnProperty(key)) {
      if (users[key].status && removalPending[key]) {
        console.log("removal for " + key + " aborted");
        removalPending[key] = null;
      }
    }
  }
}, 2 * 60000);

/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Copyright (C) Paul Johnston 1999 - 2000.
 * Updated by Greg Holt 2000 - 2001.
 * See http://pajhome.org.uk/site/legal.html for details.
 */

/*
 * Convert a 32-bit number to a hex string with ls-byte first
 */
var hex_chr = "0123456789abcdef";

function rhex(num) {
  str = "";
  for (j = 0; j <= 3; j++)
    str += hex_chr.charAt((num >> (j * 8 + 4)) & 0x0F) +
    hex_chr.charAt((num >> (j * 8)) & 0x0F);
  return str;
}

/*
 * Convert a string to a sequence of 16-word blocks, stored as an array.
 * Append padding bits and the length, as described in the MD5 standard.
 */
function str2blks_MD5(str) {
  nblk = ((str.length + 8) >> 6) + 1;
  blks = new Array(nblk * 16);
  for (i = 0; i < nblk * 16; i++) blks[i] = 0;
  for (i = 0; i < str.length; i++)
    blks[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
  blks[i >> 2] |= 0x80 << ((i % 4) * 8);
  blks[nblk * 16 - 2] = str.length * 8;
  return blks;
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function add(x, y) {
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left
 */
function rol(num, cnt) {
  return (num << cnt) | (num >>> (32 - cnt));
}

/*
 * These functions implement the basic operation for each round of the
 * algorithm.
 */
function cmn(q, a, b, x, s, t) {
  return add(rol(add(add(a, q), add(x, t)), s), b);
}

function ff(a, b, c, d, x, s, t) {
  return cmn((b & c) | ((~b) & d), a, b, x, s, t);
}

function gg(a, b, c, d, x, s, t) {
  return cmn((b & d) | (c & (~d)), a, b, x, s, t);
}

function hh(a, b, c, d, x, s, t) {
  return cmn(b ^ c ^ d, a, b, x, s, t);
}

function ii(a, b, c, d, x, s, t) {
  return cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Take a string and return the hex representation of its MD5.
 */
function calcMD5(str) {
  x = str2blks_MD5(str);
  a = 1732584193;
  b = -271733879;
  c = -1732584194;
  d = 271733878;

  for (i = 0; i < x.length; i += 16) {
    olda = a;
    oldb = b;
    oldc = c;
    oldd = d;

    a = ff(a, b, c, d, x[i + 0], 7, -680876936);
    d = ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = ff(c, d, a, b, x[i + 10], 17, -42063);
    b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = ff(b, c, d, a, x[i + 15], 22, 1236535329);

    a = gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = gg(b, c, d, a, x[i + 0], 20, -373897302);
    a = gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = gg(b, c, d, a, x[i + 12], 20, -1926607734);

    a = hh(a, b, c, d, x[i + 5], 4, -378558);
    d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = hh(d, a, b, c, x[i + 0], 11, -358537222);
    c = hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = hh(b, c, d, a, x[i + 2], 23, -995338651);

    a = ii(a, b, c, d, x[i + 0], 6, -198630844);
    d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = ii(b, c, d, a, x[i + 9], 21, -343485551);

    a = add(a, olda);
    b = add(b, oldb);
    c = add(c, oldc);
    d = add(d, oldd);
  }
  return rhex(a) + rhex(b) + rhex(c) + rhex(d);
}

var serialize = function(obj, prefix) {
  var str = [];
  for (var p in obj) {
    if (obj.hasOwnProperty(p)) {
      var k = prefix ? prefix + "[" + p + "]" : p,
        v = obj[p];
      str.push(typeof v == "object" ?
        serialize(v, k) :
        encodeURIComponent(k) + "=" + encodeURIComponent(v));
    }
  }
  return str.join("&");
}

firebase.auth().signInWithEmailAndPassword(process.env.FIRETABLE_USER, process.env.FIRETABLE_PASS).catch(function(error) {
  console.log(error);
});