type MessageTemplateDefinition = {
  readonly defaults: readonly string[];
  readonly fields?: readonly string[];
};

export const messageTemplateDefinitions = {
  throwHelp: { defaults: ['用.扔瓶子 (内容) 扔出一个漂流瓶'] },
  getHelp: { defaults: ['随机捞出一个瓶子或星星'] },
  seaHelp: { defaults: ['查看当前星海中瓶子和星星的总数'] },
  senderHelp: {
    defaults: [
      '有且仅有骰主可以使用该命令查看指定瓶子的投放者 QQ 号，格式：.查看投放者 (瓶子ID)',
    ],
  },
  jumpHelp: { defaults: ['跳进去后会产生一颗星星进入星海，只能跳一次'] },
  generalHelp: {
    defaults: [
      '以下是可用指令及说明：\n.扔瓶子: {$t星海漂流瓶_扔瓶子帮助}\n.捡瓶子: {$t星海漂流瓶_捡瓶子帮助}\n.查看星海: {$t星海漂流瓶_查看星海帮助}\n.跳入星海: {$t星海漂流瓶_跳入星海帮助}',
    ],
    fields: ['throwHelp', 'getHelp', 'seaHelp', 'jumpHelp'],
  },
  throwSuccess: {
    defaults: [
      '你成功向星海丢入一个瓶子，瓶子渐渐飘远，与星星们混在一起，你看不见它的踪迹了',
    ],
  },
  seaEmpty: { defaults: ['星海目前空空如也，你没有捞到任何东西...'] },
  bottleReceived: {
    defaults: [
      '你捡到了一个来自{$t星海漂流瓶_投放者}的瓶子，上面写着: {$t星海漂流瓶_内容}。\n瓶子专属ID为: {$t星海漂流瓶_瓶子ID}\n{$t星海漂流瓶_时间}',
    ],
    fields: ['sender', 'content', 'id', 'time'],
  },
  starReceived: {
    defaults: [
      '你捡到了一颗 {$t星海漂流瓶_星星样式}，它是 {$t星海漂流瓶_投放者} 跳入星海时变化的。',
    ],
    fields: ['starStyle', 'sender'],
  },
  seaCount: {
    defaults: ['当前星海中共有 {$t星海漂流瓶_数量} 个瓶子和星星。'],
    fields: ['count'],
  },
  senderOnlyMaster: { defaults: ['只有骰主可以使用该命令。'] },
  senderFound: {
    defaults: [
      '瓶子 ID 为 {$t星海漂流瓶_瓶子ID} 的投放者 QQ 号是: {$t星海漂流瓶_QQ号}',
    ],
    fields: ['id', 'qq'],
  },
  senderMissing: {
    defaults: ['未找到 ID 为 {$t星海漂流瓶_瓶子ID} 的瓶子。'],
    fields: ['id'],
  },
  identityMissing: { defaults: ['检测不到你的身份卡...无法跳入星海。'] },
  alreadyJumped: {
    defaults: [
      '你想要再次跳入星海，星海里调皮的星星飘过来刺了一下你的屁股，你疼的跑了出去。',
    ],
  },
  jumpSuccess: {
    defaults: ['你成功跳入星海，变成了一颗 {$t星海漂流瓶_星星样式} 进入星海。'],
    fields: ['starStyle'],
  },
} as const satisfies Record<string, MessageTemplateDefinition>;

export type MessageTemplateKey = keyof typeof messageTemplateDefinitions;
type TemplateValue = Readonly<Record<string, string>>;

const variableNames: Record<string, string> = {
  throwHelp: '$t星海漂流瓶_扔瓶子帮助',
  getHelp: '$t星海漂流瓶_捡瓶子帮助',
  seaHelp: '$t星海漂流瓶_查看星海帮助',
  jumpHelp: '$t星海漂流瓶_跳入星海帮助',
  sender: '$t星海漂流瓶_投放者',
  content: '$t星海漂流瓶_内容',
  id: '$t星海漂流瓶_瓶子ID',
  time: '$t星海漂流瓶_时间',
  starStyle: '$t星海漂流瓶_星星样式',
  count: '$t星海漂流瓶_数量',
  qq: '$t星海漂流瓶_QQ号',
};

const keys = Object.keys(messageTemplateDefinitions) as MessageTemplateKey[];

export function registerMessageTemplateConfigs(extension: seal.ExtInfo): void {
  for (const key of keys) {
    const definition: MessageTemplateDefinition =
      messageTemplateDefinitions[key];
    const fields = (definition.fields ?? [])
      .map((field) => `${variableNames[field] ?? field}`)
      .join('、');
    const description =
      '可填写多条候选文案，发送时随机选择一条。支持 SealDice 原生模板语法。' +
      (fields === '' ? '' : `可用变量：${fields}`);
    seal.ext.registerTemplateConfig(
      extension,
      `message.${key}`,
      [...definition.defaults],
      description,
      '文案',
    );
  }
}

export class MessageRenderer {
  public constructor(
    private readonly extension: seal.ExtInfo,
    private readonly random = Math.random,
  ) {}

  public render(
    ctx: seal.MsgContext,
    key: MessageTemplateKey,
    values: TemplateValue = {},
  ): string {
    for (const [name, variable] of Object.entries(variableNames))
      seal.vars.strSet(ctx, variable, values[name] ?? '');
    const configured = seal.ext
      .getTemplateConfig(this.extension, `message.${key}`)
      .map((item) => item.trim())
      .filter((item) => item !== '');
    const defaults = messageTemplateDefinitions[key].defaults;
    const templates = configured.length > 0 ? configured : defaults;
    const selected =
      templates[Math.floor(this.random() * templates.length)] ?? defaults[0];
    return seal.format(ctx, selected);
  }
}
