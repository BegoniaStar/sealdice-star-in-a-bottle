import extensionMetadata from '../extension.json';

import {
  registerPluginConfigs,
  readFallback,
  readCommandHelp,
  readStarStyles,
} from './config.ts';
import { MessageRenderer, registerMessageTemplateConfigs } from './messages.ts';

type Bottle = {
  readonly id: string;
  readonly type: 'bottle';
  readonly from: string;
  readonly qq: string;
  readonly content: string;
  readonly timestamp: number;
};

type Star = {
  readonly id: string;
  readonly type: 'star';
  readonly from: string;
  readonly qq: string;
  readonly style: string;
  readonly timestamp: number;
};

type SeaItem = Bottle | Star;

const extensionName = extensionMetadata.id;
const legacyExtensionName = '漂流瓶';
const existingExtension =
  seal.ext.find(extensionName) ?? seal.ext.find(legacyExtensionName);
const extension =
  existingExtension ??
  seal.ext.new(
    extensionMetadata.id,
    extensionMetadata.author,
    extensionMetadata.version,
  );
if (existingExtension === null) seal.ext.register(extension);
extension.autoActive = true;
registerPluginConfigs(extension);
registerMessageTemplateConfigs(extension);
const messages = new MessageRenderer(extension);

const sea = readStorage<SeaItem[]>(extension, 'sea', [], Array.isArray);
const jumpRecords = readStorage<Record<string, string>>(
  extension,
  'jumpRecords',
  {},
  (value) =>
    typeof value === 'object' && value !== null && !Array.isArray(value),
);
const allBottles = readStorage<Bottle[]>(
  extension,
  'allBottles',
  [],
  Array.isArray,
);

function readStorage<T>(
  ext: seal.ExtInfo,
  key: string,
  fallback: T,
  isValid: (value: unknown) => boolean = () => true,
): T {
  try {
    const value = ext.storageGet(key);
    if (typeof value !== 'string' || value.trim() === '') return fallback;
    const parsed: unknown = JSON.parse(value);
    return isValid(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(ext: seal.ExtInfo, key: string, value: unknown): void {
  ext.storageSet(key, JSON.stringify(value));
}

function getUserId(ctx: seal.MsgContext, msg: seal.Message): string | null {
  const fromMessage = msg.sender?.userId;
  if (typeof fromMessage === 'string' && fromMessage.trim() !== '')
    return fromMessage;
  const fromPlayer = ctx.player?.userId;
  return typeof fromPlayer === 'string' && fromPlayer.trim() !== ''
    ? fromPlayer
    : null;
}

function senderName(ctx: seal.MsgContext, msg: seal.Message): string {
  return (
    msg.sender?.nickname ||
    ctx.player?.name ||
    readFallback(extension, 'unknownUser')
  );
}

function isDiceMaster(ctx: seal.MsgContext): boolean {
  return ctx.privilegeLevel >= 100;
}

function currentDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function result(): seal.CmdExecuteResult {
  return seal.ext.newCmdExecuteResult(true);
}

function isHelp(args: seal.CmdArgs): boolean {
  return args.getArgN(1).trim().toLowerCase() === 'help';
}

function registerCommand(
  name: string,
  help: string,
  solve: seal.CmdSolve,
): seal.CmdItemInfo {
  const command = seal.ext.newCmdItemInfo();
  command.name = name;
  command.help = help;
  command.solve = solve;
  extension.cmdMap[name] = command;
  return command;
}

registerCommand(
  '扔瓶子',
  readCommandHelp(extension, 'throw'),
  (ctx, msg, args) => {
    if (isHelp(args)) {
      const ret = result();
      ret.showHelp = true;
      return ret;
    }
    const content = args.getRestArgsFrom(1).trim();
    if (content === '') {
      const ret = result();
      ret.showHelp = true;
      return ret;
    }
    const timestamp = Date.now();
    const bottle: Bottle = {
      id: `bottle_${timestamp}`,
      type: 'bottle',
      from: senderName(ctx, msg),
      qq: getUserId(ctx, msg) ?? readFallback(extension, 'unknownQq'),
      content,
      timestamp,
    };
    sea.push(bottle);
    allBottles.push(bottle);
    saveStorage(extension, 'sea', sea);
    saveStorage(extension, 'allBottles', allBottles);
    seal.replyToSender(ctx, msg, messages.render(ctx, 'throwSuccess'));
    return result();
  },
);

registerCommand(
  '捡瓶子',
  readCommandHelp(extension, 'get'),
  (ctx, msg, args) => {
    if (isHelp(args)) {
      const ret = result();
      ret.showHelp = true;
      return ret;
    }
    if (sea.length === 0) {
      seal.replyToSender(ctx, msg, messages.render(ctx, 'seaEmpty'));
      return result();
    }
    const index = Math.floor(Math.random() * sea.length);
    const item = sea.splice(index, 1)[0];
    saveStorage(extension, 'sea', sea);
    if (!item) return result();
    const text =
      item.type === 'bottle'
        ? messages.render(ctx, 'bottleReceived', {
            sender: item.from,
            content: item.content,
            id: item.id,
            time: new Date(item.timestamp).toLocaleString(),
          })
        : messages.render(ctx, 'starReceived', {
            sender: item.from,
            starStyle: item.style,
          });
    seal.replyToSender(ctx, msg, text);
    return result();
  },
);

registerCommand(
  '查看星海',
  readCommandHelp(extension, 'sea'),
  (ctx, msg, args) => {
    if (isHelp(args)) {
      const ret = result();
      ret.showHelp = true;
      return ret;
    }
    seal.replyToSender(
      ctx,
      msg,
      messages.render(ctx, 'seaCount', { count: String(sea.length) }),
    );
    return result();
  },
);

registerCommand(
  '查看投放者',
  readCommandHelp(extension, 'sender'),
  (ctx, msg, args) => {
    if (isHelp(args)) {
      const ret = result();
      ret.showHelp = true;
      return ret;
    }
    if (!isDiceMaster(ctx)) {
      seal.replyToSender(ctx, msg, messages.render(ctx, 'senderOnlyMaster'));
      return result();
    }
    const id = args.getArgN(1).trim();
    const found = allBottles.find(
      (item) => item.type === 'bottle' && item.id === id,
    );
    seal.replyToSender(
      ctx,
      msg,
      messages.render(ctx, found ? 'senderFound' : 'senderMissing', {
        id,
        qq: found?.qq ?? '',
      }),
    );
    return result();
  },
);

registerCommand('跳入星海', readCommandHelp(extension, 'jump'), (ctx, msg) => {
  const qq = getUserId(ctx, msg);
  if (qq === null) {
    seal.replyToSender(ctx, msg, messages.render(ctx, 'identityMissing'));
    return result();
  }
  const date = currentDate();
  if (jumpRecords[qq] === date) {
    seal.replyToSender(ctx, msg, messages.render(ctx, 'alreadyJumped'));
    return result();
  }
  jumpRecords[qq] = date;
  const styles = readStarStyles(extension);
  const style = styles[Math.floor(Math.random() * styles.length)];
  if (style === undefined) return result();
  const timestamp = Date.now();
  sea.push({
    id: `star_${timestamp}`,
    type: 'star',
    from: senderName(ctx, msg),
    qq,
    style,
    timestamp,
  });
  saveStorage(extension, 'jumpRecords', jumpRecords);
  saveStorage(extension, 'sea', sea);
  seal.replyToSender(
    ctx,
    msg,
    messages.render(ctx, 'jumpSuccess', { starStyle: style }),
  );
  return result();
});

registerCommand(
  '星海',
  readCommandHelp(extension, 'general'),
  (ctx, msg, args) => {
    const ret = result();
    if (isHelp(args) || args.getArgN(1).trim() === '') {
      const help = messages.render(ctx, 'generalHelp', {
        throwHelp: readCommandHelp(extension, 'throw'),
        getHelp: readCommandHelp(extension, 'get'),
        seaHelp: readCommandHelp(extension, 'sea'),
        jumpHelp: readCommandHelp(extension, 'jump'),
      });
      seal.replyToSender(ctx, msg, help);
      return ret;
    }
    ret.showHelp = true;
    return ret;
  },
);
