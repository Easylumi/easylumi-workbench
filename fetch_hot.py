#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Easylumi 每日热榜抓取 + DeepSeek AI 改写
========================================
功能：
  1. 抓取百度热搜 / B站 / 微博 / 小红书 / 抖音 当日热榜（多源容错）
  2. 调用 DeepSeek API 改写为「女性成长口播」爆款选题
  3. 写入 data/hot_data.json，供 PWA 网页读取

环境变量：
  DEEPSEEK_API_KEY  - DeepSeek 的 API Key
  MY_TRACK          - 你的赛道描述（可选，默认综合女性成长）

运行：python fetch_hot.py
"""

import json
import os
import sys
import time
import requests
from datetime import datetime, timezone, timedelta

# ============ 配置 ============
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
MY_TRACK         = os.environ.get("MY_TRACK", "女性成长、励志、口播（涵盖情感关系、职场成长、读书分享、生活感悟四个方向）")
DATA_FILE        = "data/hot_data.json"

DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"

# 多热榜源（容错）
# 注意：GitHub Actions 服务器在国外，优先使用国际可访问源
HOT_SOURCES = {
    "baidu": [
        {
            "url": "https://top.baidu.com/api/board?platform=wise&tab=realtime",
            "parser": "baidu"
        }
    ],
    "bilibili": [
        {
            "url": "https://api.bilibili.com/x/web-interface/ranking/v2?rid=0&type=all",
            "parser": "bilibili"
        },
        {
            "url": "https://api.vvhan.com/api/hotlist/bilibili",
            "parser": "vvhan"
        },
    ],
    "weibo": [
        {
            "url": "https://api.vvhan.com/api/hotlist/wbHot",
            "parser": "vvhan"
        },
    ],
    "xiaohongshu": [
        {
            "url": "https://api.vvhan.com/api/hotlist/xhsHot",
            "parser": "vvhan"
        },
    ],
    "douyin": [
        {
            "url": "https://api.vvhan.com/api/hotlist/douyin",
            "parser": "vvhan"
        },
    ],
}

# 保底热门话题（当所有热榜源都失败时使用）
FALLBACK_TOPICS = [
    "当代年轻人为什么越来越晚婚",
    "30岁后我才明白的人生道理",
    "职场女性如何平衡事业与家庭",
    "为什么越来越多女生选择独处",
    "真正厉害的女人都懂得边界感",
    "读完这本书，我停止了精神内耗",
    "女性成长路上必须戒掉的三件事",
    "如何判断一段关系是否值得继续",
    "普通人逆袭的关键不是努力而是选择",
    "情绪稳定是一个女人最好的风水",
    "为什么你越讨好别人越不被尊重",
    "女生一定要有自己的赚钱能力",
    "自律一年，生活会变成什么样",
    "成年人最顶级的修养：少说话",
    "认清自己比认清世界更重要",
]


# ============ 抓取热榜 ============
def fetch_hot(source_key):
    """抓取某个平台热榜，多源容错"""
    sources = HOT_SOURCES.get(source_key, [])
    for src in sources:
        url = src["url"]
        parser = src["parser"]
        try:
            resp = requests.get(url, timeout=20, headers={"User-Agent": UA})
            if resp.status_code != 200:
                print(f"  [warn] {source_key} {url} 状态码 {resp.status_code}", file=sys.stderr)
                continue
            data = resp.json()
            items = parse_by_parser(data, parser)
            if items:
                return items
        except Exception as e:
            print(f"  [warn] {source_key} 源 {url} 失败: {e}", file=sys.stderr)
            continue
    return []


def parse_by_parser(data, parser):
    """根据解析器类型提取热榜列表"""
    if parser == "vvhan":
        items = data.get("data") or data.get("items") or data.get("list") or []
        return parse_items(items, parser)
    if parser == "bilibili":
        items = data.get("data", {}).get("list", [])
        return parse_items(items, parser)
    if parser == "baidu":
        cards = data.get("data", {}).get("cards", [])
        if not cards:
            return []
        # 百度格式：cards[0].content[0].content
        contents = cards[0].get("content", [])
        if contents and isinstance(contents, list) and isinstance(contents[0], dict) and "content" in contents[0]:
            items = contents[0].get("content", [])
        elif contents and isinstance(contents, list):
            items = contents
        else:
            items = []
        return parse_items(items, parser)
    return []


def parse_items(items, parser):
    """统一解析为 {title, hot, url, source} 格式"""
    result = []
    for item in items[:20]:
        if not isinstance(item, dict):
            continue
        title = item.get("title") or item.get("name") or item.get("word") or ""
        hot   = item.get("hot") or item.get("hot_num") or item.get("view_count") or item.get("hotTag") or ""
        url   = item.get("url") or item.get("link") or item.get("mobil_url") or ""
        if title:
            result.append({
                "title": str(title).strip(),
                "hot": str(hot),
                "url": str(url).strip() if url else "",
                "source": parser
            })
    return result


# ============ DeepSeek AI 改写 ============
def rewrite_with_deepseek(all_items, track):
    """调用 DeepSeek 把热榜改写为口播爆款选题"""
    if not DEEPSEEK_API_KEY:
        return None, "未配置 DEEPSEEK_API_KEY，跳过 AI 改写"

    # 取前 15 条热点
    hot_titles = [f"{i+1}. {it['title']}" for i, it in enumerate(all_items[:15])]

    prompt = f"""你是顶级女性成长口播内容创作教练，擅长把当日热点改编为爆款口播选题。

我的赛道是：{track}

请把以下当日热点，改写成适合我赛口的口播爆款选题。
要求：
1. 从热点中筛选出最适合「女性成长」赛道的 6-8 个选题
2. 每个选题输出 JSON 对象，字段如下：
   - orig_title：原热点标题
   - new_title：改编后的爆款口播标题（15字内，有钩子）
   - track：匹配的赛道方向（情感关系/职场成长/读书分享/生活感悟）
   - adapt：适配度（高/中/低）
   - core_view：核心观点（一句话，15字内）
   - hook：口播开头文案（前3秒钩子，30字内）
   - angle：二创切入角度（一句话）
   - platform：原热点来源平台

3. 只返回纯 JSON 数组，不要任何解释文字、不要 markdown 代码块

当日热点：
{chr(10).join(hot_titles)}
"""

    body = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "你是一位擅长女性成长口播爆款内容创作的资深创作者，精通抖音/小红书爆款逻辑。"},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.85,
        "max_tokens": 2500
    }

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        resp = requests.post(DEEPSEEK_URL, headers=headers, json=body, timeout=120)
        if resp.status_code != 200:
            return None, f"DeepSeek API 返回 {resp.status_code}: {resp.text[:200]}"

        content = resp.json()["choices"][0]["message"]["content"]

        # 清理可能的 markdown 代码块
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        # 提取 JSON 数组
        start = content.find("[")
        end = content.rfind("]")
        if start >= 0 and end > start:
            content = content[start:end+1]

        rewritten = json.loads(content)
        return rewritten, "success"
    except json.JSONDecodeError as e:
        return None, f"DeepSeek 返回 JSON 解析失败: {e}\n原始: {content[:300]}"
    except Exception as e:
        return None, f"DeepSeek 调用异常: {e}"


def make_fallback_items():
    """生成保底热榜数据"""
    return [
        {"title": t, "hot": "", "url": "", "source": "fallback"}
        for t in FALLBACK_TOPICS
    ]


# ============ 主流程 ============
def main():
    print("=" * 50)
    print(f"Easylumi 每日热榜更新  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

    # 1. 抓取热榜
    print("\n[1/3] 抓取热榜...")
    baidu      = fetch_hot("baidu")
    bilibili   = fetch_hot("bilibili")
    weibo      = fetch_hot("weibo")
    xiaohongshu= fetch_hot("xiaohongshu")
    douyin     = fetch_hot("douyin")

    print(f"  百度: {len(baidu)} 条")
    print(f"  B站:  {len(bilibili)} 条")
    print(f"  微博: {len(weibo)} 条")
    print(f"  小红书: {len(xiaohongshu)} 条")
    print(f"  抖音: {len(douyin)} 条")

    all_items = baidu + bilibili + weibo + xiaohongshu + douyin
    used_fallback = False

    if not all_items:
        print("  [warn] 所有热榜源都失败，使用保底热门话题")
        all_items = make_fallback_items()
        used_fallback = True

    # 2. AI 改写
    print("\n[2/3] DeepSeek AI 改写...")
    rewritten, msg = rewrite_with_deepseek(all_items, MY_TRACK)
    print(f"  {msg}")
    if rewritten is None:
        rewritten = []

    # 3. 组装结果
    bj_time = datetime.now(timezone(timedelta(hours=8)))
    result = {
        "date": bj_time.strftime("%Y-%m-%d"),
        "update_time": bj_time.strftime("%Y-%m-%d %H:%M:%S"),
        "track": MY_TRACK,
        "used_fallback": used_fallback,
        "platforms": {
            "baidu":       {"count": len(baidu),       "items": baidu[:15]},
            "bilibili":    {"count": len(bilibili),    "items": bilibili[:15]},
            "weibo":       {"count": len(weibo),       "items": weibo[:15]},
            "xiaohongshu": {"count": len(xiaohongshu), "items": xiaohongshu[:15]},
            "douyin":      {"count": len(douyin),      "items": douyin[:15]},
        },
        "ai_rewrite": rewritten,
        "ai_status": msg
    }

    content_str = json.dumps(result, ensure_ascii=False, indent=2)

    # 4. 写入 data/hot_data.json
    print(f"\n[3/3] 写入 {DATA_FILE}...")
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        f.write(content_str)
    print(f"  已写入 {DATA_FILE} ({len(content_str)} bytes)")

    # 5. 输出摘要
    print("\n" + "=" * 50)
    print("摘要:")
    print(f"  热榜总量: {len(all_items)} 条")
    print(f"  AI 改写: {len(rewritten)} 条选题")
    print(f"  数据文件: {DATA_FILE}")
    print("=" * 50)


if __name__ == "__main__":
    main()
