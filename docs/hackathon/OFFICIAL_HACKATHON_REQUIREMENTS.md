# Bitget AI Base Camp Hackathon S1 — 官方活動規則

> 擷取日期：2026-06-19（UTC+8）
>
> 官方來源：[Builder Base Camp * Hackathon S1](https://bitget-ai.gitbook.io/hackathon/untitled/builder-base-camp-hackathon-s1.md)
>
> 本文件前半為繁體中文專案摘要，後半完整保留擷取時的官方 Markdown 原文。官方內容可能更新；提交前必須重新核對官方頁面、提交表單與官方社群公告。

## 專案適用重點

本專案參加「交易 Agent」賽道，最低提交門檻為：

- Bitget UID 與報名時一致。
- GitHub repository 或 MuleRun / GetAgent Studio 公開連結。
- GitHub 必須 public 且包含完整 README。
- 所有提交連結無需登入即可查看；若 Demo 需要登入，必須補交不超過 3 分鐘的公開演示影片。
- 專案說明必須解釋核心策略或工具思路，不能只有功能列表。
- 必須提供實盤收益記錄或 paper trading log。
- Paper trading log 應包含 timestamp、交易對、方向、價格、數量及帳戶餘額變化。
- 回測報告可作補充，但必須附生成報告的 code 或 notebook，不接受純截圖。
- Demo 必須真實可運行；官方接受 simulation 與 backtest，不要求真實資金。

## 評審重點

官方未設定固定權重，會綜合判斷：

- 思路深度。
- 可運行性：live / paper trading 優於 backtest，backtest 優於純概念。
- 完成度與問題／解法是否匹配。
- AI Agent 才能帶來的新穎性與發展潛力。

本專案因此優先交付公開可操作的 MVP、可核查 paper ledger、可重現 backtest 及真實 GetAgent Playbook evidence。

## 時間與日期差異

官方同一頁存在兩種提交開始日期：

- 「參賽流程」時間線及提交步驟寫明：2026 年 6 月 15 日 0:00 開放。
- 「提交規則」寫明：2026 年 6 月 16 日 0:00 開放。
- 兩處皆寫明截止時間：2026 年 6 月 25 日 24:00（UTC+8）。
- 官方提交入口為：[Google Form](https://forms.gle/GDQNx5TnCBvYuPin9)。

執行原則：保留兩個日期，不自行改寫官方內容；實際提交前以可用的官方表單、報名郵件及官方社群最新公告為準。

## 主要資源

- [活動落地頁](https://bitget.com/zh-CN/activity-hub/hackathon)
- [報名入口](https://www.bitget.com/zh-CN/campaigns/d8a2a61fd63c4bc2a3c8198ec923da9a)
- [提交表單](https://forms.gle/GDQNx5TnCBvYuPin9)
- [Agent Hub](https://github.com/BitgetLimited/agent_hub)
- [Bitget Playbook](https://www.bitget.com/zh-CN/activity/ai-get-agent/playbook?tab=explore)
- [官方 Telegram](https://t.me/+o1tYqQ_lXxllYjgy)
- [官方互動帖](https://x.com/Bitget_AI/status/2062506424085917944?s=20)

---

## 官方 Markdown 完整鏡像

以下內容為 2026-06-19 擷取的官方原文，未翻譯或改寫。

> For the complete documentation index, see [llms.txt](https://bitget-ai.gitbook.io/hackathon/llms.txt). Markdown versions of documentation pages are available by appending `.md` to page URLs; this page is available as [Markdown](https://bitget-ai.gitbook.io/hackathon/untitled/builder-base-camp-hackathon-s1.md).

# Builder Base Camp \* Hackathon S1

> 2026 年，第一批真正自主运行的交易 Agent 正在被写出来。现在轮到你了。\
> — Bitget AI 团队

## 一、这场比赛

今天我们站在下一个入口：**Agentic Trading**。加密市场 7×24 不停歇，但人需要睡觉。AI Agent 是第一个能读懂新闻、情绪、链上信号，并在没有预设规则的情况下自主判断、自主执行的存在——感知市场，形成策略，下单执行，管理风险，完整闭环。这是传统量化做不到的。

**Bitget AI Base Camp Hackathon S1** 是目前全球首个系统性面向 AI × Crypto Builder 的专项赛事，也是 Bitget 面向开发者长期运营计划的起点。

<table><thead><tr><th width="147.5">项目</th><th>详情</th></tr></thead><tbody><tr><td>活动时间</td><td>2026 年 5 月 27 日 – 6 月 30 日</td></tr><tr><td>活动形式</td><td>全球线上</td></tr><tr><td>总奖金池</td><td><strong>50,000 USDT</strong></td></tr><tr><td>主办方</td><td>Bitget</td></tr><tr><td>战略赞助</td><td>阿里云、通义千问</td></tr><tr><td>媒体与生态支持</td><td>Foresight Ventures / Foresight News</td></tr></tbody></table>

### 奖项

<table><thead><tr><th width="154.1953125">奖项</th><th width="157.328125">名额</th><th width="167.56640625">单项奖金</th><th>赛道</th></tr></thead><tbody><tr><td>一等奖</td><td>1 名</td><td>6,600 USDT</td><td>全赛道共评</td></tr><tr><td>二等奖</td><td>共 3 名</td><td>1,500 USDT</td><td>三个赛道各 1 名</td></tr><tr><td>三等奖</td><td>共 3 名</td><td>800 USDT</td><td>三个赛道各 1 名</td></tr><tr><td>最佳社区传播奖</td><td>共 3 名</td><td>500 USDT</td><td>三个赛道各 1 名</td></tr><tr><td>优秀参与奖</td><td>符合要求的队伍</td><td>+50 USDT / 队伍</td><td>提交 Demo + 符合要求发帖即可</td></tr></tbody></table>

除奖金外，参赛还能获得：***官方渠道宣发曝光、生态媒体报道、潜在孵化与投资对接、Bitget AI 新产品内测资格，以及加入 Bitget AI Builders 长期开发者社群。***

## 二、参赛流程

### 时间线（UTC+8）

<table><thead><tr><th width="203.40625">时间</th><th>节点</th></tr></thead><tbody><tr><td>5月27日 0:00</td><td>报名开放，开发启动</td></tr><tr><td>6月14日 24:00</td><td>报名截止（前 500 队伍获通义千问 Token 补贴）</td></tr><tr><td>6月15日 0:00</td><td>提交窗口开放</td></tr><tr><td>6月25日 24:00</td><td>提交截止</td></tr><tr><td>6月25–29日</td><td>评审</td></tr><tr><td>6月30日</td><td>颁奖，邮件通知获奖者</td></tr></tbody></table>

### 参赛者需要做什么

{% stepper %}
{% step %}
***报名（5月27日起，UTC+8）***

* 在[官方报名页](https://www.bitget.com/zh-CN/campaigns/d8a2a61fd63c4bc2a3c8198ec923da9a)用绑定邮箱的 Bitget 账号填写表单，个人或组队均可（最多 5 人）
* 报名后加入[官方 Telegram 社群](https://t.me/+o1tYqQ_lXxllYjgy)；前 500 支队伍在 24h 内收到通义千问 Token 补贴，进群即可领取 MuleRun Token 补贴（详见第四章）
  {% endstep %}

{% step %}
***选赛道 + 开始构建（即刻起）***

* 看第三章选定赛道，接入 Bitget Agent Hub 或 Bitget Playbook 开始构建（工具使用见第四章）
* Demo 必须真实可运行，不接受纯概念展示；不要求真实资金，模拟交易和回测记录同样有效
  {% endstep %}

{% step %}
***传播（开发期间持续）***

* 转发 Bitget [官方互动帖](https://x.com/Bitget_AI/status/2062506424085917944?s=20)并发布自己的内容，带 **#BitgetHackathon** 并 @ Bitget AI 官号
  {% endstep %}

{% step %}
***提交（6月15日 0:00 – 6月25日 24:00，UTC+8）***

* Bitget 通过官方社媒、社群和报名邮箱发布提交链接
* 按赛道填写表单上传材料，附上[官方互动帖](https://x.com/Bitget_AI/status/2062506424085917944?s=20)转发及发布内容的帖子链接参与最佳社区传播奖评选；各赛道具体提交材料见第三章
  {% endstep %}

{% step %}
***等结果（6月30日）***

* 评委独立评审后，获奖者通过报名邮箱通知，结果同步公布
  {% endstep %}
  {% endstepper %}

## 三、赛道、提交与评审

### 赛道总览

<table><thead><tr><th width="142.52734375">赛道</th><th width="250.09765625">适合你，如果…</th><th>具体可以做什么</th></tr></thead><tbody><tr><td>🟦 <strong>交易 Agent</strong></td><td>想做自动跑策略，或者让别人能 Vibe Trading 的工具</td><td>自然语言驱动的合约交易 Agent<br>BTC 趋势 + 均值回归自适应策略<br>Meme 币链上信号跟单机器人</td></tr><tr><td>🟩 <strong>交易 Infra</strong></td><td>想做让 Agent 跑得更好的底层工具或数据产品</td><td>Paper Trading 沙箱<br>Agent 监控面板 + 风险评分<br>链上数据看板<br>自然语言策略编译器</td></tr><tr><td>🟧 <strong>美股 AI 交易</strong></td><td>想用 AI 参与美股代币化资产交易，或围绕美股交易场景解决真实问题</td><td>美股代币化资产宏观情绪判断 Agent<br>基于美股历史数据的回测与策略部署<br>实时感知美联储动向并自动调仓的 Agent</td></tr></tbody></table>

### 提交规则

> 提交窗口：**2026 年 6 月 16 日 0:00 – 6 月 25 日 24:00（UTC+8）**\
> 📢**提交入口：**[**https://forms.gle/GDQNx5TnCBvYuPin9**](https://forms.gle/GDQNx5TnCBvYuPin9)

***

#### 通用规则（所有赛道） <a href="#tong-yong-gui-ze-suo-you-sai-dao" id="tong-yong-gui-ze-suo-you-sai-dao"></a>

在填写各赛道材料前，所有参赛者需满足以下基础要求：

* **报名 UID 一致**：提交时填写的 Bitget UID 必须与报名时使用的 UID 一致，用于资格核验（请填写报名时的 Bitget UID，如未报名或报名时提交失败，可在此重新填写，不影响项目正常提交）
* **链接必须公开可访问**：所有提交的链接无需登录即可查看，包括 Demo 前端页面、GitHub 仓库、MuleRun 发布页、GetAgent Studio 策略链接等；若 Demo 需要登录，必须额外提交演示视频
* **思路说明清晰**：项目说明必须包含策略或工具的核心思路，不接受纯功能列表或纯概念展示
* **至少一项运行记录**：各赛道要求详见下方 Checklist；开放创新项目选填，其他赛道必填

> ⚠️ **基础门槛**：不满足以上任一条件的提交将直接排除，不进入评审。

***

#### 各赛道提交 Checklist <a href="#ge-sai-dao-ti-jiao-checklist" id="ge-sai-dao-ti-jiao-checklist"></a>

#### 🟦 赛道一 · 交易 Agent <a href="#sai-dao-yi-jiao-yi-agent" id="sai-dao-yi-jiao-yi-agent"></a>

构建能在 Crypto 市场自主感知、判断、执行、管理风险的 AI Agent。交易标的不限，合约、现货、链上协议、预测市场均可。

<table><thead><tr><th width="177.21484375">材料</th><th width="138.95703125">要求</th><th>说明</th></tr></thead><tbody><tr><td>GitHub 仓库 或 MuleRun / GetAgent Studio 发布链接</td><td>必填</td><td>GitHub 须为 public，含完整 README；MuleRun / Studio 链接须无需登录即可访问</td></tr><tr><td>实盘收益记录 或 paper trading 日志</td><td>必填（优先）</td><td>需含：时间戳、交易对、方向、价格、数量、账户余额变化；建议上传至 GitHub 后提交链接</td></tr><tr><td>回测报告</td><td>选填，可作补充</td><td>必须附生成该报告的代码或 notebook；不接受纯截图；评委保留复现核验权利</td></tr><tr><td>演示视频</td><td>选填；若 Demo 需登录则必填</td><td>建议发布到推特（设为公开）后提交推特链接；也接受 YouTube 等其他可公开访问的视频链接；时长 ≤ 3 分钟</td></tr></tbody></table>

***

#### 🟩 赛道二 · 交易 Infra <a href="#sai-dao-er-jiao-yi-infra" id="sai-dao-er-jiao-yi-infra"></a>

构建让 Agent 跑得更好、或让交易者用起来更高效的基础设施。范围包括但不限于：给 Agent 用的工具或框架、给交易者用的产品（监控面板、可视化工具等）、策略测评与评估系统。

<table><thead><tr><th width="139.46875">材料</th><th width="133.99609375">要求</th><th>说明</th></tr></thead><tbody><tr><td>GitHub 仓库</td><td>必填</td><td>必须为 public；README 须含：安装步骤、接入方式、使用示例；另一个开发者应能按 README 独立跑通</td></tr><tr><td>部署链接</td><td>选填</td><td>若有在线可访问版本，附上部署地址</td></tr><tr><td>可核查使用记录</td><td>必填</td><td>提交以下任意一种：API 调用日志（含时间戳和调用量）/ 真实用户使用记录 / 样本输入+输出文件（可供评委复现）/ 其他开发者已接入的说明或链接</td></tr><tr><td>演示视频</td><td>选填；若 Demo 需登录则必填</td><td>建议发布到推特（设为公开）后提交推特链接；也接受 YouTube 等其他可公开访问的视频链接；时长 ≤ 3 分钟；建议展示从安装到核心功能跑通的完整流程</td></tr></tbody></table>

***

#### 🟧 赛道三 · 美股 AI 交易（美股相关项目） <a href="#sai-dao-san-mei-gu-ai-jiao-yi-mei-gu-xiang-guan-xiang-mu" id="sai-dao-san-mei-gu-ai-jiao-yi-mei-gu-xiang-guan-xiang-mu"></a>

用 AI 参与美股资产交易，或围绕美股交易场景解决真实问题。美股资产范围：Bitget 平台上的代币化美股资产，以及传统美股股票和 ETF，交易标的为美股股票即可。

<table><thead><tr><th width="142.31640625">材料</th><th width="160.70703125">要求</th><th>说明</th></tr></thead><tbody><tr><td>GitHub 仓库 或 Demo 链接</td><td>必填</td><td>GitHub 须为 public，含 README；Demo 须无需登录可访问</td></tr><tr><td>实盘收益记录 或 paper trading 日志</td><td>必填（优先）</td><td>需含：时间戳、交易标的、方向、价格、数量、账户余额变化；建议上传至 GitHub 后提交链接</td></tr><tr><td>回测报告</td><td>选填，可作补充</td><td>必须附生成该报告的代码或 notebook；不接受纯截图</td></tr><tr><td>演示视频</td><td>选填；若 Demo 需登录则必填</td><td>建议发布到推特（设为公开）后提交推特链接；也接受 YouTube 等其他可公开访问的视频链接；时长 ≤ 3 分钟</td></tr></tbody></table>

***

#### 🟧 赛道三 · 美股 AI 交易（开放创新项目） <a href="#sai-dao-san-mei-gu-ai-jiao-yi-kai-fang-chuang-xin-xiang-mu" id="sai-dao-san-mei-gu-ai-jiao-yi-kai-fang-chuang-xin-xiang-mu"></a>

早期以"开放创新"赛道报名的参赛者，可提交与美股无关的项目，但必须与加密交易或 AI 有明确结合点，且必须使用报名时的 UID。

<table><thead><tr><th width="136.33984375">材料</th><th width="164.45703125">要求</th><th>说明</th></tr></thead><tbody><tr><td>GitHub 仓库 或 Demo 链接</td><td>必填</td><td>GitHub 须为 public，含 README；Demo 须无需登录可访问</td></tr><tr><td>运行记录</td><td>选填，有记录优先</td><td>接受以下任意一种：Agent 输出结果截图+原始文件 / sample input/output / API 调用日志 / demo 运行记录 / 测试数据文件；建议上传至 GitHub 后提交链接</td></tr><tr><td>演示视频</td><td>选填；若 Demo 需登录则必填</td><td>建议发布到推特（设为公开）后提交推特链接；也接受 YouTube 等其他可公开访问的视频链接；时长 ≤ 3 分钟</td></tr></tbody></table>

***

#### 传播奖（所有赛道，选填） <a href="#chuan-bo-jiang-suo-you-sai-dao-xuan-tian" id="chuan-bo-jiang-suo-you-sai-dao-xuan-tian"></a>

与主赛道评分独立，不影响技术评审结果。

<table><thead><tr><th width="139.3359375">奖项</th><th width="121.46875">材料</th><th>说明</th></tr></thead><tbody><tr><td>优秀参与奖</td><td>互动推文链接</td><td>提交可运行 Demo + 符合要求发帖（引用 Bitget 官方互动帖的<a href="https://x.com/Bitget_AI/status/2062506424085917944?s=20">帖子链接</a>，并发布开发日记），有机会获得优秀参与奖 +50 USDT</td></tr><tr><td>最佳社区传播奖</td><td>互动推文链接</td><td>带 <strong>#BitgetHackathon</strong>   @Bitget_AI 并引用 Bitget 官方<a href="https://x.com/Bitget_AI/status/2062506424085917944?s=20">互动帖</a>发布你的内容，争取最佳社区传播奖（500 USDT × 3 名）</td></tr></tbody></table>

### 评分方向 <a href="#ping-fen-fang-xiang" id="ping-fen-fang-xiang"></a>

> 能打动评委的项目，往往是真正解决了一个问题、并且跑通了的那个

评委综合以下方向判断，不设固定权重，**Bitget 保留最终解释权**。

<table><thead><tr><th width="142.7734375">方向</th><th>偏好描述</th></tr></thead><tbody><tr><td><strong>思路深度</strong></td><td>策略逻辑或工具设计的核心假设是否成立；是否真正想清楚了这个方向</td></tr><tr><td><strong>可运行性</strong></td><td>Demo 真实可访问、代码可运行；实盘/paper trading > 回测 > 纯概念</td></tr><tr><td><strong>完成度</strong></td><td>MVP 是否跑通；问题和解法是否匹配；诚实描述完成度比夸大更受认可</td></tr><tr><td><strong>新颖性与潜力</strong></td><td>做了只有 AI Agent 才能做的事；方向有想象空间</td></tr></tbody></table>

### 提交常见问题 <a href="#chang-jian-wen-ti" id="chang-jian-wen-ti"></a>

<details>

<summary>Q：<strong>没有部署环境，只有 GitHub 可以吗？</strong></summary>

可以，但 README 里必须写清楚本地怎么运行，评委应能在不联系你的情况下跑通

</details>

<details>

<summary>Q：<strong>回测截图能用吗？</strong></summary>

不够。回测结果需附生成该结果的代码或 notebook，评委保留复现核验的权利

</details>

<details>

<summary>Q：<strong>Demo 需要登录才能访问怎么办？</strong></summary>

必须额外提交演示视频（推特公开链接或 YouTube），确保评委能看到实际运行效果

</details>

<details>

<summary>Q：<strong>MuleRun / GetAgent Studio 的链接需要登录才能访问怎么办？</strong></summary>

同上，必须额外提交演示视频

</details>

<details>

<summary>Q：<strong>实盘数据和 paper trading 都没有，只有回测可以吗？</strong></summary>

可以提交，但评分优先级低于有实际运行记录的项目。回测必须附代码，不接受纯截图

</details>

<details>

<summary>Q：<strong>开放创新项目需要提交运行记录吗？</strong></summary>

选填，但有记录优先。接受的格式很灵活：Agent 输出截图、sample input/output、API 调用日志、demo 运行记录、测试数据文件均可

</details>

<details>

<summary>Q：<strong>开放创新赛道的项目和美股完全无关可以提交吗？</strong></summary>

可以，但必须说明与加密交易或 AI 的明确结合点，且使用报名时的 UID

</details>

<details>

<summary>Q：<strong>项目说明第四段（对 AI Trading 的看法）必须写吗？</strong></summary>

选填，不影响基础评分。但如果有真实的使用体验和思考，写出来对评委理解你的项目有帮助。

</details>

## 四、比赛工具箱

### Bitget Playbook（Crypto & 美股 量化 Copilot）

Bitget Playbook 是 AI 驱动的量化策略平台。用自然语言描述交易想法，AI 生成可执行策略，基于真实历史数据回测，查看 PnL、最大回撤、夏普比率等指标，一键部署上线自动执行。

**方式一：通过 Bitget 官网**

{% stepper %}
{% step %}
***获取 Playbook API Key***

使用报名的 Bitget UID 登录 [Playbook 页面](https://www.bitget.com/zh-CN/activity/ai-get-agent/playbook?tab=explore)，点击「创建 Agent」，按照指引创建子账户，并获取 Playbook API Key 及安装命令
{% endstep %}

{% step %}
***用 Coding Agent 完成安装、创建、回测、发布***

打开 Claude Code（或任意支持的 Coding Agent），将以下 prompt 完整发送：

```
1. 用 https://www.npmjs.com/package/@bitget-ai/getagent-skill 安装 getagent
2. 使用 getagent 创建一个关于 [你的策略想法] 的策略 playbook，并上传、回测、发布
3. 回测成功后把指标列个表格给我看看

playbook 策略哲思：
[描述你的策略核心逻辑，例如：自适应市场行情，趋势时跟踪，震荡时均值回归，不明确时空仓]

playbook key：[你的 Playbook API Key]
```

{% endstep %}

{% step %}
***查看已发布的 Playbook***

发布成功后，直接在[此页面](https://www.bitget.com/zh-CN/activity/ai-get-agent/playbook?tab=explore)即可看到你上传的策略
{% endstep %}
{% endstepper %}

**方式二：通过 GetAgent Studio**

{% stepper %}
{% step %}
**进群加白**

进入[官方 Telegram 社群](https://t.me/+o1tYqQ_lXxllYjgy)，联系管理员私发你的 UID 完成加白名单
{% endstep %}

{% step %}
**通过 GetAgent Studio体验完整玩法**

之后即可在[此页面](https://getagent.studio/)链接体验完整 Playbook 玩法
{% endstep %}
{% endstepper %}

### [Bitget Agent Hub](https://github.com/BitgetLimited/agent_hub)（Crypto & 美股 Agent 的交易武器库）

Bitget Agent Hub 是为 AI 开发者打造的交易工具平台，三层能力按需取用：

<table><thead><tr><th width="137.9375">模块</th><th width="293.78125">内容</th><th>帮助</th></tr></thead><tbody><tr><td><strong>Tools</strong></td><td>58 个交易 API（现货、合约、账户等）</td><td>Agent 直接下单、查仓、管理资产，无需手写 API 封装</td></tr><tr><td><strong>Skill Hub</strong></td><td>5 个分析师级感知 Skill（宏观、情绪、技术指标、链上、新闻）</td><td>让 Agent 具备市场感知能力，几行配置即可接入</td></tr><tr><td><strong>MCP Server</strong></td><td>一行配置接入 Claude / Cursor / Codex</td><td>用你熟悉的 AI 工具直接调用 Bitget 所有交易能力</td></tr></tbody></table>

**快速安装：**

```bash
npx bitget-hub upgrade-all --target claude
```

也可以部署到指定工具：

```bash
npx bitget-hub install --target codex
npx bitget-hub install --target claude,codex
```

**配置 Bitget API Key：** 登录 bitget.com → 设置 → API 管理，创建新 Key，勾选 Read 和 / 或 Trade 权限：

```bash
export BITGET_API_KEY="your-api-key"
export BITGET_SECRET_KEY="your-secret-key"
export BITGET_PASSPHRASE="your-passphrase"
```

**接入 MCP Server（Claude Code / Cursor）：**

```bash
claude mcp add -s user \
  --env BITGET_API_KEY=your-api-key \
  --env BITGET_SECRET_KEY=your-secret-key \
  --env BITGET_PASSPHRASE=your-passphrase \
  bitget \
  -- npx -y bitget-mcp-server
```

**Skill Hub — 5 个开箱即用的分析师级 Skill：**

<table><thead><tr><th width="192.37890625">Skill</th><th>能力</th></tr></thead><tbody><tr><td><code>macro-analyst</code></td><td>宏观与跨资产分析：美联储政策、BTC vs DXY / 纳指 / 黄金</td></tr><tr><td><code>market-intel</code></td><td>链上与机构情报：ETF 流量、鲸鱼动向、DeFi TVL</td></tr><tr><td><code>news-briefing</code></td><td>新闻聚合与叙事合成：早报生成、关键词搜索</td></tr><tr><td><code>sentiment-analyst</code></td><td>情绪与持仓分析：恐贪指数、多空比、资金费率</td></tr><tr><td><code>technical-analysis</code></td><td>技术分析：23 个指标，覆盖 6 大类别</td></tr></tbody></table>

### 通义千问 Token 补贴

前 500 支完成报名的队伍可获得阿里云通义千问 Token 资助。

<table><thead><tr><th width="110.375">项目</th><th>说明</th></tr></thead><tbody><tr><td>发放时间</td><td>报名后 24h 内，发到报名 UID 绑定的邮箱</td></tr><tr><td>适用范围</td><td>Cursor、Codex 等主流 Coding Agent（<strong>暂不支持 Claude Code</strong>）</td></tr><tr><td>未收到？</td><td>在<a href="https://t.me/+o1tYqQ_lXxllYjgy">官方 Telegram 社群</a> @ 管理员，说明 UID 和报名时间</td></tr></tbody></table>

#### 通义千问配置教程

<table><thead><tr><th width="154.38671875">配置项</th><th>填写内容</th></tr></thead><tbody><tr><td>Base URL</td><td><code>https://hackathon.bitgetops.com/v1</code></td></tr><tr><td>Model（推荐）</td><td><code>qwen3.6-plus</code></td></tr><tr><td>可选模型</td><td><code>qwen3.6-flash</code>（极速版）</td></tr></tbody></table>

> ⚠️ 模型名必须用连字符（如 `qwen3.6-plus`），不能写 `qwen3.6 max`（带空格）。

#### 在 Codex 中配置

{% stepper %}
{% step %}
***第 1 步：配置 config.toml***

在 Codex App 中打开配置文件：Settings → Config → Open config.toml

![](/files/Xv2Qg4sCH8TyMsekgZZQ)![](/files/qzTJPsJ6jcdcoVZVh2xH)

`config.toml` 默认可能没有 `model_provider`，直接在文件顶部新增：

```toml
model = "qwen3.6-plus"
model_provider = "bitget-qwen"

[model_providers.bitget-qwen]
name = "Bitget Qwen"
base_url = "https://hackathon.bitgetops.com/v1"
env_key = "BITGET_QWEN_API_KEY"
wire_api = "responses"
```

{% endstep %}

{% step %}
***第 2 步：设置 API Key***

```bash
## 不要把 Key 写进 config.toml，在终端执行：
launchctl setenv BITGET_QWEN_API_KEY '你的真实 Key'

## 验证是否成功：有输出即表示 Key 已写入。
launchctl getenv BITGET_QWEN_API_KEY
```

<figure><img src="/files/w7sVBLTlbdJa2gi90KNb" alt=""><figcaption></figcaption></figure>
{% endstep %}

{% step %}
***第 3 步：重启 Codex App***

先完成第 2 步，再彻底退出 Codex（Cmd+Q，不是只关窗口），重新打开即可。
{% endstep %}

{% step %}
***第 4 步：确认正在使用千问***

* 看 App 右下角：应显示 `Bitget Qwen`，而不是 GPT-5.5
* 终端自检：`/Applications/Codex.app/Contents/Resources/codex doctor | grep model`，期望输出包含 `qwen3.6-plus`

<figure><img src="/files/DjlguzROy48rzFyPGre2" alt=""><figcaption></figcaption></figure>
{% endstep %}
{% endstepper %}

#### 在 Cursor 中配置

{% stepper %}
{% step %}
***第 1 步：打开模型设置***

Cursor Settings，或快捷键 `Cmd+Shift+J`（macOS）/ `Ctrl+Shift+J`（Windows），左侧选 Models。

<figure><img src="/files/xVmUXmAQ7lY1GkcgmGdt" alt=""><figcaption></figcaption></figure>
{% endstep %}

{% step %}
***第 2 步：填写 API Key & 开启 Base URL 覆盖***

* 在 OpenAI API Key 输入框粘贴你的 Key，点击 Verify 确认。
* 找到 Override OpenAI Base URL 开关，打开，填入：(注意：必须包含 `/v1` 后缀。)

```
https://hackathon.bitgetops.com/v1
```

<figure><img src="/files/4KUCk7HfzajKEaCFlJTJ" alt=""><figcaption></figcaption></figure>
{% endstep %}

{% step %}
***第 4 步：添加自定义模型***

在 Models 列表下方点击 `+ Add model`，输入 `qwen3.6-plus`，回车确认并勾选启用。如需极速版，再添加 `qwen3.6-flash`。

<div><figure><img src="/files/371RPgGNJmTpsoJ6cCAR" alt=""><figcaption></figcaption></figure> <figure><img src="/files/kLhK8pyZPCfy2x4qPjJr" alt=""><figcaption></figcaption></figure></div>
{% endstep %}

{% step %}
***第 5 步：选择模型并测试***

打开 Chat / Agent 面板，在顶部模型下拉框选择 `qwen3.6-plus`，发送测试消息确认正常回复。

<figure><img src="/files/1EX8rvMhc4ip4VvjkSGo" alt=""><figcaption></figcaption></figure>
{% endstep %}
{% endstepper %}

### MuleRun Token 补贴

加入官方 Telegram 社群即可领取 2,000 Credits。

<table><thead><tr><th width="158.1640625">项目</th><th>说明</th></tr></thead><tbody><tr><td>发放条件</td><td>加入<a href="https://t.me/+o1tYqQ_lXxllYjgy">官方 Telegram 社群</a></td></tr><tr><td>适用范围</td><td>MuleRun 平台，涵盖主流大模型</td></tr><tr><td>限制</td><td>每邮箱限领一次</td></tr></tbody></table>

{% stepper %}
{% step %}
***第 1 步：加入官方 Telegram 社群***

加入[官方 Telegram 社群](https://t.me/+o1tYqQ_lXxllYjgy)
{% endstep %}

{% step %}
***第 2 步：注册 MuleRun***

注册 MuleRun：[mulerun.com](https://mulerun.com/?utm_campaign=0526bitget)
{% endstep %}

{% step %}
***第 3 步：领取 Credits***

进入兑换页面 [credits.mule.page](https://credits.mule.page/)，输入专属码 `0526BITGET` 领取 2,000 Credits
{% endstep %}
{% endstepper %}

> ⚠️ MuleRun Credits 仅限在 MuleRun 平台使用。在 MuleRun 上完成构建后，可直接提交 Agent 链接作为参赛 Demo。

### 资源与联系

<table><thead><tr><th width="208.80078125">资源</th><th>链接</th></tr></thead><tbody><tr><td>Agent Hub GitHub</td><td><a href="https://github.com/BitgetLimited/agent_hub">BitgetLimited/agent_hub</a></td></tr><tr><td>活动落地页</td><td><a href="https://bitget.com/zh-CN/activity-hub/hackathon">bitget.com/zh-CN/activity-hub/hackathon</a></td></tr><tr><td>报名入口</td><td><a href="https://www.bitget.com/zh-CN/campaigns/d8a2a61fd63c4bc2a3c8198ec923da9a">点击报名</a></td></tr><tr><td>官方 Telegram</td><td><a href="https://t.me/+o1tYqQ_lXxllYjgy">加入社群</a></td></tr><tr><td>官方互动帖</td><td><a href="https://x.com/Bitget_AI/status/2062506424085917944?s=20">转发参与</a></td></tr><tr><td>提交入口</td><td><a href="https://forms.gle/GDQNx5TnCBvYuPin9">https://forms.gle/GDQNx5TnCBvYuPin9</a></td></tr></tbody></table>

## 五、常见问题

<details>

<summary>Q：没有交易经验可以参赛吗？</summary>

可以。[Bitget Agent Hub GitHub 仓库](https://github.com/BitgetLimited/agent_hub)提供了完整的骨架逻辑，你只需要在上面扩展自己的想法。Bitget Playbook 也不需要写代码就能跑通一个交易策略。**参赛全程不要求使用真实资金**，模拟交易和回测记录同样被接受。

</details>

<details>

<summary>Q：一个人可以参赛吗？组队怎么处理？</summary>

完全可以，个人和团队机会均等。报名时默认以个人身份提交，不需要填写队友信息——提交阶段再统一收集完整的队伍信息。团队最多 5 人。如果想找队友，在官方 Telegram 社群发帖招募即可。

</details>

<details>

<summary>Q：报名失败怎么办？</summary>

直接在[官方 Telegram 社群](https://t.me/+o1tYqQ_lXxllYjgy)联系管理员处理。

</details>

<details>

<summary>Q：Bitget Agent Hub 怎么用？</summary>

三种接入方式，按需选择：

* **MCP Server**：一行命令接入 Claude Code / Cursor，完成后可以用自然语言直接调用 58 个 Bitget 交易 API
* **Skill Hub**：5 个开箱即用的感知模块（宏观 / 链上 / 情绪 / 技术 / 新闻），几行配置即可给 Agent 装上市场感知能力
* **直接调用工具**：从 GitHub 仓库取用，适合需要高度定制的场景

详细接入步骤见第四章「Bitget Agent Hub」部分。

</details>

<details>

<summary>Q：Bitget Playbook 怎么用？</summary>

先完成两步人工操作（用报名 UID 创建子账户 + 在 TG 联系管理员获取 Playbook API Key），然后把包含策略想法和 API Key 的 prompt 一次性发给 Claude Code，Agent 会自动完成安装 → 创建策略 → 回测 → 发布的全流程。详细步骤见第四章「Bitget Playbook」部分。

</details>

<details>

<summary>Q：MuleRun Credits 怎么领？没收到怎么办？</summary>

加入[官方 Telegram 社群](https://t.me/+o1tYqQ_lXxllYjgy)后，注册 MuleRun 并在 [credits.mule.page](https://credits.mule.page/) 输入专属码 `0526BITGET` 即可领取 2,000 Credits。每邮箱限领一次。如果未收到，私信管理员发送你的 UID，管理员核查后处理。

</details>

<details>

<summary>Q：通义千问 Token 怎么领？适用什么工具？</summary>

前 500 支报名队伍报名后 24h 内会收到发到邮箱的 API Key。适用于 Cursor 和 Codex，**不支持 Claude Code**。收到后按第四章「通义千问 Codex 配置教程」完成配置。如果未收到，在官方 Telegram 社群 @ 管理员，说明你的 UID 和报名时间。

</details>

<details>

<summary>Q：通义千问 API Key 无法连接 / 无法使用怎么办？</summary>

该 API Key 为赞助专属额度，走的是 Bitget 内网代理，**无法直接用于官方 Qwen API**。必须按第四章配置教程填写正确的 Base URL（`https://hackathon.bitgetops.com/v1`）后才能使用，或者改用自己账户的通义千问 API Key。

</details>

<details>

<summary>Q：用自己的 API Key 接入 Agent Hub 会自动下单吗？</summary>

目前仅支持读取持仓信息，同步到模拟盘。下单功能尚未完善，不会自动操作真实账户。

</details>

<details>

<summary>Q：传播奖怎么参与？</summary>

转发 Bitget [官方互动帖](https://x.com/Bitget_AI/status/2062506424085917944?s=20)并发布自己的内容（项目想法、进展、Showcase 等），带 **#BitgetHackathon** 并 @ Bitget AI 官号，提交项目时附上帖子链接即可参与评选。提交可运行 Demo + 符合要求发帖还额外获得优秀参与奖 +50 USDT。

</details>

<details>

<summary>Q：遇到技术问题怎么办？</summary>

加入[官方 Telegram 社群](https://t.me/+o1tYqQ_lXxllYjgy)，技术团队全程在线答疑。

</details>

***

Bitget AI Base Camp 是一个长期计划。黑客松 S1 是起点，不是终点。你构建的 Agent，可能是 Agentic Trading 时代的第一批基础设施。

加入我们。— Bitget AI 团队


---

# Agent Instructions
This documentation is published with GitBook. GitBook is the documentation platform designed so that both humans and AI agents can read, navigate, and reason over technical content effectively. Learn more at gitbook.com.

## Querying This Documentation
If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://bitget-ai.gitbook.io/hackathon/untitled/builder-base-camp-hackathon-s1.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
