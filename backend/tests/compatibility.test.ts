import test from 'node:test'
import assert from 'node:assert/strict'
import { Agent } from '@mastra/core/agent'
import { createOpenAI } from '@ai-sdk/openai'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import Database from 'better-sqlite3'
import sharp from 'sharp'

test('升级后 Agent 仍可解析现有 OpenAI 聊天模型响应', async () => {
  let requests = 0
  const provider = createOpenAI({ apiKey: 'local-test-only', fetch: async (_url, options) => {
    const body = JSON.parse(String(options?.body))
    assert.equal(body.model, '测试模型')
    requests++
    return new Response(JSON.stringify({ id: '测试', object: 'chat.completion', created: 1, model: '测试模型', choices: [{ index: 0, message: { role: 'assistant', content: '兼容检查通过' }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }), { headers: { 'Content-Type': 'application/json' } })
  } })
  const agent = new Agent({ id: 'compatibility-test', name: '兼容测试', instructions: '测试', model: provider.chat('测试模型') })
  const result = await agent.generate([{ role: 'user', content: '检查' }], { maxSteps: 3 })
  assert.equal(result.text, '兼容检查通过')
  assert.equal(requests, 1)
})

test('数据库与图像原生模块保留基本读写行为', async () => {
  const db = new Database(':memory:')
  db.exec('CREATE TABLE item (name TEXT NOT NULL)')
  db.prepare('INSERT INTO item VALUES (?)').run('中文内容')
  assert.deepEqual(db.prepare('SELECT name FROM item').get(), { name: '中文内容' })
  db.close()
  const image = await sharp({ create: { width: 4, height: 4, channels: 3, background: 'red' } }).resize(2, 2).png().toBuffer()
  assert.equal((await sharp(image).metadata()).width, 2)
})

test('Hono 路由与明确的跨域白名单正常工作', async () => {
  const app = new Hono()
  app.use('*', cors({ origin: ['http://localhost:3013'], credentials: true }))
  app.get('/health', c => c.json({ status: 'ok' }))
  const good = await app.request('/health', { headers: { Origin: 'http://localhost:3013' } })
  assert.equal(good.status, 200)
  assert.equal(good.headers.get('Access-Control-Allow-Origin'), 'http://localhost:3013')
  const bad = await app.request('/health', { headers: { Origin: 'https://example.invalid' } })
  assert.equal(bad.headers.get('Access-Control-Allow-Origin'), null)
})
