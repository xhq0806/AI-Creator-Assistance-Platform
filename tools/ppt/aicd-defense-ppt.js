const fs = require('node:fs');
const path = require('node:path');
const pptxgen = require('pptxgenjs');

const OUT = 'outputs/AICD-Platform-Project-Defense.pptx';
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;
const FONT = 'Microsoft YaHei';

const COLORS = {
  navy: '07111F',
  navy2: '0D1B33',
  panel: '10213D',
  panel2: '16345E',
  cyan: '20D6FF',
  blue: '3977FF',
  purple: '8B5CF6',
  green: '22C55E',
  amber: 'F6B94B',
  red: 'EF4444',
  white: 'FFFFFF',
  text: '172033',
  muted: '64748B',
  line: 'D8E2F0',
  pale: 'F5F8FC',
  ice: 'DFF6FF',
};

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'AICD Platform';
pptx.subject = 'AI Creator Platform Project Defense';
pptx.title = 'AI 创作者辅助生产与分发平台项目答辩';
pptx.company = 'AICD Platform';
pptx.lang = 'zh-CN';
pptx.theme = {
  headFontFace: FONT,
  bodyFontFace: FONT,
  lang: 'zh-CN',
};
pptx.defineLayout({ name: 'LAYOUT_WIDE', width: SLIDE_W, height: SLIDE_H });

const SLIDES = [
  {
    title: 'AI 创作者辅助生产与分发平台',
    section: 'PROJECT DEFENSE',
    kind: 'cover',
    notes: '各位老师好，我本次答辩的项目是 AI 创作者辅助生产与分发平台。这个项目不是一个单点的 AI 生成工具，而是围绕内容生产、审核、发布、消费和反馈建立的一套全链路平台。接下来我会按照产品价值、工程架构、内容治理和交付演进四个部分展开。',
  },
  {
    title: '项目背景：AIGC 内容生产进入平台化阶段',
    section: '01 产品价值',
    kind: 'standard',
    bullets: [
      { title: '生产提效', body: '创作者需要从灵感快速生成标题、正文、配图和视频素材，降低从想法到成稿的成本。' },
      { title: '治理前置', body: '内容平台不能只追求生成效率，还需要在发布前完成安全审核、质量评分和合规改写。' },
      { title: '分发闭环', body: '内容发布后需要进入热榜、阅读、反馈和二次编辑链路，形成持续优化机制。' },
      { title: '工程要求', body: '真实平台需要账号、权限、离线草稿、缓存、测试、部署和降级兜底等完整工程能力。' },
    ],
    notes: '项目背景来自两个变化：一是 AIGC 正在显著提升内容生产效率，二是内容平台对安全、质量和推荐分发的要求更高。因此我没有把项目做成一个简单的 AI 调用页面，而是做成从创作到治理再到分发消费的完整平台。',
  },
  {
    title: '目标用户与核心痛点',
    section: '01 产品价值',
    kind: 'roles',
    roles: [
      ['个人创作者', '缺灵感、成稿慢、素材分散，需要低门槛生成和草稿保护。'],
      ['中小内容团队', '需要复用 Prompt、管理素材、统一质量标准和多人协作。'],
      ['平台运营人员', '需要审核、评分、热榜、用户和系统配置等治理能力。'],
    ],
    notes: '项目面向三类用户。个人创作者关注效率，中小团队关注复用和协作，运营人员关注平台治理。这个角色划分决定了系统不能只做创作页，还要有资源工作台、内容消费页和管理后台。',
  },
  {
    title: '项目目标：从灵感到分发的闭环平台',
    section: '01 产品价值',
    kind: 'standard',
    bullets: [
      { title: '创作不中断', body: '在线 30 秒自动保存；断网写入 IndexedDB；恢复网络后批量同步脏草稿。' },
      { title: '发布有门槛', body: '发布前执行 AI 安全审核、合规替代文本和质量评分，风险内容自动驳回。' },
      { title: '消费可排序', body: '热榜综合质量分、AI 推荐分、阅读、点赞收藏、负反馈和时间衰减。' },
      { title: '运营可治理', body: '后台覆盖用户、文章、Prompt、素材、审核样本和系统配置。' },
    ],
    notes: '项目目标可以概括为三句话：创作不中断、发布有门槛、消费可排序。在此基础上，我补充了后台治理能力，让系统具备平台级交付形态，而不是只完成前台演示。',
  },
  {
    title: '平台能力全景图',
    section: '01 产品价值',
    kind: 'panorama',
    notes: '这一页展示整个平台的闭环。用户从 Prompt 和素材进入创作工作台，经过 AI 生成、审核、评分和发布，再进入发现页、详情页和反馈链路。反馈数据会反过来影响热榜排序，运营人员则通过后台治理整个内容生态。',
  },
  {
    title: '系统总体架构：前后端分离的五层架构',
    section: '02 工程架构',
    kind: 'architecture',
    notes: '系统总体采用前后端分离的五层架构。展示层负责交互，接入层负责代理、安全和限流，应用层组织 REST API、认证和校验，服务层承载 AI、热榜、版本、素材和分发能力，数据层由 MySQL、Redis、IndexedDB 和可选 OSS 支撑。',
  },
  {
    title: '前端架构：页面、组件、Hooks、API 分层',
    section: '02 工程架构',
    kind: 'standard',
    bullets: [
      { title: '页面层', body: '创作、发现、详情、搜索、资源、审核、个人中心和后台管理页面由 Umi 路由组织。' },
      { title: '组件层', body: 'RichContentEditor、PromptManager、MaterialManager、AuditPanel、QualityPanel 拆分业务能力。' },
      { title: 'Hooks 层', body: 'useAI、useAutoSave、useOfflineSync 封装生成、自动保存和离线同步副作用。' },
      { title: 'API 层', body: 'requestJson 统一 token 注入、query 序列化、401 refresh 和错误处理。' },
    ],
    notes: '前端不是把逻辑都堆在页面里，而是按页面、组件、Hooks、API 和工具层拆开。这样做的好处是每一层职责清晰，比如 AI 生成和自动保存是副作用，就放在 Hooks 中；接口认证和错误处理则统一收敛到 API 层。',
  },
  {
    title: '后端架构：中间件、控制器、服务、模型',
    section: '02 工程架构',
    kind: 'backend',
    notes: '后端采用 Express REST API，按中间件、控制器、服务和模型分层。请求先经过安全头、跨域、请求 ID、日志、限流和 JWT 鉴权，再由控制器读取上下文并调用服务层。服务层封装业务规则，模型层通过 Sequelize 管理 MySQL。',
  },
  {
    title: '数据与外部依赖：MySQL、Redis、IndexedDB、AI Provider',
    section: '02 工程架构',
    kind: 'dependencies',
    notes: '数据层不是单一数据库。MySQL 保存用户、文章、版本、模板、素材和审核日志；Redis 支撑热榜排序、文章缓存和 AI 限流；IndexedDB 保障离线草稿；AI Provider 统一在后端接入，避免密钥暴露。',
  },
  {
    title: '技术选型与关键设计原则',
    section: '02 工程架构',
    kind: 'matrix',
    matrix: [
      ['前端', 'React 18 / TypeScript / Umi 4 / Ant Design / localForage'],
      ['后端', 'Node.js / Express 5 / Sequelize / Joi / JWT / Winston'],
      ['数据', 'MySQL 8 / Redis ZSET / IndexedDB / OSS 可扩展'],
      ['原则', '前后端分离、AI 密钥隔离、降级兜底、离线优先、安全纵深'],
    ],
    notes: '技术选型围绕平台交付而不是炫技。React 和 Umi 提供前端工程化，Express 和 Sequelize 支撑后端领域服务，Redis 解决高频排序和缓存，localForage 解决离线草稿。关键原则是密钥后端隔离、外部依赖可降级、创作链路不断。',
  },
  {
    title: 'AI 能力封装：文本、图片、审核、评分统一收敛',
    section: '03 关键实现',
    kind: 'ai',
    notes: 'AI 能力统一收敛在后端 ai.service.js 中，前端只调用自有 API。文本生成、审核、质量评分和推荐评分要求模型返回结构化 JSON；图片生成优先 Ark，失败后可切换 ModelScope；密钥缺失时返回本地兜底结果，保证答辩演示不中断。',
  },
  {
    title: '发布流水线：审核、评分、版本、热榜一体化',
    section: '03 关键实现',
    kind: 'flow',
    notes: '发布不是简单改一个状态，而是七阶段流水线。先做前置校验和权限验证，再进入 AI 安全审核；审核不通过则驳回或使用合规替代文本；审核通过后进行质量评分和推荐评分，随后写入文章、创建版本快照，并刷新 Redis 热榜。',
  },
  {
    title: '离线草稿同步：创作不中断的可靠性设计',
    section: '03 关键实现',
    kind: 'sync',
    notes: '创作场景最怕内容丢失，因此我设计了在线自动保存和离线优先策略。在线时定时保存到服务端；网络异常时写入 IndexedDB 并标记 dirty；恢复网络后批量同步，服务端返回 localId 到 serverId 的映射，避免重复创建。',
  },
  {
    title: '热榜排序：质量分、推荐分与用户反馈融合',
    section: '03 关键实现',
    kind: 'ranking',
    notes: '热榜排序引入了内容平台视角，不只按时间或阅读量排序。公式综合质量分、AI 推荐分、阅读量、点赞收藏、负反馈和时间衰减，Redis ZSET 是主路径，MySQL 是降级路径。这样能让优质内容获得基础曝光，同时通过反馈不断调整。',
  },
  {
    title: '数据模型：围绕用户、文章、审核、Prompt、素材组织',
    section: '03 关键实现',
    kind: 'dataModel',
    notes: '系统数据模型围绕四个领域展开：用户与认证、内容创作、AI 审核、Prompt 协作、素材与历史。文章不是孤立表，而是关联版本、反馈、审核日志和用户；Prompt 和素材也都有独立管理与扩展空间。',
  },
  {
    title: '内容安全治理：8 类风险识别与合规替代文本',
    section: '04 平台治理',
    kind: 'governance',
    notes: '这一页贴近字节内容平台场景。系统覆盖涉黄低俗、涉赌、涉毒、政治敏感、暴力恐怖、个人隐私、未成年人风险和虚假夸大营销八类风险。审核不通过时，系统不仅驳回，还能返回合规替代文本，让创作者有明确修改路径。',
  },
  {
    title: '质量评分与推荐潜力：从可发布到值得分发',
    section: '04 平台治理',
    kind: 'quality',
    notes: '安全审核解决的是能不能发布，质量评分解决的是值不值得分发。系统从结构完整性、信息增量、表达流畅度、平台适配度和传播性进行评分，并补充 AI 推荐分与主题标签，让分发排序更有依据。',
  },
  {
    title: '管理后台：平台运营与内容治理能力',
    section: '04 平台治理',
    kind: 'standard',
    bullets: [
      { title: '仪表盘', body: '展示用户、文章、待审、驳回、今日生成等平台核心指标。' },
      { title: '内容治理', body: '文章列表、人工审核、强制撤回、强制删除和文章分析能力。' },
      { title: '资源治理', body: '全量 Prompt 管理、素材风险状态覆盖和审核样本维护。' },
      { title: '系统配置', body: '热榜权重、AI Provider、限流配置和审核类别配置由 admin 管理。' },
    ],
    notes: '为了让项目更接近真实平台，我实现了管理后台。editor 可以管理内容、Prompt、素材和审核，admin 可以进一步管理用户和系统配置。这样既覆盖创作者端，也覆盖运营治理端。',
  },
  {
    title: '模拟分发：连接头条、抖音场景的分发闭环',
    section: '04 平台治理',
    kind: 'distribution',
    notes: '分发能力当前是模拟实现，会返回今日头条和抖音侧的平台内容 ID。这样做的目的是在不依赖真实 Open API 权限的情况下，先把平台内的发布、同步、回执和内容状态闭环打通。后续可以接入真实 OAuth、发布 API 和回调机制。',
  },
  {
    title: '工程交付：测试、E2E、Swagger、Docker Compose',
    section: '05 交付评估',
    kind: 'delivery',
    notes: '工程交付方面，项目提供了 TypeScript 检查、前端单元测试、后端 node --check、后端单元测试、冒烟 E2E 和 Playwright E2E。后端提供 Swagger 文档和健康检查，Docker Compose 支持 MySQL、Redis 和后端一键部署。',
  },
  {
    title: '效果评估：审核样本、质量评分、性能优化',
    section: '05 交付评估',
    kind: 'evaluation',
    notes: '效果评估覆盖审核、质量和性能三类。当前用 30 条人工构造样本验证审核流程，质量评分用 10 类内容场景复核，性能上做了 Umi 分包、首屏图片优先级、懒加载、无限滚动和 Redis 热榜缓存。',
  },
  {
    title: '当前边界与后续演进',
    section: '05 交付评估',
    kind: 'roadmap',
    notes: '项目也有明确边界：真实头条和抖音 Open API 尚未接入，多模态内容级审核还需补齐，长耗时 AI 任务还可以进一步异步化。后续重点是线上部署、审核样本扩充、多模态审核、真实分发和线上观测。',
  },
  {
    title: '总结：完整闭环、工程可信、平台可扩展',
    section: 'SUMMARY',
    kind: 'summary',
    notes: '最后总结一下，本项目的核心价值有三点：第一，业务闭环完整，覆盖创作、审核、发布、消费和反馈；第二，工程设计清晰，前后端分层、AI 服务封装、缓存、离线和测试都有体现；第三，平台可扩展，后续可以继续接入真实分发、多模态审核和线上治理能力。我的汇报结束，谢谢各位老师。',
  },
];

function makeDeck() {
  const deck = new pptxgen();
  deck.layout = 'LAYOUT_WIDE';
  deck.author = pptx.author;
  deck.subject = pptx.subject;
  deck.title = pptx.title;
  deck.company = pptx.company;
  deck.lang = 'zh-CN';
  deck.theme = pptx.theme;
  deck.defineLayout({ name: 'LAYOUT_WIDE', width: SLIDE_W, height: SLIDE_H });
  return deck;
}

function addHeader(deck, slide, title, section, opts = {}) {
  const dark = opts.dark === true;
  slide.addText(section || 'PROJECT DEFENSE', {
    x: 0.62,
    y: 0.32,
    w: 2.8,
    h: 0.22,
    fontFace: FONT,
    fontSize: 7.5,
    bold: true,
    color: dark ? '7DD3FC' : COLORS.blue,
    charSpace: 1.2,
    margin: 0,
  });
  slide.addText(title, {
    x: 0.62,
    y: 0.58,
    w: 10.95,
    h: 0.5,
    fontFace: FONT,
    fontSize: 22,
    bold: true,
    color: dark ? COLORS.white : COLORS.text,
    fit: 'shrink',
    margin: 0,
  });
}

function addFooter(deck, slide, page, dark = false) {
  slide.addText(`AI 创作者辅助生产与分发平台 / ${String(page).padStart(2, '0')}`, {
    x: 0.62,
    y: 7.1,
    w: 3.8,
    h: 0.18,
    fontFace: FONT,
    fontSize: 7.5,
    color: dark ? '8FB3D9' : '8A98AD',
    margin: 0,
  });
  slide.addShape(deck.ShapeType.line, {
    x: 10.7,
    y: 7.18,
    w: 1.25,
    h: 0,
    line: { color: dark ? COLORS.cyan : COLORS.blue, width: 1.2, transparency: 15 },
  });
}

function addTechBackground(deck, slide) {
  slide.background = { color: COLORS.navy };
  slide.addShape(deck.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: SLIDE_H,
    fill: { color: COLORS.navy },
    line: { color: COLORS.navy },
  });
  slide.addShape(deck.ShapeType.arc, {
    x: 9.2,
    y: -1.2,
    w: 5.7,
    h: 5.7,
    line: { color: COLORS.cyan, transparency: 72, width: 1.3 },
  });
  slide.addShape(deck.ShapeType.arc, {
    x: 9.8,
    y: -0.64,
    w: 4.3,
    h: 4.3,
    line: { color: COLORS.purple, transparency: 82, width: 1 },
  });
  slide.addShape(deck.ShapeType.rect, {
    x: 0,
    y: 6.72,
    w: SLIDE_W,
    h: 0.78,
    fill: { color: '020817', transparency: 5 },
    line: { color: '020817', transparency: 100 },
  });
  for (let i = 0; i < 9; i += 1) {
    slide.addShape(deck.ShapeType.line, {
      x: 8.85 + i * 0.42,
      y: 0.15,
      w: 0.55,
      h: 5.7,
      line: { color: '1E3A5F', transparency: 76, width: 0.5 },
    });
  }
}

function addLightBackground(deck, slide) {
  slide.background = { color: COLORS.pale };
  slide.addShape(deck.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: SLIDE_H,
    fill: { color: COLORS.pale },
    line: { color: COLORS.pale },
  });
  slide.addShape(deck.ShapeType.rect, {
    x: 0,
    y: 0,
    w: SLIDE_W,
    h: 0.17,
    fill: { color: COLORS.navy },
    line: { color: COLORS.navy },
  });
  slide.addShape(deck.ShapeType.arc, {
    x: 11.38,
    y: -0.28,
    w: 2.4,
    h: 2.4,
    line: { color: COLORS.blue, transparency: 80, width: 1 },
  });
}

function addCard(deck, slide, x, y, w, h, title, body, opts = {}) {
  const fill = opts.fill || COLORS.white;
  const accent = opts.accent || COLORS.blue;
  slide.addShape(deck.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    rectRadius: 0.1,
    fill: { color: fill, transparency: opts.transparency || 0 },
    line: { color: opts.line || 'E2E8F0', width: 0.8 },
    shadow: opts.shadow === false ? undefined : { type: 'outer', color: 'AAB7C4', opacity: 0.13, blur: 1, angle: 45, distance: 1 },
  });
  slide.addShape(deck.ShapeType.rect, {
    x,
    y,
    w: 0.08,
    h,
    fill: { color: accent },
    line: { color: accent },
  });
  slide.addText(title, {
    x: x + 0.24,
    y: y + 0.18,
    w: w - 0.42,
    h: 0.31,
    fontFace: FONT,
    fontSize: opts.titleSize || 13.2,
    bold: true,
    color: opts.dark ? COLORS.white : COLORS.text,
    fit: 'shrink',
    margin: 0,
  });
  if (body) {
    const bodyY = y + Math.min(0.58, Math.max(0.18, h * 0.48));
    const bodyH = Math.max(0.12, h - (bodyY - y) - 0.12);
    slide.addText(body, {
      x: x + 0.24,
      y: bodyY,
      w: w - 0.42,
      h: bodyH,
      fontFace: FONT,
      fontSize: opts.bodySize || 9.1,
      color: opts.dark ? 'C8D7EA' : COLORS.muted,
      fit: 'shrink',
      valign: 'mid',
      margin: 0.02,
      breakLine: false,
    });
  }
}

function addTag(deck, slide, text, x, y, w, color = COLORS.blue, opts = {}) {
  slide.addShape(deck.ShapeType.roundRect, {
    x,
    y,
    w,
    h: opts.h || 0.32,
    rectRadius: 0.08,
    fill: { color, transparency: opts.transparency || 8 },
    line: { color, transparency: 20 },
  });
  slide.addText(text, {
    x: x + 0.08,
    y: y + 0.075,
    w: w - 0.16,
    h: 0.14,
    fontFace: FONT,
    fontSize: opts.fontSize || 8.5,
    bold: true,
    color: COLORS.white,
    align: 'center',
    margin: 0,
  });
}

function addMetric(slide, value, label, x, y, w, color = COLORS.blue, opts = {}) {
  slide.addText(value, {
    x,
    y,
    w,
    h: opts.valueH || 0.58,
    fontFace: 'Arial Black',
    fontSize: opts.fontSize || 26,
    bold: true,
    color,
    align: 'center',
    margin: 0,
  });
  slide.addText(label, {
    x,
    y: y + (opts.labelY || 0.62),
    w,
    h: 0.25,
    fontFace: FONT,
    fontSize: opts.labelSize || 9.5,
    color: opts.labelColor || COLORS.muted,
    align: 'center',
    margin: 0,
  });
}

function addArrow(deck, slide, x1, y1, x2, y2, color = COLORS.blue, width = 1.2) {
  if (x2 === x1 && y2 < y1) {
    slide.addShape(deck.ShapeType.line, {
      x: x2,
      y: y2,
      w: 0,
      h: y1 - y2,
      line: { color, width, beginArrowType: 'triangle', endArrowType: 'none' },
    });
    return;
  }
  if (x2 < x1) {
    slide.addShape(deck.ShapeType.line, {
      x: x2,
      y: y2,
      w: x1 - x2,
      h: y1 - y2,
      line: { color, width, beginArrowType: 'triangle', endArrowType: 'none' },
    });
    return;
  }
  slide.addShape(deck.ShapeType.line, {
    x: x1,
    y: y1,
    w: x2 - x1,
    h: y2 - y1,
    line: { color, width, beginArrowType: 'none', endArrowType: 'triangle' },
  });
}

function addPillList(deck, slide, items, x, y, w, colors) {
  items.forEach((item, idx) => {
    const yy = y + idx * 0.48;
    slide.addShape(deck.ShapeType.roundRect, {
      x,
      y: yy,
      w,
      h: 0.32,
      rectRadius: 0.08,
      fill: { color: colors[idx % colors.length], transparency: 12 },
      line: { color: colors[idx % colors.length], transparency: 36 },
    });
    slide.addText(item, {
      x: x + 0.12,
      y: yy + 0.08,
      w: w - 0.24,
      h: 0.11,
      fontFace: FONT,
      fontSize: 8.5,
      bold: true,
      color: COLORS.text,
      align: 'center',
      margin: 0,
    });
  });
}

function renderSlide(deck, def, page) {
  const slide = deck.addSlide();
  const dark = ['cover', 'section', 'summary'].includes(def.kind);
  if (dark) addTechBackground(deck, slide);
  else addLightBackground(deck, slide);
  if (def.kind !== 'cover') addHeader(deck, slide, def.title, def.section, { dark });
  const renderer = RENDERERS[def.kind] || renderStandard;
  renderer(deck, slide, def, page);
  addFooter(deck, slide, page, dark);
}

function renderCover(deck, slide) {
  slide.addText('PROJECT DEFENSE', {
    x: 0.72,
    y: 0.78,
    w: 2.4,
    h: 0.24,
    fontFace: FONT,
    fontSize: 8.5,
    bold: true,
    color: COLORS.cyan,
    charSpace: 1.5,
    margin: 0,
  });
  slide.addText('AI 创作者辅助生产\n与分发平台', {
    x: 0.72,
    y: 1.72,
    w: 7.5,
    h: 1.5,
    fontFace: FONT,
    fontSize: 35,
    bold: true,
    color: COLORS.white,
    fit: 'shrink',
    margin: 0,
  });
  slide.addText('从灵感输入、AIGC 生成、内容审核、质量评分到热榜分发的全链路平台', {
    x: 0.76,
    y: 3.55,
    w: 8.2,
    h: 0.38,
    fontFace: FONT,
    fontSize: 14.5,
    color: 'BBD7FF',
    fit: 'shrink',
    margin: 0,
  });
  addTag(deck, slide, '产品闭环', 0.78, 4.36, 1.1, COLORS.blue);
  addTag(deck, slide, '工程架构', 2.05, 4.36, 1.1, COLORS.purple);
  addTag(deck, slide, '内容治理', 3.32, 4.36, 1.1, COLORS.cyan);
  addTag(deck, slide, '交付演进', 4.59, 4.36, 1.1, COLORS.green);
  slide.addShape(deck.ShapeType.roundRect, {
    x: 8.95,
    y: 1.2,
    w: 3.08,
    h: 3.8,
    rectRadius: 0.16,
    fill: { color: '0E2549', transparency: 10 },
    line: { color: COLORS.cyan, transparency: 40, width: 1 },
  });
  ['创作', '审核', '发布', '分发', '反馈'].forEach((label, idx) => {
    const y = 1.62 + idx * 0.61;
    slide.addShape(deck.ShapeType.ellipse, {
      x: 9.38,
      y,
      w: 0.25,
      h: 0.25,
      fill: { color: idx % 2 ? COLORS.purple : COLORS.cyan },
      line: { color: COLORS.white, transparency: 100 },
    });
    slide.addText(label, {
      x: 9.78,
      y: y - 0.01,
      w: 1.7,
      h: 0.22,
      fontFace: FONT,
      fontSize: 11,
      bold: true,
      color: COLORS.white,
      margin: 0,
    });
    if (idx < 4) addArrow(deck, slide, 9.5, y + 0.31, 9.5, y + 0.48, '6EE7F9');
  });
}

function renderStandard(deck, slide, def) {
  const bullets = def.bullets || [];
  bullets.slice(0, 4).forEach((item, idx) => {
    addCard(deck, slide, 0.82 + (idx % 2) * 6.02, 1.55 + Math.floor(idx / 2) * 2.25, 5.35, 1.54, item.title, item.body, {
      accent: item.color || [COLORS.blue, COLORS.purple, COLORS.cyan, COLORS.green][idx % 4],
    });
  });
}

function renderRoles(deck, slide, def) {
  def.roles.forEach(([role, pain], idx) => {
    const x = 0.82 + idx * 4.12;
    slide.addShape(deck.ShapeType.roundRect, {
      x,
      y: 1.68,
      w: 3.55,
      h: 4.25,
      rectRadius: 0.16,
      fill: { color: COLORS.white },
      line: { color: 'DDE7F3', width: 0.8 },
      shadow: { type: 'outer', color: 'AAB7C4', opacity: 0.12, blur: 1, angle: 45, distance: 1 },
    });
    slide.addShape(deck.ShapeType.ellipse, {
      x: x + 1.31,
      y: 2.02,
      w: 0.92,
      h: 0.92,
      fill: { color: [COLORS.blue, COLORS.purple, COLORS.cyan][idx], transparency: 8 },
      line: { color: [COLORS.blue, COLORS.purple, COLORS.cyan][idx], transparency: 40 },
    });
    slide.addText(String(idx + 1), {
      x: x + 1.58,
      y: 2.21,
      w: 0.4,
      h: 0.27,
      fontFace: 'Arial Black',
      fontSize: 18,
      bold: true,
      color: COLORS.white,
      align: 'center',
      margin: 0,
    });
    slide.addText(role, {
      x: x + 0.34,
      y: 3.26,
      w: 2.85,
      h: 0.34,
      fontFace: FONT,
      fontSize: 16,
      bold: true,
      color: COLORS.text,
      align: 'center',
      margin: 0,
    });
    slide.addText(pain, {
      x: x + 0.36,
      y: 3.92,
      w: 2.8,
      h: 1.12,
      fontFace: FONT,
      fontSize: 10.5,
      color: COLORS.muted,
      fit: 'shrink',
      align: 'center',
      valign: 'mid',
      margin: 0.02,
    });
  });
}

function renderPanorama(deck, slide) {
  const nodes = [
    ['Prompt / 素材', 0.82, 2.42, COLORS.blue],
    ['AI 生成', 3.05, 2.42, COLORS.purple],
    ['安全审核', 5.38, 2.42, COLORS.cyan],
    ['质量评分', 7.7, 2.42, COLORS.green],
    ['发布分发', 10.03, 2.42, COLORS.amber],
  ];
  nodes.forEach(([label, x, y, color], idx) => {
    slide.addShape(deck.ShapeType.roundRect, {
      x,
      y,
      w: 1.86,
      h: 0.84,
      rectRadius: 0.12,
      fill: { color, transparency: 5 },
      line: { color, transparency: 8, width: 1 },
    });
    slide.addText(label, {
      x: x + 0.12,
      y: y + 0.26,
      w: 1.62,
      h: 0.18,
      fontFace: FONT,
      fontSize: 11.5,
      bold: true,
      color: COLORS.white,
      align: 'center',
      margin: 0,
    });
    if (idx < nodes.length - 1) addArrow(deck, slide, x + 1.9, y + 0.42, nodes[idx + 1][1] - 0.08, nodes[idx + 1][2] + 0.42, COLORS.blue, 1.1);
  });
  addCard(deck, slide, 1.2, 5.12, 3.0, 0.82, '内容消费与反馈', '发现页、详情页、阅读计数、点赞收藏、负反馈', { accent: COLORS.purple, bodySize: 8.4 });
  addCard(deck, slide, 4.62, 5.12, 3.0, 0.82, '热榜重算', 'Redis ZSET + MySQL fallback，实时更新曝光排序', { accent: COLORS.blue, bodySize: 8.4 });
  addCard(deck, slide, 8.02, 5.12, 3.0, 0.82, '运营治理', '后台管理用户、文章、Prompt、素材、审核和系统配置', { accent: COLORS.green, bodySize: 8.4 });
}

function renderArchitecture(deck, slide) {
  const layers = [
    ['展示层', 'Umi + React + Ant Design，承载创作、消费、后台治理界面'],
    ['接入层', 'Nginx / CDN / Helmet / CORS / Rate Limiter，负责请求入口和安全边界'],
    ['应用层', 'Express REST API、JWT、Joi、Swagger，统一认证、校验和响应'],
    ['服务层', 'AI 服务、热榜服务、版本服务、素材服务、分发服务，封装业务能力'],
    ['数据层', 'MySQL、Redis、IndexedDB、OSS，支撑持久化、缓存、离线和素材存储'],
  ];
  layers.forEach(([name, desc], idx) => {
    const y = 1.36 + idx * 0.96;
    const color = [COLORS.blue, COLORS.purple, COLORS.cyan, COLORS.green, COLORS.amber][idx];
    slide.addShape(deck.ShapeType.roundRect, {
      x: 1.12,
      y,
      w: 10.7,
      h: 0.68,
      rectRadius: 0.12,
      fill: { color: idx % 2 === 0 ? COLORS.white : 'EEF6FF' },
      line: { color: color, transparency: 42, width: 1 },
    });
    slide.addShape(deck.ShapeType.roundRect, {
      x: 1.36,
      y: y + 0.15,
      w: 1.18,
      h: 0.34,
      rectRadius: 0.08,
      fill: { color, transparency: 4 },
      line: { color, transparency: 15 },
    });
    slide.addText(name, { x: 1.44, y: y + 0.24, w: 1.02, h: 0.1, fontFace: FONT, fontSize: 9.5, bold: true, color: COLORS.white, align: 'center', margin: 0 });
    slide.addText(desc, { x: 2.82, y: y + 0.22, w: 8.45, h: 0.22, fontFace: FONT, fontSize: 11, color: COLORS.text, fit: 'shrink', margin: 0 });
  });
}

function renderBackend(deck, slide) {
  const chain = ['中间件', '控制器', '服务层', '模型层', '数据库'];
  chain.forEach((label, idx) => {
    const x = 0.9 + idx * 2.34;
    addCard(deck, slide, x, 2.1, 1.65, 1.0, label, ['安全头/限流/JWT', '参数读取/统一响应', 'AI/热榜/版本/素材', 'Sequelize 实体关联', 'MySQL/Redis'][idx], {
      accent: [COLORS.blue, COLORS.purple, COLORS.cyan, COLORS.green, COLORS.amber][idx],
      titleSize: 12.2,
      bodySize: 8.2,
    });
    if (idx < chain.length - 1) addArrow(deck, slide, x + 1.68, 2.6, x + 2.22, 2.6, COLORS.blue, 1);
  });
  addCard(deck, slide, 1.1, 4.2, 10.8, 1.12, '请求生命周期', 'HTTP Request -> Helmet/CORS -> Request ID/Logger -> Rate Limiter -> requireAuth -> validate -> Controller -> Service -> Model -> ok(res, data)', {
    accent: COLORS.cyan,
    bodySize: 10.5,
  });
}

function renderDependencies(deck, slide) {
  addCard(deck, slide, 4.85, 2.55, 3.35, 1.1, 'Express REST API', '统一承接前端请求、权限上下文、业务服务与响应格式', { accent: COLORS.blue });
  const deps = [
    ['MySQL', '用户 / 文章 / 版本 / 审核日志', 0.85, 2.55, COLORS.green],
    ['Redis', '热榜 ZSET / 缓存 / AI 限流', 9.05, 2.55, COLORS.red],
    ['IndexedDB', '离线草稿队列 / dirty 标记', 4.85, 1.32, COLORS.purple],
    ['AI Provider', 'Ark / ModelScope / 本地兜底', 4.85, 4.78, COLORS.cyan],
  ];
  deps.forEach(([title, body, x, y, color]) => {
    addCard(deck, slide, x, y, 3.25, 1.12, title, body, { accent: color });
  });
  addArrow(deck, slide, 4.75, 3.11, 4.12, 3.11, COLORS.green, 1.05);
  addArrow(deck, slide, 8.25, 3.11, 8.98, 3.11, COLORS.red, 1.05);
  addArrow(deck, slide, 6.52, 2.52, 6.52, 2.05, COLORS.purple, 1.05);
  addArrow(deck, slide, 6.52, 3.68, 6.52, 4.7, COLORS.cyan, 1.05);
}

function renderMatrix(deck, slide, def) {
  def.matrix.forEach(([name, value], idx) => {
    const y = 1.5 + idx * 1.05;
    slide.addShape(deck.ShapeType.roundRect, {
      x: 0.92,
      y,
      w: 11.35,
      h: 0.72,
      rectRadius: 0.08,
      fill: { color: idx % 2 === 0 ? COLORS.white : 'EEF6FF' },
      line: { color: 'D7E2F1' },
    });
    addTag(deck, slide, name, 1.18, y + 0.2, 1.08, [COLORS.blue, COLORS.purple, COLORS.cyan, COLORS.green][idx]);
    slide.addText(value, { x: 2.58, y: y + 0.23, w: 9.0, h: 0.19, fontFace: FONT, fontSize: 11, color: COLORS.text, fit: 'shrink', margin: 0 });
  });
}

function renderAi(deck, slide) {
  const abilities = [
    ['文本生成', '标题、正文、标签，结构化 JSON 返回'],
    ['图片生成', 'Ark Images 优先，ModelScope 兜底'],
    ['安全审核', '8 类风险识别，返回合规替代文本'],
    ['质量评分', '结构、深度、流畅度与推荐潜力'],
    ['生成历史', '记录最近 20 条个人生成结果'],
    ['降级兜底', '密钥缺失或外部失败时保障演示链路'],
  ];
  abilities.forEach(([title, body], idx) => {
    addCard(deck, slide, 0.85 + (idx % 3) * 4.05, 1.5 + Math.floor(idx / 3) * 2.15, 3.4, 1.45, title, body, {
      accent: [COLORS.blue, COLORS.purple, COLORS.cyan, COLORS.green, COLORS.amber, COLORS.red][idx],
      bodySize: 8.8,
    });
  });
}

function renderFlow(deck, slide) {
  const stages = ['前置校验', '权限验证', 'AI 安全审核', '审核分流', '质量评分', '版本快照', '热榜分发'];
  stages.forEach((stage, idx) => {
    const x = 0.62 + idx * 1.8;
    const y = 2.02;
    slide.addShape(deck.ShapeType.roundRect, {
      x,
      y,
      w: 1.32,
      h: 0.86,
      rectRadius: 0.12,
      fill: { color: [COLORS.blue, COLORS.purple, COLORS.cyan, COLORS.green, COLORS.amber, COLORS.red, COLORS.blue][idx], transparency: 4 },
      line: { color: COLORS.white, transparency: 100 },
    });
    slide.addText(String(idx + 1).padStart(2, '0'), { x: x + 0.09, y: y + 0.16, w: 0.36, h: 0.2, fontFace: 'Arial Black', fontSize: 10.5, color: COLORS.white, margin: 0 });
    slide.addText(stage, { x: x + 0.42, y: y + 0.22, w: 0.74, h: 0.22, fontFace: FONT, fontSize: 8.7, bold: true, color: COLORS.white, align: 'center', fit: 'shrink', margin: 0 });
    if (idx < stages.length - 1) addArrow(deck, slide, x + 1.35, y + 0.43, x + 1.72, y + 0.43, COLORS.blue);
  });
  addCard(deck, slide, 1.05, 4.28, 5.35, 0.98, '成功路径', 'published -> 写入 MySQL -> 刷新 Redis 热榜 -> 进入发现页', { accent: COLORS.green, bodySize: 8.4 });
  addCard(deck, slide, 6.95, 4.28, 5.35, 0.98, '风险路径', 'rejected -> 返回 422 -> 展示原因与合规替代文本', { accent: COLORS.red, bodySize: 8.4 });
}

function renderSync(deck, slide) {
  const steps = [
    ['01', '在线保存', '创作页每 30 秒保存草稿，成功后获得或更新 serverId。', COLORS.green],
    ['02', '离线落盘', '网络异常时写入 IndexedDB，标记 dirty=true，避免内容丢失。', COLORS.purple],
    ['03', '恢复同步', '监听 online 事件，按 updatedAt 扫描脏草稿并批量提交。', COLORS.blue],
    ['04', 'ID 回写', '服务端返回 localId -> serverId 映射，本地清除 dirty 标记。', COLORS.cyan],
  ];
  steps.forEach(([num, title, body, color], idx) => {
    const x = 0.86 + idx * 3.05;
    slide.addShape(deck.ShapeType.roundRect, {
      x,
      y: 1.78,
      w: 2.48,
      h: 2.35,
      rectRadius: 0.14,
      fill: { color: COLORS.white },
      line: { color: 'D8E2F0', width: 0.8 },
      shadow: { type: 'outer', color: 'AAB7C4', opacity: 0.12, blur: 1, angle: 45, distance: 1 },
    });
    slide.addShape(deck.ShapeType.ellipse, {
      x: x + 0.2,
      y: 2.0,
      w: 0.48,
      h: 0.48,
      fill: { color, transparency: 4 },
      line: { color, transparency: 20 },
    });
    slide.addText(num, { x: x + 0.29, y: 2.14, w: 0.3, h: 0.1, fontFace: 'Arial Black', fontSize: 9.6, bold: true, color: COLORS.white, align: 'center', margin: 0 });
    slide.addText(title, { x: x + 0.82, y: 2.12, w: 1.25, h: 0.18, fontFace: FONT, fontSize: 12.2, bold: true, color: COLORS.text, margin: 0 });
    slide.addText(body, { x: x + 0.26, y: 2.78, w: 1.98, h: 0.8, fontFace: FONT, fontSize: 8.8, color: COLORS.muted, fit: 'shrink', valign: 'mid', margin: 0.02 });
    addTag(deck, slide, idx === 0 ? 'Creator Page' : idx === 1 ? 'IndexedDB' : idx === 2 ? 'Draft Sync API' : 'MySQL Mapping', x + 0.42, 3.72, 1.58, color, { fontSize: 6.8 });
  });
  addCard(deck, slide, 1.18, 5.12, 10.3, 0.82, '可靠性收益', '网络波动不丢稿；保存失败自动降级本地；恢复网络后批量同步；服务端 ID 回写避免重复创建。', { accent: COLORS.cyan, bodySize: 8.8 });
}

function renderRanking(deck, slide) {
  slide.addShape(deck.ShapeType.roundRect, {
    x: 0.88,
    y: 1.42,
    w: 11.6,
    h: 0.78,
    rectRadius: 0.1,
    fill: { color: COLORS.navy },
    line: { color: COLORS.cyan, transparency: 45 },
  });
  slide.addText('score = quality × 0.35 + ai_rank × 0.25 + ln(view+1) × 0.35 + ln(like+favorite×2+1) × 0.30 - negative × 0.35 - age_hours × 0.20', {
    x: 1.08,
    y: 1.68,
    w: 11.2,
    h: 0.2,
    fontFace: 'Consolas',
    fontSize: 9.2,
    color: COLORS.white,
    fit: 'shrink',
    margin: 0,
  });
  const signals = [
    ['质量分', '基础曝光', COLORS.blue],
    ['AI 推荐分', '平台适配', COLORS.purple],
    ['阅读量', '热度反馈', COLORS.green],
    ['点赞收藏', '正向反馈', COLORS.cyan],
    ['负反馈', '降低曝光', COLORS.red],
    ['时间衰减', '新内容机会', COLORS.amber],
  ];
  signals.forEach(([title, body, color], idx) => {
    addCard(deck, slide, 0.88 + (idx % 3) * 4.0, 2.75 + Math.floor(idx / 3) * 1.48, 3.35, 0.96, title, body, { accent: color, titleSize: 12, bodySize: 8.5 });
  });
}

function renderDataModel(deck, slide) {
  const domains = [
    ['用户与认证', ['users'], 0.85, 1.48, COLORS.blue],
    ['内容创作', ['articles', 'article_versions', 'user_feedbacks'], 4.82, 1.48, COLORS.green],
    ['AI 审核', ['audit_logs', 'audit_manual_annotations', 'audit_reports'], 8.78, 1.48, COLORS.red],
    ['Prompt 协作', ['prompt_templates', 'prompt_versions', 'prompt_teams'], 2.85, 4.38, COLORS.purple],
    ['素材与历史', ['materials', 'generation_histories'], 7.0, 4.38, COLORS.cyan],
  ];
  domains.forEach(([title, items, x, y, color]) => {
    addCard(deck, slide, x, y, 3.25, 1.55, title, items.join('\n'), { accent: color, bodySize: 8.4 });
  });
  slide.addShape(deck.ShapeType.roundRect, {
    x: 4.78,
    y: 3.42,
    w: 3.38,
    h: 0.52,
    rectRadius: 0.08,
    fill: { color: COLORS.navy },
    line: { color: COLORS.cyan, transparency: 40 },
  });
  slide.addText('articles 是内容生命周期中心实体，关联版本、审核、反馈、Prompt 与素材', {
    x: 5.0,
    y: 3.61,
    w: 2.95,
    h: 0.1,
    fontFace: FONT,
    fontSize: 7.6,
    bold: true,
    color: COLORS.white,
    align: 'center',
    fit: 'shrink',
    margin: 0,
  });
}

function renderGovernance(deck, slide) {
  const risks = ['涉黄低俗', '涉赌', '涉毒', '政治敏感', '暴力恐怖', '个人隐私', '未成年人风险', '虚假夸大营销'];
  risks.forEach((risk, idx) => {
    addTag(deck, slide, risk, 0.9 + (idx % 4) * 2.45, 1.5 + Math.floor(idx / 4) * 0.62, 1.82, [COLORS.red, COLORS.amber, COLORS.purple, COLORS.blue][idx % 4], { fontSize: 8.1 });
  });
  const outputs = [
    ['允许发布', 'LOW 风险或合规内容进入质量评分', COLORS.green],
    ['驳回发布', 'HIGH 风险内容返回 422 并保留审核日志', COLORS.red],
    ['合规替代文本', '模型给出安全表达，降低创作者修改成本', COLORS.blue],
    ['一键应用', '前端可直接套用替代文本并再次审核', COLORS.purple],
  ];
  outputs.forEach(([title, body, color], idx) => {
    addCard(deck, slide, 1.0 + (idx % 2) * 5.85, 3.4 + Math.floor(idx / 2) * 1.33, 5.05, 0.95, title, body, { accent: color, bodySize: 8.5 });
  });
}

function renderQuality(deck, slide) {
  const items = [
    ['结构完整性', '标题、开头、主体、结尾清晰', '25%'],
    ['信息增量', '事实、案例、方法或独立观点', '30%'],
    ['表达流畅度', '语言通顺、段落自然', '20%'],
    ['平台适配度', '适合图文内容消费场景', '15%'],
    ['传播性', '钩子、冲突点或行动建议', '10%'],
  ];
  items.forEach(([name, body, weight], idx) => {
    const y = 1.48 + idx * 0.86;
    const color = [COLORS.blue, COLORS.purple, COLORS.cyan, COLORS.green, COLORS.amber][idx];
    slide.addShape(deck.ShapeType.roundRect, {
      x: 1.0,
      y,
      w: 1.28,
      h: 0.55,
      rectRadius: 0.08,
      fill: { color, transparency: 4 },
      line: { color, transparency: 20 },
    });
    slide.addText(weight, { x: 1.15, y: y + 0.18, w: 0.95, h: 0.12, fontFace: 'Arial Black', fontSize: 13, bold: true, color: COLORS.white, align: 'center', margin: 0 });
    slide.addShape(deck.ShapeType.roundRect, {
      x: 2.55,
      y,
      w: 8.95,
      h: 0.55,
      rectRadius: 0.08,
      fill: { color: COLORS.white },
      line: { color: 'D7E2F1', width: 0.8 },
    });
    slide.addShape(deck.ShapeType.rect, { x: 2.55, y, w: 0.07, h: 0.55, fill: { color }, line: { color } });
    slide.addText(name, { x: 2.78, y: y + 0.19, w: 1.45, h: 0.12, fontFace: FONT, fontSize: 9.5, bold: true, color: COLORS.text, margin: 0 });
    slide.addText(body, { x: 4.35, y: y + 0.19, w: 6.7, h: 0.12, fontFace: FONT, fontSize: 8.4, color: COLORS.muted, fit: 'shrink', margin: 0 });
  });
}

function renderDistribution(deck, slide) {
  const columns = [
    ['平台内发布', '文章通过审核与评分后进入 published 状态，并刷新平台热榜。', COLORS.green],
    ['模拟分发服务', '生成头条、抖音侧模拟内容 ID，记录分发结果和回执。', COLORS.blue],
    ['外部平台场景', '为后续 OAuth、发布 API、回调和失败重试预留接口边界。', COLORS.purple],
  ];
  columns.forEach(([title, body, color], idx) => {
    addCard(deck, slide, 1.0 + idx * 4.05, 2.35, 3.3, 1.72, title, body, { accent: color, bodySize: 8.6 });
    addTag(deck, slide, idx === 0 ? 'Article' : idx === 1 ? 'Distribution' : 'Toutiao / Douyin', 1.72 + idx * 4.05, 4.4, 1.85, color, { fontSize: 7.8 });
  });
  addCard(deck, slide, 1.05, 5.2, 10.8, 0.86, '当前边界', '当前为模拟分发，不调用真实头条/抖音 Open API；后续可接 OAuth、发布 API、回调和失败重试。', { accent: COLORS.amber, bodySize: 8.8 });
}

function renderDelivery(deck, slide) {
  const commands = [
    ['TypeScript', 'pnpm run typecheck'],
    ['前端测试', 'pnpm run test:frontend'],
    ['后端检查', 'pnpm --dir ai-creator-backend run check'],
    ['后端测试', 'pnpm --dir ai-creator-backend run test'],
    ['冒烟 E2E', 'pnpm run smoke:e2e'],
    ['部署', 'docker-compose up -d'],
  ];
  commands.forEach(([name, cmd], idx) => {
    addCard(deck, slide, 0.85 + (idx % 3) * 4.05, 1.48 + Math.floor(idx / 3) * 1.74, 3.38, 1.1, name, cmd, { accent: [COLORS.blue, COLORS.purple, COLORS.cyan, COLORS.green, COLORS.amber, COLORS.red][idx], bodySize: 8.4 });
  });
}

function renderEvaluation(deck, slide) {
  addMetric(slide, '30', '审核抽样样本', 0.95, 1.7, 2.1, COLORS.blue, { fontSize: 28 });
  addMetric(slide, '10', '质量评分场景', 3.62, 1.7, 2.1, COLORS.purple, { fontSize: 28 });
  addMetric(slide, '2.5s', 'LCP 验收目标', 6.28, 1.7, 2.1, COLORS.green, { fontSize: 28 });
  addMetric(slide, '600s', '文章缓存 TTL', 8.95, 1.7, 2.1, COLORS.cyan, { fontSize: 28 });
  const rows = [
    ['审核评估', '覆盖正常、高危违规、隐私、虚假营销和边界表达。'],
    ['质量复核', '从结构、信息增量、流畅度、平台适配度和传播性判断评分合理性。'],
    ['性能优化', 'Umi 分包、图片优先级、懒加载、无限滚动和 Redis 热榜缓存。'],
  ];
  rows.forEach(([title, body], idx) => addCard(deck, slide, 1.15 + idx * 3.65, 4.45, 3.05, 1.02, title, body, { accent: [COLORS.blue, COLORS.purple, COLORS.green][idx], bodySize: 8.1 }));
}

function renderRoadmap(deck, slide) {
  const columns = [
    ['P0', '交付可信', ['线上部署地址', '审核样本扩充'], COLORS.red],
    ['P1', '能力补齐', ['视频模型验证', '多模态审核', '真实 Open API 分发'], COLORS.blue],
    ['P2', '生产增强', ['RUM/Sentry 观测', '后台操作审计', 'HttpOnly Cookie'], COLORS.green],
  ];
  columns.forEach(([level, title, items, color], idx) => {
    const x = 0.95 + idx * 4.05;
    slide.addShape(deck.ShapeType.roundRect, { x, y: 1.6, w: 3.3, h: 4.25, rectRadius: 0.14, fill: { color: COLORS.white }, line: { color: 'DAE6F4' } });
    addMetric(slide, level, title, x + 0.38, 1.95, 2.5, color, { fontSize: 24, labelY: 0.56 });
    addPillList(deck, slide, items, x + 0.5, 3.15, 2.3, [color, COLORS.cyan, COLORS.purple]);
  });
}

function renderSummary(deck, slide) {
  slide.addText('完整闭环 / 工程可信 / 平台可扩展', {
    x: 0.8,
    y: 1.32,
    w: 9.0,
    h: 0.55,
    fontFace: FONT,
    fontSize: 25,
    bold: true,
    color: COLORS.white,
    margin: 0,
  });
  const items = [
    ['业务闭环完整', '创作、审核、发布、消费、反馈与后台治理形成端到端链路。'],
    ['工程设计清晰', '前后端分层、AI 服务封装、缓存、离线、权限、测试与部署齐备。'],
    ['平台持续演进', '可继续接入真实分发、多模态审核、异步任务和线上观测。'],
  ];
  items.forEach(([title, body], idx) => addCard(deck, slide, 0.9 + idx * 4.05, 3.0, 3.35, 1.35, title, body, { accent: [COLORS.blue, COLORS.cyan, COLORS.green][idx], fill: COLORS.panel, line: '2D517B', dark: true, bodySize: 8.5 }));
  slide.addText('Thank you for watching', { x: 0.9, y: 5.75, w: 3.8, h: 0.28, fontFace: 'Georgia', fontSize: 14, italic: true, color: 'BBD7FF', margin: 0 });
}

const RENDERERS = {
  cover: renderCover,
  standard: renderStandard,
  roles: renderRoles,
  panorama: renderPanorama,
  architecture: renderArchitecture,
  backend: renderBackend,
  dependencies: renderDependencies,
  matrix: renderMatrix,
  ai: renderAi,
  flow: renderFlow,
  sync: renderSync,
  ranking: renderRanking,
  dataModel: renderDataModel,
  governance: renderGovernance,
  quality: renderQuality,
  distribution: renderDistribution,
  delivery: renderDelivery,
  evaluation: renderEvaluation,
  roadmap: renderRoadmap,
  summary: renderSummary,
};

async function generateDeck(fileName = OUT, slideDefs = SLIDES) {
  const dir = path.dirname(fileName);
  if (dir && dir !== '.' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (fs.existsSync(fileName)) fs.unlinkSync(fileName);
  const deck = makeDeck();
  slideDefs.forEach((slideDef, index) => renderSlide(deck, slideDef, index + 1));
  await deck.writeFile({ fileName });
  if (process.env.AICD_SKIP_NOTES !== '1') {
    enhanceDeckWithPowerPoint(fileName, slideDefs.map((slide) => slide.notes));
  }
  return fileName;
}

function enhanceDeckWithPowerPoint(fileName, notes) {
  if (process.platform !== 'win32') return;
  const fullPath = path.resolve(fileName);
  const notesPath = `${fullPath}.notes.json`;
  fs.writeFileSync(notesPath, JSON.stringify(notes), 'utf8');
  const escapedPath = fullPath.replace(/'/g, "''");
  const escapedNotesPath = notesPath.replace(/'/g, "''");
  const script = `$ErrorActionPreference = 'Stop'
$notes = (Get-Content -LiteralPath '${escapedNotesPath}' -Encoding UTF8 -Raw) | ConvertFrom-Json
$powerpoint = New-Object -ComObject PowerPoint.Application
try {
  $presentation = $powerpoint.Presentations.Open('${escapedPath}', $false, $false, $false)
  if ($presentation.Slides.Count -ne $notes.Count) { throw "slide count $($presentation.Slides.Count) does not match notes count $($notes.Count)" }
  for ($i = 1; $i -le $presentation.Slides.Count; $i++) {
    $slide = $presentation.Slides.Item($i)
    $noteText = [string]$notes[$i - 1]
    $notesPage = $slide.NotesPage
    $placeholder = $notesPage.Shapes.Placeholders.Item(2)
    $placeholder.TextFrame.TextRange.Text = $noteText
    $slide.SlideShowTransition.EntryEffect = 513
    $slide.SlideShowTransition.Duration = 0.45
    $sequence = $slide.TimeLine.MainSequence
    while ($sequence.Count -gt 0) { $sequence.Item(1).Delete() }
    $candidates = New-Object System.Collections.Generic.List[object]
    for ($j = 1; $j -le $slide.Shapes.Count; $j++) {
      $shape = $slide.Shapes.Item($j)
      $hasText = $false
      try { if ($shape.HasTextFrame -and $shape.TextFrame.HasText) { $hasText = $true } } catch {}
      $isContent = $shape.Top -gt 55 -and $shape.Top -lt 500 -and $shape.Width -gt 30 -and $shape.Height -gt 12
      if ($hasText -and $isContent) {
        $row = [math]::Floor(($shape.Top + 6) / 12)
        $candidates.Add([pscustomobject]@{ Shape = $shape; Row = $row; Top = [math]::Round($shape.Top, 1); Left = [math]::Round($shape.Left, 1) })
      }
    }
    $animated = 0
    $sortedCandidates = @($candidates | Sort-Object Row, Left, Top | Select-Object -First 8)
    foreach ($candidate in $sortedCandidates) {
      $effect = $sequence.AddEffect($candidate.Shape, 10, 0, 1)
      $effect.Timing.Duration = 0.35
      $effect.Timing.TriggerDelayTime = 0.08 * $animated
      $animated++
    }
    if ($animated -eq 0) {
      for ($j = 1; $j -le $slide.Shapes.Count; $j++) {
        $shape = $slide.Shapes.Item($j)
        $hasText = $false
        try { if ($shape.HasTextFrame -and $shape.TextFrame.HasText) { $hasText = $true } } catch {}
        if ($hasText -and $shape.Top -gt 40 -and $shape.Top -lt 510) {
          $effect = $sequence.AddEffect($shape, 10, 0, 1)
          $effect.Timing.Duration = 0.35
          break
        }
      }
    }
  }
  $presentation.Save()
  $presentation.Close()
}
finally {
  $powerpoint.Quit()
}`;
  try {
    require('node:child_process').execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { stdio: 'pipe' });
  } finally {
    if (fs.existsSync(notesPath)) fs.unlinkSync(notesPath);
  }
}

function fixPowerPointNotesMasterOrder(fileName) {
  if (process.platform !== 'win32') return;
  const fullPath = path.resolve(fileName);
  const escapedPath = fullPath.replace(/'/g, "''");
  const script = `$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$pptxPath = '${escapedPath}'
$zip = [System.IO.Compression.ZipFile]::Open($pptxPath, [System.IO.Compression.ZipArchiveMode]::Update)
try {
  $entry = $zip.GetEntry('ppt/presentation.xml')
  if ($null -eq $entry) { throw 'ppt/presentation.xml not found' }
  $reader = New-Object System.IO.StreamReader($entry.Open(), [System.Text.Encoding]::UTF8)
  $xml = $reader.ReadToEnd()
  $reader.Dispose()
  $notesMatch = [regex]::Match($xml, '<p:notesMasterIdLst>.*?</p:notesMasterIdLst>')
  if ($notesMatch.Success -and $xml.IndexOf('<p:notesMasterIdLst>') -gt $xml.IndexOf('<p:sldIdLst>')) {
    $notes = $notesMatch.Value
    $xml = $xml.Remove($notesMatch.Index, $notesMatch.Length)
    $insertAt = $xml.IndexOf('<p:sldIdLst>')
    if ($insertAt -lt 0) { throw 'ppt slide id list not found' }
    $xml = $xml.Insert($insertAt, $notes)
    $entry.Delete()
    $newEntry = $zip.CreateEntry('ppt/presentation.xml')
    $writer = New-Object System.IO.StreamWriter($newEntry.Open(), (New-Object System.Text.UTF8Encoding($false)))
    $writer.Write($xml)
    $writer.Dispose()
  }
}
finally {
  $zip.Dispose()
}`;
  require('node:child_process').execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { stdio: 'pipe' });
}

async function main() {
  const fileName = await generateDeck(OUT);
  console.log(`wrote ${fileName} (${SLIDES.length} slides)`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  SLIDES,
  generateDeck,
  fixPowerPointNotesMasterOrder,
  enhanceDeckWithPowerPoint,
};
