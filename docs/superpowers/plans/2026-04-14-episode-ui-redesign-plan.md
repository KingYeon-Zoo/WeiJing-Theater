# Episode UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 根据 DESIGN.md 重构 Episode 页面的前端视觉表现为极致黑白与药丸几何风格，并全量汉化文本。

**Architecture:** 直接修改 Vue 单文件组件中的 HTML 模板内容与 class 绑定，不触及任何核心逻辑变量与 API 调用。主要包括颜色类名替换、圆角类名替换以及英文字符串硬编码的中文化映射。

**Tech Stack:** Vue 3, Tailwind CSS, Vite

---

### Task 1: 导航与图层面板的汉化与重构

**Files:**
- Modify: `frontend/app/pages/drama/[id]/episode/[episodeNumber].vue`

- [ ] **Step 1: 顶部工具栏汉化及按钮药丸化**
在 `<header class="figma-topbar">` 与 `<nav class="topbar-center">` 内，替换原本的数字标签为中文：
- `1. Script` -> `1. 剧本`
- `2. Extract` -> `2. 角色解析`
- `3. Cast` -> `3. 选角配置`
- `4. Breakdown` -> `4. 镜头拆解`
- `5. Production` -> `5. 生成制作`
同时，修改顶部右侧计数和返回按钮样式，增加 `rounded-full` 与 `focus:border-dashed`。

- [ ] **Step 2: 左侧图层面板汉化**
在 `<aside class="figma-layers">` 内替换如下文本：
- `RAW MATERIAL` -> `原始素材`
- `REWRITTEN SCRIPT` -> `改写剧本`
- `Characters` -> `登场角色`
- `Scenes` -> `场景列表`
- `Voice Casting` -> `配音设定`
- `Storyboards` -> `分镜序列`

- [ ] **Step 3: 测试验证 UI 汉化是否渲染正常**
Run: `npm run build` (仅测试语法)，或者在本地浏览器人工检查页面，确保此时页面的左侧和上侧 UI 无乱码，且原本的方法正常触发。

- [ ] **Step 4: Commit**
```bash
git add frontend/app/pages/drama/\[id\]/episode/\[episodeNumber\].vue
git commit -m "feat(ui): translate topbar and layers panel to chinese, update button shapes"
```

---

### Task 2: 画布内容与属性面板汉化

**Files:**
- Modify: `frontend/app/pages/drama/[id]/episode/[episodeNumber].vue`

- [ ] **Step 1: 画布头部操作按钮与标题内容**
在所有的 `<div class="canvas-header">` 区域内：
- `Raw Import` -> `原始导入`
- `Save Raw Material` -> `保存原始素材`
- `Script Construction` -> `剧本构建`
- `Skip` -> `跳过`
- `AI Rewrite` -> `AI 智能改写`
- `Save Content` -> `保存剧本内容`
- `Extraction Engine` -> `信息提取引擎`
- `Extract Entities` -> `提取实体信息`
- `Voice Casting` -> `声音选角`
- `Auto Assign Voices` -> `自动分配关联声线`
- `Storyboard Sequences` -> `分镜序列大纲`
- `+ Add First` -> `+ 增加首镜头`
- `Breakdown AI` -> `AI 分镜拆解`
- `Engine Room` -> `生成引擎车间`

- [ ] **Step 2: Inspector 面板表单内容修改**
在 `<aside class="figma-inspector">` 中：
- `Character Properties` -> `角色属性`
- `Name`, `Gender`, `Appearance` -> `姓名`, `性别`, `外貌描述`
- `Scene Properties` -> `场景属性`
- `Period`, `Lighting`, `Visual Feel` -> `年代`, `光影`, `视觉氛围`
- `Audio Configuration` -> `音频环境配置`
- `Selected Voice` -> `已选分配声线`
- `-- Auto Model Voice --` -> `-- 自动推测声线 --`
- `Shot Inspector` -> `镜头检查器`
- `Action / Narrative` -> `镜头动作说明 / 旁白`
- `Camera Shot`, `Movement` -> `镜头景别`, `运镜方式`
- `Reference Prompt (Visuals)` -> `视觉提示词参考`
- `Characters Triggered` -> `涉及登场角色`

- [ ] **Step 3: 测试验证面板是否绑定出错**
检查由于名称的更改，并没有破坏原本 `v-model` 的变量绑定 `c.name`, `s.period` 等。

- [ ] **Step 4: Commit**
```bash
git add frontend/app/pages/drama/\[id\]/episode/\[episodeNumber\].vue
git commit -m "feat(ui): translate canvas and inspector panels to chinese"
```

---

### Task 3: 极致黑白配色与交互状态重构

**Files:**
- Modify: `frontend/app/pages/drama/[id]/episode/[episodeNumber].vue`

- [ ] **Step 1: 移除硬编码彩色与阴影类**
全选文件并排查 `bg-blue-`、`text-blue-`、`border-gray-`、`bg-green-` 的 Tailwind 类名，替换为统一样式的 `bg-black`, `text-white` 或相反的配置。去除过重的阴影效果，如 `shadow-xl`，保持平整设计或最多 `shadow-sm`。

- [ ] **Step 2: 为按钮与交互项添加胶囊状（Pill）与玻璃效果**
所有的 `<button class="btn...">` 都加上 `rounded-[50px]`，对于 `btn-ghost` 可以加上 `hover:bg-black/10` (即 `rgba(0,0,0,0.1)`) 来模拟 `rgba(0,0,0,0.08)` 玻璃效果。
为 `<input>`, `<textarea>` 和 `<select>` 面板统一使用负间距排版，建议在其上的 class 加入 `tracking-tighter` (-0.05em 左右等同)。

- [ ] **Step 3: 添加虚线聚焦交互反馈**
对于能够获取焦点的互动组件（如输入框、操作按钮），使用统一的虚线边框类覆盖浏览器的原有实线：`focus:outline-none focus:ring-0 focus:border-black focus:border-[2px] focus:border-dashed`。

- [ ] **Step 4: 测试所有状态展示效果**
确保深色模式、正常使用情境下，颜色表现呈现极其冷静高级的 Figma 工具感。

- [ ] **Step 5: Commit**
```bash
git add frontend/app/pages/drama/\[id\]/episode/\[episodeNumber\].vue
git commit -m "style: apply pure monochrome figma design system with pill geometry"
```
