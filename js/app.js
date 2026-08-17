/**
 * Easylumi Workbench - 主应用逻辑
 * 手机端H5个人工作台
 */

// ========== 本地存储封装 ==========
const Store = {
    get(key, def) {
        try {
            const v = localStorage.getItem('el_' + key);
            return v ? JSON.parse(v) : def;
        } catch { return def; }
    },
    set(key, val) {
        localStorage.setItem('el_' + key, JSON.stringify(val));
    },
    remove(key) {
        localStorage.removeItem('el_' + key);
    }
};

// ========== 工具函数 ==========
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

function fmtDate(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDisplayDate(d = new Date()) {
    const w = ['周日','周一','周二','周三','周四','周五','周六'];
    return `${d.getMonth()+1}月${d.getDate()}日 ${w[d.getDay()]}`;
}
function fmtMonthYear(d) {
    return `${d.getFullYear()}年${d.getMonth()+1}月`;
}
function getGreeting() {
    const h = new Date().getHours();
    if (h < 6) return '凌晨好';
    if (h < 9) return '早上好';
    if (h < 12) return '上午好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
}
function throttle(fn, wait) {
    let last = 0;
    return (...args) => {
        const now = Date.now();
        if (now - last >= wait) { last = now; fn(...args); }
    };
}

// ========== 预设数据 ==========
const QUOTES = [
    { text: '温柔的人，终会被温柔以待。', en: 'The future belongs to those who believe in the beauty of their dreams.' },
    { text: '星光不问赶路人，时光不负有心人。', en: 'Time rewards those who stay true to their hearts.' },
    { text: '种一棵树最好的时间是十年前，其次是现在。', en: 'The best time to plant a tree was 10 years ago. The second best time is now.' },
    { text: '你若盛开，清风自来。', en: 'If you bloom, the breeze will come naturally.' },
    { text: '生活明朗，万物可爱。', en: 'Life is bright, and everything is lovely.' },
    { text: '保持热爱，奔赴山海。', en: 'Keep loving, and go towards the mountains and seas.' },
    { text: '慢下来，才能看到生活的美。', en: 'Slow down to see the beauty of life.' },
    { text: '每一个不曾起舞的日子，都是对生命的辜负。', en: 'Every day without dancing is a betrayal to life.' }
];

const POEMS = [
    { text: '心似双丝网，中有千千结。', source: '——《千秋岁》' },
    { text: '山有木兮木有枝，心悦君兮君不知。', source: '——《越人歌》' },
    { text: '人生如逆旅，我亦是行人。', source: '——苏轼《临江仙》' },
    { text: '且将新火试新茶，诗酒趁年华。', source: '——苏轼《望江南》' },
    { text: '长风破浪会有时，直挂云帆济沧海。', source: '——李白《行路难》' },
    { text: '采菊东篱下，悠然见南山。', source: '——陶渊明《饮酒》' },
    { text: '路漫漫其修远兮，吾将上下而求索。', source: '——屈原《离骚》' },
    { text: '落霞与孤鹜齐飞，秋水共长天一色。', source: '——王勃《滕王阁序》' }
];

const DAILY_QUOTES = [
    { text: '推动高质量发展，谱写中国式现代化新篇章。', source: '——学习强国' },
    { text: '科技创新引领产业变革，新质生产力加速形成。', source: '——人民日报' },
    { text: '心有所信，方能行远。', source: '——新华社' },
    { text: '数字化转型浪潮下的机遇与挑战并存。', source: '——眼界' },
    { text: '绿水青山就是金山银山。', source: '——人民日报' },
    { text: '每一个不曾起舞的日子，都是对生命的辜负。', source: '——学习强国' },
    { text: '以梦为马，不负韶华。', source: '——新华社' },
    { text: '保持热爱，奔赴山海。', source: '——眼界' }
];

const DEFAULT_TASKS = [
    { id: 't1', text: '7:00 起床', type: 'normal' },
    { id: 't2', text: '练字打卡', type: 'normal' },
    { id: 't3', text: '背英语单词20个', type: 'normal' },
    { id: 't4', text: '看书 30 分钟', type: 'normal' },
    { id: 't5', text: '动起来（Morning、Night、面部瑜伽全部完成）', type: 'fitness_link' },
    { id: 't6', text: '23:30 前睡觉', type: 'normal' },
    { id: 't7', text: '饭前喝一杯水', type: 'group', sub: [
        { id: 't7a', text: '早饭前喝一杯水' },
        { id: 't7b', text: '午饭前喝一杯水' },
        { id: 't7c', text: '晚饭前喝一杯水' }
    ]}
];

const FITNESS_PLANS = {
    morning: {
        1: ['帕梅拉暴汗三部曲'],
        2: ['古法健身'],
        3: ['40分钟热汗瑜伽'],
        4: ['暴汗拳击+HIIT', '拉伸'],
        5: ['MADFIT', '拉伸'],
        6: ['全身有氧'],
        0: ['全身有氧']
    },
    night: {
        1: ['手臂30分钟', '拉伸'],
        2: ['瘦腿30分钟', '拉伸'],
        3: ['瘦腰30分钟', '拉伸'],
        4: ['改善富贵包', '拉伸'],
        5: ['舞蹈风瘦手臂', '普拉提瘦腿', '拉伸'],
        6: ['全身有氧'],
        0: ['全身有氧']
    },
    face: {
        1: ['筷子操'],
        2: ['眼袋操'],
        3: ['缩鼻美容'],
        4: ['面部瑜伽'],
        5: ['面部拨筋'],
        6: ['面部八段锦'],
        0: ['缩鼻美容']
    }
};

const CLASSICS = [
    { title: '上善若水', source: '《道德经》第八章', category: 'daodejing',
      quote: '「上善若水。水善利万物而不争，处众人之所恶，故几于道。」',
      explain: '最高的善像水一样，水善于滋养万物而不与万物相争，停留在众人都不喜欢的地方，所以最接近于道。' },
    { title: '道法自然', source: '《道德经》第二十五章', category: 'daodejing',
      quote: '「人法地，地法天，天法道，道法自然。」',
      explain: '人取法地，地取法天，天取法道，道取法自然。强调万物都应顺应自然规律。' },
    { title: '应无所住', source: '《金刚经》', category: 'jingangjing',
      quote: '「应无所住而生其心。」',
      explain: '心不执着于任何事物，才能生起清净的智慧之心。' },
    { title: '天行健', source: '《易经·乾卦》', category: 'yijing',
      quote: '「天行健，君子以自强不息。」',
      explain: '天体运行刚健不息，君子应当效法天道，自我奋发图强，永不止息。' },
    { title: '学而时习', source: '《论语·学而》', category: 'lunyu',
      quote: '「学而时习之，不亦说乎？有朋自远方来，不亦乐乎？」',
      explain: '学习后按时温习，不是很愉快吗？有志同道合的朋友从远方来，不是很快乐吗？' },
    { title: '己所不欲', source: '《论语·颜渊》', category: 'lunyu',
      quote: '「己所不欲，勿施于人。」',
      explain: '自己不愿意的事情，不要强加给别人。这是儒家"仁"的核心思想之一。' },
    { title: '捭阖之道', source: '《鬼谷子》', category: 'guiguzi',
      quote: '「捭之者，开也，言也，阳也；阖之者，闭也，默也，阴也。」',
      explain: '捭阖是鬼谷子思想的核心，捭是开放、言说，阖是封闭、沉默，阴阳相济才能把握事物的变化规律。' }
];

const NEWS_DATA = [
    { title: '推动高质量发展 谱写中国式现代化新篇章', source: 'xuexi', date: '2026-08-16', tag: '学习强国', url: 'https://www.xuexi.cn' },
    { title: '科技创新引领产业变革 新质生产力加速形成', source: 'rmrb', date: '2026-08-16', tag: '人民日报', url: 'https://paper.people.com.cn' },
    { title: '全球经济复苏步伐加快 中国经济展现强大韧性', source: 'xinhua', date: '2026-08-15', tag: '新华社', url: 'http://www.xinhuanet.com' },
    { title: '数字化转型浪潮下的机遇与挑战', source: 'yanjie', date: '2026-08-15', tag: '眼界', url: '#' },
    { title: '绿色低碳发展成为全球共识', source: 'xuexi', date: '2026-08-14', tag: '学习强国', url: 'https://www.xuexi.cn' },
    { title: '人工智能赋能千行百业 产业智能化加速推进', source: 'rmrb', date: '2026-08-14', tag: '人民日报', url: 'https://paper.people.com.cn' },
    { title: '乡村振兴新图景：特色产业带动农民增收', source: 'xinhua', date: '2026-08-13', tag: '新华社', url: 'http://www.xinhuanet.com' },
    { title: '元宇宙概念持续升温 虚实融合开启新纪元', source: 'yanjie', date: '2026-08-13', tag: '眼界', url: '#' }
];

const VIRAL_DATA = [
    {
        platform: 'douyin', title: '30天自律挑战：从摆烂到人生开挂',
        score: '95%', core: '用时间可视化+阶段奖励机制，把宏大目标拆解成每日可执行动作',
        direction: '做一期"30天身材管理挑战"，每天记录饮食和运动',
        angle: '以"普通人逆袭"为切入点，引发共鸣',
        url: 'https://www.douyin.com'
    },
    {
        platform: 'xiaohongshu', title: '96年女生下班后的4小时｜副业月入过万',
        score: '92%', core: '展示具体的副业方法论和收入截图，真实性+可复制性',
        direction: '分享内容创作者的日常时间表和收入来源',
        angle: '突出"下班后黄金4小时"的时间管理概念',
        url: 'https://www.xiaohongshu.com'
    },
    {
        platform: 'weibo', title: '#早起打卡# 坚持早起100天，我的人生变了',
        score: '88%', core: '用数据对比（早起前后）+情感共鸣，引发跟风打卡',
        direction: '做"自律打卡"系列，每天分享自己的自律日常',
        angle: '用真实改变打动人心，引导用户参与话题互动',
        url: 'https://weibo.com'
    },
    {
        platform: 'douyin', title: '3分钟学会：让视频爆款的5个黄金开头',
        score: '90%', core: '干货密集+案例拆解，解决创作者的直接痛点',
        direction: '做短视频创作教程系列，每期一个知识点',
        angle: '用具体数据（完播率提升50%）增强说服力',
        url: 'https://www.douyin.com'
    },
    // ===== 账号选题库（30+清醒女性认知成长博主）=====
    { platform: 'topic', title: '《被讨厌的勇气》：同事一句话，我内耗了三天', score: '95%',
      core: '过度在意别人评价，把别人的课题背在自己身上，活得累',
      direction: '书籍拆解', angle: '用"课题分离"当场止损：这句话是我的课题还是他的？3秒判断法', url: '' },
    { platform: 'topic', title: '《界限》：不会拒绝的老好人，正在被消耗', score: '93%',
      core: '不会说不，帮了别人委屈自己，不帮又愧疚',
      direction: '书籍拆解', angle: '给3句"温和但坚定"的边界话术，现场演示怎么接催婚、蹭车、借钱', url: '' },
    { platform: 'topic', title: '《纳瓦尔宝典》：靠死工资，永远富不起来', score: '90%',
      core: '收入单一、拼命加班却存不下钱的"努力陷阱"',
      direction: '书籍拆解', angle: '拆"杠杆"概念：普通人最容易上手的两种杠杆——内容和工具，各举实操', url: '' },
    { platform: 'topic', title: '《蛤蟆先生去看心理医生》：emo是内在小孩在求救', score: '92%',
      core: '长期情绪低落、自我怀疑，还要在别人面前装"我没事"',
      direction: '书籍拆解', angle: '用"人生坐标"自测：你活在"我不好你好"象限吗？附一次咨询式自我对话', url: '' },
    { platform: 'topic', title: '《认知觉醒》：道理都懂，为什么还是过不好', score: '96%',
      core: '收藏一堆干货、买一堆课，生活原地踏步',
      direction: '书籍拆解', angle: '拆"本能脑vs理智脑"：不是你懒，是大脑天生省电；给不靠意志力的启动法', url: '' },
    { platform: 'topic', title: '《金钱心理学》：月入2万还是月光，问题不在收入', score: '91%',
      core: '赚得不少却攒不下钱，用消费缓解焦虑的恶性循环',
      direction: '书籍拆解', angle: '拆"情绪消费"：翻一年账单找到3个漏钱黑洞 + 一个反直觉的存钱顺序', url: '' },
    { platform: 'topic', title: '《非暴力沟通》：怼人不需要撕破脸', score: '88%',
      core: '和伴侣/父母一说话就吵，委屈说不出口，说了就炸',
      direction: '书籍拆解', angle: '用"观察-感受-需要-请求"四步改写一句吵架原话，改完立竿见影', url: '' },
    { platform: 'topic', title: '《心流》：刷3小时手机，为什么比上班还累', score: '87%',
      core: '注意力碎片化，越休息越累，专注力像漏水的桶',
      direction: '书籍拆解', angle: '拆"精神熵"：低质量休息vs高质量心流，分享每天25分钟的进入仪式', url: '' },
    { platform: 'topic', title: '《微习惯》：自律失败的姐妹，把目标缩小100倍', score: '94%',
      core: '计划做100分，执行3天弃坑，然后自责，循环往复',
      direction: '书籍拆解', angle: '"每天1个俯卧撑"的傻子策略为什么吊打宏大计划；演示怎么把背单词缩到不可能失败', url: '' },
    { platform: 'topic', title: '《终身成长》：35岁危机，是能力还是思维危机', score: '89%',
      core: '年龄焦虑、"这辈子就这样了"的固定型思维定势',
      direction: '书籍拆解', angle: '自测固定型vs成长型：同一句"我不行"，两种思维两种人生；30+换赛道来得及', url: '' },
    { platform: 'topic', title: '《断舍离》：你囤的不是东西，是不安全感', score: '86%',
      core: '房间乱、收藏夹满、信息过载，心里也跟着堵',
      direction: '书籍拆解', angle: '从物质断舍离讲到信息断舍离：清空800条收藏夹后，注意力回来了', url: '' },
    { platform: 'topic', title: '《五种时间》：你不是没时间，是时间结构烂', score: '90%',
      core: '工作、副业、健身、学习多线并行，天天救火、样样拖延',
      direction: '书籍拆解', angle: '用"五种时间"给一周排序：生存先压缩，好看要固定，赚钱要复利', url: '' },
    { platform: 'topic', title: '《向前一步》：你不敢要的，别人凭什么给你', score: '85%',
      core: '职场女性不敢谈薪、不敢争取，习惯性把自己往后排',
      direction: '书籍拆解', angle: '拆"冒充者综合征"：你不是不配，是没开口；给一次真实谈薪逐句复盘', url: '' },
    { platform: 'topic', title: '30+开书店的第N年，说点大实话', score: '93%',
      core: '想辞职开店/搞副业，又怕踩坑，信息差太大',
      direction: '生活成长切片', angle: '真实流水账：最惨一个月赚多少、最后悔的一个决定、开店教会我的3件事', url: '' },
    { platform: 'topic', title: '体检查出结节那天，我在走廊站了十分钟', score: '95%',
      core: '30+健康焦虑：不敢体检、查完更焦虑、情绪拖垮身体',
      direction: '生活成长切片', angle: '从恐慌到建立"健康最小动作"系统：砍掉80%养生焦虑，只留3件事', url: '' },
    { platform: 'topic', title: '自媒体第3个月数据惨淡，我为什么还在更', score: '91%',
      core: '起步期没正反馈，想放弃又不敢all in',
      direction: '生活成长切片', angle: '晒真实后台数据 + 止损线和迭代逻辑：做账号是长跑，先跑对方向再谈爆发', url: '' },
    { platform: 'topic', title: '30岁重学英语，被00后同学"关照"之后', score: '88%',
      core: '想学习又怕丢脸、怕晚了、坚持不下去',
      direction: '生活成长切片', angle: '真实课堂翻车现场 + 大龄学习法：不求速成，只求每天都碰一下', url: '' },
    { platform: 'topic', title: '自律失败的第108天，我决定放过自己', score: '94%',
      core: '自律-崩盘-自责的恶性循环，越自律越焦虑',
      direction: '生活成长切片', angle: '从"完美自律"切换到"及格自律"：允许自己每天烂尾20%，反而坚持下来了', url: '' },
    { platform: 'topic', title: '一个人过生日那天，我把"孤独"重新定义了', score: '89%',
      core: '单身/独居的孤独羞耻感，怕被说"没人陪"',
      direction: '生活成长切片', angle: '独处≠可怜：一个人吃饭旅行过节的快乐清单，把独居过成滋养不是将就', url: '' },
    { platform: 'topic', title: '又被催婚了，今年第14次，我是这样接住的', score: '92%',
      core: '催婚压力：不想吵翻，也不想将就，进退两难',
      direction: '生活成长切片', angle: '实录一次催婚对话逐句复盘：哪句接得漂亮、哪句翻车了，下次怎么改', url: '' },
    { platform: 'topic', title: '收入断崖的那半年，我是怎么熬过来的', score: '90%',
      core: '收入波动带来的失控感和自我怀疑',
      direction: '生活成长切片', angle: '拆"低谷期财务+心态双预案"：固定支出砍到多少、每天怎么稳住情绪', url: '' },
    { platform: 'topic', title: '从"假装精致"到真实生活，我一年多存4万', score: '93%',
      core: '为面子消费、被种草绑架，精致穷',
      direction: '生活成长切片', angle: '对比账单说话：砍掉的5类"精致税"留下的3类真实快乐，省钱不丢人', url: '' },
    { platform: 'topic', title: '别学我4点半起床，找到你自己的黄金时间', score: '87%',
      core: '盲目模仿别人的自律模板，越学越挫败',
      direction: '生活成长切片', angle: '试过早起的惨痛教训后，用一周记录法找到自己的高效时段，适配>模仿', url: '' },
    { platform: 'topic', title: '我用AI搭了个个人工作台，人生理顺了一半', score: '96%',
      core: '想管理生活但APP下了一堆、信息散落各处',
      direction: 'AI工具·个人系统', angle: '实军用WorkBuddy搭工作台：待办+运动+复盘一个页面搞定，展示真实界面', url: '' },
    { platform: 'topic', title: '多线并行不崩溃：我的时间管理只有3层', score: '92%',
      core: '工作+副业+学习多任务切换，一乱全乱',
      direction: 'AI工具·个人系统', angle: '拆"日-周-月"三层结构：每天15分钟规划，一周省出5小时', url: '' },
    { platform: 'topic', title: '用AI帮我拆书，1小时出一周口播素材', score: '95%',
      core: '想做知识博主，但读书慢、写稿慢、坚持不了',
      direction: 'AI工具·个人系统', angle: '演示完整拆书工作流：丢给AI一个指令模板，书→痛点→案例→行动全部结构化', url: '' },
    { platform: 'topic', title: '选题库这样建，再也不怕没东西拍', score: '91%',
      core: '选题靠灵感，灵感靠不住，经常断更',
      direction: 'AI工具·个人系统', angle: '展示选题库字段模板：从"选题池→已发布→数据复盘"一条线跑通，选题永远比拍摄多10条', url: '' },
    { platform: 'topic', title: 'AI时代，普通女生的第二曲线怎么启动', score: '89%',
      core: '看到别人用AI搞钱很焦虑，自己不知道从哪下手',
      direction: 'AI工具·个人系统', angle: '轻商业认知：先把自己变成"会用AI的熟练工"再谈变现；给3个零成本起步路径', url: '' },
    { platform: 'topic', title: '我的全自动工作流：AI + 日历 + 每日复盘', score: '90%',
      core: '工具装了一堆，没有形成闭环，等于白装',
      direction: 'AI工具·个人系统', angle: '完整演示"输入→处理→输出→复盘"闭环：一条内容从灵感到发布的全流程', url: '' },
    { platform: 'topic', title: '用AI记了一个月情绪日记，我发现了规律', score: '94%',
      core: '情绪来了只会硬扛，找不到根源，反复内耗',
      direction: 'AI工具·个人系统', angle: '把每天的情绪事件丢给AI分析，30天后它找到3个"情绪雷区"，比自己想的准', url: '' },
    { platform: 'topic', title: '别只拿AI聊天，把它变成你的私人助理', score: '93%',
      core: '知道AI很火，但只会问"帮我写个文案"，用法太浅',
      direction: 'AI工具·个人系统', angle: '演示5个真实场景：行程规划/学习计划/合同避坑/健身餐单/复盘提问，当场出结果', url: '' },
    { platform: 'topic', title: '凌晨一点，我盯着满桌的计划表一个都没完成', score: '88%',
      core: '计划越做越漂亮，执行越来越拉胯，自我怀疑',
      direction: 'AI工具·个人系统', angle: '用"周计划复盘法"找出计划失败的真凶：不是执行力，是排产逻辑', url: '' },
    // ===== 抖音高热度观点类视频（每日由爬虫流水线更新）=====
    { platform: 'douyinhot', hot_word: '女性独立', title: '经济独立是女人最大的底气？我只认同一半', score: '95%',
      core: '底气=收入×认知，光有钱没有财商照样焦虑；真正独立是决策独立',
      direction: '轻商业认知支柱：拆"收入独立vs决策独立"，用自己开书店的真实账本举例',
      angle: '钩子：月入3万但不敢辞职的你，算独立吗？', url: 'https://www.douyin.com/search/%E5%A5%B3%E6%80%A7%E7%8B%AC%E7%AB%8B' },
    { platform: 'douyinhot', hot_word: '30岁焦虑', title: '30岁没结婚没买房，人生就落后了吗', score: '93%',
      core: '人生进度条是自己画的，社会时钟只是参考答案之一',
      direction: '人生选择支柱：结合《五种时间》讲自定义人生排序，晒自己的周计划表',
      angle: '钩子：30岁那年我辞职开书店，所有人都说我疯了', url: 'https://www.douyin.com/search/30%E5%B2%81%E7%84%A6%E8%99%91' },
    { platform: 'douyinhot', hot_word: '情绪内耗', title: '停止内耗最快的方式：把"想"换成"写"', score: '94%',
      core: '内耗源于大脑反刍，写下来=外置内存条，情绪从"经历"变"素材"',
      direction: 'AI工具支柱：演示用AI记情绪日记30天，找出3个情绪雷区的全过程',
      angle: '钩子：凌晨一点，我盯着满桌的计划表，一个都没完成', url: 'https://www.douyin.com/search/%E6%83%85%E7%BB%AA%E5%86%85%E8%80%97' }
];

// ========== 数据初始化 ==========
function initData() {
    if (!Store.get('tasks')) Store.set('tasks', {});
    if (!Store.get('fitness')) {
        const fd = {};
        ['morning','night','face'].forEach(k => { fd[k] = {}; });
        Store.set('fitness', fd);
    }
    if (!Store.get('bodyRecords')) Store.set('bodyRecords', []);
    if (!Store.get('dailyNotes')) Store.set('dailyNotes', []);
    if (!Store.get('favorites')) Store.set('favorites', []);
    if (!Store.get('quoteIdx')) Store.set('quoteIdx', 0);
    if (!Store.get('poemIdx')) Store.set('poemIdx', 0);
    if (!Store.get('dailyQuoteIdx')) Store.set('dailyQuoteIdx', 0);
}

// ========== 首页模块 ==========
const HomeModule = {
    init() {
        this.updateWelcome();
        this.updateQuote();
        this.updatePoem();
        this.updateStats();
        this.updateDate();
        $('#poemRefresh').addEventListener('click', () => this.refreshPoem());
        setInterval(() => this.updateWelcome(), 60000);
    },
    updateWelcome() {
        $('#welcomeTime').textContent = getGreeting();
        const slogans = [
            '今天也是温柔坚持的一天 💪',
            '慢慢来，比较快 🌸',
            '做自己喜欢的事，成为自己喜欢的人 ✨',
            '每一天都是新的开始 🌅',
            '温柔且坚定，知足且上进 💜'
        ];
        const idx = new Date().getDate() % slogans.length;
        $('#welcomeSlogan').textContent = slogans[idx];
    },
    updateQuote() {
        const idx = Store.get('quoteIdx', 0) % QUOTES.length;
        $('#quoteText').textContent = QUOTES[idx].text;
        $('#quoteEn').textContent = QUOTES[idx].en;
    },
    updatePoem() {
        const idx = Store.get('poemIdx', 0) % POEMS.length;
        $('#poemText').textContent = POEMS[idx].text;
        $('#poemSource').textContent = POEMS[idx].source;
    },
    refreshPoem() {
        let idx = Store.get('poemIdx', 0);
        idx = (idx + 1) % POEMS.length;
        Store.set('poemIdx', idx);
        this.updatePoem();
    },
    updateStats() {
        const today = fmtDate();
        const tasks = Store.get('tasks', {});
        const todayTasks = tasks[today] || this.getDefaultTasksForDate(today);
        let done = 0, total = 0;
        todayTasks.forEach(t => {
            if (t.type === 'group' && t.sub) {
                let subDone = 0;
                t.sub.forEach(s => { total++; if (s.done) subDone++; });
                if (subDone === t.sub.length) done++;
            } else {
                total++;
                if (t.done) done++;
            }
        });
        $('#statDone').textContent = done;
        $('#statTodo').textContent = total;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        $('#statProgress').textContent = pct + '%';
    },
    updateDate() {
        $('#dateDisplay').textContent = fmtDisplayDate();
    },
    getDefaultTasksForDate(dateStr) {
        return JSON.parse(JSON.stringify(DEFAULT_TASKS));
    }
};

// ========== 今日计划模块 ==========
const PlanModule = {
    curMonth: new Date(),
    selDate: fmtDate(),
    currentList: null,

    init() {
        this.renderCalendar();
        this.renderTasks();
        $('#calPrev').addEventListener('click', () => this.changeMonth(-1));
        $('#calNext').addEventListener('click', () => this.changeMonth(1));
        $('#taskAddBtn').addEventListener('click', () => this.addTask());
        $('#taskAddInput').addEventListener('keypress', e => { if (e.key === 'Enter') this.addTask(); });
        $('#dateTasksClose').addEventListener('click', () => $('#dateTasksModal').classList.remove('active'));
    },

    changeMonth(delta) {
        this.curMonth.setMonth(this.curMonth.getMonth() + delta);
        this.renderCalendar();
    },

    renderCalendar() {
        $('#calTitle').textContent = fmtMonthYear(this.curMonth);
        const days = $('#calendarDays');
        days.innerHTML = '';
        const y = this.curMonth.getFullYear(), m = this.curMonth.getMonth();
        const firstDay = new Date(y, m, 1).getDay();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const tasks = Store.get('tasks', {});
        const today = fmtDate();

        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            days.appendChild(empty);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const dayEl = document.createElement('div');
            dayEl.className = 'cal-day' + (dateStr === this.selDate ? ' active' : '');
            const pct = this.calcDayProgress(dateStr, tasks);
            dayEl.innerHTML = `
                <span class="cal-day-num">${d}</span>
                <div class="cal-day-ring">
                    <svg viewBox="0 0 20 20">
                        <circle class="ring-bg" cx="10" cy="10" r="8"/>
                        <circle class="ring-fill" cx="10" cy="10" r="8"
                            stroke-dasharray="50.27" stroke-dashoffset="${50.27 * (1 - pct)}"/>
                    </svg>
                </div>
            `;
            dayEl.addEventListener('click', () => {
                this.selDate = dateStr;
                this.renderCalendar();
                this.renderTasks();
            });
            days.appendChild(dayEl);
        }
    },

    calcDayProgress(dateStr, tasks) {
        const list = tasks[dateStr];
        if (!list) return 0;
        let done = 0, total = 0;
        list.forEach(t => {
            if (t.type === 'group' && t.sub) {
                let sd = 0;
                t.sub.forEach(s => { total++; if (s.done) sd++; });
                if (sd === t.sub.length) done++;
            } else { total++; if (t.done) done++; }
        });
        return total > 0 ? done / total : 0;
    },

    getTasksForDate(dateStr) {
        const tasks = Store.get('tasks', {});
        if (!tasks[dateStr]) {
            tasks[dateStr] = JSON.parse(JSON.stringify(DEFAULT_TASKS));
            Store.set('tasks', tasks);
        }
        this.currentList = tasks[dateStr];
        return this.currentList;
    },

    renderTasks() {
        const d = new Date(this.selDate + 'T00:00:00');
        $('#taskDateTitle').textContent = fmtDisplayDate(d) + ' 任务清单';
        const list = this.getTasksForDate(this.selDate);
        this.currentList = list;
        const container = $('#taskList');
        container.innerHTML = '';

        list.forEach((task, idx) => {
            if (task.type === 'group' && task.sub) {
                const group = document.createElement('div');
                group.className = 'task-group';
                const isWater = task.id === 't7';
                group.innerHTML = `<div class="task-group-label ${isWater ? 'water-label' : ''}">${task.text}</div>`;
                const subContainer = document.createElement('div');
                subContainer.className = 'task-subitems';
                let allDone = true;
                task.sub.forEach((sub, sidx) => {
                    if (!sub.done) allDone = false;
                    const item = this.createTaskItem(sub.text, sub.done, () => {
                        sub.done = !sub.done;
                        this.saveAndRefresh();
                    }, () => {
                        task.sub.splice(sidx, 1);
                        this.saveAndRefresh();
                    });
                    subContainer.appendChild(item);
                });
                group.appendChild(subContainer);
                container.appendChild(group);
                // 更新父任务状态：全部子任务完成则父任务自动完成
                if (allDone && !task.done) {
                    task.done = true;
                    this.saveTasks(list);
                } else if (!allDone && task.done) {
                    task.done = false;
                    this.saveTasks(list);
                }
            } else {
                const item = this.createTaskItem(task.text, task.done, () => {
                    task.done = !task.done;
                    this.saveAndRefresh();
                }, () => {
                    list.splice(idx, 1);
                    this.saveAndRefresh();
                });
                container.appendChild(item);
            }
        });
    },

    createTaskItem(text, done, onToggle, onDelete) {
        const item = document.createElement('div');
        item.className = 'task-item';
        item.innerHTML = `
            <div class="task-checkbox ${done ? 'checked' : ''}"></div>
            <div class="task-text ${done ? 'done' : ''}">${text}</div>
            <button class="task-delete">🗑</button>
        `;
        item.querySelector('.task-checkbox').addEventListener('click', onToggle);
        item.querySelector('.task-text').addEventListener('click', onToggle);
        item.querySelector('.task-delete').addEventListener('click', onDelete);
        return item;
    },

    saveTasks(list) {
        const tasks = Store.get('tasks', {});
        tasks[this.selDate] = list;
        Store.set('tasks', tasks);
        this.currentList = list;
    },

    saveAndRefresh() {
        if (!this.currentList) this.currentList = this.getTasksForDate(this.selDate);
        const tasks = Store.get('tasks', {});
        tasks[this.selDate] = this.currentList;
        Store.set('tasks', tasks);
        this.renderTasks();
        this.renderCalendar();
        HomeModule.updateStats();
    },

    addTask() {
        const input = $('#taskAddInput');
        const text = input.value.trim();
        if (!text) return;
        const list = this.getTasksForDate(this.selDate);
        list.push({ id: 'custom_' + Date.now(), text, type: 'normal', done: false });
        this.saveAndRefresh();
        input.value = '';
    }
};

// ========== 运动塑形模块 ==========
const FitnessModule = {
    activeTab: 'morning',

    init() {
        $$('.fitness-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
        });
        this.initLists();
        this.renderAll();
        ['morning','night','face'].forEach(k => {
            $(`#${k}AddBtn`).addEventListener('click', () => this.addItem(k));
            $(`#${k}AddInput`).addEventListener('keypress', e => { if (e.key === 'Enter') this.addItem(k); });
        });
        $('#bodySaveBtn').addEventListener('click', () => this.saveBodyRecord());
        this.renderBodyHistory();
    },

    initLists() {
        const fitness = Store.get('fitness', {});
        const today = new Date().getDay();
        ['morning','night','face'].forEach(k => {
            if (!fitness[k]) fitness[k] = {};
            const dayKey = fmtDate();
            if (!fitness[k][dayKey]) {
                fitness[k][dayKey] = FITNESS_PLANS[k][today].map((text, i) => ({
                    id: `${k}_${today}_${i}`, text, done: false
                }));
            }
        });
        Store.set('fitness', fitness);
    },

    switchTab(tab) {
        this.activeTab = tab;
        $$('.fitness-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        $$('.fitness-panel').forEach(p => p.classList.toggle('active', p.id === `fitness-${tab}`));
    },

    renderAll() {
        ['morning','night','face'].forEach(k => this.renderList(k));
    },

    renderList(type) {
        const fitness = Store.get('fitness', {});
        const dayKey = fmtDate();
        const list = fitness[type]?.[dayKey] || [];
        const container = $(`#${type}List`);
        container.innerHTML = '';
        let done = 0;
        list.forEach((item, idx) => {
            if (item.done) done++;
            const el = document.createElement('div');
            el.className = 'fitness-item';
            el.innerHTML = `
                <div class="task-checkbox ${item.done ? 'checked' : ''}"></div>
                <div class="task-text ${item.done ? 'done' : ''}">${item.text}</div>
                <button class="task-delete">🗑</button>
            `;
            el.querySelector('.task-checkbox').addEventListener('click', () => {
                item.done = !item.done;
                Store.set('fitness', fitness);
                this.renderList(type);
                this.checkFitnessTaskComplete();
            });
            el.querySelector('.task-text').addEventListener('click', () => {
                item.done = !item.done;
                Store.set('fitness', fitness);
                this.renderList(type);
                this.checkFitnessTaskComplete();
            });
            el.querySelector('.task-delete').addEventListener('click', () => {
                list.splice(idx, 1);
                Store.set('fitness', fitness);
                this.renderList(type);
                this.checkFitnessTaskComplete();
            });
            container.appendChild(el);
        });
        $(`#${type}Count`).textContent = `${done} / ${list.length}`;
    },

    addItem(type) {
        const input = $(`#${type}AddInput`);
        const text = input.value.trim();
        if (!text) return;
        const fitness = Store.get('fitness', {});
        const dayKey = fmtDate();
        if (!fitness[type]) fitness[type] = {};
        if (!fitness[type][dayKey]) fitness[type][dayKey] = [];
        fitness[type][dayKey].push({ id: `custom_${Date.now()}`, text, done: false });
        Store.set('fitness', fitness);
        this.renderList(type);
        input.value = '';
    },

    checkFitnessTaskComplete() {
        const fitness = Store.get('fitness', {});
        const dayKey = fmtDate();
        let allDone = true;
        ['morning','night','face'].forEach(k => {
            const list = fitness[k]?.[dayKey] || [];
            if (list.length === 0 || list.some(i => !i.done)) allDone = false;
        });
        // 更新今日计划中的运动任务
        const tasks = Store.get('tasks', {});
        if (tasks[dayKey]) {
            const fitTask = tasks[dayKey].find(t => t.id === 't5');
            if (fitTask) {
                fitTask.done = allDone;
                Store.set('tasks', tasks);
                HomeModule.updateStats();
            }
        }
    },

    saveBodyRecord() {
        const w = $('#bodyWeight').value;
        const waist = $('#bodyWaist').value;
        const hip = $('#bodyHip').value;
        const thigh = $('#bodyThigh').value;
        if (!w && !waist && !hip && !thigh) return;
        const records = Store.get('bodyRecords', []);
        records.unshift({ date: fmtDate(), weight: w, waist, hip, thigh });
        Store.set('bodyRecords', records);
        $('#bodyWeight').value = '';
        $('#bodyWaist').value = '';
        $('#bodyHip').value = '';
        $('#bodyThigh').value = '';
        this.renderBodyHistory();
    },

    renderBodyHistory() {
        const records = Store.get('bodyRecords', []);
        const container = $('#bodyHistory');
        if (records.length === 0) {
            container.innerHTML = '<div class="empty-state">暂无记录，开始记录你的身材变化吧</div>';
            return;
        }
        container.innerHTML = records.slice(0, 10).map(r => {
            const parts = [];
            if (r.weight) parts.push(`体重${r.weight}kg`);
            if (r.waist) parts.push(`腰围${r.waist}cm`);
            return `
                <div class="body-history-item">
                    <span class="body-history-date">${r.date}</span>
                    <span class="body-history-data">${parts.join(' · ') || '无数据'}</span>
                </div>
            `;
        }).join('');
    }
};

// ========== 新闻资讯模块 ==========
const NewsModule = {
    filter: 'all',
    favModalOpen: false,

    init() {
        this.updateDailyQuote();
        this.renderNews();
        $('#dqRandom').addEventListener('click', () => this.randomDailyQuote());
        $('#dqFavorite').addEventListener('click', () => this.favoriteDailyQuote());
        $('#dqFavorites').addEventListener('click', () => this.showFavorites());
        $('#favoritesClose').addEventListener('click', () => $('#favoritesModal').classList.remove('active'));
        $('#newsRefresh').addEventListener('click', () => this.renderNews());
        $$('.news-filter-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                this.filter = tag.dataset.filter;
                $$('.news-filter-tag').forEach(t => t.classList.toggle('active', t.dataset.filter === this.filter));
                this.renderNews();
            });
        });
    },

    updateDailyQuote() {
        const idx = Store.get('dailyQuoteIdx', 0) % DAILY_QUOTES.length;
        $('#dailyQuoteText').textContent = DAILY_QUOTES[idx].text;
        $('#dailyQuoteSource').textContent = DAILY_QUOTES[idx].source;
    },

    randomDailyQuote() {
        let idx = Store.get('dailyQuoteIdx', 0);
        idx = (idx + 1) % DAILY_QUOTES.length;
        Store.set('dailyQuoteIdx', idx);
        this.updateDailyQuote();
    },

    favoriteDailyQuote() {
        const idx = Store.get('dailyQuoteIdx', 0) % DAILY_QUOTES.length;
        const q = DAILY_QUOTES[idx];
        const favs = Store.get('favorites', []);
        if (!favs.some(f => f.text === q.text)) {
            favs.push({ text: q.text, source: q.source, type: 'quote', time: Date.now() });
            Store.set('favorites', favs);
            alert('已收藏到收藏夹');
        }
    },

    showFavorites() {
        const favs = Store.get('favorites', []);
        const list = $('#favoritesList');
        if (favs.length === 0) {
            list.innerHTML = '<div class="empty-state">暂无收藏</div>';
        } else {
            list.innerHTML = favs.slice().reverse().map((f, i) => `
                <div class="favorite-item">
                    <button class="favorite-delete" data-idx="${favs.length - 1 - i}">🗑</button>
                    <div class="favorite-text">${f.text}</div>
                    <div class="favorite-source">${f.source || ''}</div>
                </div>
            `).join('');
            list.querySelectorAll('.favorite-delete').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.idx);
                    favs.splice(idx, 1);
                    Store.set('favorites', favs);
                    this.showFavorites();
                });
            });
        }
        $('#favoritesModal').classList.add('active');
    },

    renderNews() {
        const list = $('#newsList');
        const filtered = this.filter === 'all' ? NEWS_DATA : NEWS_DATA.filter(n => n.source === this.filter);
        // 随机排序模拟换一批
        const shuffled = [...filtered].sort(() => Math.random() - 0.5);
        list.innerHTML = shuffled.slice(0, 6).map(n => `
            <div class="news-card">
                <div class="news-card-header">
                    <span class="news-tag news-tag-${n.source}">${n.tag}</span>
                    <span class="news-date">${n.date}</span>
                </div>
                <div class="news-title">${n.title}</div>
                <a href="${n.url}" target="_blank" class="news-link">查看全文 →</a>
            </div>
        `).join('');
    }
};

// ========== 爆款二创模块 ==========
const ViralModule = {
    filter: 'all',

    init() {
        this.renderViral();
        $$('.viral-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filter = btn.dataset.platform;
                $$('.viral-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.platform === this.filter));
                this.renderViral();
            });
        });
    },

    renderViral() {
        const list = $('#viralList');
        const filtered = this.filter === 'all' ? VIRAL_DATA : VIRAL_DATA.filter(v => v.platform === this.filter);
        list.innerHTML = filtered.map(v => {
            const isTopic = v.platform === 'topic';
            const isHot = v.platform === 'douyinhot';
            const platformName = isTopic ? '我的选题库' : isHot ? `抖音热榜·观点｜${v.hot_word || ''}` :
                v.platform === 'douyin' ? '抖音' : v.platform === 'xiaohongshu' ? '小红书' : '微博';
            return `
            <div class="viral-card">
                <span class="viral-platform-tag viral-tag-${v.platform}">
                    ${platformName}
                </span>
                <div class="viral-title">${v.title}</div>
                <div class="viral-meta">
                    <span class="viral-score">${isTopic ? '优先级' : '适配度'} ${v.score}</span>
                </div>
                <div class="viral-field">
                    <div class="viral-field-label">${isTopic ? '🎯 核心受众痛点' : '🎯 视频核心观点'}</div>
                    <div class="viral-field-value">${v.core}</div>
                </div>
                <div class="viral-field">
                    <div class="viral-field-label">${isTopic ? '✏️ 内容支柱' : '✏️ 适合二创改编方向'}</div>
                    <div class="viral-field-value">${v.direction}</div>
                </div>
                <div class="viral-field">
                    <div class="viral-field-label">💡 ${isTopic ? '视频可切入角度' : '参考切入点'}</div>
                    <div class="viral-field-value">${v.angle}</div>
                </div>
                <div class="viral-actions">
                    ${(!isTopic && v.url) ? `<a href="${v.url}" target="_blank" class="viral-btn viral-btn-primary">${isHot ? '🔍 直达抖音搜索' : '📱 直达原视频'}</a>` : ''}
                    <button class="viral-btn viral-btn-secondary" onclick="ViralModule.saveFavorite('${v.title.replace(/'/g, "\\'")}')">⭐ 收藏选题</button>
                </div>
            </div>
            `;
        }).join('');
    },

    saveFavorite(title) {
        const v = VIRAL_DATA.find(x => x.title === title);
        if (!v) return;
        const favs = Store.get('favorites', []);
        if (!favs.some(f => f.text === v.title)) {
            favs.push({ text: v.title, source: v.platform, type: 'viral', time: Date.now() });
            Store.set('favorites', favs);
            alert('已收藏到收藏夹');
        }
    }
};

// ========== 修心修行功课模块 ==========
const SpiritualModule = {
    classicFilter: 'all',

    init() {
        this.updateAlmanac();
        this.renderClassics();
        $$('.classics-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.classicFilter = tab.dataset.classic;
                $$('.classics-tab').forEach(t => t.classList.toggle('active', t.dataset.classic === this.classicFilter));
                this.renderClassics();
            });
        });
    },

    updateAlmanac() {
        const d = new Date();
        const w = ['周日','周一','周二','周三','周四','周五','周六'];
        $('#almanacDate').textContent = `${d.getMonth()+1}月${d.getDate()}日 ${w[d.getDay()]}`;
        // 简单农历（模拟）
        const lunarMonths = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
        const lunarDays = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十',
            '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
            '廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
        // 简化的农历显示（实际应用需要农历库）
        const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
        const lunarMonth = lunarMonths[Math.floor((dayOfYear % 360) / 30)];
        const lunarDay = lunarDays[(dayOfYear % 30)];
        $('#almanacLunar').textContent = `农历 ${lunarMonth}${lunarDay}`;

        // 宜忌（每日变化）
        const yiList = [
            ['立券','嫁娶','栽种','牧养','纳财'],
            ['祭祀','祈福','出行','会友','开市'],
            ['安床','入宅','修造','动土','破土'],
            ['裁衣','理发','沐浴','扫舍','修饰'],
            ['入学','求医','治病','服药','栽种'],
            ['结婚','搬家','签约','开业','动土'],
            ['祭祀','祈福','斋醮','沐浴','安床']
        ];
        const jiList = [
            ['开业','开凿','栽种','入宅','搬家'],
            ['安葬','行丧','伐木','作梁','纳畜'],
            ['嫁娶','移徙','入宅','出行','词讼'],
            ['开仓','出货','纳财','破土','安葬'],
            ['开市','出行','嫁娶','修造','动土'],
            ['祭祀','祈福','斋醮','酬神','开仓'],
            ['嫁娶','开市','安葬','破土','出行']
        ];
        const idx = d.getDay();
        $('#yiItems').textContent = yiList[idx].join(' · ');
        $('#jiItems').textContent = jiList[idx].join(' · ');

        // 运势分数（每日随机但稳定）
        const seed = d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate();
        const career = 70 + (seed * 13 % 25);
        const health = 75 + (seed * 7 % 20);
        const wealth = 65 + (seed * 17 % 30);
        const scores = $('.fortune-scores');
        scores.innerHTML = `
            <div class="fortune-score-item">
                <span class="score-label">事业</span>
                <div class="score-bar"><div class="score-fill" style="width:${career}%"></div></div>
                <span class="score-value">${career}</span>
            </div>
            <div class="fortune-score-item">
                <span class="score-label">健康</span>
                <div class="score-bar"><div class="score-fill" style="width:${health}%"></div></div>
                <span class="score-value">${health}</span>
            </div>
            <div class="fortune-score-item">
                <span class="score-label">财运</span>
                <div class="score-bar"><div class="score-fill" style="width:${wealth}%"></div></div>
                <span class="score-value">${wealth}</span>
            </div>
        `;
    },

    renderClassics() {
        const filtered = this.classicFilter === 'all' ? CLASSICS : CLASSICS.filter(c => c.category === this.classicFilter);
        const container = $('#classicsList');
        container.innerHTML = filtered.map(c => `
            <div class="classic-card">
                <span class="classic-tag">${{
                    daodejing: '道德经', jingangjing: '金刚经',
                    yijing: '易经', lunyu: '论语', guiguzi: '鬼谷子'
                }[c.category]}</span>
                <div class="classic-title">${c.title}</div>
                <div class="classic-source">${c.source}</div>
                <div class="classic-quote">
                    <div class="classic-quote-text">${c.quote}</div>
                </div>
                <div class="classic-explain-title">📖 今日讲解</div>
                <div class="classic-explain-text">${c.explain}</div>
            </div>
        `).join('');
    }
};

// ========== 每天感悟模块 ==========
const DailyModule = {
    init() {
        $('#dailySubmit').addEventListener('click', () => this.saveDaily());
        this.renderDailyList();
    },

    saveDaily() {
        const record = {
            id: 'daily_' + Date.now(),
            date: fmtDate(),
            gratitude: [
                $('#gratitude1').value.trim(),
                $('#gratitude2').value.trim(),
                $('#gratitude3').value.trim()
            ].filter(Boolean),
            improve: [
                $('#improve1').value.trim(),
                $('#improve2').value.trim()
            ].filter(Boolean),
            affirm: $('#affirm1').value.trim()
        };
        if (record.gratitude.length === 0 && record.improve.length === 0 && !record.affirm) {
            alert('请至少填写一项内容');
            return;
        }
        const notes = Store.get('dailyNotes', []);
        notes.unshift(record);
        Store.set('dailyNotes', notes);
        // 清空
        $('#gratitude1').value = '';
        $('#gratitude2').value = '';
        $('#gratitude3').value = '';
        $('#improve1').value = '';
        $('#improve2').value = '';
        $('#affirm1').value = '';
        this.renderDailyList();
    },

    renderDailyList() {
        const notes = Store.get('dailyNotes', []);
        const container = $('#dailyList');
        if (notes.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✨</div>暂无感悟记录，开始记录每天的美好吧</div>';
            return;
        }
        container.innerHTML = notes.map((n, idx) => `
            <div class="daily-record">
                <div class="daily-record-date">
                    📅 ${n.date}
                    <button class="daily-record-delete" data-idx="${idx}">🗑</button>
                </div>
                ${n.gratitude.length > 0 ? `
                    <div class="daily-record-section drs-gratitude">
                        <div class="daily-record-label">🌿 感恩的3件事</div>
                        ${n.gratitude.map(g => `<div class="daily-record-item">• ${g}</div>`).join('')}
                    </div>
                ` : ''}
                ${n.improve.length > 0 ? `
                    <div class="daily-record-section drs-improve">
                        <div class="daily-record-label">🌻 可改进的2件事</div>
                        ${n.improve.map(i => `<div class="daily-record-item">• ${i}</div>`).join('')}
                    </div>
                ` : ''}
                ${n.affirm ? `
                    <div class="daily-record-section drs-affirm">
                        <div class="daily-record-label">💜 积极的自我肯定</div>
                        <div class="daily-record-item">${n.affirm}</div>
                    </div>
                ` : ''}
            </div>
        `).join('');
        container.querySelectorAll('.daily-record-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const arr = Store.get('dailyNotes', []);
                arr.splice(idx, 1);
                Store.set('dailyNotes', arr);
                this.renderDailyList();
            });
        });
    }
};

// ========== 路由系统 ==========
const Router = {
    currentPage: 'home',

    init() {
        $$('.menu-item').forEach(item => {
            item.addEventListener('click', () => this.navigate(item.dataset.page));
        });
        $('#menuToggle').addEventListener('click', () => this.toggleSidebar());
        $('#sidebarOverlay').addEventListener('click', () => this.closeSidebar());
        $('#refreshBtn').addEventListener('click', () => location.reload());
        const params = new URLSearchParams(location.search);
        const pageMap = { todo: 'plan', hot: 'viral', feel: 'daily',
                          home: 'home', plan: 'plan', fitness: 'fitness',
                          news: 'news', viral: 'viral', spiritual: 'spiritual', daily: 'daily' };
        const p = params.get('page');
        if (p && pageMap[p]) this.navigate(pageMap[p]);
    },

    navigate(page) {
        this.currentPage = page;
        $$('.menu-item').forEach(i => i.classList.toggle('active', i.dataset.page === page));
        $$('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + page));

        const titles = {
            home: '首页', plan: '今日计划', fitness: '运动塑形',
            news: '新闻资讯', viral: '爆款二创',
            spiritual: '修心修行功课', daily: '每天感悟'
        };
        $('#pageTitle').textContent = titles[page] || '首页';
        this.closeSidebar();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    toggleSidebar() {
        $('#sidebar').classList.toggle('open');
        $('#sidebarOverlay').classList.toggle('active');
    },

    closeSidebar() {
        $('#sidebar').classList.remove('open');
        $('#sidebarOverlay').classList.remove('active');
    }
};

// ========== 应用初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    initData();
    Router.init();
    HomeModule.init();
    PlanModule.init();
    FitnessModule.init();
    NewsModule.init();
    ViralModule.init();
    SpiritualModule.init();
    DailyModule.init();

    // 从CDN加载外部数据（如果可用）
    loadExternalData();
});

// 尝试从jsDelivr CDN加载更新数据
async function loadExternalData() {
    try {
        // 可配置为用户的GitHub仓库
        const base = 'https://cdn.jsdelivr.net/gh/Easylumi/easylumi-workbench@main';
        const [newsRes, viralRes, hotRes] = await Promise.all([
            fetch(`${base}/news.json`).catch(() => null),
            fetch(`${base}/viral.json`).catch(() => null),
            fetch(`${base}/douyin-hot.json`).catch(() => null)
        ]);
        if (newsRes && newsRes.ok) {
            const data = await newsRes.json();
            if (data && data.length) {
                // 合并外部数据到NEWS_DATA
                NEWS_DATA.length = 0;
                NEWS_DATA.push(...data);
                NewsModule.renderNews();
            }
        }
        if (viralRes && viralRes.ok) {
            const data = await viralRes.json();
            if (data && data.length) {
                // 只替换平台素材，保留"我的选题库"（platform=topic）
                const topics = VIRAL_DATA.filter(v => v.platform === 'topic');
                VIRAL_DATA.length = 0;
                VIRAL_DATA.push(...data, ...topics);
                ViralModule.renderViral();
            }
        }
        if (hotRes && hotRes.ok) {
            const data = await hotRes.json();
            if (data && data.length) {
                // 移除旧的抖音观点数据，插入新数据（保留选题库和其他素材）
                const keep = VIRAL_DATA.filter(v => v.platform !== 'douyinhot');
                const pos = keep.findIndex(v => v.platform === 'topic');
                if (pos > -1) { keep.splice(pos, 0, ...data); }
                else { keep.push(...data); }
                VIRAL_DATA.length = 0;
                VIRAL_DATA.push(...keep);
                ViralModule.renderViral();
            }
        }
    } catch (e) {
        console.log('CDN数据加载失败，使用本地数据');
    }
}
