import { Agent } from '@mastra/core/agent'
import { createOpenAI } from '@ai-sdk/openai'
import { Hono } from 'hono'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { getTextConfig, getTextProviderBaseUrl } from '../services/ai.js'
import { badRequest, notFound, now, success } from '../utils/response.js'
import { toSnakeCase } from '../utils/transform.js'
import { getSkillPack, loadAgentSkills } from '../agents/skills.js'

const app = new Hono()
const CREATIVE_AGENT_TYPE = 'creative_interviewer'

const DEFAULT_CREATIVE_PROMPT = `你是“微境创作访谈师”，服务对象是没有任何自媒体或编剧经验的新手。

你的工作方式：
1. 先读上下文，再基于当前范围（整剧或单集）推进访谈。
2. 一次只问一个高价值问题，不要连发问卷。
3. 在信息不足时优先追问，不要仓促定稿。
4. 随着对话持续维护结构化创作草稿。
5. 当信息足够时，明确告诉用户已经可以提交定稿。

你的输出必须始终是 JSON，不要输出 Markdown，不要输出代码块。
JSON 结构固定为：
{
  "assistant_message": "给用户看的自然语言回复",
  "ready_to_commit": false,
  "focus": "当前最需要补齐的信息",
  "draft_update": {
    "brief": {},
    "character_bible": {},
    "world_book": {},
    "episode_outlines": [],
    "current_episode": {}
  }
}

要求：
- assistant_message 用简体中文。
- 整剧范围优先沉淀：创作简报、人物设定、世界观、分集大纲。
- 单集范围优先沉淀：当前集目标、冲突、关键场景、剧本初稿。
- 如果用户已经给出明确信息，就直接更新 draft_update，不要重复问同样的问题。
- ready_to_commit 只有在已经能产出稳定的简报/大纲/初稿时才为 true。`

function safeParseJSON<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function truncateText(value: string | null | undefined, max = 2400) {
  if (!value) return ''
  return value.length > max ? `${value.slice(0, max)}\n...[截断]` : value
}

function mergeDraft(base: any, patch: any): any {
  if (patch === undefined) return base
  if (patch === null || typeof patch !== 'object') return patch
  if (Array.isArray(patch)) return patch

  const result: Record<string, any> = {
    ...(base && typeof base === 'object' && !Array.isArray(base) ? base : {}),
  }

  for (const [key, value] of Object.entries(patch)) {
    result[key] = mergeDraft(result[key], value)
  }

  return result
}

function parseAgentPayload(rawText: string) {
  const candidates = [
    rawText.trim(),
    rawText.match(/```json\s*([\s\S]*?)```/i)?.[1]?.trim(),
    rawText.match(/(\{[\s\S]*\})/)?.[1]?.trim(),
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // ignore
    }
  }

  return {
    assistant_message: rawText.trim(),
    ready_to_commit: false,
    focus: '继续补齐创作信息',
    draft_update: {},
  }
}

function getAgentConfig(agentType: string) {
  const rows = db.select().from(schema.agentConfigs)
    .where(and(eq(schema.agentConfigs.agentType, agentType), isNull(schema.agentConfigs.deletedAt)))
    .all()
  return rows.find(row => row.isActive) || rows[0] || null
}

function getModel(dbConfig: any) {
  const textConfig = getTextConfig()
  const provider = createOpenAI({
    baseURL: getTextProviderBaseUrl(textConfig),
    apiKey: textConfig.apiKey,
  } as any)
  const modelName = dbConfig?.model || textConfig.model
  return provider.chat(modelName)
}

function normalizeSession(row: any) {
  return {
    ...toSnakeCase(row),
    structured_draft: safeParseJSON(row.structuredDraft, {}),
  }
}

function normalizeMessages(rows: any[]) {
  return rows.map(row => ({
    ...toSnakeCase(row),
    attachment: safeParseJSON(row.attachment, null),
  }))
}

function buildEpisodeDescription(outline: any) {
  if (!outline || typeof outline !== 'object') return ''
  const segments = [
    outline.title ? `标题：${outline.title}` : '',
    outline.logline ? `一句话：${outline.logline}` : '',
    outline.goal ? `目标：${outline.goal}` : '',
    outline.conflict ? `冲突：${outline.conflict}` : '',
    outline.hook ? `钩子：${outline.hook}` : '',
    outline.summary ? `概要：${outline.summary}` : '',
  ].filter(Boolean)
  return segments.join('\n')
}

function buildDramaMetadata(existingMeta: Record<string, any>, draft: Record<string, any>, sessionId: number, committedAt: string) {
  return {
    ...existingMeta,
    creative_brief: draft.brief || existingMeta.creative_brief || {},
    character_bible: draft.character_bible || existingMeta.character_bible || {},
    world_book: draft.world_book || existingMeta.world_book || {},
    episode_outlines: draft.episode_outlines || existingMeta.episode_outlines || [],
    creative_interview: {
      ...(existingMeta.creative_interview || {}),
      last_session_id: sessionId,
      committed_at: committedAt,
      status: 'committed',
    },
  }
}

function getCurrentEpisodeDraft(draft: Record<string, any>) {
  const current = draft.current_episode && typeof draft.current_episode === 'object'
    ? draft.current_episode
    : {}
  const content = current.script_draft
    || current.screenplay_seed
    || current.raw_story
    || current.scene_outline
    || ''
  const description = current.summary
    || current.goal
    || current.intent
    || current.conflict
    || ''
  return { current, content, description }
}

function buildCreativeContext(scope: 'drama' | 'episode', dramaId: number, episodeId?: number | null) {
  const [drama] = db.select().from(schema.dramas).where(eq(schema.dramas.id, dramaId)).all()
  if (!drama) throw new Error('Drama not found')

  const episodes = db.select().from(schema.episodes)
    .where(eq(schema.episodes.dramaId, dramaId))
    .orderBy(schema.episodes.episodeNumber)
    .all()

  const parsedMeta = safeParseJSON<Record<string, any>>(drama.metadata, {})
  const context: Record<string, any> = {
    drama: {
      id: drama.id,
      title: drama.title,
      description: drama.description || '',
      genre: drama.genre || '',
      style: drama.style || '',
      tags: safeParseJSON<string[]>(drama.tags, []),
      metadata: parsedMeta,
    },
    episodes: episodes.map(ep => ({
      id: ep.id,
      episode_number: ep.episodeNumber,
      title: ep.title,
      description: ep.description || '',
      has_raw_content: !!ep.content,
      has_script_content: !!ep.scriptContent,
    })),
  }

  if (scope === 'episode') {
    const episode = episodes.find(item => item.id === episodeId)
    if (!episode) throw new Error('Episode not found')
    const outlines = Array.isArray(parsedMeta.episode_outlines) ? parsedMeta.episode_outlines : []
    const matchedOutline = outlines.find((item: any, index: number) => {
      if (item?.episode_id === episode.id) return true
      const episodeNumber = Number(item?.episode_number || item?.episodeNumber || index + 1)
      return episodeNumber === episode.episodeNumber
    }) || null

    context.target_episode = {
      id: episode.id,
      episode_number: episode.episodeNumber,
      title: episode.title,
      description: episode.description || '',
      raw_content: truncateText(episode.content),
      script_content: truncateText(episode.scriptContent),
      matched_outline: matchedOutline,
    }
  }

  return context
}

function createCreativeAgent(scope: 'drama' | 'episode', context: any) {
  const dbConfig = getAgentConfig(CREATIVE_AGENT_TYPE)
  const model = getModel(dbConfig)
  const pack = getSkillPack(CREATIVE_AGENT_TYPE)
  const defaults = pack?.defaults || {}
  const baseInstructions = dbConfig?.systemPrompt?.trim() || DEFAULT_CREATIVE_PROMPT
  const skillInstructions = loadAgentSkills(CREATIVE_AGENT_TYPE)

  const instructions = [
    baseInstructions,
    '',
    skillInstructions,
    '',
    `当前访谈范围：${scope === 'drama' ? '整部剧策划' : '当前集补充修订'}`,
    `默认提问深度：${defaults.question_depth || 'balanced'}`,
    `默认输出模板：${defaults.output_template || 'brief-outline-script'}`,
    `默认启用子技能：${Array.isArray(defaults.default_enabled_skills) ? defaults.default_enabled_skills.join(', ') : '全部按 skill-pack 装配'}`,
    '',
    '以下是当前项目上下文（只读 JSON）：',
    JSON.stringify(context, null, 2),
  ].join('\n')

  return new Agent({
    id: CREATIVE_AGENT_TYPE,
    name: dbConfig?.name || '创作访谈',
    instructions,
    model,
    tools: {},
  })
}

function getSessionMessages(sessionId: number) {
  return db.select().from(schema.creativeMessages)
    .where(eq(schema.creativeMessages.sessionId, sessionId))
    .orderBy(schema.creativeMessages.id)
    .all()
}

function getSessionRow(sessionId: number) {
  const [row] = db.select().from(schema.creativeSessions)
    .where(eq(schema.creativeSessions.id, sessionId)).all()
  return row || null
}

// POST /creative/sessions
app.post('/sessions', async (c) => {
  const body = await c.req.json()
  const scope = body.scope === 'episode' ? 'episode' : 'drama'
  const dramaId = Number(body.drama_id)
  const episodeId = body.episode_id ? Number(body.episode_id) : null

  if (!dramaId) return badRequest(c, 'drama_id is required')
  if (scope === 'episode' && !episodeId) return badRequest(c, 'episode_id is required for episode scope')

  const existing = db.select().from(schema.creativeSessions)
    .where(and(
      eq(schema.creativeSessions.scope, scope),
      eq(schema.creativeSessions.dramaId, dramaId),
      scope === 'episode'
        ? eq(schema.creativeSessions.episodeId, episodeId as number)
        : isNull(schema.creativeSessions.episodeId),
      eq(schema.creativeSessions.status, 'active'),
    ))
    .orderBy(desc(schema.creativeSessions.updatedAt))
    .all()[0]

  if (existing) {
    return success(c, {
      session: normalizeSession(existing),
      messages: normalizeMessages(getSessionMessages(existing.id)),
    })
  }

  const ts = now()
  const context = buildCreativeContext(scope, dramaId, episodeId)
  const initialDraft = scope === 'drama'
    ? {
      brief: context.drama.metadata?.creative_brief || {},
      character_bible: context.drama.metadata?.character_bible || {},
      world_book: context.drama.metadata?.world_book || {},
      episode_outlines: context.drama.metadata?.episode_outlines || [],
    }
    : {
      current_episode: {
        summary: context.target_episode?.description || '',
        script_draft: db.select().from(schema.episodes)
          .where(eq(schema.episodes.id, episodeId as number))
          .all()[0]?.content || '',
        matched_outline: context.target_episode?.matched_outline || null,
      },
    }

  const res = db.insert(schema.creativeSessions).values({
    scope,
    dramaId,
    episodeId,
    status: 'active',
    structuredDraft: JSON.stringify(initialDraft),
    createdAt: ts,
    updatedAt: ts,
  }).run()

  const session = getSessionRow(Number(res.lastInsertRowid))
  return success(c, {
    session: normalizeSession(session),
    messages: [],
  })
})

// GET /creative/sessions/:id
app.get('/sessions/:id', async (c) => {
  const sessionId = Number(c.req.param('id'))
  const session = getSessionRow(sessionId)
  if (!session) return notFound(c, 'Creative session not found')

  return success(c, {
    session: normalizeSession(session),
    messages: normalizeMessages(getSessionMessages(sessionId)),
  })
})

// POST /creative/sessions/:id/messages
app.post('/sessions/:id/messages', async (c) => {
  const sessionId = Number(c.req.param('id'))
  const body = await c.req.json()
  const message = String(body.message || '').trim()
  if (!message) return badRequest(c, 'message is required')

  const session = getSessionRow(sessionId)
  if (!session) return notFound(c, 'Creative session not found')
  if (session.status !== 'active') return badRequest(c, 'Creative session is not active')

  const ts = now()
  db.insert(schema.creativeMessages).values({
    sessionId,
    role: 'user',
    content: message,
    attachment: null,
    createdAt: ts,
  }).run()

  const context = buildCreativeContext(session.scope as 'drama' | 'episode', session.dramaId, session.episodeId)
  const draft = safeParseJSON<Record<string, any>>(session.structuredDraft, {})
  const messageRows = getSessionMessages(sessionId)
  const history = messageRows.map(row => ({
    role: row.role as 'user' | 'assistant',
    content: row.content,
  })) as any[]

  const agent = createCreativeAgent(session.scope as 'drama' | 'episode', {
    ...context,
    current_draft: draft,
  })

  const startTime = performance.now()
  const result = await agent.generate(history, { maxSteps: 8 })

  const payload = parseAgentPayload(result.text || '')
  const nextDraft = mergeDraft(draft, payload.draft_update || {})

  db.insert(schema.creativeMessages).values({
    sessionId,
    role: 'assistant',
    content: String(payload.assistant_message || result.text || '').trim(),
    attachment: JSON.stringify(payload),
    createdAt: now(),
  }).run()

  db.update(schema.creativeSessions).set({
    structuredDraft: JSON.stringify(nextDraft),
    updatedAt: now(),
  }).where(eq(schema.creativeSessions.id, sessionId)).run()

  const elapsedMs = Math.round(performance.now() - startTime)
  return success(c, {
    session: normalizeSession(getSessionRow(sessionId)),
    messages: normalizeMessages(getSessionMessages(sessionId)),
    reply: {
      assistant_message: payload.assistant_message || '',
      ready_to_commit: !!payload.ready_to_commit,
      focus: payload.focus || '',
      draft: nextDraft,
      elapsed_ms: elapsedMs,
    },
  })
})

// POST /creative/sessions/:id/commit
app.post('/sessions/:id/commit', async (c) => {
  const sessionId = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  const session = getSessionRow(sessionId)
  if (!session) return notFound(c, 'Creative session not found')

  const draft = safeParseJSON<Record<string, any>>(session.structuredDraft, {})
  const committedAt = now()

  if (session.scope === 'drama') {
    const [drama] = db.select().from(schema.dramas).where(eq(schema.dramas.id, session.dramaId)).all()
    if (!drama) return notFound(c, 'Drama not found')

    const existingMeta = safeParseJSON<Record<string, any>>(drama.metadata, {})
    const nextMeta = buildDramaMetadata(existingMeta, draft, session.id, committedAt)

    db.update(schema.dramas).set({
      metadata: JSON.stringify(nextMeta),
      updatedAt: committedAt,
    }).where(eq(schema.dramas.id, session.dramaId)).run()

    if (body.apply_outline_to_episodes !== false && Array.isArray(draft.episode_outlines)) {
      const episodes = db.select().from(schema.episodes)
        .where(eq(schema.episodes.dramaId, session.dramaId))
        .orderBy(schema.episodes.episodeNumber)
        .all()

      draft.episode_outlines.forEach((outline: any, index: number) => {
        const episodeNumber = Number(outline?.episode_number || outline?.episodeNumber || index + 1)
        const episode = episodes.find(item => item.episodeNumber === episodeNumber)
        if (!episode) return
        db.update(schema.episodes).set({
          description: buildEpisodeDescription(outline),
          updatedAt: committedAt,
        }).where(eq(schema.episodes.id, episode.id)).run()
      })
    }
  } else {
    const episodeId = session.episodeId
    if (!episodeId) return badRequest(c, 'Episode session missing episode_id')

    const { content, description } = getCurrentEpisodeDraft(draft)
    const updates: Record<string, any> = { updatedAt: committedAt }
    if (description) updates.description = description
    if (content) updates.content = content

    db.update(schema.episodes).set(updates).where(eq(schema.episodes.id, episodeId)).run()
  }

  db.update(schema.creativeSessions).set({
    status: 'committed',
    committedAt,
    updatedAt: committedAt,
  }).where(eq(schema.creativeSessions.id, sessionId)).run()

  const refreshedSession = getSessionRow(sessionId)
  return success(c, {
    session: normalizeSession(refreshedSession),
    messages: normalizeMessages(getSessionMessages(sessionId)),
    committed: true,
  })
})

export default app
