# AICD Defense PPT Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 23-slide project defense PowerPoint for the AI creator platform using the provided product introduction template as visual reference.

**Architecture:** Use the approved design spec as the source of truth, inspect the template for visual language, then generate a new `.pptx` with `pptxgenjs`. Keep content and rendering logic in a small output script, include speaker notes for every slide, and verify with content extraction plus visual conversion when available.

**Tech Stack:** Node.js, `pptxgenjs`, PowerPoint `.pptx`, optional Python/LibreOffice/Poppler for QA, project Markdown documentation.

---

## File Structure

- Create: `tools/ppt/aicd-defense-ppt.js`
  - Generates the final deck, slide content, diagrams, and speaker notes.
- Create: `outputs/AICD-Platform-Project-Defense.pptx`
  - Final generated answer deck.
- Optional Create: `outputs/ppt-preview/`
  - Holds rendered PDF/JPEG previews if LibreOffice and Poppler are available.
- Read-only reference: `D:\Browserdownload\产品介绍.pptx`
  - Visual template reference; do not edit the source template.
- Read-only reference: `docs/superpowers/specs/2026-06-09-aicd-defense-ppt-design.md`
  - Approved deck design.
- Read-only references: `README.md`, `docs/architecture.md`, `docs/evaluation-report.md`, `docs/deployment-and-qa.md`, `docs/safety-quality-rules.md`, `D:\桌面\AI创作工作台交付清单\技术方案与架构设计.md`
  - Content source documents.

## Constraints

- Do not modify existing project source code.
- Do not edit `D:\Browserdownload\产品介绍.pptx`.
- Do not commit unless the user explicitly asks for a commit.
- Preserve unrelated uncommitted work in the repository.
- Final PPT must contain 23 slides and speaker notes on every slide.

### Task 1: Inspect Template And Tooling

**Files:**
- Read: `D:\Browserdownload\产品介绍.pptx`
- Read: `package.json`
- Output: terminal findings only

- [ ] **Step 1: Confirm template exists**

Run: `Test-Path -LiteralPath "D:\Browserdownload\产品介绍.pptx"`

Expected: `True`

- [ ] **Step 2: Check pptxgenjs is available**

Run: `node -e "require('pptxgenjs'); console.log('pptxgenjs ok')"`

Expected: `pptxgenjs ok`

- [ ] **Step 3: Extract template text if possible**

Run: `python -m markitdown "D:\Browserdownload\产品介绍.pptx"`

Expected: template text is printed, or command fails because `markitdown` is unavailable. If unavailable, continue with visual/template style inferred from PPTX metadata and generated deck style.

- [ ] **Step 4: Try rendering template thumbnail if available**

Run: `python "C:\Users\xhq\.claude\skills\pptx\scripts\thumbnail.py" "D:\Browserdownload\产品介绍.pptx"`

Expected: a thumbnail image or a clear dependency error. If dependency error occurs, continue without thumbnail and use the template only as a style reference path.

### Task 2: Create Output Script Skeleton

**Files:**
- Create: `tools/ppt/aicd-defense-ppt.js`
- Create directory if needed: `tools/ppt`
- Create directory if needed: `outputs`

- [ ] **Step 1: Create directories**

Run: `if (Test-Path -LiteralPath "tools") { if (-not (Test-Path -LiteralPath "tools\ppt")) { New-Item -ItemType Directory -Path "tools\ppt" | Out-Null } }; if (-not (Test-Path -LiteralPath "outputs")) { New-Item -ItemType Directory -Path "outputs" | Out-Null }; "ready"`

Expected: `ready`

- [ ] **Step 2: Add generator skeleton**

Write `tools/ppt/aicd-defense-ppt.js` with this structure:

```js
const pptxgen = require('pptxgenjs');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'AICD Platform';
pptx.subject = 'AI Creator Platform Project Defense';
pptx.title = 'AI 创作者辅助生产与分发平台项目答辩';
pptx.company = 'AICD Platform';
pptx.lang = 'zh-CN';
pptx.theme = {
  headFontFace: 'Microsoft YaHei',
  bodyFontFace: 'Microsoft YaHei',
  lang: 'zh-CN',
};

const OUT = 'outputs/AICD-Platform-Project-Defense.pptx';

async function main() {
  const slide = pptx.addSlide();
  slide.background = { color: '07111F' };
  slide.addText('AI 创作者辅助生产与分发平台', {
    x: 0.7, y: 2.35, w: 8.8, h: 0.7,
    fontFace: 'Microsoft YaHei', fontSize: 34, bold: true, color: 'FFFFFF', margin: 0,
  });
  slide.addText('项目答辩 PPT 生成脚本初始化', {
    x: 0.75, y: 3.15, w: 6.8, h: 0.35,
    fontFace: 'Microsoft YaHei', fontSize: 16, color: 'A7C7FF', margin: 0,
  });
  slide.addNotes('本页用于验证 PPT 生成脚本可运行，后续任务会替换为完整 23 页内容。');
  await pptx.writeFile({ fileName: OUT });
  console.log(`wrote ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 3: Run generator skeleton**

Run: `node tools/ppt/aicd-defense-ppt.js`

Expected: `wrote outputs/AICD-Platform-Project-Defense.pptx`

### Task 3: Implement Deck Theme And Reusable Drawing Helpers

**Files:**
- Modify: `tools/ppt/aicd-defense-ppt.js`

- [ ] **Step 1: Add constants**

Add these constants near the top of `tools/ppt/aicd-defense-ppt.js`:

```js
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

const COLORS = {
  navy: '07111F',
  navy2: '0D1B33',
  panel: '10213D',
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

const FONT = 'Microsoft YaHei';
```

- [ ] **Step 2: Add layout helpers**

Add these helper functions:

```js
function addHeader(slide, title, section, opts = {}) {
  const dark = opts.dark === true;
  slide.addText(section || 'PROJECT DEFENSE', {
    x: 0.62, y: 0.32, w: 2.8, h: 0.22,
    fontFace: FONT, fontSize: 7.5, bold: true, color: dark ? '7DD3FC' : COLORS.blue,
    charSpace: 1.2, margin: 0,
  });
  slide.addText(title, {
    x: 0.62, y: 0.58, w: 10.6, h: 0.46,
    fontFace: FONT, fontSize: 23, bold: true, color: dark ? COLORS.white : COLORS.text,
    margin: 0,
  });
}

function addFooter(slide, page, dark = false) {
  slide.addText(`AI 创作者辅助生产与分发平台 / ${String(page).padStart(2, '0')}`, {
    x: 0.62, y: 7.1, w: 3.8, h: 0.18,
    fontFace: FONT, fontSize: 7.5, color: dark ? '8FB3D9' : '8A98AD', margin: 0,
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 10.7, y: 7.18, w: 1.25, h: 0,
    line: { color: dark ? COLORS.cyan : COLORS.blue, width: 1.2, transparency: 15 },
  });
}

function addTechBackground(slide) {
  slide.background = { color: COLORS.navy };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
    fill: { color: COLORS.navy }, line: { color: COLORS.navy },
  });
  slide.addShape(pptx.ShapeType.arc, {
    x: 9.2, y: -1.2, w: 5.7, h: 5.7,
    line: { color: COLORS.cyan, transparency: 72, width: 1.3 },
  });
  slide.addShape(pptx.ShapeType.arc, {
    x: 9.8, y: -0.64, w: 4.3, h: 4.3,
    line: { color: COLORS.purple, transparency: 82, width: 1 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.0, y: 6.72, w: SLIDE_W, h: 0.78,
    fill: { color: '020817', transparency: 5 }, line: { color: '020817', transparency: 100 },
  });
}

function addLightBackground(slide) {
  slide.background = { color: COLORS.pale };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE_W, h: SLIDE_H,
    fill: { color: COLORS.pale }, line: { color: COLORS.pale },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE_W, h: 0.17,
    fill: { color: COLORS.navy }, line: { color: COLORS.navy },
  });
}
```

- [ ] **Step 3: Add content helpers**

Add these helper functions:

```js
function addCard(slide, x, y, w, h, title, body, opts = {}) {
  const fill = opts.fill || COLORS.white;
  const accent = opts.accent || COLORS.blue;
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.12,
    fill: { color: fill },
    line: { color: opts.line || 'E2E8F0', width: 0.8 },
    shadow: opts.shadow === false ? undefined : { type: 'outer', color: 'AAB7C4', opacity: 0.12, blur: 1, angle: 45, distance: 1 },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w: 0.08, h,
    fill: { color: accent }, line: { color: accent },
  });
  slide.addText(title, {
    x: x + 0.25, y: y + 0.18, w: w - 0.42, h: 0.28,
    fontFace: FONT, fontSize: opts.titleSize || 13.5, bold: true,
    color: opts.dark ? COLORS.white : COLORS.text, margin: 0,
  });
  slide.addText(body, {
    x: x + 0.25, y: y + 0.58, w: w - 0.42, h: h - 0.72,
    fontFace: FONT, fontSize: opts.bodySize || 9.3,
    color: opts.dark ? 'C8D7EA' : COLORS.muted,
    breakLine: false, fit: 'shrink', valign: 'mid', margin: 0.02,
  });
}

function addTag(slide, text, x, y, w, color = COLORS.blue) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 0.32, rectRadius: 0.08,
    fill: { color, transparency: 8 }, line: { color, transparency: 20 },
  });
  slide.addText(text, {
    x: x + 0.08, y: y + 0.08, w: w - 0.16, h: 0.1,
    fontFace: FONT, fontSize: 8.5, bold: true, color: COLORS.white, align: 'center', margin: 0,
  });
}

function addMetric(slide, value, label, x, y, w, color = COLORS.blue) {
  slide.addText(value, {
    x, y, w, h: 0.58,
    fontFace: 'Arial Black', fontSize: 26, bold: true, color, align: 'center', margin: 0,
  });
  slide.addText(label, {
    x, y: y + 0.62, w, h: 0.25,
    fontFace: FONT, fontSize: 9.5, color: COLORS.muted, align: 'center', margin: 0,
  });
}

function addNotes(slide, notes) {
  slide.addNotes(notes);
}

function addArrow(slide, x1, y1, x2, y2, color = COLORS.blue) {
  slide.addShape(pptx.ShapeType.line, {
    x: x1, y: y1, w: x2 - x1, h: y2 - y1,
    line: { color, width: 1.2, beginArrowType: 'none', endArrowType: 'triangle' },
  });
}
```

- [ ] **Step 4: Run syntax check**

Run: `node --check tools/ppt/aicd-defense-ppt.js`

Expected: no output and exit code 0.

### Task 4: Implement Slide Data And Generation Loop

**Files:**
- Modify: `tools/ppt/aicd-defense-ppt.js`

- [ ] **Step 1: Add slide data array**

Add a `SLIDES` array with 23 objects containing `title`, `section`, `kind`, and `notes`. Use the exact titles from `docs/superpowers/specs/2026-06-09-aicd-defense-ppt-design.md`.

Each notes field must be a complete Chinese speaker note. Example object:

```js
{
  title: 'AI 创作者辅助生产与分发平台',
  section: 'PROJECT DEFENSE',
  kind: 'cover',
  notes: '各位老师好，我本次答辩的项目是 AI 创作者辅助生产与分发平台。这个项目不是单点的 AI 生成工具，而是围绕内容生产、审核、发布、消费和反馈建立的一套全链路平台。接下来我会按照产品价值、工程架构、内容治理和交付演进四个部分展开。',
}
```

- [ ] **Step 2: Replace skeleton `main()`**

Replace `main()` so it clears the initial test slide and calls `renderSlide(slideDef, index)` for all 23 slide definitions:

```js
async function main() {
  SLIDES.forEach((slideDef, index) => renderSlide(slideDef, index + 1));
  await pptx.writeFile({ fileName: OUT });
  console.log(`wrote ${OUT} (${SLIDES.length} slides)`);
}
```

- [ ] **Step 3: Add dispatcher**

Add `renderSlide`:

```js
function renderSlide(def, page) {
  const slide = pptx.addSlide();
  const dark = ['cover', 'section', 'summary'].includes(def.kind);
  if (dark) addTechBackground(slide); else addLightBackground(slide);
  if (def.kind !== 'cover') addHeader(slide, def.title, def.section, { dark });

  const renderer = RENDERERS[def.kind] || renderStandard;
  renderer(slide, def, page);
  addFooter(slide, page, dark);
  addNotes(slide, def.notes);
}
```

- [ ] **Step 4: Add `RENDERERS` map**

Add this object after renderer functions are created in later tasks; for now include standard fallback:

```js
const RENDERERS = {
  cover: renderCover,
  standard: renderStandard,
};
```

- [ ] **Step 5: Run syntax check**

Run: `node --check tools/ppt/aicd-defense-ppt.js`

Expected: no output and exit code 0.

### Task 5: Implement Core Slide Renderers

**Files:**
- Modify: `tools/ppt/aicd-defense-ppt.js`

- [ ] **Step 1: Add cover renderer**

Add `renderCover(slide, def, page)`:

```js
function renderCover(slide, def) {
  slide.addText('PROJECT DEFENSE', {
    x: 0.72, y: 0.78, w: 2.4, h: 0.24,
    fontFace: FONT, fontSize: 8.5, bold: true, color: COLORS.cyan, charSpace: 1.5, margin: 0,
  });
  slide.addText('AI 创作者辅助生产\n与分发平台', {
    x: 0.72, y: 1.78, w: 7.5, h: 1.45,
    fontFace: FONT, fontSize: 35, bold: true, color: COLORS.white,
    breakLine: false, fit: 'shrink', margin: 0,
  });
  slide.addText('从灵感输入、AIGC 生成、内容审核、质量评分到热榜分发的全链路平台', {
    x: 0.76, y: 3.55, w: 7.8, h: 0.38,
    fontFace: FONT, fontSize: 14.5, color: 'BBD7FF', margin: 0,
  });
  addTag(slide, '产品闭环', 0.78, 4.36, 1.1, COLORS.blue);
  addTag(slide, '工程架构', 2.05, 4.36, 1.1, COLORS.purple);
  addTag(slide, '内容治理', 3.32, 4.36, 1.1, COLORS.cyan);
  addTag(slide, '交付演进', 4.59, 4.36, 1.1, COLORS.green);
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 9.0, y: 1.25, w: 3.0, h: 3.7, rectRadius: 0.16,
    fill: { color: '0E2549', transparency: 10 }, line: { color: COLORS.cyan, transparency: 40, width: 1 },
  });
  ['创作', '审核', '发布', '分发', '反馈'].forEach((label, idx) => {
    const y = 1.65 + idx * 0.58;
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 9.38, y, w: 0.24, h: 0.24,
      fill: { color: idx % 2 ? COLORS.purple : COLORS.cyan }, line: { color: COLORS.white, transparency: 100 },
    });
    slide.addText(label, { x: 9.78, y: y - 0.02, w: 1.7, h: 0.22, fontFace: FONT, fontSize: 11, bold: true, color: COLORS.white, margin: 0 });
    if (idx < 4) addArrow(slide, 9.5, y + 0.3, 9.5, y + 0.5, '6EE7F9');
  });
}
```

- [ ] **Step 2: Add standard renderer**

Add `renderStandard(slide, def)`:

```js
function renderStandard(slide, def) {
  const bullets = def.bullets || [];
  bullets.slice(0, 4).forEach((item, idx) => {
    addCard(slide, 0.8 + (idx % 2) * 6.05, 1.55 + Math.floor(idx / 2) * 2.25, 5.35, 1.55, item.title, item.body, {
      accent: item.color || [COLORS.blue, COLORS.purple, COLORS.cyan, COLORS.green][idx % 4],
    });
  });
}
```

- [ ] **Step 3: Add section renderer**

Add `renderSection(slide, def, page)`:

```js
function renderSection(slide, def, page) {
  slide.addText(def.title, {
    x: 0.8, y: 2.25, w: 8.3, h: 0.8,
    fontFace: FONT, fontSize: 31, bold: true, color: COLORS.white, margin: 0,
  });
  slide.addText(def.subtitle || '', {
    x: 0.82, y: 3.15, w: 8.0, h: 0.35,
    fontFace: FONT, fontSize: 14, color: 'BBD7FF', margin: 0,
  });
  addMetric(slide, String(page).padStart(2, '0'), '章节页', 9.7, 2.25, 1.55, COLORS.cyan);
}
```

- [ ] **Step 4: Update `RENDERERS` map**

Set:

```js
const RENDERERS = {
  cover: renderCover,
  standard: renderStandard,
  section: renderSection,
};
```

- [ ] **Step 5: Run generator**

Run: `node tools/ppt/aicd-defense-ppt.js`

Expected: `wrote outputs/AICD-Platform-Project-Defense.pptx (23 slides)`

### Task 6: Implement Specialized Diagram Slides

**Files:**
- Modify: `tools/ppt/aicd-defense-ppt.js`

- [ ] **Step 1: Add architecture renderer**

Add `renderArchitecture(slide, def)` that draws five stacked layers: 展示层、接入层、应用层、服务层、数据层. Each layer uses a rounded rectangle and a short description.

Expected content:

```js
const layers = [
  ['展示层', 'Umi + React + Ant Design，承载创作、消费、后台治理界面'],
  ['接入层', 'Nginx / CDN / Helmet / CORS / Rate Limiter，负责请求入口和安全边界'],
  ['应用层', 'Express REST API、JWT、Joi、Swagger，统一认证、校验和响应'],
  ['服务层', 'AI 服务、热榜服务、版本服务、素材服务、分发服务，封装业务能力'],
  ['数据层', 'MySQL、Redis、IndexedDB、OSS，支撑持久化、缓存、离线和素材存储'],
];
```

- [ ] **Step 2: Add flow renderer**

Add `renderFlow(slide, def)` for slide 12 with seven stages:

```js
['前置校验', '权限验证', 'AI 安全审核', '审核分流', '质量评分', '版本快照', '热榜分发']
```

Draw each stage as a numbered node connected by arrows.

- [ ] **Step 3: Add sync renderer**

Add `renderSync(slide, def)` for slide 13 with three swimlanes: 创作页、IndexedDB、Draft Sync API / MySQL. Show online save, offline persist, dirty draft sync, localId-serverId mapping.

- [ ] **Step 4: Add ranking renderer**

Add `renderRanking(slide, def)` for slide 14. Include formula text:

```text
score = quality_score × 0.35 + ai_rank_score × 0.25 + ln(view+1) × 0.35 + ln(like+favorite×2+1) × 0.30 - negative × 0.35 - age_hours × 0.20
```

Add six signal cards: 质量分、AI 推荐分、阅读量、点赞收藏、负反馈、时间衰减.

- [ ] **Step 5: Add governance renderer**

Add `renderGovernance(slide, def)` for slide 16. Draw 8 risk categories:

```js
['涉黄低俗', '涉赌', '涉毒', '政治敏感', '暴力恐怖', '个人隐私', '未成年人风险', '虚假夸大营销']
```

Show decision outputs: 允许发布、驳回、合规替代文本、一键应用.

- [ ] **Step 6: Add roadmap renderer**

Add `renderRoadmap(slide, def)` for slide 22 with P0/P1/P2 columns:

```js
P0: ['线上部署地址', '审核样本扩充']
P1: ['视频模型验证', '多模态审核', '真实 Open API 分发']
P2: ['RUM/Sentry 观测', '后台操作审计', 'HttpOnly Cookie']
```

- [ ] **Step 7: Update `RENDERERS` map**

Add:

```js
architecture: renderArchitecture,
flow: renderFlow,
sync: renderSync,
ranking: renderRanking,
governance: renderGovernance,
roadmap: renderRoadmap,
```

- [ ] **Step 8: Run generator**

Run: `node tools/ppt/aicd-defense-ppt.js`

Expected: `wrote outputs/AICD-Platform-Project-Defense.pptx (23 slides)`

### Task 7: Fill All 23 Slides With Final Content

**Files:**
- Modify: `tools/ppt/aicd-defense-ppt.js`

- [ ] **Step 1: Populate slide 2-5 content**

Use bullets that cover background, user pain points, goals, and platform capability panorama from the README and technical方案 document.

- [ ] **Step 2: Populate slide 6-10 content**

Use architecture, frontend, backend, data dependency, and technical selection content from `docs/architecture.md` and `技术方案与架构设计.md`.

- [ ] **Step 3: Populate slide 11-15 content**

Use AI service, release pipeline, offline sync, ranking formula, and data model content from `技术方案与架构设计.md`.

- [ ] **Step 4: Populate slide 16-19 content**

Use safety governance, quality scoring, admin backend, and simulated distribution content from `docs/safety-quality-rules.md` and `技术方案与架构设计.md`.

- [ ] **Step 5: Populate slide 20-23 content**

Use delivery, evaluation, roadmap, and summary content from `docs/deployment-and-qa.md`, `docs/evaluation-report.md`, and the approved design spec.

- [ ] **Step 6: Verify notes count by inspecting script data**

Run: `node -e "$s=require('fs').readFileSync('tools/ppt/aicd-defense-ppt.js','utf8'); console.log(($s.match(/notes:/g)||[]).length)"`

Expected: `23`

### Task 8: Generate Final PPT And Content QA

**Files:**
- Create/overwrite: `outputs/AICD-Platform-Project-Defense.pptx`

- [ ] **Step 1: Generate final PPT**

Run: `node tools/ppt/aicd-defense-ppt.js`

Expected: `wrote outputs/AICD-Platform-Project-Defense.pptx (23 slides)`

- [ ] **Step 2: Validate output exists**

Run: `Test-Path -LiteralPath "outputs\AICD-Platform-Project-Defense.pptx"`

Expected: `True`

- [ ] **Step 3: Extract text for content QA if markitdown is available**

Run: `python -m markitdown "outputs\AICD-Platform-Project-Defense.pptx"`

Expected: text includes all 23 slide titles. If unavailable, inspect with unzip/XML or skip with recorded dependency limitation.

- [ ] **Step 4: Check placeholder text**

Run: `rg -i "xxxx|lorem|ipsum|TODO|TBD|占位" "tools/ppt/aicd-defense-ppt.js"`

Expected: no matches.

### Task 9: Visual QA And Fix Loop

**Files:**
- Read: `outputs/AICD-Platform-Project-Defense.pptx`
- Optional Create: `outputs/ppt-preview/`
- Modify if needed: `tools/ppt/aicd-defense-ppt.js`

- [ ] **Step 1: Try converting PPTX to PDF**

Run: `python "C:\Users\xhq\.claude\skills\pptx\scripts\office\soffice.py" --headless --convert-to pdf "outputs\AICD-Platform-Project-Defense.pptx" --outdir "outputs\ppt-preview"`

Expected: a PDF in `outputs/ppt-preview`, or a clear dependency error if LibreOffice is unavailable.

- [ ] **Step 2: Try converting PDF to JPEG previews**

Run: `pdftoppm -jpeg -r 150 "outputs\ppt-preview\AICD-Platform-Project-Defense.pdf" "outputs\ppt-preview\slide"`

Expected: `slide-01.jpg` through `slide-23.jpg`, or a clear dependency error if Poppler is unavailable.

- [ ] **Step 3: Inspect previews if generated**

Check all generated slide images for overlapping elements, text overflow, low contrast, and missing content. Record issues by slide number.

- [ ] **Step 4: Fix any issues**

Modify `tools/ppt/aicd-defense-ppt.js` to adjust text size, spacing, or layout only for affected slides.

- [ ] **Step 5: Regenerate and re-check affected slides**

Run: `node tools/ppt/aicd-defense-ppt.js`

Expected: `wrote outputs/AICD-Platform-Project-Defense.pptx (23 slides)`

If PDF/JPEG conversion is available, rerun conversion and inspect affected slides.

### Task 10: Final Report

**Files:**
- Read: `outputs/AICD-Platform-Project-Defense.pptx`
- Read: `tools/ppt/aicd-defense-ppt.js`

- [ ] **Step 1: Confirm generated file and size**

Run: `Get-Item -LiteralPath "outputs\AICD-Platform-Project-Defense.pptx" | Format-List Name,Length,LastWriteTime`

Expected: file metadata is printed.

- [ ] **Step 2: Report QA status**

Final response should include:

- Output path.
- Slide count.
- Speaker notes status.
- Content QA status.
- Visual QA status or dependency limitation.
- Any files created.

## Self-Review Notes

- Spec coverage: The plan covers template reference, 23-slide generation, speaker notes, visual style, content QA, visual QA, and final reporting.
- Placeholder scan: Plan intentionally contains the word `占位` only in the placeholder-check command and QA language, not as unfinished work.
- Scope: This is a single deliverable, not multiple independent subsystems.
