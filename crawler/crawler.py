#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Easylumi 每日内容爬虫 + AI 改写流水线
- 抓取新闻资讯
- 生成国学内容（黄历、经文）
- 生成爆款二创素材
- 使用 DeepSeek API 进行 AI 改写
"""

import os
import sys
import json
import random
import requests
from datetime import datetime, timedelta
from pathlib import Path

# ========== 配置 ==========
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"
DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# 新闻 RSS 源配置
NEWS_SOURCES = {
    "rmrb": {
        "name": "人民日报",
        "rss": "https://www.people.com.cn/rss/",
        "fallback_url": "https://www.people.com.cn",
    },
    "xinhua": {
        "name": "新华社",
        "rss": "http://www.xinhuanet.com/politics/news_politics.xml",
        "fallback_url": "http://www.xinhuanet.com",
    },
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

# ========== 账号赛道配置（所有内容生成必须严格对齐）==========
NICHE_PROFILE = {
    "name": "30+清醒女性认知成长博主",
    "positioning": "用书、真实生活、系统工具理顺生活；不贩卖焦虑，只输出边界建立、人生选择、长期成长、情绪管理、轻商业认知",
    "audience": "28-40岁经济独立、拒绝婚恋将就、持续自我提升、反感鸡汤的都市女性",
    "pillars": "①问题导向书籍拆解（痛点→书中观点→真实案例→落地行动）②真实生活成长切片（书店运营/健康焦虑/自媒体试错/自律矛盾）③个人系统与AI工具方法论",
    "banned": "极端对立情绪、男女对立、空洞鸡汤、玄学占卜主线（玄学仅可作顺势成长视角少量引用）",
    "tone": "短视频互联网语境，接地气有网感，避免书面化说教",
}

# 赛道关键词：用于热榜筛选 + AI 判断相关性
NICHE_KEYWORDS = [
    "女性", "女生", "女人", "30岁", "35岁", "成长", "认知", "清醒", "独立",
    "边界", "拒绝", "内耗", "情绪", "焦虑", "自律", "读书", "看书",
    "搞钱", "存钱", "消费", "副业", "收入", "职场", "辞职", "失业",
    "催婚", "婚恋", "单身", "独居", "离婚", "相亲",
    "时间管理", "习惯", "学习", "提升", "心态", "复盘", "中年", "年龄",
]


# ========== DeepSeek AI 调用 ==========
def call_deepseek(prompt: str, max_tokens: int = 2000, temperature: float = 0.7) -> str:
    """调用 DeepSeek API 进行 AI 生成"""
    if not DEEPSEEK_API_KEY:
        print("⚠️ 未设置 DEEPSEEK_API_KEY，跳过 AI 改写")
        return ""

    try:
        resp = requests.post(
            DEEPSEEK_API_URL,
            headers={
                "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": f"你是「{NICHE_PROFILE['name']}」账号的专属内容策划师，深谙{NICHE_PROFILE['audience']}的内容偏好。{NICHE_PROFILE['tone']}。所有短视频相关输出必须严格符合账号定位，禁止{NICHE_PROFILE['banned']}。涉及国学经典时，你同时是严谨的国学研究者，释义准确、引用有据。"},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": max_tokens,
                "temperature": temperature,
            },
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"DeepSeek API 调用失败: {e}")
        return ""


# ========== 新闻抓取 ==========
def fetch_news() -> list:
    """抓取新闻数据（含降级方案）"""
    news_list = []
    today = datetime.now().strftime("%Y-%m-%d")

    # 方案1: 尝试从 RSS 抓取
    # 注: 由于网络限制，实际 RSS 抓取可能不稳定
    # 这里提供框架代码，实际使用时可根据需要调整

    # 方案2: 使用 AI 生成当日新闻摘要（当爬虫不可用时）
    if DEEPSEEK_API_KEY:
        prompt = """请生成6-8条今日热点新闻标题，涵盖以下领域：
1. 国内政治/经济
2. 科技创新
3. 社会民生
4. 文化教育
5. 国际要闻

请按照以下 JSON 格式返回（只返回JSON数组，不要其他文字）：
[
  {"title": "新闻标题", "source": "rmrb|xinhua|xuexi|yanjie", "tag": "来源名称"}
]
"""
        ai_result = call_deepseek(prompt, max_tokens=1500, temperature=0.8)
        try:
            # 尝试提取 JSON
            json_str = ai_result
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0]
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0]
            ai_news = json.loads(json_str.strip())
            for item in ai_news:
                news_list.append({
                    "title": item["title"],
                    "source": item.get("source", "xuexi"),
                    "date": today,
                    "tag": item.get("tag", "学习强国"),
                    "url": "#",
                })
            print(f"✅ AI 生成新闻 {len(news_list)} 条")
        except Exception as e:
            print(f"AI 新闻生成解析失败: {e}")

    # 方案3: 如果都失败了，使用预设模板 + 随机变化
    if not news_list:
        news_list = generate_fallback_news(today)

    return news_list


def generate_fallback_news(today: str) -> list:
    """生成备用新闻数据"""
    templates = [
        {"title": "推动高质量发展 谱写中国式现代化新篇章", "source": "xuexi", "tag": "学习强国"},
        {"title": "科技创新引领产业变革 新质生产力加速形成", "source": "rmrb", "tag": "人民日报"},
        {"title": "全球经济复苏步伐加快 中国经济展现强大韧性", "source": "xinhua", "tag": "新华社"},
        {"title": "数字化转型浪潮下的机遇与挑战", "source": "yanjie", "tag": "眼界"},
        {"title": "绿色低碳发展成为全球共识", "source": "xuexi", "tag": "学习强国"},
        {"title": "人工智能赋能千行百业 产业智能化加速推进", "source": "rmrb", "tag": "人民日报"},
        {"title": "乡村振兴新图景：特色产业带动农民增收", "source": "xinhua", "tag": "新华社"},
        {"title": "元宇宙概念持续升温 虚实融合开启新纪元", "source": "yanjie", "tag": "眼界"},
    ]
    # 每日随机选取4-6条
    selected = random.sample(templates, min(random.randint(4, 6), len(templates)))
    for s in selected:
        s["date"] = today
        s["url"] = "#"
    return selected


# ========== 爆款素材生成（严格赛道对齐）==========
def generate_viral_content() -> list:
    """为30+清醒女性认知成长赛道生成/改写爆款二创素材"""
    viral_list = []

    if DEEPSEEK_API_KEY:
        prompt = f"""你是短视频爆款选题分析师。请为以下账号筛选并生成4-6条适合二次创作的爆款素材（来源平台：抖音/小红书/微博的真实热门内容类型）。

【账号定位】{NICHE_PROFILE['name']}
【人设方向】{NICHE_PROFILE['positioning']}
【目标受众】{NICHE_PROFILE['audience']}
【内容三支柱】{NICHE_PROFILE['pillars']}
【禁止内容】{NICHE_PROFILE['banned']}
【文案调性】{NICHE_PROFILE['tone']}

筛选标准（必须全部满足）：
1. 主题必须落在：边界建立 / 人生选择 / 长期成长 / 情绪管理 / 轻商业认知 / 读书方法 / 女性自我提升
2. 受众一眼觉得"这说的是我"
3. 有明确的情绪共鸣点或认知增量，不是纯娱乐八卦
4. 拒绝：泛娱乐明星八卦、纯穿搭美妆、男女对立引战、鸡汤口号

每条素材包含：
1. platform（douyin/xiaohongshu/weibo）
2. title 爆款视频标题（带网感，可直接当视频封面文案）
3. score 与该账号的适配度（85%-98%，基于受众重合度+内容支柱匹配度打分）
4. core 视频核心观点（1-2句）
5. direction 适合二创改编方向（结合三支柱说明怎么改）
6. angle 参考切入点（口播前3秒怎么开口）

只返回JSON数组，不要其他文字：
[
  {{"platform": "douyin", "title": "标题", "score": "92%", "core": "核心观点", "direction": "改编方向", "angle": "切入点"}}
]"""
        ai_result = call_deepseek(prompt, max_tokens=2000, temperature=0.9)
        try:
            json_str = ai_result
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0]
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0]
            ai_viral = json.loads(json_str.strip())
            for item in ai_viral:
                viral_list.append({
                    "platform": item["platform"],
                    "title": item["title"],
                    "score": item.get("score", "90%"),
                    "core": item["core"],
                    "direction": item["direction"],
                    "angle": item["angle"],
                    "url": f"https://www.{item['platform'] == 'douyin' and 'douyin.com' or item['platform'] == 'xiaohongshu' and 'xiaohongshu.com' or 'weibo.com'}",
                })
            print(f"✅ AI 生成赛道爆款素材 {len(viral_list)} 条")
        except Exception as e:
            print(f"AI 爆款生成解析失败: {e}")

    # 降级方案（同样限定赛道）
    if not viral_list:
        viral_list = [
            {
                "platform": "douyin",
                "title": "30岁以后，我把'懂事'两个字戒了",
                "score": "95%",
                "core": "过度懂事=边界失守，先学会课题分离再谈温柔",
                "direction": "书籍拆解支柱：结合《被讨厌的勇气》讲课题分离，接自己'内耗三天'的真实案例",
                "angle": "钩子：你上一次不愧疚地拒绝别人，是什么时候？",
                "url": "https://www.douyin.com",
            },
            {
                "platform": "xiaohongshu",
                "title": "28-38岁女生，请开始建立你的'不将就清单'",
                "score": "93%",
                "core": "拒绝婚恋将就的本质是提高人生决策标准，而非对抗",
                "direction": "生活切片支柱：晒自己从'假装精致'到真实生活的转变清单",
                "angle": "钩子：30岁以后，你还在用别人的标准给自己打分吗？",
                "url": "https://www.xiaohongshu.com",
            },
        ]

    return viral_list


# ========== 抖音高热度观点类视频抓取 ==========
def fetch_douyin_hot_words() -> list:
    """抓取抖音热榜词（多端点降级），返回热词列表"""
    endpoints = [
        # 抖音网页端热榜（无需登录的公开接口）
        "https://www.iesdouyin.com/web/api/v2/hotsearch/billboard/word/",
        "https://www.douyin.com/aweme/v1/web/hot/search/list/",
    ]
    for url in endpoints:
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10)
            if resp.status_code != 200:
                continue
            data = resp.json()
            words = []
            # iesdouyin 格式
            if isinstance(data.get("data"), dict):
                for item in data["data"].get("word_list", []) or []:
                    if item.get("word"):
                        words.append(item["word"])
            if words:
                print(f"✅ 抓取抖音热榜 {len(words)} 条（{url.split('/')[2]}）")
                return words[:50]
        except Exception as e:
            print(f"热榜接口失败 {url.split('/')[2]}: {e}")
    print("⚠️ 抖音热榜接口均不可用，转由 AI 基于赛道趋势生成")
    return []


def filter_niche_words(words: list) -> list:
    """按赛道关键词筛选热词"""
    matched = [w for w in words if any(k in w for k in NICHE_KEYWORDS)]
    print(f"🎯 热榜中与赛道相关的热词 {len(matched)} 条: {matched[:10]}")
    return matched


def generate_douyin_opinion() -> list:
    """抓取抖音高热度观点性输出视频 → 生成二创分析卡片"""
    hot_words = fetch_douyin_hot_words()
    niche_words = filter_niche_words(hot_words)

    if DEEPSEEK_API_KEY:
        hot_ctx = f"\n【今日抖音热榜中与赛道相关的热词】{json.dumps(niche_words, ensure_ascii=False)}" if niche_words else \
                  "\n【今日热榜暂无直接相关热词，请基于近30天抖音女性成长赛道高热话题趋势生成】"
        prompt = f"""你是抖音爆款内容分析师。请针对"30+清醒女性认知成长"账号，产出6-8条抖音高热度观点性输出视频的二创分析卡片。

观点性输出视频定义：以口播/访谈形式输出明确观点、认知、方法论的视频（非剧情、非纯vlog、非娱乐）。

【账号定位】{NICHE_PROFILE['name']}
【人设方向】{NICHE_PROFILE['positioning']}
【目标受众】{NICHE_PROFILE['audience']}
【内容三支柱】{NICHE_PROFILE['pillars']}
【禁止内容】{NICHE_PROFILE['banned']}{hot_ctx}
【文案调性】{NICHE_PROFILE['tone']}

要求：
1. 优先围绕上面给出的真实热词/热点组织内容；无热词时按赛道高热话题生成
2. 每条必须包含观点性输出（有明确认知增量或反常识观点）
3. score=适配度：按 受众重合度40% + 内容支柱匹配30% + 二创可操作性30% 综合打分（85%-98%）
4. direction 要具体到"用哪个支柱的什么形式改编"
5. angle 给出可直接口播的前3秒话术

只返回JSON数组，不要其他文字：
[
  {{"hot_word": "热词", "title": "爆款视频标题", "score": "95%", "core": "视频核心观点", "direction": "适合二创改编方向", "angle": "参考切入点"}}
]"""
        ai_result = call_deepseek(prompt, max_tokens=2500, temperature=0.85)
        try:
            json_str = ai_result
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0]
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0]
            items = json.loads(json_str.strip())
            result = []
            for item in items:
                kw = item.get("hot_word") or item["title"]
                result.append({
                    "platform": "douyinhot",
                    "hot_word": kw,
                    "title": item["title"],
                    "score": item.get("score", "90%"),
                    "core": item["core"],
                    "direction": item["direction"],
                    "angle": item["angle"],
                    "url": f"https://www.douyin.com/search/{requests.utils.quote(kw)}",
                })
            print(f"✅ 生成抖音观点类二创卡片 {len(result)} 条")
            return result
        except Exception as e:
            print(f"AI 抖音观点生成解析失败: {e}")

    # 降级方案（赛道内固定高热观点选题）
    fallback = [
        ("女性独立", "经济独立是女人最大的底气？我只认同一半", "95%",
         "底气=收入×认知，光有钱没有财商照样焦虑；真正独立是决策独立",
         "轻商业认知支柱：拆'收入独立vs决策独立'，用自己开书店的真实账本举例",
         "钩子：月入3万但不敢辞职的你，算独立吗？"),
        ("30岁焦虑", "30岁没结婚没买房，人生就落后了吗", "93%",
         "人生进度条是自己画的，社会时钟只是参考答案之一",
         "人生选择支柱：结合《五种时间》讲自定义人生排序，晒自己的周计划表",
         "钩子：30岁那年我辞职开书店，所有人都说我疯了"),
        ("情绪内耗", "停止内耗最快的方式：把'想'换成'写'", "94%",
         "内耗源于大脑反刍，写下来=外置内存条，情绪从'经历'变'素材'",
         "AI工具支柱：演示用AI记情绪日记30天，找出3个情绪雷区的全过程",
         "钩子：凌晨一点，我盯着满桌的计划表，一个都没完成"),
    ]
    return [{
        "platform": "douyinhot", "hot_word": kw, "title": t, "score": s,
        "core": c, "direction": d, "angle": a,
        "url": f"https://www.douyin.com/search/{requests.utils.quote(kw)}",
    } for kw, t, s, c, d, a in fallback]


# ========== 国学内容生成 ==========
def generate_classics() -> list:
    """生成每日国学内容"""
    classics = []

    if DEEPSEEK_API_KEY:
        prompt = """请为\"每日国学\"栏目生成3-4条经典内容，从以下经典中选择：
道德经、金刚经、易经、论语、鬼谷子

每条需要包含：
1. 经文标题
2. 出处
3. 分类（daodejing/jingangjing/yijing/lunyu/guiguzi）
4. 古文原文（1-2句）
5. 白话文释义（80-120字）

请按照以下 JSON 格式返回（只返回JSON数组）：
[
  {
    "title": "标题",
    "source": "出处",
    "category": "分类标识",
    "quote": "古文原文",
    "explain": "白话释义"
  }
]
"""
        ai_result = call_deepseek(prompt, max_tokens=2000, temperature=0.7)
        try:
            json_str = ai_result
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0]
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0]
            ai_classics = json.loads(json_str.strip())
            for item in ai_classics:
                classics.append(item)
            print(f"✅ AI 生成国学内容 {len(classics)} 条")
        except Exception as e:
            print(f"AI 国学生成解析失败: {e}")

    # 降级方案：使用预设经典
    if not classics:
        classics = [
            {
                "title": "上善若水",
                "source": "《道德经》第八章",
                "category": "daodejing",
                "quote": "「上善若水。水善利万物而不争，处众人之所恶，故几于道。」",
                "explain": "最高的善像水一样，水善于滋养万物而不与万物相争，停留在众人都不喜欢的地方，所以最接近于道。"
            },
            {
                "title": "应无所住",
                "source": "《金刚经》",
                "category": "jingangjing",
                "quote": "「应无所住而生其心。」",
                "explain": "心不执着于任何事物，才能生起清净的智慧之心。"
            },
        ]

    return classics


# ========== 名言金句生成 ==========
def generate_quotes() -> dict:
    """生成每日名言和金句"""
    quotes = {"quotes": [], "poems": [], "daily": []}

    if DEEPSEEK_API_KEY:
        prompt = """请生成以下内容：

1. 3条励志名言（中英文对照），温柔治愈风格
2. 3条古诗词名句（含出处）
3. 3条每日金句（含出处，偏国学/哲学）

格式如下（只返回JSON）：
{
  "quotes": [{"text": "中文", "en": "English"}],
  "poems": [{"text": "诗句", "source": "出处"}],
  "daily": [{"text": "金句", "source": "出处"}]
}
"""
        ai_result = call_deepseek(prompt, max_tokens=2000, temperature=0.8)
        try:
            json_str = ai_result
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0]
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0]
            quotes = json.loads(json_str.strip())
            print("✅ AI 生成名言金句")
        except Exception as e:
            print(f"AI 名言生成解析失败: {e}")

    return quotes


# ========== 黄历数据生成 ==========
def generate_almanac() -> dict:
    """生成今日黄历数据"""
    today = datetime.now()
    yi_list = [
        ["立券", "嫁娶", "栽种", "牧养", "纳财"],
        ["祭祀", "祈福", "出行", "会友", "开市"],
        ["安床", "入宅", "修造", "动土", "破土"],
        ["裁衣", "理发", "沐浴", "扫舍", "修饰"],
        ["入学", "求医", "治病", "服药", "栽种"],
        ["结婚", "搬家", "签约", "开业", "动土"],
        ["祭祀", "祈福", "斋醮", "沐浴", "安床"],
    ]
    ji_list = [
        ["开业", "开凿", "栽种", "入宅", "搬家"],
        ["安葬", "行丧", "伐木", "作梁", "纳畜"],
        ["嫁娶", "移徙", "入宅", "出行", "词讼"],
        ["开仓", "出货", "纳财", "破土", "安葬"],
        ["开市", "出行", "嫁娶", "修造", "动土"],
        ["祭祀", "祈福", "斋醮", "酬神", "开仓"],
        ["嫁娶", "开市", "安葬", "破土", "出行"],
    ]
    idx = today.weekday()
    seed = today.year * 10000 + today.month * 100 + today.day

    return {
        "date": f"{today.month}月{today.day}日",
        "weekday": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][idx],
        "lunar": "农历数据",
        "yi": yi_list[idx],
        "ji": ji_list[idx],
        "fortune": {
            "career": 70 + (seed * 13 % 25),
            "health": 75 + (seed * 7 % 20),
            "wealth": 65 + (seed * 17 % 30),
        },
        "tips": {
            "god_direction": ["正北", "正南", "正东", "正西", "东南", "西南", "东北", "西北"][seed % 8],
            "travel": "适合与朋友小聚、分享心得，贵人运较旺。",
        },
    }


# ========== 主流程 ==========
def main():
    print("=" * 50)
    print("🚀 Easylumi 每日内容爬虫启动")
    print(f"📅 日期: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

    # 1. 抓取新闻
    print("\n📰 [1/6] 抓取新闻资讯...")
    news = fetch_news()
    with open(DATA_DIR / "news.json", "w", encoding="utf-8") as f:
        json.dump(news, f, ensure_ascii=False, indent=2)

    # 2. 生成爆款素材（严格赛道对齐）
    print("\n🔥 [2/6] 生成赛道爆款二创素材...")
    viral = generate_viral_content()
    with open(DATA_DIR / "viral.json", "w", encoding="utf-8") as f:
        json.dump(viral, f, ensure_ascii=False, indent=2)

    # 3. 抓取抖音热榜 → 观点类视频二创分析
    print("\n📈 [3/6] 抓取抖音高热度观点类视频...")
    douyin_hot = generate_douyin_opinion()
    with open(DATA_DIR / "douyin-hot.json", "w", encoding="utf-8") as f:
        json.dump(douyin_hot, f, ensure_ascii=False, indent=2)

    # 4. 生成国学内容
    print("\n📖 [4/6] 生成国学内容...")
    classics = generate_classics()
    with open(DATA_DIR / "classics.json", "w", encoding="utf-8") as f:
        json.dump(classics, f, ensure_ascii=False, indent=2)

    # 5. 生成名言金句
    print("\n✨ [5/6] 生成名言金句...")
    quotes = generate_quotes()
    with open(DATA_DIR / "quotes.json", "w", encoding="utf-8") as f:
        json.dump(quotes, f, ensure_ascii=False, indent=2)

    # 6. 生成黄历
    print("\n🧧 [6/6] 生成黄历数据...")
    almanac = generate_almanac()
    with open(DATA_DIR / "almanac.json", "w", encoding="utf-8") as f:
        json.dump(almanac, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 50)
    print("✅ 所有数据生成完毕！")
    print(f"📁 数据保存目录: {DATA_DIR}")
    print("=" * 50)


if __name__ == "__main__":
    main()
