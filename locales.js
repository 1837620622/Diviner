// ─────────────────────────────────────────────────────────────
// 玄机子 · 中英双语词典模块 (I18N Locale Dictionary)
// 职责：提供 zh / en 两套扁平词典、t() 取词函数、语言切换与
//       页面静态文案重渲染（data-i18n / data-i18n-ph）。
// 约定：
//   - 参数占位符写作 {n}、{model}、{name} 等，由 t() 运行时替换；
//   - 缺词时先回退 zh，再回退 key 本身，保证界面永不露出 undefined；
//   - 语言偏好存于 localStorage('xuanjizi_lang')，默认 'zh'；
//   - 语言切换后派发 'i18n:applied' 事件，脚本侧据此刷新动态文案。
// 说明：塔罗牌义、签诗、系统提示词与呈递给模型的问卜 prompt
//       属于推演内容而非界面文案，不在本词典范围内。
// ─────────────────────────────────────────────────────────────
(function () {
  'use strict';

  var LANG_STORAGE_KEY = 'xuanjizi_lang';

  // ───────────────────────────
  // 简体中文词典（回退基准）
  // ───────────────────────────
  var zh = {
    // ── 全局通用 ──
    'appName': '玄机子',
    'close': '关闭',
    'cancel': '取消',
    'confirm': '确认',
    'submit': '呈递',

    // ── 页面元信息 ──
    'meta.title': '玄机子 · 灵台问卜',
    'meta.description': '玄机子 - 东方数理与灵犀占断。周易六爻、梅花易数、四柱八字、小六壬、塔罗、灵签与梦象解析。',

    // ── 开场仪式 ──
    'ritual.motto': '灵台既明 · 方可问卜',
    'ritual.credit': '传康KK 无偿开发 · 免费使用',

    // ── 侧边栏 ──
    'sidebar.close': '收起侧栏',
    'sidebar.brandDesc': '观象授时 · 灵台问卜',
    'sidebar.newChat': '新起一卦',
    'sidebar.sectionTools': '命理法器',
    'sidebar.sectionHistory': '近问档案',
    'sidebar.clearAll': '清空全部',
    'sidebar.clear': '清空',
    'sidebar.sponsor': '随喜',
    'sidebar.sponsorTitle': '随喜赞助',
    'sidebar.zenSound': '禅音',
    'sidebar.zenSoundTitle': '空灵禅音',
    'sidebar.about': '关于',
    'sidebar.aboutTitle': '关于玄机子',
    'sidebar.profile': '档案',
    'sidebar.profileTitle': '命主档案',

    // ── 命主档案弹窗 ──
    'profile.title': '命主档案',
    'profile.kicker': '定位与形象 · 随卦自动携带',
    'profile.hint': '立档之后，每次起卦自动把这份信息带给玄机子；档案为本机共用，各对话上下文仍按会话独立记忆。',
    'profile.locLabel': '定位 · 所在城市',
    'profile.locPlaceholder': '例：四川 · 成都',
    'profile.personaLabel': '形象自述',
    'profile.personaPlaceholder': '例：1995 年生，从事互联网行业，性格谨慎细致，正面临事业与感情的抉择……',
    'profile.customLabel': '个人嘱托 · 专属提示词',
    'profile.customPlaceholder': '例：请先给结论再展开；多用白话解释；建议要具体可行……',
    'profile.saveBtn': '立档存记',
    'profile.clearBtn': '销档',
    'status.profileSaved': '命主档案已立 · 随卦随行',
    'status.profileCleared': '命主档案已销',

    // ── 九方法器（侧栏入口名） ──
    'tool.tarot': '灵犀塔罗',
    'tool.iching': '周易六爻',
    'tool.meihua': '梅花易数',
    'tool.xiaoliuren': '小六壬',
    'tool.bazi': '四柱八字',
    'tool.lot': '观象灵签',
    'tool.almanac': '择吉黄历',
    'tool.dream': '周公解梦',
    'tool.muyu': '功德木鱼',

    // ── 顶栏 ──
    'header.sidebarToggle': '展开或收起侧栏',
    'header.chatTitleDefault': '灵台问卜',
    'header.sponsor': '随喜',
    'header.sponsorTitle': '随喜赞助',
    'header.share': '符笺',
    'header.shareTitle': '生成符笺海报',
    'header.newChatTitle': '新建推演',

    // ── 状态徽标（setStatus 调用处动态刷新） ──
    'status.ready': '灵台清明 · 气场通达',
    'status.divining': '玄机子正在排盘推演……',
    'status.busy': '上一卦尚在推演，请稍候再呈',
    'status.aborted': '已中止推演',
    'status.abortedDone': '推演已中止',
    'status.modelBlocked': '此路受阻 · 请另择法器',
    'status.timeout': '推演超时 · 可另择法器',
    'status.fluctuation': '推演遇到波动 · 可另择法器',
    'status.textOnly': '{name} 仅通文字 · 图片将不参与推演',

    // ── 欢迎画卷 ──
    'welcome.tag': 'THE ORACLE · 灵台问卜',
    'welcome.title1': '一念既起',
    'welcome.title2': '万象有应',
    'welcome.desc': '先定心念，再择法门。让卦象、牌阵与时序缓缓显形，而不是匆忙得到一个答案。',
    'welcome.stepsLabel': '问卜流程',
    'welcome.step1': '定念',
    'welcome.step2': '取象',
    'welcome.step3': '明断',
    'welcome.divider': '择一法门 · 入境取象',
    'welcome.footnote': '占断用于整理思路与自省，不替代医疗、法律、投资等专业判断。',
    'welcome.door.tarotTitle': '灵犀塔罗',
    'welcome.door.tarotSub': '圣三角 · 观心抉择',
    'welcome.door.ichingTitle': '周易六爻',
    'welcome.door.ichingSub': '三币摇卦 · 详断吉凶',
    'welcome.door.meihuaTitle': '梅花易数',
    'welcome.door.meihuaSub': '报数取象 · 时机动变',
    'welcome.door.baziTitle': '四柱八字',
    'welcome.door.baziSub': '生辰排盘 · 五行格局',
    'welcome.door.xlrTitle': '小六壬',
    'welcome.door.xlrSub': '掐指落宫 · 近事速断',
    'welcome.door.lotTitle': '观象灵签',
    'welcome.door.lotSub': '虔心求签 · 每日一示',
    'welcome.door.tarotAria': '开启灵犀塔罗 圣三角 · 观心抉择',
    'welcome.door.ichingAria': '开启易 周易六爻 三币摇卦 · 详断吉凶',
    'welcome.door.meihuaAria': '开启梅 梅花易数 报数取象 · 时机动变',
    'welcome.door.baziAria': '开启命 四柱八字 生辰排盘 · 五行格局',
    'welcome.door.xlrAria': '开启诀 小六壬 掐指落宫 · 近事速断',
    'welcome.door.lotAria': '开启签 观象灵签 虔心求签 · 每日一示',

    // ── 快捷问卜话题（data-prompt 为呈给模型的呈文，须双语并换） ──
    'chip.career': '事业贵人',
    'chip.careerPrompt': '求问近期的事业发展与贵人相助时机，当如何抉择？',
    'chip.love': '姻缘情感',
    'chip.lovePrompt': '求测当前的情感缘分与阻碍，对方心意如何？',
    'chip.wealth': '财运吉凶',
    'chip.wealthPrompt': '报数 3 与 8，求问下半年财运走势与投资趋避。',
    'chip.choice': '抉择转机',
    'chip.choicePrompt': '求问近期重大抉择：当进当退，时机与隐患何在？',
    'chip.tarot3': '塔罗三牌',
    'chip.ichingnajia': '六爻纳甲',
    'chip.muyu': '功德木鱼',

    // ── 输入区 ──
    'composer.placeholder': '写下想问的一件事，或先择法门起卦',
    'composer.uploadTitle': '上传相格/户型/卦象图',
    'composer.motto': '先问自己，再问天地 · 卦是镜，不是命令',
    'composer.credit': '传康KK · 无偿开发 · 免费使用',

    // ── 呈递 / 停止双态键 ──
    'send': '呈递问卜',
    'stop': '中止推演',

    // ── 模型（法器）选择器 ──
    'model.btnTitle': '择一尊法器（模型）推演',
    'model.badgeDefault': '默认',
    'model.capVision': '图文',
    'model.capText': '文字',
    'model.pacePrefix': '速',
    'model.pace.fast': '疾',
    'model.pace.steady': '稳',
    'model.pace.slow': '缓',
    'model.fallbackName': '所选模型',
    // 八尊法器的名号、厂商与优劣注语
    'model.qwen36.name': '通义千问 3.6',
    'model.qwen36.vendor': '通义千问',
    'model.qwen36.pros': '响应迅捷、长上下文稳健、图文兼通，宜日常快速问卜。',
    'model.qwen36.cons': '玄学意象的细腻铺陈，略逊专用推理模型。',
    'model.dsv4vision.name': 'DeepSeek V4 视觉版',
    'model.dsv4vision.vendor': 'DeepSeek',
    'model.dsv4vision.pros': '深度推理兼具图像解读，可观相格、户型、卦象图。',
    'model.dsv4vision.cons': '起卦耗时较长，免费线路限流较紧。',
    'model.dsv4flash.name': 'DeepSeek V4 Flash',
    'model.dsv4flash.vendor': 'DeepSeek',
    'model.dsv4flash.pros': '推理链缜密，擅解繁复卦理与多条件抉择。',
    'model.dsv4flash.cons': '仅文字；免费线路或有限流。',
    'model.glm53.name': '智谱清言 GLM-5.3',
    'model.glm53.vendor': '智谱清言',
    'model.glm53.pros': '中文语感醇厚、说理温润，契合东方术数语境。',
    'model.glm53.cons': '仅文字；推理时稍缓。',
    'model.hy3.name': '腾讯混元 HY3',
    'model.hy3.vendor': '腾讯混元',
    'model.hy3.pros': '国学底蕴醇厚、断语稳妥，宜问大势进退。',
    'model.hy3.cons': '仅文字；响应偏慢。',
    'model.glm47.name': '智谱清言 GLM-4.7',
    'model.glm47.vendor': '智谱清言',
    'model.glm47.pros': '直连专线、出语快、中文稳妥，宜速问速答。',
    'model.glm47.cons': '仅文字；深度铺陈稍弱。',
    'model.mimo25.name': '小米 MiMo 2.5',
    'model.mimo25.vendor': '小米 MiMo',
    'model.mimo25.pros': '思路清晰、语气平实，宜追问与复盘。',
    'model.mimo25.cons': '仅文字；免费额度易触限。',
    'model.qwen38flash.name': '通义千问 3.8 Flash',
    'model.qwen38flash.vendor': '通义千问',
    'model.qwen38flash.pros': '出语极快，宜简短占断、速问速答。',
    'model.qwen38flash.cons': '仅文字；深度铺陈稍弱。',

    // ── 全局加载蒙层 ──
    'loading.title': '玄机子观象推演中',
    'loading.desc': '正在排定盘面与气象生克……',

    // ── 历史档案与会话（动态渲染） ──
    'history.empty': '暂无历史问卜',
    'history.deleteTitle': '删除',

    // ── 第二轮补充：对话署名、等候与状态、开关与工具动态文案 ──
    'chat.userName': '求问善信',
    'chat.aiName': '玄机子',
    'msg.waitCount': '已候 {n} 息',
    'msg.modelFallback': '所选模型',
    'status.searching': '联网参详中……',
    'status.searchingHint': '联网参详中 · {q}',
    'status.websearchOn': '联网参详已启 · 推演前可核全网之说',
    'status.websearchOff': '联网参详已敛 · 仅凭自身修为推演',
    'websearch.label': '联网参详',
    'search.sourcesTitle': '联网参详所得 · {n} 条',
    'iching.movingLine': '动爻',
    'iching.staticLine': '静爻',
    'bazi.reviewNoCity': '尚未填写出生城市。',
    'bazi.reviewNote': '资料已录入；正式四柱、节气交接与真太阳时由后续推演校核，本页不会伪造干支结果。',
    'confirm.clearAll': '确认清空所有历史问卜档案？',
    'session.newTitle': '新问卜',
    'send.stop': '中止推演',
    'send.submit': '呈递问卜',
    'msg.noFixedAnswer': '天机稍晦，方才推演未得定数。建议稍候重新问卜。',
    'history.clearConfirm': '确认清空所有历史问卜档案？',
    'session.newTitle': '新问卜',

    // ── 消息流 ──
    'msg.userRole': '求问善信',
    'msg.aiRole': '玄机子',
    'msg.imageOnlyContent': '（已上传相格或户型图，请玄机子推演）',
    'msg.waiting': '玄机子凝神排盘中 · 已候 {n} 息',
    'msg.emptyResult': '天机稍晦，方才推演未得定数。建议稍候重新问卜。',
    'msg.abortedSuffix': '——（善信中止推演，卦辞至此）——',
    'msg.abortedEmpty': '推演已应善信之请中止。心中所问仍在，可随时重新起卦。',
    'msg.modelError': '此尊法器（{model}）此番推演受阻。\n\n【缘由】{detail}\n\n【建议趋避】点击输入框上方的模型选择器，另择一尊法器再问；深度推理类法器较稳，极速类法器较快。',
    'msg.modelErrorDefault': '所选模型推演受阻',
    'msg.timeout': '推演耗时过久，已自动中止。\n\n【建议趋避】稍候重新问卜，或另择一尊较快的法器（模型）；深度推理类法器本就耗时较长。\n\n【玄机箴言】静水流深，急则生变。',
    'msg.networkError': '推演暂遇阻滞。\n\n【建议趋避】稍候片刻重新问卜，或点击输入框上方的模型选择器另择一尊法器；若上传了图片请稍作压缩后重试。\n\n【玄机箴言】静水流深，急则生变；稍安勿躁，自有明断。',
    'msg.netStatus': '网络状态码 {n}',
    'msg.posterFallback': '天道酬勤，顺势而为。易理幽微，神明默会。',
    'action.copy': '复制卦辞',
    'action.copied': '已复制',
    'action.share': '符笺海报',
    'action.helpful': '有启发',

    // ── 图片上传 ──
    'upload.sizeLimit': '单张图片请控制在 15MB 以内。',
    'err.imageRead': '图片读取失败',
    'err.imageFormat': '图片格式无法识别',

    // ── 随喜赞助弹窗 ──
    'sponsor.title': '随喜结缘 · 功德赞助',
    'sponsor.heroTitle': '愿随喜功德 · 护持灵台长明',
    'sponsor.desc': '若玄机子为君解惑启智、点明方向，可随喜结缘以资算力与系统维护。',
    'sponsor.tier1': '顺遂吉祥',
    'sponsor.tier2': '财运亨通',
    'sponsor.tier3': '福慧双增',
    'sponsor.tier4': '大展宏图',
    'sponsor.qrAlt': '微信赞赏码',
    'sponsor.qrInfo': '微信 / 支付宝 扫码赞赏',
    'sponsor.qrTip': '长按识别二维码 · 随喜结缘',
    'sponsor.quote': '「种善因，得善果；施与受，皆是圆满。」',
    'sponsor.closeBtn': '感念善缘 · 功德圆满',

    // ── 灵犀塔罗弹窗 ──
    'tarot.title': '灵犀塔罗 · 圣三角牌阵',
    'tarot.kicker': '洗牌 · 抽取 · 亲手翻开三张牌',
    'tarot.qLabel': '心念困惑（默念心中所求之事）',
    'tarot.qPlaceholder': '例：当前这段合作的发展走势与阻碍如何？',
    'tarot.deckHintIdle': '静心一息，然后洗牌',
    'tarot.deckHintShuffling': '洗牌中 · 守住你最初的问题',
    'tarot.deckHintDealt': '牌已落位 · 请依次亲手翻开',
    'tarot.deckHintPartial': '已揭示 {n}/3 · 请继续亲手翻牌',
    'tarot.deckHintDone': '三牌俱明 · 可呈递解读',
    'tarot.slotPast': '【过去】起因因缘',
    'tarot.slotPresent': '【现在】当下境遇',
    'tarot.slotFuture': '【未来】走向趋避',
    'tarot.flipCard': '翻牌',
    'tarot.ariaPast': '翻开过去牌',
    'tarot.ariaPresent': '翻开现在牌',
    'tarot.ariaFuture': '翻开未来牌',
    'tarot.drawBtn': '虔心洗牌并抽取三牌',
    'tarot.reshuffleBtn': '重新洗牌',
    'tarot.submitBtn': '呈递牌阵请玄机子详析',
    'tarot.resultTitle': '圣三角牌阵已揭示',
    'tarot.posPast': '过去',
    'tarot.posPresent': '现在',
    'tarot.posFuture': '未来',
    'tarot.upright': '正位',
    'tarot.reversed': '逆位',
    'tarot.uprightBracket': '【正位】',
    'tarot.reversedBracket': '【逆位】',
    'tarot.defaultQuestion': '求问当前困惑与走向',

    // ── 周易六爻弹窗 ──
    'iching.title': '周易六爻纳甲',
    'iching.kicker': '三钱六掷 · 自初爻而上',
    'iching.qLabel': '问卜心意与事由',
    'iching.qPlaceholder': '例：问下半年换工作的吉凶与时机',
    'iching.tossBtn': '摇掷铜钱',
    'iching.tossStep': '第 {n} 爻 / 共 6 爻',
    'iching.done': '六爻成卦 · 功德圆满',
    'iching.resultTitle': '周易六爻已排定',
    'iching.resultOrder': '（自初爻至上爻依次为：{lines}）',
    'iching.lineLabel': '第{n}爻',
    'iching.dongLine': '动爻',
    'iching.jingLine': '静爻',
    'iching.submitBtn': '呈递卦象详批',
    'iching.defaultMatter': '问近期大事吉凶与转机',

    // ── 梅花易数弹窗 ──
    'meihua.title': '梅花易数起卦',
    'meihua.kicker': '观时取数 · 体用生克',
    'meihua.tabTime': '当下时辰起卦',
    'meihua.tabNum': '报数起卦',
    'meihua.timeInfo': '以当前年、月、日、时辰数理，演化上卦、下卦与动爻。',
    'meihua.nowBtn': '以当前时辰起卦',
    'meihua.num1Label': '上卦基数 (1-999)',
    'meihua.num1Placeholder': '例：3',
    'meihua.num2Label': '下卦基数 (1-999)',
    'meihua.num2Placeholder': '例：8',
    'meihua.calcBtn': '数理成卦',
    'meihua.errNum': '请填入两个正整数再行报数起卦',
    'meihua.modeTime': '当前公历数理起卦（未换算农历，供参详）',
    'meihua.modeNum': '报数数理 ({a}, {b}) 起卦',
    'meihua.cardBen': '本卦',
    'meihua.cardHu': '互卦',
    'meihua.cardBian': '变卦',
    'meihua.dongAt': '动爻在第 {n} 爻',
    'meihua.huDesc': '二三四爻 / 三四五爻',
    'meihua.bianChanged': '第 {n} 爻已变',
    'meihua.tiyong': '体用：体卦 {ti}，用卦 {yong}。以不动者为体，动爻所在为用。',
    'meihua.submitBtn': '呈递梅花卦详批',

    // ── 小六壬弹窗 ──
    'xlr.title': '小六壬掌中诀速断',
    'xlr.kicker': '掌中六神 · 近事速断',
    'xlr.qLabel': '所测急事或出行',
    'xlr.qPlaceholder': '例：今日出门找失物 / 面试是否顺利',
    'xlr.rollBtn': '掐指轮转推演',
    'xlr.result': '掐指落宫：【{name}】 — {desc}',
    'xlr.submitBtn': '请玄机子详断',
    'xlr.defaultQuestion': '问近事吉凶',

    // ── 四柱八字弹窗 ──
    'bazi.title': '四柱八字 · 生辰校核',
    'bazi.kicker': '录入生辰 · 再由推演校核四柱',
    'bazi.yearLabel': '出生年',
    'bazi.yearPlaceholder': '例：1995',
    'bazi.monthLabel': '出生月',
    'bazi.dayLabel': '出生日',
    'bazi.hourLabel': '出生时辰',
    'bazi.genderLabel': '性别',
    'bazi.genderQian': '乾造（男）',
    'bazi.genderKun': '坤造（女）',
    'bazi.cityLabel': '出生城市（校正真太阳时）',
    'bazi.cityPlaceholder': '例：成都（用于时差校核）',
    'bazi.calcBtn': '精密排盘',
    'bazi.errDate': '请先填写有效的出生年月日。',
    'bazi.errDateSubmit': '请先完整填写出生年月日。',
    'bazi.reviewTitle': '{gender} · 公历 {y}年{m}月{d}日 · {hour}',
    'bazi.reviewCity': '出生地：{city}。',
    'bazi.reviewNoCity': '尚未填写出生城市。',
    'bazi.reviewNote': '资料已录入；正式四柱、节气交接与真太阳时由后续推演校核，本页不会伪造干支结果。',
    'bazi.submitBtn': '呈递八字详批',

    // ── 观象灵签弹窗 ──
    'lot.title': '观象灵签 · 每日一签',
    'lot.kicker': '静念一事 · 摇签见示',
    'lot.hint': '屏息凝神，默念所求之事',
    'lot.shakeBtn': '虔心摇签',
    'lot.submitBtn': '请玄机子解签',

    // ── 择吉黄历弹窗 ──
    'almanac.title': '择吉万年历 · 今日黄历',
    'almanac.weekdayPrefix': '星期',
    'almanac.pendingTitle': '今日宜忌待推演',
    'almanac.pendingDesc': '黄历干支、值神、冲煞与宜忌不能仅凭公历日期在前端硬编码。本页只确认日期，点击下方后再由推演线路给出参考。',
    'almanac.askBtn': '以此日干支向玄机子问事',

    // ── 周公解梦弹窗 ──
    'dream.title': '周公解梦 · 原型意象',
    'dream.kicker': '从意象、情绪与现实处境解读',
    'dream.chipsLabel': '梦境关键意象速选',
    'dream.chip1': '江海波涛',
    'dream.chip2': '登高坠落',
    'dream.chip3': '故人重逢',
    'dream.chip4': '得财失物',
    'dream.chip5': '龙蛇异兽',
    'dream.chip6': '乘风飞翔',
    'dream.detailLabel': '梦境详情描述',
    'dream.detailPlaceholder': '详细描述梦中的场景、情绪感受与醒来时的心境……',
    'dream.submitBtn': '请玄机子解梦',
    'dream.errEmpty': '请先描述梦境详情。',

    // ── 功德木鱼弹窗 ──
    'muyu.title': '功德电子木鱼',
    'muyu.kicker': '一敲一息 · 收束心念',
    'muyu.countLabel': '功德数：',
    'muyu.hint': '轻触木鱼，息心澄虑，福慧双增',
    'muyu.closeBtn': '静心收功',
    'muyu.floatPlus': '+1 功德',

    // ── 符笺海报弹窗与画布 ──
    'poster.title': '运势符笺海报',
    'poster.downloadBtn': '保存海报到本地',
    'poster.canvasTitle': '玄机子 · 灵台符笺',
    'poster.canvasDate': ' · 观象授时',
    'poster.canvasQuote': '「知命而不受制于命，顺势而为，自强不息」',
    'poster.fileName': '玄机子符笺',

    // ── 关于弹窗（依约定：正文不逐句翻译，仅译标题，正文 zh/en 同值） ──
    'about.title': '关于玄机子',
    'about.heading': '玄机子 · 灵台问卜',
    'about.version': '版本：v8.3 灵台校勘版',
    'about.intro': '融汇东方传统易学、四柱八字、梅花六爻与西方灵犀塔罗，为问卜者提供客观、富于哲思与可行建议的推演指导。',
    'about.quote': '「知命而不受制于命，顺势而为，自强不息。」',
    'about.credit': '开发者：传康KK · 无偿开发，免费使用'
  };

  // ───────────────────────────
  // 英文词典（玄学占卜气质：mystic, restrained, elegant）
  // ───────────────────────────
  var en = {
    // ── 全局通用 ──
    'appName': 'Xuanjizi',
    'close': 'Close',
    'cancel': 'Cancel',
    'confirm': 'Confirm',
    'submit': 'Submit',

    // ── 页面元信息 ──
    'meta.title': 'Xuanjizi · Oracle of the Spirit Terrace',
    'meta.description': 'Xuanjizi — Eastern numerology and intuitive divination. I Ching Six Lines, Plum Blossom numerology, Four Pillars of Destiny, Xiao Liu Ren, Tarot, oracle lots, and dream interpretation.',

    // ── 开场仪式 ──
    'ritual.motto': 'Only a clear spirit may consult the oracle',
    'ritual.credit': 'Freely built by Chuankang KK · Free to use',

    // ── 侧边栏 ──
    'sidebar.close': 'Collapse sidebar',
    'sidebar.brandDesc': 'Reading the heavens · Consulting the oracle',
    'sidebar.newChat': 'Begin a New Reading',
    'sidebar.sectionTools': 'Arts of Divination',
    'sidebar.sectionHistory': 'Recent Readings',
    'sidebar.clearAll': 'Clear all',
    'sidebar.clear': 'Clear',
    'sidebar.sponsor': 'Offering',
    'sidebar.sponsorTitle': 'Make an offering',
    'sidebar.zenSound': 'Zen Chime',
    'sidebar.zenSoundTitle': 'Ambient zen chime',
    'sidebar.about': 'About',
    'sidebar.aboutTitle': 'About Xuanjizi',
    'sidebar.profile': 'Profile',
    'sidebar.profileTitle': 'Seeker Profile',

    // ── Seeker Profile modal ──
    'profile.title': 'Seeker Profile',
    'profile.kicker': 'Location & persona · carried with every reading',
    'profile.hint': 'Once saved, this profile is sent automatically with every reading on this device; each conversation still keeps its own independent context.',
    'profile.locLabel': 'Location · City',
    'profile.locPlaceholder': 'e.g. Chengdu, Sichuan',
    'profile.personaLabel': 'About you',
    'profile.personaPlaceholder': 'e.g. Born in 1995, working in tech, cautious by nature, facing choices in career and love…',
    'profile.customLabel': 'Personal instructions · custom prompt',
    'profile.customPlaceholder': 'e.g. Give the conclusion first; explain in plain language; keep advice concrete and actionable…',
    'profile.saveBtn': 'Save Profile',
    'profile.clearBtn': 'Clear',
    'status.profileSaved': 'Profile saved · carried with every reading',
    'status.profileCleared': 'Profile cleared',

    // ── 九方法器 ──
    'tool.tarot': 'Intuitive Tarot',
    'tool.iching': 'I Ching Six Lines',
    'tool.meihua': 'Plum Blossom Oracle',
    'tool.xiaoliuren': 'Xiao Liu Ren',
    'tool.bazi': 'Four Pillars of Destiny',
    'tool.lot': 'Oracle Lots',
    'tool.almanac': 'Auspicious Almanac',
    'tool.dream': 'Book of Dreams',
    'tool.muyu': 'Merit Wooden Fish',

    // ── 顶栏 ──
    'header.sidebarToggle': 'Expand or collapse sidebar',
    'header.chatTitleDefault': 'Oracle of the Spirit Terrace',
    'header.sponsor': 'Offering',
    'header.sponsorTitle': 'Make an offering',
    'header.share': 'Talisman',
    'header.shareTitle': 'Create a talisman poster',
    'header.newChatTitle': 'New reading',

    // ── 状态徽标 ──
    'status.ready': 'Spirit clear · Field open',
    'status.divining': 'Xuanjizi is casting the chart…',
    'status.busy': 'The previous reading is still in progress; please wait a moment.',
    'status.aborted': 'Reading halted',
    'status.abortedDone': 'The reading has been halted',
    'status.modelBlocked': 'This vessel is blocked · Choose another',
    'status.timeout': 'The reading timed out · Choose another vessel',
    'status.fluctuation': 'The reading met turbulence · Choose another vessel',
    'status.textOnly': '{name} reads text only · Images will not be considered',

    // ── 欢迎画卷 ──
    'welcome.tag': 'THE ORACLE',
    'welcome.title1': 'A thought arises,',
    'welcome.title2': 'all things answer.',
    'welcome.desc': 'Still your intention first, then choose your method. Let the hexagrams, the spread, and the hour reveal themselves in their own time — rather than rushing toward an answer.',
    'welcome.stepsLabel': 'The ritual steps',
    'welcome.step1': 'Still the intention',
    'welcome.step2': 'Take the image',
    'welcome.step3': 'Read it clear',
    'welcome.divider': 'Choose a path · Enter and take its image',
    'welcome.footnote': 'Divination serves reflection and self-inquiry; it does not replace medical, legal, or investment advice.',
    'welcome.door.tarotTitle': 'Intuitive Tarot',
    'welcome.door.tarotSub': 'Three-card spread · Behold the heart',
    'welcome.door.ichingTitle': 'I Ching Six Lines',
    'welcome.door.ichingSub': 'Three-coin casting · Weal and woe in detail',
    'welcome.door.meihuaTitle': 'Plum Blossom Oracle',
    'welcome.door.meihuaSub': 'Numbers from the moment · The timing of change',
    'welcome.door.baziTitle': 'Four Pillars of Destiny',
    'welcome.door.baziSub': 'Birth chart · The five-element pattern',
    'welcome.door.xlrTitle': 'Xiao Liu Ren',
    'welcome.door.xlrSub': 'Fingertip reckoning · Swift answers for near matters',
    'welcome.door.lotTitle': 'Oracle Lots',
    'welcome.door.lotSub': 'Draw a lot in sincerity · One sign each day',
    'welcome.door.tarotAria': 'Open Intuitive Tarot — Three-card spread, behold the heart',
    'welcome.door.ichingAria': 'Open I Ching Six Lines — Three-coin casting, weal and woe in detail',
    'welcome.door.meihuaAria': 'Open Plum Blossom Oracle — Numbers from the moment, the timing of change',
    'welcome.door.baziAria': 'Open Four Pillars of Destiny — Birth chart, the five-element pattern',
    'welcome.door.xlrAria': 'Open Xiao Liu Ren — Fingertip reckoning, swift answers for near matters',
    'welcome.door.lotAria': 'Open Oracle Lots — Draw a lot in sincerity, one sign each day',

    // ── 快捷问卜话题 ──
    'chip.career': 'Career & Allies',
    'chip.careerPrompt': 'I ask about my career in the near term — its course, and when helpful hands may arrive. How should I choose?',
    'chip.love': 'Love & Bonds',
    'chip.lovePrompt': 'I ask about the ties of the heart at present — what draws us together, what stands between us, and what the other truly feels.',
    'chip.wealth': 'Fortune & Wealth',
    'chip.wealthPrompt': 'By the numbers 3 and 8, I ask about the flow of wealth in the coming months — where to advance, and where to hold back.',
    'chip.choice': 'The Crossroads',
    'chip.choicePrompt': 'I ask about a grave decision at hand: should I advance or withdraw? Where lies the timing, and where the hidden risk?',
    'chip.tarot3': 'Tarot Three Cards',
    'chip.ichingnajia': 'Six Lines Na Jia',
    'chip.muyu': 'Merit Wooden Fish',

    // ── 输入区 ──
    'composer.placeholder': 'Write the one thing you wish to ask, or choose a method first',
    'composer.uploadTitle': 'Upload a portrait, floor plan, or hexagram image',
    'composer.motto': 'Ask yourself first, then ask heaven and earth · The hexagram is a mirror, not a command',
    'composer.credit': 'Freely built by Chuankang KK · Free to use',

    // ── 呈递 / 停止 ──
    'send': 'Present the question',
    'stop': 'Halt the reading',

    // ── 模型（法器）选择器 ──
    'model.btnTitle': 'Choose a vessel (model) for the reading',
    'model.badgeDefault': 'Default',
    'model.capVision': 'Vision',
    'model.capText': 'Text',
    'model.pacePrefix': 'Pace',
    'model.pace.fast': 'Swift',
    'model.pace.steady': 'Steady',
    'model.pace.slow': 'Slow',
    'model.fallbackName': 'the chosen model',
    // 八尊法器
    'model.qwen36.name': 'Tongyi Qianwen 3.6',
    'model.qwen36.vendor': 'Tongyi Qianwen',
    'model.qwen36.pros': 'Swift responses, steady over long context, versed in text and image alike — well suited to everyday readings.',
    'model.qwen36.cons': 'In weaving subtle mystic imagery, it trails the dedicated reasoning models.',
    'model.dsv4vision.name': 'DeepSeek V4 Vision',
    'model.dsv4vision.vendor': 'DeepSeek',
    'model.dsv4vision.pros': 'Deep reasoning joined with sight — it can read portraits, floor plans, and hexagram charts.',
    'model.dsv4vision.cons': 'Castings take longer; the free line is more tightly limited.',
    'model.dsv4flash.name': 'DeepSeek V4 Flash',
    'model.dsv4flash.vendor': 'DeepSeek',
    'model.dsv4flash.pros': 'A meticulous chain of reasoning, skilled with tangled hexagram logic and choices of many conditions.',
    'model.dsv4flash.cons': 'Text only; the free line may be rate-limited.',
    'model.glm53.name': 'Zhipu Qingyan GLM-5.3',
    'model.glm53.vendor': 'Zhipu Qingyan',
    'model.glm53.pros': 'Rich, warm in its Chinese prose — attuned to the language of the Eastern arts.',
    'model.glm53.cons': 'Text only; a little slow when deep in thought.',
    'model.hy3.name': 'Tencent Hunyuan HY3',
    'model.hy3.vendor': 'Tencent Hunyuan',
    'model.hy3.pros': 'Deep in the classics, measured in judgment — well suited to questions of great tides, advance and retreat.',
    'model.hy3.cons': 'Text only; responses tend to be slow.',
    'model.glm47.name': 'Zhipu Qingyan GLM-4.7',
    'model.glm47.vendor': 'Zhipu Qingyan',
    'model.glm47.pros': 'A direct line and quick speech, steady in Chinese — for swift questions and swift answers.',
    'model.glm47.cons': 'Text only; its deeper elaboration is somewhat lighter.',
    'model.mimo25.name': 'Xiaomi MiMo 2.5',
    'model.mimo25.vendor': 'Xiaomi MiMo',
    'model.mimo25.pros': 'Clear in thought, plain in tone — well suited to follow-up questions and reflection.',
    'model.mimo25.cons': 'Text only; the free quota runs out easily.',
    'model.qwen38flash.name': 'Tongyi Qianwen 3.8 Flash',
    'model.qwen38flash.vendor': 'Tongyi Qianwen',
    'model.qwen38flash.pros': 'Extremely quick of speech — for brief readings, swift questions, and swift answers.',
    'model.qwen38flash.cons': 'Text only; its deeper elaboration is somewhat lighter.',

    // ── 全局加载蒙层 ──
    'loading.title': 'Xuanjizi is reading the signs',
    'loading.desc': 'Setting the chart, weighing the interplay of forces…',

    // ── 历史档案与会话 ──
    'history.empty': 'No readings yet',
    'history.deleteTitle': 'Delete',

    // ── Round 2: signatures, waiting & status, toggle & tool copy ──
    'chat.userName': 'Seeker',
    'chat.aiName': 'Xuanjizi',
    'msg.waitCount': '{n} breaths waited',
    'msg.modelFallback': 'the chosen vessel',
    'status.searching': 'Consulting the web…',
    'status.searchingHint': 'Consulting the web · {q}',
    'status.websearchOn': 'Web consultation on · sources checked before each reading',
    'status.websearchOff': 'Web consultation off · reading from inner knowledge alone',
    'websearch.label': 'Web Search',
    'search.sourcesTitle': 'Web sources · {n} found',
    'iching.movingLine': 'Moving',
    'iching.staticLine': 'Still',
    'bazi.reviewNoCity': 'No birth city provided. ',
    'bazi.reviewNote': 'Details recorded; the formal four pillars, solar-term boundaries and true solar time will be verified in the reading that follows — this page never fabricates results.',
    'confirm.clearAll': 'Clear all reading history?',
    'session.newTitle': 'New reading',
    'send.stop': 'Stop reading',
    'send.submit': 'Send',
    'msg.noFixedAnswer': 'The heavens were dim just now and no firm answer came through. Please ask again in a little while.',
    'history.clearConfirm': 'Clear all records of past readings?',
    'session.newTitle': 'New Reading',

    // ── 消息流 ──
    'msg.userRole': 'Seeker',
    'msg.aiRole': 'Xuanjizi',
    'msg.imageOnlyContent': '(Portrait or floor plan uploaded — please read it, Xuanjizi.)',
    'msg.waiting': 'Xuanjizi is gathering focus · {n} breaths waited',
    'msg.emptyResult': 'The heavens were dim; this reading found no fixed answer. Please ask again in a moment.',
    'msg.abortedSuffix': '—— (The seeker halted the reading; the words end here.) ——',
    'msg.abortedEmpty': 'The reading was halted at your request. Your question remains — begin again whenever you wish.',
    'msg.modelError': 'This vessel ({model}) met an obstruction in the present reading.\n\n[The cause] {detail}\n\n[Guidance] Open the vessel selector above the input box and choose another; the deep-reasoning vessels are steadier, the swift ones quicker.',
    'msg.modelErrorDefault': 'The chosen model met an obstruction',
    'msg.timeout': 'The reading ran too long and was halted of itself.\n\n[Guidance] Ask again in a moment, or choose a swifter vessel (model); the deep-reasoning vessels are slow by nature.\n\n[The Oracle] Still waters run deep — haste invites turbulence.',
    'msg.networkError': 'The reading met a passing obstruction.\n\n[Guidance] Wait a moment and ask again, or open the vessel selector above the input box and choose another; if you uploaded images, compress them a little before retrying.\n\n[The Oracle] Still waters run deep — haste invites turbulence; keep your peace, and clarity will come.',
    'msg.netStatus': 'Network status {n}',
    'msg.posterFallback': 'Heaven rewards diligence; act in step with the tide. The wisdom of the Changes is subtle — the spirits quietly comprehend.',
    'action.copy': 'Copy the reading',
    'action.copied': 'Copied',
    'action.share': 'Talisman poster',
    'action.helpful': 'Insightful',

    // ── 图片上传 ──
    'upload.sizeLimit': 'Please keep each image within 15MB.',
    'err.imageRead': 'Failed to read the image',
    'err.imageFormat': 'The image format is not recognized',

    // ── 随喜赞助弹窗 ──
    'sponsor.title': 'Offering · Support the Work',
    'sponsor.heroTitle': 'An offering of merit — to keep the lamp of the Spirit Terrace burning',
    'sponsor.desc': 'If Xuanjizi has brought you clarity or direction, you may make an offering to support computing and upkeep.',
    'sponsor.tier1': 'Smooth and auspicious',
    'sponsor.tier2': 'Fortune flowing in',
    'sponsor.tier3': 'Blessings and wisdom grow',
    'sponsor.tier4': 'Great undertakings flourish',
    'sponsor.qrAlt': 'WeChat appreciation code',
    'sponsor.qrInfo': 'Scan with WeChat / Alipay to appreciate',
    'sponsor.qrTip': 'Long-press the code · Make an offering',
    'sponsor.quote': '“Sow good causes, reap good fruits; in giving and receiving, both are fulfilled.”',
    'sponsor.closeBtn': 'Grateful for this bond of goodwill',

    // ── 灵犀塔罗弹窗 ──
    'tarot.title': 'Intuitive Tarot · Three-Card Spread',
    'tarot.kicker': 'Shuffle · Draw · Turn three cards with your own hand',
    'tarot.qLabel': 'What weighs on your heart (hold the matter silently in mind)',
    'tarot.qPlaceholder': 'e.g. How will this partnership unfold, and what stands in its way?',
    'tarot.deckHintIdle': 'Rest for a breath, then shuffle',
    'tarot.deckHintShuffling': 'Shuffling · Hold fast to your first question',
    'tarot.deckHintDealt': 'The cards are placed · Turn them, one by one, with your own hand',
    'tarot.deckHintPartial': '{n}/3 revealed · Turn the rest with your own hand',
    'tarot.deckHintDone': 'Three cards revealed · Present them for interpretation',
    'tarot.slotPast': '[Past] Cause and origin',
    'tarot.slotPresent': '[Present] The present state',
    'tarot.slotFuture': '[Future] Where it leads',
    'tarot.flipCard': 'Turn the card',
    'tarot.ariaPast': 'Turn the past card',
    'tarot.ariaPresent': 'Turn the present card',
    'tarot.ariaFuture': 'Turn the future card',
    'tarot.drawBtn': 'Shuffle with a sincere heart and draw three cards',
    'tarot.reshuffleBtn': 'Shuffle again',
    'tarot.submitBtn': 'Present the spread for Xuanjizi to interpret',
    'tarot.resultTitle': 'The Three-Card Spread is revealed',
    'tarot.posPast': 'Past',
    'tarot.posPresent': 'Present',
    'tarot.posFuture': 'Future',
    'tarot.upright': 'Upright',
    'tarot.reversed': 'Reversed',
    'tarot.uprightBracket': '[Upright]',
    'tarot.reversedBracket': '[Reversed]',
    'tarot.defaultQuestion': 'I ask of my present quandary and the way ahead',

    // ── 周易六爻弹窗 ──
    'iching.title': 'I Ching Six Lines · Na Jia',
    'iching.kicker': 'Three coins, six casts · Rising from the first line',
    'iching.qLabel': 'Your intention and the matter at hand',
    'iching.qPlaceholder': 'e.g. Changing jobs in the coming months — fortune and timing',
    'iching.tossBtn': 'Cast the coins',
    'iching.tossStep': 'Line {n} of 6',
    'iching.done': 'Six lines cast · The hexagram is complete',
    'iching.resultTitle': 'The Six Lines are set',
    'iching.resultOrder': '(from first line to top: {lines})',
    'iching.lineLabel': 'Line {n}',
    'iching.dongLine': 'Moving',
    'iching.jingLine': 'Still',
    'iching.submitBtn': 'Present the hexagram for a full reading',
    'iching.defaultMatter': 'I ask of the weal and woe and the turn of great matters near at hand',

    // ── 梅花易数弹窗 ──
    'meihua.title': 'Plum Blossom Oracle',
    'meihua.kicker': 'Numbers from the hour · Substance and function in interplay',
    'meihua.tabTime': 'Cast by the present hour',
    'meihua.tabNum': 'Cast by given numbers',
    'meihua.timeInfo': 'From the numbers of the present year, month, day, and hour, the upper and lower trigrams and the moving line unfold.',
    'meihua.nowBtn': 'Cast by the present hour',
    'meihua.num1Label': 'Upper trigram number (1-999)',
    'meihua.num1Placeholder': 'e.g. 3',
    'meihua.num2Label': 'Lower trigram number (1-999)',
    'meihua.num2Placeholder': 'e.g. 8',
    'meihua.calcBtn': 'Form the hexagram',
    'meihua.errNum': 'Please enter two positive integers before casting by numbers',
    'meihua.modeTime': 'Cast from the present solar-calendar numbers (not converted to the lunar calendar; offered for reference)',
    'meihua.modeNum': 'Cast from the given numbers ({a}, {b})',
    'meihua.cardBen': 'Base hexagram',
    'meihua.cardHu': 'Mutual hexagram',
    'meihua.cardBian': 'Changed hexagram',
    'meihua.dongAt': 'The moving line lies at line {n}',
    'meihua.huDesc': 'Lines 2-3-4 / Lines 3-4-5',
    'meihua.bianChanged': 'Line {n} has changed',
    'meihua.tiyong': 'Substance and function: the substance hexagram is {ti}, the function hexagram is {yong}. What remains still is the substance; where the moving line lies is the function.',
    'meihua.submitBtn': 'Present the plum blossom hexagram for a full reading',

    // ── 小六壬弹窗 ──
    'xlr.title': 'Xiao Liu Ren · Palm Reckoning',
    'xlr.kicker': 'Six spirits in the palm · Swift answers for near matters',
    'xlr.qLabel': 'The urgent matter or journey at hand',
    'xlr.qPlaceholder': 'e.g. Searching for a lost thing today / Will the interview go well',
    'xlr.rollBtn': 'Reckon by fingertip',
    'xlr.result': 'The fingertip lands on [{name}] — {desc}',
    'xlr.submitBtn': 'Ask Xuanjizi for a full reading',
    'xlr.defaultQuestion': 'I ask of the weal and woe of a near matter',

    // ── 四柱八字弹窗 ──
    'bazi.title': 'Four Pillars of Destiny · Birth Data Review',
    'bazi.kicker': 'Enter your birth data · Let the reading verify the Four Pillars',
    'bazi.yearLabel': 'Year of birth',
    'bazi.yearPlaceholder': 'e.g. 1995',
    'bazi.monthLabel': 'Month of birth',
    'bazi.dayLabel': 'Day of birth',
    'bazi.hourLabel': 'Hour of birth',
    'bazi.genderLabel': 'Gender',
    'bazi.genderQian': 'Male chart (Qian)',
    'bazi.genderKun': 'Female chart (Kun)',
    'bazi.cityLabel': 'City of birth (to correct for true solar time)',
    'bazi.cityPlaceholder': 'e.g. Chengdu (for time-offset correction)',
    'bazi.calcBtn': 'Cast the chart precisely',
    'bazi.errDate': 'Please enter a valid date of birth first.',
    'bazi.errDateSubmit': 'Please complete the year, month, and day of birth first.',
    'bazi.reviewTitle': '{gender} · Solar calendar {y}-{m}-{d} · {hour}',
    'bazi.reviewCity': 'Birthplace: {city}.',
    'bazi.reviewNoCity': 'No city of birth entered.',
    'bazi.reviewNote': 'The data is recorded; the true Four Pillars, the solar terms, and true solar time will be verified by the reading that follows — this page will not fabricate stems and branches.',
    'bazi.submitBtn': 'Present the birth chart for a full reading',

    // ── 观象灵签弹窗 ──
    'lot.title': 'Oracle Lots · One Lot a Day',
    'lot.kicker': 'Hold one matter still in mind · Shake the lots and receive the sign',
    'lot.hint': 'Hold your breath and still your mind; hold the matter silently within',
    'lot.shakeBtn': 'Shake the lots with a sincere heart',
    'lot.submitBtn': 'Ask Xuanjizi to interpret the lot',

    // ── 择吉黄历弹窗 ──
    'almanac.title': 'Auspicious Almanac · Today',
    'almanac.weekdayPrefix': '',
    'almanac.pendingTitle': 'Today’s auspicious and inauspicious acts await the reading',
    'almanac.pendingDesc': 'The stems and branches, the presiding spirit, the clashes, and the fitting acts of the almanac cannot be fixed in code from the solar date alone. This page only confirms the date; once you press below, the reading will offer its guidance.',
    'almanac.askBtn': 'Ask Xuanjizi about this day',

    // ── 周公解梦弹窗 ──
    'dream.title': 'Book of Dreams · Archetypal Images',
    'dream.kicker': 'Read through image, emotion, and waking circumstance',
    'dream.chipsLabel': 'Key images of the dream — quick pick',
    'dream.chip1': 'Rivers, lakes, and waves',
    'dream.chip2': 'Climbing high and falling',
    'dream.chip3': 'Meeting one long parted from',
    'dream.chip4': 'Gaining wealth, losing things',
    'dream.chip5': 'Dragons, serpents, and strange beasts',
    'dream.chip6': 'Riding the wind in flight',
    'dream.detailLabel': 'Describe the dream in detail',
    'dream.detailPlaceholder': 'Describe the scene of the dream, the feelings it carried, and your mood upon waking…',
    'dream.submitBtn': 'Ask Xuanjizi to interpret the dream',
    'dream.errEmpty': 'Please describe the dream first.',

    // ── 功德木鱼弹窗 ──
    'muyu.title': 'Merit Wooden Fish',
    'muyu.kicker': 'One strike, one breath · Gather the wandering mind',
    'muyu.countLabel': 'Merit: ',
    'muyu.hint': 'Touch the wooden fish lightly; still the heart, clear the mind — blessings and wisdom grow.',
    'muyu.closeBtn': 'Rest the mind and close',
    'muyu.floatPlus': '+1 merit',

    // ── 符笺海报弹窗与画布 ──
    'poster.title': 'Fortune Talisman Poster',
    'poster.downloadBtn': 'Save the poster',
    'poster.canvasTitle': 'Xuanjizi · Talisman of the Spirit Terrace',
    'poster.canvasDate': ' · Reading the heavens',
    'poster.canvasQuote': '“Know fate, yet never be bound by it; move with the tide, and strive without rest.”',
    'poster.fileName': 'Xuanjizi_Talisman',

    // ── 关于弹窗（正文与中文同值，不逐句翻译） ──
    'about.title': 'About Xuanjizi',
    'about.heading': zh['about.heading'],
    'about.version': zh['about.version'],
    'about.intro': zh['about.intro'],
    'about.quote': zh['about.quote'],
    'about.credit': zh['about.credit']
  };

  // ───────────────────────────
  // 词典挂载与取词函数
  // ───────────────────────────
  window.I18N_LOCALES = { zh: zh, en: en };

  // 读取语言偏好：localStorage 优先，其次既有全局值，最后回退 'zh'。
  // 存储不可用（隐私模式）时不抛异常。
  function resolveInitialLang() {
    var stored = null;
    try { stored = localStorage.getItem(LANG_STORAGE_KEY); } catch (e) { /* 存储不可用 */ }
    if (stored === 'zh' || stored === 'en') return stored;
    if (window.I18N_LANG === 'zh' || window.I18N_LANG === 'en') return window.I18N_LANG;
    return 'zh';
  }

  // 按当前语言取词：缺词先回退 zh，再回退 key 本身；
  // params 中的 {name} 占位符逐一替换为对应值。
  function t(key, params) {
    var dict = window.I18N_LOCALES[window.I18N_LANG] || zh;
    var s = dict[key];
    if (s === undefined || s === null || s === '') s = zh[key];
    if (s === undefined || s === null) s = key;
    if (params) {
      for (var name in params) {
        if (Object.prototype.hasOwnProperty.call(params, name)) {
          s = s.split('{' + name + '}').join(String(params[name]));
        }
      }
    }
    return s;
  }

  // 重渲染当前页面静态文案：
  //   data-i18n     → 替换 textContent；
  //   data-i18n-ph  → 替换 placeholder。
  // 完成后派发 'i18n:applied'，供脚本侧刷新动态文案
  // （状态徽标、会话标题、模型面板、等候提示等）。
  function applyI18n() {
    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var val = t(el.getAttribute('data-i18n'));
      if (el.textContent !== val) el.textContent = val;
    }
    var phNodes = document.querySelectorAll('[data-i18n-ph]');
    for (var j = 0; j < phNodes.length; j++) {
      var phEl = phNodes[j];
      var phVal = t(phEl.getAttribute('data-i18n-ph'));
      if (phEl.placeholder !== phVal) phEl.placeholder = phVal;
    }
    window.dispatchEvent(new CustomEvent('i18n:applied', { detail: { lang: window.I18N_LANG } }));
  }

  // 切换语言：记忆于本地、更新全局值，并立即重渲染当前页面。
  function setI18nLang(lang) {
    if (lang !== 'zh' && lang !== 'en') return;
    try { localStorage.setItem(LANG_STORAGE_KEY, lang); } catch (e) { /* 存储不可用时静默忽略 */ }
    window.I18N_LANG = lang;
    applyI18n();
  }

  window.t = t;
  window.setI18nLang = setI18nLang;
  window.applyI18n = applyI18n;

  // 初始化：读取记忆中的语言并渲染静态文案。
  // 语言切换控件与动态文案刷新由主控在 script.js 中接线。
  window.I18N_LANG = resolveInitialLang();
  applyI18n();
})();
