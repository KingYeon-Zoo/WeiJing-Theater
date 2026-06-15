import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SKILLS_DIR = path.resolve(__dirname, '../../../skills')
const AGENT_SKILL_MAP: Record<string, string[]> = {
  script_rewriter: ['script_rewriter'],
  extractor: ['extractor'],
  storyboard_breaker: ['storyboard_breaker'],
  voice_assigner: ['voice_assigner'],
  grid_prompt_generator: ['grid_prompt_generator'],
  creative_interviewer: ['creative_interviewer'],
}

export type SkillPackManifest = {
  version: number
  agent_type: string
  pack_name: string
  load_order: string[]
  defaults: Record<string, any>
}

export type SkillListEntry = {
  id: string
  name: string
  description: string
  runtime_enabled: boolean
  pack_name: string | null
  load_order_index: number | null
  agent_type: string
  is_root: boolean
}

function stripFrontmatter(content: string): string {
  if (!content.startsWith('---')) return content.trim()
  const end = content.indexOf('\n---', 3)
  if (end === -1) return content.trim()
  return content.slice(end + 4).trim()
}

function resolveSkillPath(skillId: string): string {
  return path.join(SKILLS_DIR, ...skillId.split('/'), 'SKILL.md')
}

function parseSkillMeta(raw: string, fallbackName: string) {
  const nameMatch = raw.match(/^name:\s*(.+)$/m)
  const descMatch = raw.match(/^description:\s*(.+)$/m)
  return {
    name: nameMatch ? nameMatch[1].trim() : fallbackName,
    description: descMatch ? descMatch[1].trim() : '',
  }
}

function dedupeStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function getLegacyLoadOrder(agentType: string) {
  return AGENT_SKILL_MAP[agentType] || []
}

function getPackPath(agentType: string) {
  return path.join(SKILLS_DIR, agentType, 'skill-pack.json')
}

function normalizePack(agentType: string, raw: any): SkillPackManifest {
  const legacyLoadOrder = getLegacyLoadOrder(agentType)
  const loadOrder = Array.isArray(raw?.load_order)
    ? raw.load_order.filter((item: unknown): item is string => typeof item === 'string')
    : legacyLoadOrder

  return {
    version: Number(raw?.version) || 1,
    agent_type: agentType,
    pack_name: String(raw?.pack_name || agentType),
    load_order: dedupeStrings(loadOrder.length ? loadOrder : legacyLoadOrder),
    defaults: raw?.defaults && typeof raw.defaults === 'object' ? raw.defaults : {},
  }
}

export function getSkillPack(agentType: string): SkillPackManifest | null {
  const packPath = getPackPath(agentType)
  if (!fs.existsSync(packPath)) return null

  try {
    const raw = JSON.parse(fs.readFileSync(packPath, 'utf-8'))
    return normalizePack(agentType, raw)
  } catch {
    return normalizePack(agentType, {})
  }
}

export function updateSkillPack(agentType: string, patch: Partial<SkillPackManifest>) {
  const current = getSkillPack(agentType) || normalizePack(agentType, {})
  const next = normalizePack(agentType, {
    ...current,
    ...patch,
    defaults: patch.defaults && typeof patch.defaults === 'object'
      ? patch.defaults
      : current.defaults,
    load_order: Array.isArray(patch.load_order) ? patch.load_order : current.load_order,
  })

  fs.mkdirSync(path.dirname(getPackPath(agentType)), { recursive: true })
  fs.writeFileSync(getPackPath(agentType), `${JSON.stringify(next, null, 2)}\n`, 'utf-8')
  return next
}

function getRuntimeSkillIds(agentType: string) {
  const pack = getSkillPack(agentType)
  if (pack?.load_order?.length) return pack.load_order
  return getLegacyLoadOrder(agentType)
}

function readSkill(skillId: string): string {
  const skillPath = resolveSkillPath(skillId)
  if (!fs.existsSync(skillPath)) return ''

  const raw = fs.readFileSync(skillPath, 'utf-8')
  const content = stripFrontmatter(raw)
  if (!content) return ''

  return [
    `## Skill: ${skillId}`,
    content,
  ].join('\n')
}

export function loadAgentSkills(agentType: string): string {
  const skillIds = getRuntimeSkillIds(agentType)
  const contents = skillIds
    .map(readSkill)
    .filter(Boolean)

  if (!contents.length) return ''

  return [
    '以下是该 Agent 专属的项目技能规范（SKILL.md）。',
    '不同 Agent 会加载不同 skill；你只需要遵守当前注入的这些技能。',
    '你必须在不违背当前工具边界的前提下优先遵守这些规范；若与用户明确要求冲突，以用户要求为准。',
    '',
    contents.join('\n\n'),
  ].join('\n')
}

function scanSkillEntries(dir: string, entries: SkillListEntry[]) {
  const fsEntries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of fsEntries) {
    if (!entry.isDirectory()) continue
    const fullPath = path.join(dir, entry.name)
    const skillPath = path.join(fullPath, 'SKILL.md')
    if (fs.existsSync(skillPath)) {
      const relativeDir = path.relative(SKILLS_DIR, fullPath).split(path.sep).join('/')
      const raw = fs.readFileSync(skillPath, 'utf-8')
      const meta = parseSkillMeta(raw, entry.name)
      const [agentType] = relativeDir.split('/')
      const pack = getSkillPack(agentType)
      const loadOrderIndex = pack?.load_order.indexOf(relativeDir) ?? -1
      const legacyEnabled = !pack && getLegacyLoadOrder(agentType).includes(relativeDir)

      entries.push({
        id: relativeDir,
        name: meta.name,
        description: meta.description,
        runtime_enabled: pack ? loadOrderIndex >= 0 : legacyEnabled,
        pack_name: pack?.pack_name || null,
        load_order_index: loadOrderIndex >= 0 ? loadOrderIndex : null,
        agent_type: agentType,
        is_root: relativeDir === agentType,
      })
    }

    scanSkillEntries(fullPath, entries)
  }
}

export function listSkills(): SkillListEntry[] {
  if (!fs.existsSync(SKILLS_DIR)) return []
  const entries: SkillListEntry[] = []
  scanSkillEntries(SKILLS_DIR, entries)
  return entries.sort((a, b) => a.id.localeCompare(b.id))
}

export function listSkillPacks() {
  if (!fs.existsSync(SKILLS_DIR)) return []
  const agentDirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter(entry => entry.isDirectory())
  return agentDirs
    .map(entry => {
      const agentType = entry.name
      const pack = getSkillPack(agentType)
      if (!pack) return null
      const skills = listSkills().filter(skill => skill.agent_type === agentType)
      return {
        ...pack,
        skills,
      }
    })
    .filter(Boolean)
}
