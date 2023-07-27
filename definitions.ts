import {Redis} from "ioredis";
import postgres from "postgres";
import Discord from 'discord.js';
import AudioHelper from "./lib/audioHelper.js";
import BlacklistHelper from "./lib/blacklistHelper.js";
import CacheManager from "./lib/cacheManager.js";
import CooldownHelper from "./lib/cooldownHelper.js";
import CommandHandler from "./lib/commandHandler.js";
import UserHelper from "./lib/userHelper.js";
import GuildSettingsManager from "./lib/guildSettingsManager.js";
import PrefixHelper from "./lib/prefixHelper.js";

interface MCLBOTMain {
  redis: Redis;
  shutdown: (code: number) => Promise<void>;
  pg: postgres.Sql;
  processStartTime: number;
  preConnectTime: number;
  api: Discord.Client;
  Discord: object;
  version: string;
  modules: MCLBOTModules;
  ready: boolean;
  firstReady: boolean;
  longVersion: string;
  dirty: boolean
  disabledDMs: object;
  commands: MCLBOTCommands
}

 interface MCLBOTCommands {
   [key: string]: MCLBOTCommand
 }

interface MCLBOTMessage extends Discord.Message {
  replies: Array<Discord.Message>;
  deleted?: boolean
  messageEdits: number
  currentHandled: number
}

interface MCLBOTContext {
  invokeTime?: number
  main: MCLBOTMain;
  message: MCLBOTMessage;
  author: Discord.User;
  member: Discord.GuildMember | null;
  guild: Discord.Guild | null;
  channel: Discord.Channel;
  isBotAdmin: boolean;
  isEdited: boolean;
  messageEdits: number;
  mentionLength: number;
  guildPrefixDisabled?: boolean;
  guildPrefix?: string;
  startsWithPrefix?: boolean;
  rawCommand?: string;
  command?: MCLBOTCommand;
  subcommand?: MCLBOTCommand;
  category?: string;
  isSubcommandRedirect?: boolean
  rawCommandParameters?: string | undefined;
  parsedArguments: Array<string>;
  parsedFlags: object
  reply: (text: string, options?: object) => Promise<void>;
  deleteReplies: () => Promise<void>;
}

interface MCLBOTModules {
  audioHelper: AudioHelper
  blacklistHelper: BlacklistHelper
  cacheManager: CacheManager
  cooldownHelper: CooldownHelper
  commandHandler: CommandHandler
  userHelper: UserHelper
  prefixHelper: PrefixHelper
  guildSettingsManager: GuildSettingsManager
}

interface MCLBOTModule {
  initializeModule(): void
}

// interface loadableModule {
//   [key: string]: MCLBOTModule | undefined
// }

interface MCLBOTCommand {
  name: string,
  description: string,
  disabled?: boolean,
  hide?: boolean,
  alias: string | Array<string>,
  owner: boolean,
  guildOnly: boolean,
  guarded: boolean,
  permission: string | Array<string>,
  selfPermission: string | Array<string>,,
  middleware: string | Array<string>,
  cooldown: boolean | object,
  hideTyping: boolean,
  nsfw: boolean,
  category?: string,
  arguments?: Array<MCLBOTArgument>
  fn: (context: MCLBOTContext, ...args) => Promise<string | void>;
  subcommands: Array<MCLBOTCommand>,
  load: (main: MCLBOTMain, ...args) => Promise<string | void>;
}

interface MCLBOTArgument {
  label: string,
  type: string,
  min?: number,
  max?: number,
  infinite?: boolean,
  optional?: boolean,
  list?: string,
  listAll?: boolean,
  default?: (context: MCLBOTContext, ...args) => Promise<string | void>;
}

interface MCLBOTFlag {
  label: string,
  type: string,
  short?: string,
  global?: boolean,
  min?: number,
  max?: number,
  description: string,
  infinite?: boolean,
}

export {MCLBOTMain, MCLBOTContext, MCLBOTModule, MCLBOTModules, MCLBOTMessage, MCLBOTCommand}
