import { Hono } from 'hono'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { success, badRequest } from '../utils/response.js'
import { listSkills, listSkillPacks, getSkillPack, updateSkillPack } from '../agents/skills.js'

const app = new Hono()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SKILLS_DIR = path.resolve(__dirname, '../../../skills')

// GET /skills — List all skills (recursive, supports nested dirs)
app.get('/', async (c) => {
  return success(c, listSkills())
})

// GET /skills/packs — List all skill packs
app.get('/packs', async (c) => {
  return success(c, listSkillPacks())
})

// GET /skills/packs/:agentType — Read one skill pack
app.get('/packs/:agentType', async (c) => {
  const agentType = c.req.param('agentType')
  const pack = getSkillPack(agentType)
  if (!pack) return badRequest(c, 'Skill pack not found')
  return success(c, pack)
})

// PUT /skills/packs/:agentType — Update one skill pack
app.put('/packs/:agentType', async (c) => {
  const agentType = c.req.param('agentType')
  const body = await c.req.json()
  const next = updateSkillPack(agentType, {
    version: body.version,
    pack_name: body.pack_name,
    load_order: body.load_order,
    defaults: body.defaults,
  })
  return success(c, next)
})

// GET /skills/:id — Get skill content
app.get('/*', async (c) => {
  const id = c.req.path.slice('/api/v1/skills/'.length)
  const skillPath = path.join(SKILLS_DIR, id, 'SKILL.md')
  if (!fs.existsSync(skillPath)) return badRequest(c, 'Skill not found')
  const content = fs.readFileSync(skillPath, 'utf-8')
  const [agentType] = id.split('/')
  const pack = getSkillPack(agentType)
  const loadOrderIndex = pack?.load_order.indexOf(id) ?? -1
  return success(c, {
    id,
    content,
    pack_name: pack?.pack_name || null,
    runtime_enabled: pack ? loadOrderIndex >= 0 : id === agentType,
    load_order_index: loadOrderIndex >= 0 ? loadOrderIndex : null,
  })
})

// PUT /skills/:id — Update skill content
app.put('/*', async (c) => {
  const id = c.req.path.slice('/api/v1/skills/'.length)
  const body = await c.req.json()
  const skillDir = path.join(SKILLS_DIR, id)
  const skillPath = path.join(skillDir, 'SKILL.md')
  if (!fs.existsSync(skillDir)) fs.mkdirSync(skillDir, { recursive: true })
  fs.writeFileSync(skillPath, body.content, 'utf-8')
  return success(c)
})

// POST /skills — Create new skill directory
app.post('/', async (c) => {
  const body = await c.req.json()
  const { id, name, description } = body
  if (!id) return badRequest(c, 'Skill id is required')

  const skillDir = path.join(SKILLS_DIR, id)
  if (fs.existsSync(skillDir)) return badRequest(c, 'Skill already exists')

  fs.mkdirSync(skillDir, { recursive: true })
  const content = `---
name: ${name || id}
description: ${description || ''}
---

# ${name || id}

Write your skill content here.
`
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), content, 'utf-8')
  return success(c, { id, name: name || id, description: description || '' })
})

// DELETE /skills/:id — Delete skill directory
app.delete('/*', async (c) => {
  const id = c.req.path.slice('/api/v1/skills/'.length)
  const skillDir = path.join(SKILLS_DIR, id)
  if (!fs.existsSync(skillDir)) return badRequest(c, 'Skill not found')
  fs.rmSync(skillDir, { recursive: true, force: true })
  return success(c)
})

export default app
