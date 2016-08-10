var irc = require('slate-irc');
var net = require('net');
var KeenTracking = require('keen-tracking');

var logger = require('debug')('app:logger');
var notice = require('debug')('app:notice');

require('dotenv').config();

var track = new KeenTracking({
  projectId: process.env.KEEN_ID,
  writeKey: process.env.KEEN_KEY
});

var stream = net.connect({
  port: 6667,
  host: 'irc.freenode.org'
});

var client = irc(stream);

client.use(function() {
  return function(irc){
    irc.stream.pipe(logger);
  }
});

client.nick(process.env.BOT_NICKNAME);
client.user(process.env.BOT_NICKNAME, process.env.BOT_REALNAME);

var CHANNELS = [
  '#express',
  '#node.js',
  '#reactjs',
  '#redux',
  '#openshift',
  '#css',
  '#html',
  '#socket.io',
  '##javascript'
];

var USERS = [
  'avilano',
  'erecinos',
  'jllanas',
  'javmarr',
  'joelgarza',
  'pamsny',
  'riccochapa',
  'samcio',
  'stevealvaradorgv'
];

// not in production
if (!process.env.OPENSHIFT_NODEJS_IP) {
  USERS.push('ibolmo');
}

var isTracked = function(user){
  return USERS.indexOf(user) > -1;
};

client.join(CHANNELS);

CHANNELS.forEach(function(channel){
  client.names(channel, function(err, names){
    if (err) {
      logger('err "' + err + '" in names for ' + channel);
    } else {
      names.forEach(function(user){
        if (isTracked(user.name)) {
          notice(channel + ' (found): ' + user.name);
          track.recordEvent('found', {
            user: user.name,
            channel: channel
          });
        }
      });
    }
  });
})

client.on('message', function(e){
  if (isTracked(e.from) && e.to != ('#' + process.env.BOT_NICKNAME)) {
    notice(e.from + ' (message): ' + e.from);
    track.recordEvent('message', {
      user: e.from,
      channel: e.to
    });
  }
});

client.on('join', function(e){
  if (isTracked(e.nick)) {
    notice(e.channel + ' (join): ' + e.nick);
    track.recordEvent('join', {
      user: e.nick,
      channel: e.channel
    });
  }
});

client.on('part', function(e){
  if (isTracked(e.nick)) {
    notice(e.channel + ' (part): ' + e.nick);
    track.recordEvent('part', {
      user: e.nick,
      channel: e.channel
    });
  }
});
