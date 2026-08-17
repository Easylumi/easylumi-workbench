# Easylumi 工作台

> 🌸 温柔坚持，复刻成长 —— 把每一天都过成想要的样子

一个专为 **Easylumi** 打造的手机端H5个人工作台，包含今日计划、运动塑形、新闻资讯、爆款二创、内容复盘、修心修行功课、每天感悟七大模块。

## ✨ 功能模块

| 模块 | 功能描述 |
|------|---------|
| 🏠 首页 | 欢迎问候、名言金句、数据统计、日期显示 |
| 📋 今日计划 | 日历+环形进度、每日自律任务、自定义待办 |
| 💪 运动塑形 | Morning/Night/面部瑜伽/身材记录，周计划自动轮换 |
| 📰 新闻资讯 | 每日金句、新闻筛选、收藏功能 |
| 🔥 爆款二创 | 抖音/小红书/微博爆款素材，适配度分析 |
| 📊 内容复盘 | 结构化复盘表单、历史记录查阅 |
| 🧘 修心修行 | 今日黄历宜忌、运势评分、每日国学经文 |
| ✨ 每天感悟 | 三二一日记法：感恩3件+改进2件+肯定1句 |

## 🚀 部署使用

### 方式一：GitHub Pages（推荐）
1. Fork 本仓库到个人 GitHub
2. 进入 Settings → Pages → Source 选择 main 分支
3. 访问 `https://你的用户名.github.io/easylumi-workbench`

### 方式二：jsDelivr CDN
前端会自动从 CDN 拉取最新数据：
```
https://cdn.jsdelivr.net/gh/你的用户名/你的仓库名@main/data/news.json
```

## 🤖 GitHub Actions 自动流水线

### 配置步骤

1. **设置 DeepSeek API Key**
   - 进入仓库 Settings → Secrets and variables → Actions
   - 点击 `New repository secret`
   - Name: `DEEPSEEK_API_KEY`
   - Value: 你的 DeepSeek API Key

2. **流水线功能**
   - 每天北京时间早上6点自动运行
   - 自动抓取/生成新闻、爆款素材、国学内容
   - 使用 DeepSeek AI 进行内容改写和生成
   - 自动生成数据推送到仓库，通过 jsDelivr CDN 分发

3. **手动触发**
   - 进入 Actions → Daily Content Crawler & AI Rewrite
   - 点击 `Run workflow` 手动执行

### 数据文件结构
```
data/
├── news.json      # 新闻资讯
├── viral.json     # 爆款二创素材
├── classics.json  # 每日国学
├── quotes.json    # 名言金句
└── almanac.json   # 黄历数据
```

## 📱 本地开发

```bash
# 克隆仓库
git clone https://github.com/你的用户名/easylumi-workbench.git
cd easylumi-workbench

# 用任意静态服务器运行
npx serve .
# 或
python -m http.server 8080
```

## 🎨 设计特色

- **马卡龙低饱和配色**：粉、绿、蓝、橙、紫柔和搭配
- **大圆角卡片设计**：24px圆角，温暖治愈
- **全部浅色主题**：拒绝深色，暖色调贯穿
- **iPhone 15 Pro Max 优先适配**：完美适配移动端

## 📄 数据持久化

所有用户数据通过 `localStorage` 本地存储：
- 待办任务、运动打卡
- 身材记录、内容复盘
- 每日感悟、收藏夹

数据保存在浏览器本地，换设备需重新记录。

---

💜 Made with love for Easylumi
