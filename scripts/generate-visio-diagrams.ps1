$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $repoRoot "docs\diagrams"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$script:PageWidth = 13.33
$script:PageHeight = 7.5

function ToVisioY([double]$y) {
  return $script:PageHeight - $y
}

function Set-ShapeStyle($shape, [string]$fill, [string]$line = "4F5B67", [double]$weight = 1.0) {
  $shape.CellsU("FillForegnd").FormulaU = "RGB($([Convert]::ToInt32($fill.Substring(0,2),16)),$([Convert]::ToInt32($fill.Substring(2,2),16)),$([Convert]::ToInt32($fill.Substring(4,2),16)))"
  $shape.CellsU("LineColor").FormulaU = "RGB($([Convert]::ToInt32($line.Substring(0,2),16)),$([Convert]::ToInt32($line.Substring(2,2),16)),$([Convert]::ToInt32($line.Substring(4,2),16)))"
  $shape.CellsU("LineWeight").FormulaU = "$weight pt"
}

function Set-TextStyle($shape, [int]$size = 11, [int]$bold = 0, [string]$color = "1F2933") {
  $shape.CellsU("Char.Size").FormulaU = "$size pt"
  $shape.CellsU("Char.Style").FormulaU = "$bold"
  $shape.CellsU("Char.Color").FormulaU = "RGB($([Convert]::ToInt32($color.Substring(0,2),16)),$([Convert]::ToInt32($color.Substring(2,2),16)),$([Convert]::ToInt32($color.Substring(4,2),16)))"
  $shape.CellsU("Para.HorzAlign").FormulaU = "1"
  $shape.CellsU("VerticalAlign").FormulaU = "1"
  $shape.CellsU("TextMarginLeft").FormulaU = "0.08 in"
  $shape.CellsU("TextMarginRight").FormulaU = "0.08 in"
  $shape.CellsU("TextMarginTop").FormulaU = "0.04 in"
  $shape.CellsU("TextMarginBottom").FormulaU = "0.04 in"
}

function Add-Box($page, [string]$text, [double]$x, [double]$y, [double]$w, [double]$h, [string]$fill = "FFFFFF", [string]$line = "4F5B67", [int]$size = 11, [int]$bold = 0) {
  $shape = $page.DrawRectangle($x, (ToVisioY ($y + $h)), ($x + $w), (ToVisioY $y))
  $shape.Text = $text
  Set-ShapeStyle $shape $fill $line 1.0
  Set-TextStyle $shape $size $bold
  return $shape
}

function Add-Header($page, [string]$text, [double]$x, [double]$y, [double]$w, [string]$fill = "243B53") {
  $shape = Add-Box $page $text $x $y $w 0.38 $fill $fill 12 1
  Set-TextStyle $shape 12 1 "FFFFFF"
  return $shape
}

function Add-Line($page, [double]$x1, [double]$y1, [double]$x2, [double]$y2, [string]$color = "627D98", [double]$weight = 1.1, [bool]$arrow = $true) {
  $line = $page.DrawLine($x1, (ToVisioY $y1), $x2, (ToVisioY $y2))
  $line.CellsU("LineColor").FormulaU = "RGB($([Convert]::ToInt32($color.Substring(0,2),16)),$([Convert]::ToInt32($color.Substring(2,2),16)),$([Convert]::ToInt32($color.Substring(4,2),16)))"
  $line.CellsU("LineWeight").FormulaU = "$weight pt"
  if ($arrow) {
    $line.CellsU("EndArrow").FormulaU = "13"
  }
  return $line
}

function Add-Label($page, [string]$text, [double]$x, [double]$y, [double]$w, [double]$h, [int]$size = 10, [string]$color = "334E68") {
  $shape = $page.DrawRectangle($x, (ToVisioY ($y + $h)), ($x + $w), (ToVisioY $y))
  $shape.Text = $text
  $shape.CellsU("FillPattern").FormulaU = "0"
  $shape.CellsU("LinePattern").FormulaU = "0"
  Set-TextStyle $shape $size 0 $color
  return $shape
}

function Setup-Page($page, [string]$name, [string]$title) {
  $page.Name = $name
  $page.PageSheet.CellsU("PageWidth").FormulaU = "$script:PageWidth in"
  $page.PageSheet.CellsU("PageHeight").FormulaU = "$script:PageHeight in"
  Add-Label $page $title 0.28 0.12 12.8 0.35 17 "102A43" | Out-Null
  Add-Line $page 0.28 0.58 13.05 0.58 "BCCCDC" 1.0 $false | Out-Null
}

function Export-Page($page, [string]$fileName) {
  $svg = Join-Path $outDir $fileName
  if (Test-Path $svg) { Remove-Item $svg -Force }
  $page.Export($svg)
}

$visio = New-Object -ComObject Visio.Application
$visio.Visible = $false
$doc = $visio.Documents.Add("")

try {
  $page = $doc.Pages.Item(1)
  Setup-Page $page "3.1 架构风格" "3.1 架构风格：前后端分离 + 分层服务 + 多存储协同"
  Add-Header $page "用户角色" 0.4 0.9 2.2 | Out-Null
  Add-Box $page "游客/读者`n内容浏览、搜索、反馈" 0.4 1.45 2.2 0.75 "F0F4F8" "9FB3C8" | Out-Null
  Add-Box $page "创作者`nAI 生成、草稿、发布" 0.4 2.45 2.2 0.75 "E0F2FE" "4098D7" | Out-Null
  Add-Box $page "编辑/管理员`n审核治理、系统配置" 0.4 3.45 2.2 0.75 "FCEFC7" "F0B429" | Out-Null

  Add-Header $page "前端 SPA" 3.1 0.9 2.55 "0F609B" | Out-Null
  Add-Box $page "Umi 路由与 Layout" 3.1 1.35 2.55 0.45 "E6F6FF" "4098D7" | Out-Null
  Add-Box $page "页面：发现 / 创作 / 详情 / 后台" 3.1 1.95 2.55 0.6 "E6F6FF" "4098D7" | Out-Null
  Add-Box $page "组件与 Hooks`nEditor / Prompt / Material / Audit" 3.1 2.7 2.55 0.7 "E6F6FF" "4098D7" | Out-Null
  Add-Box $page "API 封装 requestJson`ntoken + refresh + domain APIs" 3.1 3.55 2.55 0.75 "E6F6FF" "4098D7" | Out-Null
  Add-Box $page "IndexedDB 离线草稿" 3.1 4.55 2.55 0.5 "F0F4F8" "9FB3C8" | Out-Null

  Add-Header $page "后端 REST API" 6.15 0.9 2.8 "486581" | Out-Null
  Add-Box $page "Express 请求管线`nHelmet / CORS / Logger / RateLimit" 6.15 1.35 2.8 0.65 "F0F4F8" "627D98" | Out-Null
  Add-Box $page "鉴权与校验`nAuth / Staff / Admin / Joi" 6.15 2.15 2.8 0.62 "F0F4F8" "627D98" | Out-Null
  Add-Box $page "控制器`nAuth / AI / Article / Admin" 6.15 2.92 2.8 0.62 "F0F4F8" "627D98" | Out-Null
  Add-Box $page "领域服务`nAI / Ranking / DraftSync / Version" 6.15 3.68 2.8 0.72 "F0F4F8" "627D98" | Out-Null
  Add-Box $page "Sequelize 模型层" 6.15 4.55 2.8 0.5 "F0F4F8" "627D98" | Out-Null

  Add-Header $page "数据与外部能力" 9.45 0.9 3.35 "334E68" | Out-Null
  Add-Box $page "MySQL`n用户、文章、版本、素材、审核" 9.45 1.35 1.55 0.8 "E3F8FF" "4098D7" | Out-Null
  Add-Box $page "Redis`n热榜、缓存、限流、配置" 11.25 1.35 1.55 0.8 "FFFBEA" "F0B429" | Out-Null
  Add-Box $page "Ark / ModelScope`n生成、审核、评分、多模态" 9.45 2.45 3.35 0.8 "EAE2F8" "805AD5" | Out-Null
  Add-Box $page "uploads / OSS`n图片与素材文件" 9.45 3.55 1.55 0.75 "E3FCEC" "2F855A" | Out-Null
  Add-Box $page "模拟分发`nToutiao / Douyin mock id" 11.25 3.55 1.55 0.75 "FCEFC7" "D69E2E" | Out-Null

  Add-Line $page 2.6 2.8 3.1 2.2 | Out-Null
  Add-Line $page 5.65 2.55 6.15 2.55 | Out-Null
  Add-Line $page 8.95 3.1 9.45 2.85 | Out-Null
  Add-Line $page 8.95 4.8 9.45 1.75 | Out-Null
  Export-Page $page "3-1-architecture-style.svg"

  $page = $doc.Pages.Add()
  Setup-Page $page "3.4 部署视图" "3.4 部署视图：开发代理、生产静态站点、后端容器与外部 AI"
  Add-Box $page "浏览器" 5.75 0.95 1.8 0.55 "F0F4F8" "627D98" 12 1 | Out-Null
  Add-Header $page "开发环境" 0.55 1.75 3.5 "0F609B" | Out-Null
  Add-Box $page "Umi Dev Server`nlocalhost:8000" 0.75 2.25 3.1 0.75 "E6F6FF" "4098D7" | Out-Null
  Add-Box $page "Umi proxy`n/api /uploads -> :3000" 0.75 3.25 3.1 0.75 "E6F6FF" "4098D7" | Out-Null
  Add-Header $page "生产环境" 4.9 1.75 3.5 "334E68" | Out-Null
  Add-Box $page "CDN / Nginx 静态站点" 5.1 2.25 3.1 0.65 "F0F4F8" "627D98" | Out-Null
  Add-Box $page "dist 前端产物" 5.1 3.08 3.1 0.55 "F0F4F8" "627D98" | Out-Null
  Add-Box $page "Nginx 反向代理`n/api -> backend" 5.1 3.85 3.1 0.75 "F0F4F8" "627D98" | Out-Null
  Add-Header $page "docker-compose / 后端" 9.25 1.75 3.5 "486581" | Out-Null
  Add-Box $page "aicd-backend`nNode.js 18 + Express :3000" 9.45 2.25 3.1 0.8 "F0F4F8" "627D98" | Out-Null
  Add-Box $page "aicd-mysql`nMySQL 8.0 3307:3306" 9.45 3.35 1.45 0.8 "E3F8FF" "4098D7" | Out-Null
  Add-Box $page "aicd-redis`nRedis 7 6380:6379" 11.1 3.35 1.45 0.8 "FFFBEA" "F0B429" | Out-Null
  Add-Box $page "健康检查`n/api/v1/health" 9.45 4.45 1.45 0.65 "E3FCEC" "2F855A" | Out-Null
  Add-Box $page "uploads / OSS" 11.1 4.45 1.45 0.65 "E3FCEC" "2F855A" | Out-Null
  Add-Box $page "Ark / ModelScope`n外部 AI 服务" 9.45 5.45 3.1 0.75 "EAE2F8" "805AD5" | Out-Null
  Add-Line $page 5.75 1.25 2.45 2.25 | Out-Null
  Add-Line $page 5.75 1.25 6.65 2.25 | Out-Null
  Add-Line $page 3.85 3.63 9.45 2.65 | Out-Null
  Add-Line $page 8.2 4.2 9.45 2.65 | Out-Null
  Add-Line $page 11.0 3.05 10.2 3.35 | Out-Null
  Add-Line $page 11.0 3.05 11.85 3.35 | Out-Null
  Add-Line $page 11.0 3.05 10.2 4.45 | Out-Null
  Add-Line $page 11.0 3.05 11.85 4.45 | Out-Null
  Add-Line $page 11.0 3.05 11.0 5.45 | Out-Null
  Export-Page $page "3-4-deployment-view.svg"

  $page = $doc.Pages.Add()
  Setup-Page $page "5.1 前端模块依赖" "5.1 前端模块依赖：应用壳层、页面、创作域、API 层分开阅读"
  Add-Header $page "应用壳层" 0.45 0.95 2.45 "243B53" | Out-Null
  Add-Box $page "Umi 路由 .umirc.ts" 0.65 1.45 2.05 0.48 "F0F4F8" "627D98" | Out-Null
  Add-Box $page "全局 Layout / 后台 Layout" 0.65 2.1 2.05 0.55 "F0F4F8" "627D98" | Out-Null
  Add-Box $page "Auth / Staff / Admin Wrapper" 0.65 2.85 2.05 0.55 "F0F4F8" "627D98" | Out-Null
  Add-Box $page "models/auth`nlocalStorage token" 0.65 3.6 2.05 0.65 "FCEFC7" "D69E2E" | Out-Null
  Add-Header $page "页面层" 3.35 0.95 2.85 "0F609B" | Out-Null
  Add-Box $page "发现 / 搜索 / 详情" 3.55 1.45 2.45 0.5 "E6F6FF" "4098D7" | Out-Null
  Add-Box $page "创作工作台 creator" 3.55 2.15 2.45 0.5 "E6F6FF" "4098D7" | Out-Null
  Add-Box $page "资源 / 审核 / 个人中心" 3.55 2.85 2.45 0.5 "E6F6FF" "4098D7" | Out-Null
  Add-Box $page "管理后台 admin/*" 3.55 3.55 2.45 0.5 "E6F6FF" "4098D7" | Out-Null
  Add-Header $page "创作域组件与 Hooks" 6.65 0.95 3.0 "2F855A" | Out-Null
  Add-Box $page "RichContentEditor" 6.85 1.45 1.25 0.45 "E3FCEC" "2F855A" | Out-Null
  Add-Box $page "PromptManager" 8.2 1.45 1.25 0.45 "E3FCEC" "2F855A" | Out-Null
  Add-Box $page "MaterialManager`nImageRefineModal" 6.85 2.1 2.6 0.58 "E3FCEC" "2F855A" | Out-Null
  Add-Box $page "Audit / Quality / Preview" 6.85 2.9 2.6 0.55 "E3FCEC" "2F855A" | Out-Null
  Add-Box $page "useAI / useAutoSave / useOfflineSync" 6.85 3.65 2.6 0.6 "E3FCEC" "2F855A" | Out-Null
  Add-Box $page "IndexedDB offlineDraft" 6.85 4.48 2.6 0.5 "F0F4F8" "9FB3C8" | Out-Null
  Add-Header $page "API 层" 10.15 0.95 2.75 "805AD5" | Out-Null
  Add-Box $page "services/api/index.ts" 10.35 1.45 2.35 0.48 "EAE2F8" "805AD5" | Out-Null
  Add-Box $page "auth / ai / articles / resources" 10.35 2.15 2.35 0.65 "EAE2F8" "805AD5" | Out-Null
  Add-Box $page "client.ts requestJson`ntoken + refresh" 10.35 3.05 2.35 0.7 "EAE2F8" "805AD5" | Out-Null
  Add-Box $page "/api/v1 REST" 10.35 4.05 2.35 0.55 "F0F4F8" "627D98" | Out-Null
  Add-Line $page 2.7 2.4 3.55 2.4 | Out-Null
  Add-Line $page 6.0 2.4 6.85 2.35 | Out-Null
  Add-Line $page 9.45 2.75 10.35 2.47 | Out-Null
  Add-Line $page 9.45 4.0 10.35 3.4 | Out-Null
  Add-Line $page 11.5 3.75 11.5 4.05 | Out-Null
  Export-Page $page "5-1-frontend-dependencies.svg"

  $page = $doc.Pages.Add()
  Setup-Page $page "5.2 后端模块依赖" "5.2 后端模块依赖：请求管线到领域服务，再到模型与基础设施"
  Add-Box $page "app.js`nExpress 应用入口" 0.55 1.1 1.9 0.7 "F0F4F8" "627D98" 11 1 | Out-Null
  Add-Header $page "全局中间件" 2.8 0.95 2.15 "243B53" | Out-Null
  Add-Box $page "helmet / cors" 3.0 1.45 1.75 0.42 "F0F4F8" "627D98" | Out-Null
  Add-Box $page "json / raw upload" 3.0 2.0 1.75 0.42 "F0F4F8" "627D98" | Out-Null
  Add-Box $page "requestId / logger" 3.0 2.55 1.75 0.42 "F0F4F8" "627D98" | Out-Null
  Add-Box $page "rate-limit / docs / uploads" 3.0 3.1 1.75 0.55 "F0F4F8" "627D98" | Out-Null
  Add-Header $page "路由守卫" 5.4 0.95 2.0 "0F609B" | Out-Null
  Add-Box $page "Joi validate" 5.58 1.45 1.62 0.42 "E6F6FF" "4098D7" | Out-Null
  Add-Box $page "requireAuth" 5.58 2.0 1.62 0.42 "E6F6FF" "4098D7" | Out-Null
  Add-Box $page "Staff / Admin" 5.58 2.55 1.62 0.42 "E6F6FF" "4098D7" | Out-Null
  Add-Box $page "AI rate limiter" 5.58 3.1 1.62 0.42 "E6F6FF" "4098D7" | Out-Null
  Add-Header $page "控制器" 7.8 0.95 2.25 "2F855A" | Out-Null
  Add-Box $page "Auth / User" 8.0 1.45 1.85 0.42 "E3FCEC" "2F855A" | Out-Null
  Add-Box $page "AI / Article / Rank" 8.0 2.0 1.85 0.42 "E3FCEC" "2F855A" | Out-Null
  Add-Box $page "Prompt / Material / Upload" 8.0 2.55 1.85 0.5 "E3FCEC" "2F855A" | Out-Null
  Add-Box $page "Audit / Admin / System" 8.0 3.2 1.85 0.5 "E3FCEC" "2F855A" | Out-Null
  Add-Header $page "领域服务" 10.45 0.95 2.25 "805AD5" | Out-Null
  Add-Box $page "AI Service" 10.65 1.45 1.85 0.42 "EAE2F8" "805AD5" | Out-Null
  Add-Box $page "Ranking Service" 10.65 2.0 1.85 0.42 "EAE2F8" "805AD5" | Out-Null
  Add-Box $page "DraftSync / Version" 10.65 2.55 1.85 0.42 "EAE2F8" "805AD5" | Out-Null
  Add-Box $page "Material / Distribution" 10.65 3.1 1.85 0.5 "EAE2F8" "805AD5" | Out-Null
  Add-Header $page "模型与基础设施" 2.8 4.45 9.9 "334E68" | Out-Null
  Add-Box $page "Sequelize Models`nUser / Article / Prompt / Material / Audit" 3.0 4.95 2.8 0.8 "F0F4F8" "627D98" | Out-Null
  Add-Box $page "MySQL" 6.15 5.0 1.4 0.55 "E3F8FF" "4098D7" | Out-Null
  Add-Box $page "Redis" 7.9 5.0 1.4 0.55 "FFFBEA" "F0B429" | Out-Null
  Add-Box $page "Ark / ModelScope" 9.65 5.0 1.45 0.55 "EAE2F8" "805AD5" | Out-Null
  Add-Box $page "uploads / OSS" 11.35 5.0 1.15 0.55 "E3FCEC" "2F855A" | Out-Null
  Add-Line $page 2.45 1.45 3.0 1.65 | Out-Null
  Add-Line $page 4.75 2.45 5.58 2.45 | Out-Null
  Add-Line $page 7.2 2.45 8.0 2.45 | Out-Null
  Add-Line $page 9.85 2.45 10.65 2.45 | Out-Null
  Add-Line $page 11.55 3.6 4.4 4.95 | Out-Null
  Add-Line $page 4.4 5.75 6.15 5.28 | Out-Null
  Add-Line $page 11.55 2.2 7.9 5.0 | Out-Null
  Add-Line $page 11.55 1.65 9.65 5.0 | Out-Null
  Add-Line $page 11.55 3.35 11.35 5.0 | Out-Null
  Export-Page $page "5-2-backend-dependencies.svg"

  $page = $doc.Pages.Add()
  Setup-Page $page "7.1 领域实体关系" "7.1 领域实体关系：以 User、Article、Prompt 三条主线组织"
  Add-Box $page "users`n账号、角色、状态" 5.55 0.95 2.2 0.65 "FCEFC7" "D69E2E" 12 1 | Out-Null
  Add-Box $page "articles`n草稿/发布/驳回/撤回" 5.55 2.05 2.2 0.75 "E6F6FF" "4098D7" 12 1 | Out-Null
  Add-Box $page "article_versions`n保存/发布/同步/撤回快照" 2.4 2.05 2.25 0.75 "E6F6FF" "4098D7" | Out-Null
  Add-Box $page "user_feedbacks`n点赞/收藏/负反馈" 8.7 2.05 2.25 0.75 "E6F6FF" "4098D7" | Out-Null
  Add-Box $page "audit_logs`nAI/人工审核留痕" 5.55 3.25 2.2 0.65 "FCEFC7" "D69E2E" | Out-Null
  Add-Box $page "materials`nURL/上传/风险状态" 0.65 1.0 2.2 0.65 "E3FCEC" "2F855A" | Out-Null
  Add-Box $page "generation_histories`n个人生成记录" 0.65 3.25 2.2 0.65 "EAE2F8" "805AD5" | Out-Null
  Add-Box $page "prompt_teams`n协作团队" 10.5 0.95 2.1 0.62 "E3F8FF" "4098D7" | Out-Null
  Add-Box $page "prompt_team_members`n成员与角色" 10.5 1.9 2.1 0.62 "E3F8FF" "4098D7" | Out-Null
  Add-Box $page "prompt_templates`n私有/系统/团队模板" 10.5 2.85 2.1 0.72 "E3F8FF" "4098D7" | Out-Null
  Add-Box $page "prompt_template_versions`n模板版本" 10.5 3.9 2.1 0.62 "E3F8FF" "4098D7" | Out-Null
  Add-Box $page "audit_manual_annotations`n人工标注样本" 4.35 4.75 2.4 0.72 "FCEFC7" "D69E2E" | Out-Null
  Add-Box $page "audit_evaluation_reports`n准确率/召回率/F1" 7.25 4.75 2.4 0.72 "FCEFC7" "D69E2E" | Out-Null
  Add-Line $page 6.65 1.6 6.65 2.05 | Out-Null
  Add-Line $page 5.55 2.42 4.65 2.42 | Out-Null
  Add-Line $page 7.75 2.42 8.7 2.42 | Out-Null
  Add-Line $page 6.65 2.8 6.65 3.25 | Out-Null
  Add-Line $page 5.55 1.25 2.85 1.33 | Out-Null
  Add-Line $page 5.55 1.35 2.85 3.55 | Out-Null
  Add-Line $page 7.75 1.2 10.5 1.25 | Out-Null
  Add-Line $page 11.55 1.57 11.55 1.9 | Out-Null
  Add-Line $page 11.55 2.52 11.55 2.85 | Out-Null
  Add-Line $page 11.55 3.57 11.55 3.9 | Out-Null
  Add-Line $page 6.65 3.9 5.55 4.75 | Out-Null
  Add-Line $page 6.65 3.9 8.45 4.75 | Out-Null
  Add-Line $page 7.75 2.55 5.55 4.75 | Out-Null
  Export-Page $page "7-1-domain-entities.svg"

  $page = $doc.Pages.Add()
  Setup-Page $page "8.4 发布与内容治理" "8.4 发布与内容治理：审核、自动修复、评分、版本、热榜闭环"
  Add-Box $page "1 创作者点击`n审核并发布" 0.55 1.55 1.55 0.7 "F0F4F8" "627D98" | Out-Null
  Add-Box $page "2 前端校验`n标题/正文/分类" 2.45 1.55 1.65 0.7 "E6F6FF" "4098D7" | Out-Null
  Add-Box $page "3 Article API`nupsertDraft" 4.45 1.55 1.65 0.7 "F0F4F8" "627D98" | Out-Null
  Add-Box $page "4 AI 审核`nauditContent" 6.45 1.55 1.65 0.7 "EAE2F8" "805AD5" | Out-Null
  Add-Box $page "5 不合规？`nauto_fix + safe_alternative" 6.45 2.75 1.65 0.82 "FCEFC7" "D69E2E" | Out-Null
  Add-Box $page "6 质量评分`n推荐潜力评分" 8.45 1.55 1.65 0.7 "EAE2F8" "805AD5" | Out-Null
  Add-Box $page "7 写入 MySQL`narticle + version" 10.45 1.55 1.65 0.7 "E3F8FF" "4098D7" | Out-Null
  Add-Box $page "8 刷新 Redis`n热榜/缓存" 10.45 2.75 1.65 0.7 "FFFBEA" "F0B429" | Out-Null
  Add-Box $page "发布成功`n返回文章并跳转详情" 8.45 4.35 1.85 0.72 "E3FCEC" "2F855A" 11 1 | Out-Null
  Add-Box $page "审核失败`n422 + 风险原因 + 替代文本" 5.9 4.35 2.05 0.72 "FFE3E3" "D64545" 11 1 | Out-Null
  Add-Line $page 2.1 1.9 2.45 1.9 | Out-Null
  Add-Line $page 4.1 1.9 4.45 1.9 | Out-Null
  Add-Line $page 6.1 1.9 6.45 1.9 | Out-Null
  Add-Line $page 7.28 2.25 7.28 2.75 | Out-Null
  Add-Line $page 8.1 1.9 8.45 1.9 | Out-Null
  Add-Line $page 10.1 1.9 10.45 1.9 | Out-Null
  Add-Line $page 11.28 2.25 11.28 2.75 | Out-Null
  Add-Line $page 11.28 3.45 9.38 4.35 | Out-Null
  Add-Line $page 7.28 3.57 6.92 4.35 | Out-Null
  Add-Label $page "通过或自动修复后继续评分发布" 7.75 0.95 2.6 0.28 9 "486581" | Out-Null
  Add-Label $page "仍不合规则驳回，并从热榜移除" 5.65 5.18 2.7 0.28 9 "486581" | Out-Null
  Export-Page $page "8-4-publishing-governance.svg"

  $vsdx = Join-Path $outDir "technical-diagrams.vsdx"
  if (Test-Path $vsdx) { Remove-Item $vsdx -Force }
  $doc.SaveAs($vsdx)
}
finally {
  $doc.Close()
  $visio.Quit()
}

Write-Host "Generated Visio diagrams in $outDir"
