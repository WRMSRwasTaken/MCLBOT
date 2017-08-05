module.exports = {
  channelCreate: {
    on: 'channelCreate',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  channelDelete: {
    on: 'channelDelete',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  channelPinsUpdate: {
    on: 'channelPinsUpdate',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  channelUpdate: {
    on: 'channelUpdate',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  clientUserSettingsUpdate: {
    on: 'clientUserSettingsUpdate',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  emojiCreate: {
    on: 'emojiCreate',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  emojiDelete: {
    on: 'emojiDelete',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  emojiUpdate: {
    on: 'emojiUpdate',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  guildBanAdd: {
    on: 'guildBanAdd',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  guildBanRemove: {
    on: 'guildBanRemove',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  guildCreate: {
    on: 'guildCreate',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  guildDelete: {
    on: 'guildDelete',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  guildMemberAdd: {
    on: 'guildMemberAdd',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  guildMemberAvailable: {
    on: 'guildMemberAvailable',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  guildMemberRemove: {
    on: 'guildMemberRemove',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  guildMembersChunk: {
    on: 'guildMembersChunk',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  guildMemberSpeaking: {
    on: 'guildMemberSpeaking',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  guildMemberUpdate: {
    on: 'guildMemberUpdate',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  guildUnavailable: {
    on: 'guildUnavailable',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  guildUpdate: {
    on: 'guildUpdate',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  message: {
    on: 'message',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  messageDelete: {
    on: 'messageDelete',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  messageDeleteBulk: {
    on: 'messageDeleteBulk',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  messageReactionAdd: {
    on: 'messageReactionAdd',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  messageReactionRemove: {
    on: 'messageReactionRemove',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  messageReactionRemoveAll: {
    on: 'messageReactionRemoveAll',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  messageUpdate: {
    on: 'messageUpdate',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  presenceUpdate: {
    on: 'presenceUpdate',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  roleCreate: {
    on: 'roleCreate',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  roleDelete: {
    on: 'roleDelete',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  roleUpdate: {
    on: 'roleUpdate',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  typingStart: {
    on: 'typingStart',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  typingStop: {
    on: 'typingStop',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  userNoteUpdate: {
    on: 'userNoteUpdate',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  userUpdate: {
    on: 'userUpdate',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
  voiceStateUpdate: {
    on: 'voiceStateUpdate',
    fn: (main) => {
      main.prometheusMetrics.websocketEventCountGauge.inc();
    },
  },
};
