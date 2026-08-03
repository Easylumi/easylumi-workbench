#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Easylumi 每日热榜抓取 + DeepSeek AI 改写
========================================
功能：
  1. 抓取抖音 / B站 / 微博 / 小红书 当日热榜
  2. 调用 DeepSeek API 改写为「女性成长口播」爆款选题
  3. 写入 data/hot_data.json，供 PWA 网页通过 Gitee raw 读取

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

# 多热榜源（容错）
HOT_SOURCES = {
    "douyin": [
        "https://api.vvhan.com/api/hotlist/douyin",
        "https://api.coder007.sjtu.edu.cn/api-hot/douyin",
    ],
    "bilibili": [
        "https://api.vvhan.com/api/hotlist/bilibili",
        "https://api.coder007.sjtu.edu.cn/api-hot/bilibili",
    ],
    "weibo": [
        "https://api.vvhan.com/api/hotlist/wbHot",
        "https://api.coder007.sjtu.edu.cn/api-hot/weibo",
    ],
    "xiaohongshu": [
        "https://api.vvhan.com/api/hotlist/xhsHot",
        "https://api.coder007.sjtu.edu.cn/api-hot/xiaohongshu",
    ],
}

UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"


# ============ 抓取热榜 ============
def fetch_hot(source_key):
    """抓取某个平台热榜，多源容错"""
    sources = HOT_SOURCES.get(source_key, [])
    for url in sources:
        try:
            resp = requests.get(url, timeout=15, headers={"User-Agent": UA})
            if resp.status_code != 200:
                continue
            data = resp.json()
            # 兼容两种格式
            items = data.get("data") or data.get("items") or data.get("list") or []
            if items:
                return parse_items(items, source_key)
        except Exception as e:
            print(f"  [warn] {source_key} 源 {url} 失败: {e}", file=sys.stderr)
            continue
    return []


def parse_items(items, source):
    """统一解析为 {title, hot, url} 格式"""
    result = []
    for item in items[:20]:
        title = item.get("title") or item.get("name") or item.get("word") or ""
        hot   = item.get("hot") or item.get("hot_num") or item.get("view_count") or ""
        url   = item.get("url") or item.get("link") or item.get("mobil_url") or ""
        if title:
            result.append({
                "title": str(title).strip(),
                "hot": str(hot),
                "url": str(url).strip() if url else "",
                "source": source
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


# ============ 主流程 ============
def main():
    print("=" * 50)
    print(f"Easylumi 每日热榜更新  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)

    # 1. 抓取热榜
    print("\n[1/3] 抓取热榜...")
    douyin     = fetch_hot("douyin")
    bilibili   = fetch_hot("bilibili")
    weibo      = fetch_hot("weibo")
    xiaohongshu= fetch_hot("xiaohongshu")

    print(f"  抖音: {len(douyin)} 条")
    print(f"  B站:  {len(bilibili)} 条")
    print(f"  微博: {len(weibo)} 条")
    print(f"  小红书: {len(xiaohongshu)} 条")

    all_items = douyin + bilibili + weibo + xiaohongshu
    if not all_items:
        print("  [error] 所有热榜源都失败，退出")
        sys.exit(1)

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
        "platforms": {
            "douyin":      {"count": len(douyin),      "items": douyin[:15]},
            "bilibili":    {"count": len(bilibili),    "items": bilibili[:15]},
            "weibo":       {"count": len(weibo),       "items": weibo[:15]},
            "xiaohongshu": {"count": len(xiaohongshu), "items": xiaohongshu[:15]},
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
    print("\n✅ 完成！如果配置了 git，运行以下命令推送到 Gitee：")
    print("  git add data/hot_data.json")
    print("  git commit -m \"📊 更新热榜数据\"")
    print("  git push")


if __name__ == "__main__":
    main()
