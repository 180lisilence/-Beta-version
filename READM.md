\# 个人工作台 Personal‑Workbench

> 📦 Electron 本地效率工作台 | 工作生活一体化管理，内置AI对话，\*\*所有数据本地存储，不上传云端\*\*



\[!\[Electron](https://img.shields.io/badge/Electron-33.0.0-blue.svg)](https://www.electronjs.org/)

\[!\[License](https://img.shields.io/badge/license-ISC-green.svg)](./package.json)



\## ✨ 功能介绍

一个基于 Electron + 原生 HTML/CSS/JS 开发的本地桌面工作台，无前端框架依赖。整合待办、项目、自媒体、客户跟进、健身、饮食、游戏清单管理，内置大模型AI对话。



\### 📋 业务模块

\- \*\*首页总览\*\*：仪表盘，今日待办、高优待办、快速备忘、数据统计、模块快捷入口

\- \*\*今日计划\*\*：待办任务管理，支持优先级、截止时间、标记完成

\- \*\*自媒体\*\*：选题管理、文案草稿、计划发布、复盘笔记

\- \*\*开发工作\*\*：项目‑任务两级管理，任务进度、截止时间跟踪

\- \*\*咨询工作\*\*：客户工单、跟进状态、下次跟进提醒

\- \*\*健身计划\*\*：训练记录，训练方案、运动时长标记

\- \*\*饮食计划\*\*：饮食记录，按日期分组统计热量

\- \*\*游戏娱乐\*\*：游戏清单，游玩进度、累计时长记录

\- \*\*AI对话\*\*：多会话AI聊天，持久保存对话记录；全局悬浮AI快捷对话球

\- \*\*数据与设置\*\*：主题切换、AI服务商配置、数据备份导入导出、回收站、系统重置



\### 🚀 特色特性

\- 🌓 \*\*深色 / 浅色双主题\*\*，配置本地记忆

\- 🗑️ \*\*回收站软删除\*\*，支持恢复、彻底删除

\- 🔔 \*\*桌面到期通知提醒\*\*，定时扫描即将到期事项

\- 🤖 兼容多家大模型（豆包、通义千问、DeepSeek、Kimi、智谱、OpenAI），兼容OpenAI标准接口

\- 💾 JSON完整备份/导入，待办支持导出CSV

\- 📱 侧边栏折叠，支持触摸手势操作

\- 🛡️ Electron安全最佳实践：`contextIsolation`，关闭nodeIntegration，通过IPC读写本地文件

\- ⚠️ 全局JS异常捕获，崩溃弹窗打印错误堆栈便于排错



\## 📂 项目结构

```

personal‑workbench

├─ index.html                     # 应用入口HTML

├─ styles.css                     # 全局样式、主题变量、响应式

├─ preload.js                     # Electron preload 桥接脚本

├─ package.json                   # 依赖、运行\&打包脚本

├─ main/

│   └─ main.js                    # Electron主进程，窗口、文件读写IPC

└─ renderer/

&#x20;   ├─ boot.js                    # 应用启动入口

&#x20;   ├─ router.js                  # Hash路由模块

&#x20;   ├─ store.js                   # 数据存储层，模拟数据库

&#x20;   ├─ ui.js                      # UI工具库：DOM构建、弹窗、toast、表单

&#x20;   ├─ api‑ai.js                  # AI接口、会话消息CRUD

&#x20;   └─ modules/

&#x20;       ├─ home.js                # 首页总览，提供全局列表/编辑弹窗工具

&#x20;       ├─ todayPlan.js           # 今日计划

&#x20;       ├─ media.js               # 自媒体

&#x20;       ├─ develop.js             # 开发工作

&#x20;       ├─ consult.js             # 咨询工单

&#x20;       ├─ fitness.js             # 健身计划

&#x20;       ├─ diet.js                # 饮食计划

&#x20;       ├─ game.js                # 游戏娱乐

&#x20;       ├─ aiPage.js              # AI完整对话页面

&#x20;       └─ setting.js             # 设置页面

```



\## 🛠️ 环境要求

\- Node.js >= 20



\## 🚀 快速开始

\### 1. 安装依赖

```bash

npm install

```



\### 2. 开发运行

```bash

npm start

```

> 启动后自动打开Electron窗口，默认开启开发者调试工具。



\### 3. 打包 Windows 程序

输出产物在 `dist/` 目录，生成 NSIS安装包 + 便携版(portable)

```bash

npm run build-win

```



\## 💾 数据存储位置

> Windows：`%APPDATA%/personal‑workbench/workbench‑data.json`

>

> 由electron `app.getPath('userData')` 获取，所有业务数据保存在该JSON文件。



\- \*\*磁盘JSON文件\*\*：业务数据、系统配置 config

\- \*\*LocalStorage\*\*：UI状态（主题、侧边栏折叠状态、悬浮球位置、通知已推送标记）



> ⚠️ AI悬浮快捷面板对话仅保存在内存，关闭面板即丢失；AI页面内对话会持久化存入数据文件。



\## 🤖 AI配置说明

进入【数据与设置】页面配置AI参数：

1\. 选择AI服务商；

2\. 填入对应服务商的 `API Key`；

3\. 可自定义模型、自定义API接口地址、System Prompt；

4\. 点击`🧪 测试连接`验证连通性。



支持服务商：

\- `doubao` 豆包方舟

\- `qwen` 通义千问

\- `deepseek` DeepSeek

\- `openai` OpenAI

\- `moonshot` Kimi（月之暗面）

\- `zhipu` 智谱GLM



> 兼容任意遵循OpenAI Chat Completions接口格式的大模型服务。



\## 📖 扩展开发

\### 新增业务模块简要步骤

1\. 修改 `renderer/store.js`：在`STORES`数组添加存储key，`STORE\_LABELS`添加中文名称；

2\. 修改 `index.html`：侧边栏导航增加nav-item路由链接；

3\. 在`renderer/modules/`新建模块js，参考`todayPlan.js`，复用`renderListPage`和`openEditor`；

4\. index.html引入新增脚本，重启项目访问对应hash路由。



\### 核心全局API

```js

// 存储层

Store.DBgetAll(storeName)     // 查询全部

Store.DBget(storeName, id)    // 根据id查询单条

Store.DBadd(storeName, item)  // 新增记录

Store.DBput(storeName, item)  // 更新记录

Store.DBdelete(storeName, id) // 软删除，移入回收站

Store.DBpurge(storeName, id)  // 彻底物理删除



// 路由

Router.registerRoute(name, handler, title) // 注册页面路由



// UI工具

UI.Modal     // 弹窗

UI.Toast     // 消息提示

U.el()       // DOM快速创建工具



// AI模块

AIMod.AI.chat(messages)      // AI对话请求

```



\## ⚠️ 注意事项 \& 已知限制

1\. 文件关联功能\*\*仅保存文件路径字符串，不会读取本地文件内容\*\*；

2\. 导入备份为\*\*覆盖模式\*\*，导入前建议先导出备份；

3\. 桌面提醒依赖系统Notification通知权限，权限拒绝则无法弹窗；

4\. AI网络请求在渲染进程直接fetch，无内置代理，如需代理请开启系统全局代理；

5\. 单机本地软件，\*\*无账号系统，无云端同步能力\*\*；

6\. AI悬浮快捷面板聊天不持久化，正式AI对话页面消息才会保存。





