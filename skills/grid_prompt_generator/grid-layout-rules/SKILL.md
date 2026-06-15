---
name: grid-layout-rules
description: Use when grid-image-generator 需要根据 first_frame、first_last 或 multi_ref 模式生成严格宫格布局提示词。
---

# 宫格布局规则

## first_frame

- 每格都是一个镜头的起始画面。
- 必须写出 `exactly N visible panels`。

## first_last

- 用首尾帧形成节奏，但总格数仍然严格等于 `rows * cols`。
- 不能偷换成固定两列布局。

## multi_ref

- 所有格子围绕同一镜头的不同角度或构图。
- 重点强调同场景、同光线、同色板。

## 通用约束

- 必须包含 `rows x cols grid layout`。
- 必须包含 `no merged panels, no missing panels`。
- 有参考图映射时，只能用 `图片1/图片2/...` 指代参考图。
