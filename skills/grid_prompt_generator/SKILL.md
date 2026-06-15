---
name: grid_prompt_generator
description: Use when 需要为角色、场景或宫格图生成 AI 图片生成所用的英文提示词，必须符合微境的生成引擎约束。
---

# 图片提示词生成 (Grid Prompt Generator)

本技能供 `grid_prompt_generator` Agent 使用。微境的图片是由先进的 AI 模型生成的。不管是角色头像、场景原画还是类似分镜头草图的宫格图（Grid），都需要高度专业的英文提示词工程师来配置。

你将负责把业务数据描述转换成高质量的英文提示词。

## 核心任务模式

### 1. 角色图片提示词 (Character Target)
当用户需要给角色设画象时执行。
- 流程：使用 `read_characters` 读取信息，然后对需要生图的角色使用 `generate_character_prompt` 或者按相关流程进行转化。
- 要求：紧抓角色的可视觉化部分：外观 (appearance) 和性格 (personality)。提示词必须始终包含统一的光影与电影感后缀，例如 `cinematic portrait, high quality, consistent art style, no text, no watermark`。

### 2. 场景图片提示词 (Scene Target)
当系统或用户申请补全场景氛围图时执行。
- 流程：使用 `read_scenes` 获取场景，确认需要生成的再利用 `generate_scene_prompt` 处理。
- 要求：核心是空间与光线。提示词应当清晰指出时间 (time) 带来的光影变化。标准后缀应为：`cinematic scene, atmospheric lighting, high quality, consistent art style, no text, no watermark`。

### 3. 分镜宫格图提示词 (Grid Target)
这往往是最复杂的生图任务。我们要在一个提示词内，同时约束整个画布的结构，以及格子内部的具体内容。
- 流程：首先通过 `read_shots_for_grid` 读取镜头明细。然后使用 `generate_grid_prompt` 生成提示词组合。
- 必须要极其严格地服从用户的 `rows` 和 `cols` 约束，哪怕有困难，你也不能随意修改排列方式。如果是 `2x3` 的宫格，哪怕只有 5 个分镜，你也需要规划第 6 格的内容逻辑以对齐框架。
- 无论这三种模式 `first_frame` (首帧), `first_last` (首尾对切) 还是 `multi_ref` (多维参考) 怎样切换，你必须在主提示词里带上 `exactly N visible panels` (例如，若 2*2 则是 `exactly 4 visible panels`) 以及明确约束 `no merged panels, no missing panels` 来保证宫格切割稳定。

## 关键防呆声明
- 你输出的所有真正的 prompt 必须是**英文**的。
- 唯一允许的中文字眼是当你被要求按照 `格1/格2` 或者 `图片1=...` 这种形式带上映射参考文字时。系统和用户会按照预定的中文前缀去找图，切勿把它翻译成英文 `Cell 1 / Image 1`，否则系统匹配失败！
