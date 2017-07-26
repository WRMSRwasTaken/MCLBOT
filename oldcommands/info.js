const path = require('path');
const shared = require(path.resolve(__dirname, '../lib/shared.js'));
const main = shared.main;

const _ = require('lodash');
const Bluebird = require('bluebird');

function lookupID(message, id) {
  console.log('lookup for user:', id);
  message.client.fetchUser(id)
    .then((user) => {
      console.log(user);
      if (!user) {
        message.channel.send(`User: ${id} could not be found.`);
        return;
      }
      message.channel.send(user.username);
    })
    .catch(err => message.channel.send(`Sorry, I could not execute that command. The error was: ${err}`));
}

main.registerCommand({
  name: 'info',
  desc: 'prints information about a user',
  alias: ['user', 'userinfo'],
  optArgs: ['user'],
  fn: (message, text, params) => {
    // if (!message.content.split(' ')[1]) {
    //   let omsg;
    //
    //   message.channel.send(`Requested info for username: ${message.author.username}`)
    //     .then(msg => omsg = msg)
    //     .then(() => Bluebird.delay(2000))
    //     .then(() => omsg.delete());
    //   return;
    // }
    //
    // console.log(message.guild.members);


    // if (message.mentions.everyone) {
    //   return;
    // }
    //
    // const mentionedUsers = message.mentions.users.array();
    //
    // console.log(params);
    //
    // if (mentionedUsers > 0) {
    //   _.forEach(mentionedUsers, (user) => {
    //     lookupID(message, user.id);
    //   });
    // } else {
    //   lookupID(message, params);
    // }

    // message.client.fetchUser(message.mentions.users.first().id)
    //   .then((user) => {
    //     console.log(user);
    //     message.channel.send(user.username);
    //   })
    //   .catch(err => message.channel.send(`Sorry, I could not execute that command. The error was: ${err}`));
  },
});
