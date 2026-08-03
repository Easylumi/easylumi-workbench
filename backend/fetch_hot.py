#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Easylumi 每日热榜抓取 + DeepSeek AI 改写
========================================
功能：
  1. 抓取百度/知乎/微博/B站/小红书/抖音 当日热榜（多源容错）
  2. 调用 DeepSeek API 改写为「女性成长口播」爆款选题
  3. 写入 data/hot_data.json，供 PWA 网页读取
  4. 所有源都失败时，写入兜底数据，保证 workflow 不报错

环境变量：
  DEEPSEEK_API_KEY  - DeepSeek 的 API Key
"""

import json
import os
import sys
import requests
from datetime import datetime, timezone, timedelta

# ============ 配置 ============
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
MY_TRACK = os.environ.get("MY_TRACK", "女性成长、励志、口播（涵盖情感关系、职场成长、读书分享、生活感悟四个方向）")
DATA_FILE = "data/hot_data.json"
DEEPSEEK_URL = "https://api.deepseek.com/chat/completions"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
HEADERS = {
    "User-Agent": UA,
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}

# 多热榜源：按 GitHub Actions 国际网络可达性排列，优先放国外能解析的
HOT_SOURCES = {
    "baidu": [
        {
            "url": "https://top.baidu.com/api/board?platform=wise&tab=realtime",
            "parser": "baidu_top"
        },
        {
            "url": "https://tenapi.cn/v2/baiduhot",
            "parser": "tenapi"
        },
    ],
    "zhihu": [
        {
            "url": "https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50",
            "parser": "zhihu"
        },
    ],
    "weibo": [
        {
            "url": "https://weibo.com/ajax/side/hotSearch",
            "parser": "weibo"
        },
    ],
    "bilibili": [
        {
            "url": "https://api.bilibili.com/x/web-interface/search/square?limit=30",
            "parser": "bilibili_api"
        },
        {
            "url": "https://s.search.bilibili.com/main/hotword?limit=30",
            "parser": "bilibili_s"
        },
    ],
    "xiaohongshu": [
        {
            "url": "https://api.vvhan.com/api/hotlist/xhsHot",
            "parser": "vvhan"
        },
        {
            "url": "https://api.coder007.sjtu.edu.cn/api-hot/xiaohongshu",
            "parser": "coder007"
        },
    ],
    "douyin": [
        {
            "url": "https://api.vvhan.com/api/hotlist/douyin",
            "parser": "vvhan"
        },
        {
            "url": "https://api.coder007.sjtu.edu.cn/api-hot/douyin",
            "parser": "coder007"
        },
    ],
}


def parse_vvhan(data):
    items = data.get("data") if isinstance(data.get("data"), list) else []
    return parse_items(items)


def parse_coder007(data):
    if isinstance(data, list):
        return parse_items(data)
    items = data.get("data") or data.get("items") or data.get("list") or []
    return parse_items(items)


def parse_tenapi(data):
    items = data.get("data") if isinstance(data.get("data"), list) else []
    return parse_items(items)


def parse_baidu_top(data):
    try:
        cards = data.get("data", {}).get("cards", [])
        items = []
        for card in cards:
            for content in card.get("content", []):
                title = content.get("word") or content.get("query") or ""
                if title:
                    items.append({
                        "title": str(title).strip(),
                        "hot": str(content.get("hotScore", "") or content.get("raw_hot", "")),
                        "url": content.get("url", ""),
                    })
        return items
    except Exception:
        return []


def parse_zhihu(data):
    items = []
    for item in data.get("data", [])[:20]:
        target = item.get("target", {})
        title = target.get("title") or item.get("target", {}).get("title")
        if title:
            items.append({
                "title": str(title).strip(),
                "hot": str(item.get("detail_text", "") or " "),
                "url": target.get("url", "") or f"https://www.zhihu.com/question/{target.get('id', '')}",
            })
    return items


def parse_weibo(data):
    items = []
    realtime = data.get("data", {}).get("realtime", [])
    for item in realtime[:20]:
        word = item.get("word") or item.get("note")
        if word:
            items.append({
                "title": str(word).strip(),
                "hot": str(item.get("raw_hot", "") or item.get("num", "")),
                "url": item.get("url", ""),
            })
    return items


def parse_bilibili_api(data):
    items = []
    trending = data.get("data", {}).get("trending", {})
    for item in trending.get("list", [])[:20]:
        keyword = item.get("keyword") or item.get("show_name")
        if keyword:
            items.append({
                "title": str(keyword).strip(),
                "hot": str(item.get("heat_score", "") or ""),
                "url": item.get("icon", ""),
            })
    return items


def parse_bilibili_s(data):
    items = []
    for item in data.get("list", [])[:20]:
        keyword = item.get("keyword")
        if keyword:
            items.append({
                "title": str(keyword).strip(),
                "hot": "",
                "url": "",
            })
    return items


PARSERS = {
    "vvhan": parse_vvhan,
    "coder007": parse_coder007,
    "tenapi": parse_tenapi,
    "baidu_top": parse_baidu_top,
    "zhihu": parse_zhihu,
    "weibo": parse_weibo,
    "bilibili_api": parse_bilibili_api,
    "bilibili_s": parse_bilibili_s,
}


def parse_items(items):
    """统一解析为 {title, hot, url} 格式"""
    result = []
    for item in items[:20]:
        if isinstance(item, str):
            title = item
            hot = ""
            url = ""
        else:
            title = (item.get("title") or item.get("name") or item.get("word") or
                     item.get("desc") or item.get("query") or item.get("keyword") or "")
            hot = (item.get("hot") or item.get("hot_num") or item.get("view_count") or
                   item.get("heat_score") or item.get("hotScore") or item.get("hots") or
                   item.get("num") or item.get("raw_hot") or "")
            url = (item.get("url") or item.get("link") or item.get("mobil_url") or
                   item.get("mobilUrl") or "")
        if title and str(title).strip():
            result.append({
                "title": str(title).strip(),
                "hot": str(hot) if hot else "",
                "url": str(url).strip() if url else "",
            })
    return result


def fetch_hot(source_key):
    """抓取某个平台热榜，多源容错"""
    sources = HOT_SOURCES.get(source_key, [])
    for src in sources:
        url = src["url"]
        parser_name = src["parser"]
        parser = PARSERS.get(parser_name, parse_items)
        try:
            print(f"    尝试 {source_key}: {url}", file=sys.stderr)
            resp = requests.get(url, timeout=20, headers=HEADERS)
            print(f"    状态码: {resp.status_code}", file=sys.stderr)
            if resp.status_code != 200:
                continue
            data = resp.json()
            items = parser(data)
            if items:
                print(f"    ✅ {source_key} 成功获取 {len(items)} 条", file=sys.stderr)
                return items
        except Exception as e:
            print(f"    [warn] {source_key} 源 {url} 失败: {e}", file=sys.stderr)
            continue
    return []


def rewrite_with_deepseek(all_items, track):
    """调用 DeepSeek 把热榜改写为口播爆款选题"""
    if not DEEPSEEK_API_KEY:
        return None, "未配置 DEEPSEEK_API_KEY，跳过 AI 改写"

    hot_titles = [f"{i+1}. {it['title']}" for i, it in enumerate(all_items[:15])]

    prompt = f"""你是顶级女性成长口播内容创作教练，擅长把当日热点改编为爆款口播选题。

我的赛道是：{track}

请把以下当日热点，改写成适合我赛道的口播爆款选题。
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
        "max_tokens": 2000
    }

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        resp = requests.post(DEEPSEEK_URL, headers=headers, json=body, timeout=90)
        if resp.status_code != 200:
            return None, f"DeepSeek API 返回 {resp.status_code}: {resp.text[:200]}"

        content = resp.json()["choices"][0]["message"]["content"]
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1] if "\n" in content else content[3:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

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


def fallback_data():
    """所有源失败时的兜底数据"""
    bj_time = datetime.now(timezone(timedelta(hours=8)))
    return {
        "date": bj_time.strftime("%Y-%m-%d"),
        "update_time": bj_time.strftime("%Y-%m-%d %H:%M:%S"),
        "track": MY_TRACK,
        "all_sources_failed": True,
        "note": "本次 GitHub Actions 网络无法访问热榜 API，已使用兜底数据。",
        "platforms": {
            "baidu": {"count": 0, "items": []},
            "zhihu": {"count": 0, "items": []},
            "weibo": {"count": 0, "items": []},
            "bilibili": {"count": 0, "items": []},
            "xiaohongshu": {"count": 0, "items": []},
            "douyin": {"count": 0, "items": []},
        },
        "ai_rewrite": [],
        "ai_status": "未执行（无热榜数据）"
    }


def main():
    print("=" * 50)
    print(f"Easylumi 每日热榜更新  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

    # 1. 抓取所有平台热榜
    print("\n[1/3] 抓取热榜...")
    platforms = ["baidu", "zhihu", "weibo", "bilibili", "xiaohongshu", "douyin"]
    results = {}
    for p in platforms:
        print(f"\n  抓取 {p}...", file=sys.stderr)
        results[p] = fetch_hot(p)

    print(f"\n  百度:   {len(results['baidu'])} 条")
    print(f"  知乎:   {len(results['zhihu'])} 条")
    print(f"  微博:   {len(results['weibo'])} 条")
    print(f"  B站:    {len(results['bilibili'])} 条")
    print(f"  小红书: {len(results['xiaohongshu'])} 条")
    print(f"  抖音:   {len(results['douyin'])} 条")

    all_items = (results['baidu'] + results['zhihu'] + results['weibo'] +
                 results['bilibili'] + results['xiaohongshu'] + results['douyin'])

    if not all_items:
        print("\n  [warn] 所有热榜源都失败，使用兜底数据...")
        result = fallback_data()
    else:
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
            "all_sources_failed": False,
            "platforms": {
                "baidu":        {"count": len(results['baidu']),        "items": results['baidu'][:15]},
                "zhihu":        {"count": len(results['zhihu']),        "items": results['zhihu'][:15]},
                "weibo":        {"count": len(results['weibo']),        "items": results['weibo'][:15]},
                "bilibili":     {"count": len(results['bilibili']),     "items": results['bilibili'][:15]},
                "xiaohongshu":  {"count": len(results['xiaohongshu']),  "items": results['xiaohongshu'][:15]},
                "douyin":       {"count": len(results['douyin']),       "items": results['douyin'][:15]},
            },
            "ai_rewrite": rewritten,
            "ai_status": msg
        }

    # 4. 写入
    content_str = json.dumps(result, ensure_ascii=False, indent=2)
    print(f"\n[3/3] 写入 {DATA_FILE}...")
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        f.write(content_str)
    print(f"  已写入 {DATA_FILE} ({len(content_str)} bytes)")

    # 5. 摘要
    print("\n" + "=" * 50)
    print("摘要:")
    print(f"  热榜总量: {len(all_items)} 条")
    print(f"  AI 改写: {len(result.get('ai_rewrite', []))} 条选题")
    print(f"  数据文件: {DATA_FILE}")
    print(f"  全部失败: {result.get('all_sources_failed', False)}")
    print("=" * 50)
    print("\n Done!")


if __name__ == "__main__":
    main()
