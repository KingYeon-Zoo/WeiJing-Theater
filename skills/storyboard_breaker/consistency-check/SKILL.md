---
name: consistency-check
description: Use when storyboard-breaker 已经生成镜头草稿，需要确认字段完整、角色绑定正确且可直接保存。
---

# 分镜一致性检查

- `scene_id` 只在可明确匹配已有场景时填写。
- `character_ids` 只绑定当前镜头真实出现或说话的角色。
- `description` 面向人读，`image_prompt` 面向单帧生成，二者不要互相替代。
- `bgm_prompt`、`sound_effect` 不能只写空泛情绪词。
- 全集镜头顺序应能完整复原剧情。
