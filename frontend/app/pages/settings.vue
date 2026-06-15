<template>
  <div class="settings-page">
    <div class="settings-container">
      <header class="settings-header">
        <div class="settings-header-text">
          <h1 class="settings-page-title">Preferences</h1>
          <p class="settings-desc">Manage API keys, LLM models, agents, and workspace skills.</p>
        </div>
      </header>

      <nav class="settings-tabs">
        <button v-for="t in baseTabs" :key="t.id" :class="['settings-tab', { active: tab === t.id }]" @click="tab = t.id">
          <component :is="t.icon" :size="14" />
          {{ t.label }}
        </button>
        <div class="tab-divider"></div>
        <button v-for="t in advancedTabs" :key="t.id" :class="['settings-tab', { active: tab === t.id }]" @click="tab = t.id">
          <component :is="t.icon" :size="14" />
          {{ t.label }}
        </button>
      </nav>

      <div class="settings-content-body">
        <!-- ===== AI 服务配置 ===== -->
        <div v-if="tab === 'ai'" class="settings-panel fade-in">
          <section class="preferences-section">
            <div class="section-kicker">Quick Setup</div>
            <div class="section-title-row">
              <h2 class="section-title">微境一键推荐配置</h2>
              <button class="btn btn-primary" @click="presetDialog = true">
                <Sparkles :size="14" /> 一键配置
              </button>
            </div>
            <p class="section-desc">一键写入文本、图片、音频三类推荐配置，适合作为开箱默认方案。</p>
            <div class="preset-grid">
              <article v-for="preset in weijingPresetCards" :key="preset.serviceType" class="preset-card">
                <div class="preset-card-top">
                  <span class="preset-service mono-sm">{{ preset.label }}</span>
                  <span class="tag tag-accent">{{ preset.provider }}</span>
                </div>
                <div class="preset-model mono truncate">{{ preset.model }}</div>
                <div class="preset-base mono truncate">{{ preset.baseUrl }}</div>
              </article>
            </div>
          </section>

          <section v-for="st in serviceTypes" :key="st.type" class="preferences-section">
            <div class="section-title-row">
              <h2 class="section-title">{{ st.label }} API</h2>
              <div class="flex items-center gap-2">
                <span v-if="countActive(st.type)" class="tag tag-success">{{ countActive(st.type) }} Active</span>
                <button class="btn btn-icon btn-sm" @click="startAddCfg(st.type)"><Plus :size="14" /></button>
              </div>
            </div>
            <p class="section-desc">{{ serviceMeta[st.type].desc }}</p>

            <div class="config-table">
              <div v-for="c in byType(st.type)" :key="c.id" class="config-row" :class="{ 'is-active': c.is_active }">
                <div class="config-status">
                  <label class="toggle"><input type="checkbox" :checked="c.is_active" @change="toggleCfg(c)"><span /></label>
                </div>
                <div class="config-info">
                  <div class="config-name-group">
                    <span class="config-provider">{{ c.provider }}</span>
                    <span class="config-name">{{ c.name || c.provider + '-' + c.service_type }}</span>
                  </div>
                  <div class="config-endpoints">
                    <span class="config-model mono truncate">{{ fmtModel(c.model) }}</span>
                    <span class="config-base mono truncate">{{ c.base_url || 'N/A' }}</span>
                  </div>
                </div>
                <div class="config-actions">
                  <span :class="['tag', c.api_key ? 'tag-success' : 'tag-error']">{{ c.api_key ? 'Key Set' : 'No Key' }}</span>
                  <button class="btn btn-ghost btn-sm" @click="testExistingCfg(c)">测试</button>
                  <button class="btn btn-icon btn-ghost" @click="startEditCfg(c)"><Pencil :size="13" /></button>
                  <button class="btn btn-icon btn-ghost" @click="delCfg(c.id)"><Trash2 :size="13" /></button>
                </div>
              </div>
              <div v-if="!byType(st.type).length" class="config-empty">No configurations found.</div>
            </div>
          </section>
        </div>

        <!-- ===== Agent 配置 ===== -->
        <div v-else-if="tab === 'agents'" class="settings-panel fade-in">
          <section class="preferences-section">
            <div class="section-title-row"><h2 class="section-title">Agent Configuration</h2></div>
            <p class="section-desc">调整内部 Agent 运行模型、提示词和参数，实时生效。</p>
            <div class="agent-list">
              <div v-for="a in agentDefs" :key="a.type" class="agent-accordion" :class="{'is-open': editingAgent === a.type}">
                <div class="accordion-head" @click="toggleAgentEdit(a.type)">
                  <div class="agent-icon">{{ a.icon }}</div>
                  <div class="agent-identity">
                    <div class="agent-label">{{ a.label }}</div>
                    <div class="agent-type mono-sm">{{ a.type }}</div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span v-if="getAgentCfg(a.type)" class="tag tag-success">Customized</span>
                    <span v-else class="tag">Default</span>
                    <ChevronDown :size="14" class="accordion-arrow" />
                  </div>
                </div>
                <div v-if="editingAgent === a.type" class="accordion-body">
                  <div class="field-grid-2">
                    <label class="field">
                      <span class="field-label">Primary Model</span>
                      <BaseSelect v-model="agentForm.model" :options="textModelSelectOptions" placeholder="Default service model" searchable />
                    </label>
                    <div class="field-row">
                      <label class="field">
                        <span class="field-label">Temperature</span>
                        <input v-model.number="agentForm.temperature" class="input mono" type="number" min="0" max="2" step="0.1" />
                      </label>
                      <label class="field">
                        <span class="field-label">Max Tokens</span>
                        <input v-model.number="agentForm.max_tokens" class="input mono" type="number" min="100" max="32000" />
                      </label>
                    </div>
                  </div>
                  <label class="field">
                    <span class="field-label">System Prompt</span>
                    <textarea v-model="agentForm.system_prompt" class="textarea mono" rows="8" placeholder="Agent directions..." />
                  </label>
                  <div class="accordion-foot">
                    <button class="btn btn-ghost btn-sm" @click="resetAgentPrompt(a.type)">Reset Prompt</button>
                    <div class="flex items-center gap-2">
                      <span v-if="agentSaved === a.type" class="tag tag-success"><Check :size="11" /> Saved</span>
                      <button class="btn btn-primary" :disabled="agentSaving" @click="saveAgentCfg(a.type)">
                        <Loader2 v-if="agentSaving" :size="14" class="animate-spin" /> Save Agent
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- ===== Skills 配置 ===== -->
        <div v-else-if="tab === 'skills'" class="settings-panel fade-in skill-panel-layout">
          <aside class="skill-nav">
            <div class="skill-nav-title mono-sm">Agents</div>
            <button v-for="a in agentDefs" :key="a.type" :class="['skill-nav-btn', { active: selectedAgent === a.type }]" @click="selectAgent(a.type)">
              <span class="agent-icon-sm">{{ a.icon }}</span>
              <span class="skill-nav-label">{{ a.label }}</span>
              <span v-if="agentSkillCount(a.type) > 0" class="skill-badge">{{ agentSkillCount(a.type) }}</span>
            </button>
          </aside>
          <main class="skill-workspace">
            <div class="section-title-row">
              <h2 class="section-title">{{ selectedAgentLabel }} Skills</h2>
              <button class="btn btn-primary btn-sm" @click="startAddSkill"><Plus :size="13" /> New Skill</button>
            </div>
            <p class="section-desc">Manage the skills pack and behaviors assigned to the {{ selectedAgentType }} agent.</p>

            <div v-if="currentPack" class="preferences-section bordered-sec">
              <div class="section-title-row">
                <div class="flex flex-col gap-1">
                  <span class="font-600">{{ currentPack.pack_name }}</span>
                  <span class="mono dim sm">{{ currentPack.agent_type }} · {{ currentPack.load_order?.length || 0 }} loaded</span>
                </div>
                <span class="tag tag-accent">Skill Pack</span>
              </div>
              <div class="pack-order-list">
                <div v-for="s in currentSkills" :key="s.id + '-runtime'" class="pack-order-item">
                  <div class="flex flex-col gap-1">
                    <span class="font-500">{{ s.name }}</span>
                    <span class="mono dim xs">{{ s.id }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span v-if="s.load_order_index !== null" class="tag mono">#{{ s.load_order_index + 1 }}</span>
                    <span :class="['tag', s.runtime_enabled ? 'tag-success' : '']">{{ s.runtime_enabled ? 'Enabled' : 'Disabled' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="agent-list" style="padding:0">
              <div v-for="s in currentSkills" :key="s.id" class="agent-accordion" :class="{'is-open': editingSkill === s.id}">
                <div class="accordion-head" @click.stop="toggleSkillEdit(s.id)">
                  <FileText :size="16" class="color-black" />
                  <div class="agent-identity">
                    <div class="agent-label">{{ s.name }}</div>
                    <div class="agent-type mono-sm">{{ s.description }}</div>
                  </div>
                  <div class="flex items-center gap-3">
                    <button class="btn btn-icon btn-ghost" @click.stop="deleteSkill(s.id)"><Trash2 :size="14" /></button>
                    <ChevronDown :size="14" class="accordion-arrow" />
                  </div>
                </div>
                <div v-if="editingSkill === s.id" class="accordion-body">
                  <textarea v-model="skillContent" class="textarea mono" rows="16" placeholder="Write SKILL.md contents..." />
                  <div class="accordion-foot">
                    <span class="mono dim sm">skills/{{ s.id }}/SKILL.md</span>
                    <div class="flex items-center gap-2">
                       <span v-if="skillSaved === s.id" class="tag tag-success"><Check :size="11" /> Saved</span>
                       <button class="btn btn-primary" :disabled="skillSaving" @click="saveSkill(s.id)">
                         <Loader2 v-if="skillSaving" :size="14" class="animate-spin" /> Save Skill
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <div v-if="cfgDialog" class="overlay" @click.self="cfgDialog = false">
      <form class="modal figma-modal" @submit.prevent="saveCfg">
        <div class="modal-header">
          <div class="modal-identity">
            <span class="mono-label">{{ cfgEditId ? 'Edit Config' : 'New Config' }}</span>
            <h2 class="modal-name">{{ serviceMeta[cfgForm.service_type].label }} Service</h2>
          </div>
        </div>
        <div class="modal-body field-stack">
          <div class="preset-picker">
            <button v-for="preset in presetsByType(cfgForm.service_type)" :key="cfgForm.service_type + '-' + preset.provider" type="button" class="preset-pill" @click="applyProviderPreset(cfgForm.service_type, preset.provider)">
              {{ preset.label }}
            </button>
          </div>
          <div class="field-grid-2">
            <label class="field"><span class="field-label">配置名称</span><input v-model="cfgForm.name" class="input" placeholder="Name" /></label>
            <label class="field"><span class="field-label">服务商</span><BaseSelect v-model="cfgForm.provider" :options="providerSelectOptions" placeholder="Provider" searchable /></label>
          </div>
          <label class="field"><span class="field-label">API Key</span><input v-model="cfgForm.api_key" class="input" type="password" placeholder="sk-..." /></label>
          <label class="field"><span class="field-label">Base URL</span><input v-model="cfgForm.base_url" class="input mono" placeholder="https://..." /></label>
          <div class="endpoint-hint mono sm"><span class="dim">Calculated: </span>{{ endpointHint }}</div>
          <label class="field"><span class="field-label">Models (Csv)</span><input v-model="cfgForm.modelStr" class="input mono" placeholder="model, model-2" /></label>
          <label class="field"><span class="field-label">Priority Ratio</span><input v-model.number="cfgForm.priority" class="input" type="number" min="0" max="999" /></label>
          <div v-if="cfgTestResult" class="test-result" :class="{ ok: cfgTestResult.reachable, bad: !cfgTestResult.reachable }">
            <div class="flex items-center gap-2 mb-2">
               <span class="tag" :class="cfgTestResult.reachable ? 'tag-success' : 'tag-error'">STATUS</span>
               <span class="text-sm">{{ cfgTestResult.message }}</span>
            </div>
            <div class="mono xs dim">{{ cfgTestResult.method }} {{ cfgTestResult.url }}</div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-ghost" :disabled="cfgTesting" @click="testDraftCfg">
             <Loader2 v-if="cfgTesting" :size="14" class="animate-spin" /> Test Ping
          </button>
          <div class="flex gap-2">
            <button type="button" class="btn btn-white" @click="cfgDialog = false">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Configuration</button>
          </div>
        </div>
      </form>
    </div>

    <div v-if="presetDialog" class="overlay" @click.self="presetDialog = false">
      <form class="modal figma-modal" @submit.prevent="applyWeijingPreset">
        <div class="modal-header">
          <div class="modal-identity">
            <span class="mono-label">Automated Setup</span>
            <h2 class="modal-name">Weijing Template</h2>
          </div>
        </div>
        <div class="modal-body field-stack">
          <label class="field">
            <span class="field-label">Weijing API Key</span>
            <input v-model="weijingForm.apiKey" class="input" type="password" placeholder="For all unified services" />
          </label>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-white" @click="presetDialog = false">Cancel</button>
          <button type="submit" class="btn btn-primary">Apply Template</button>
        </div>
      </form>
    </div>

    <div v-if="addSkillDialog" class="overlay" @click.self="addSkillDialog = false">
      <form class="modal figma-modal" @submit.prevent="confirmAddSkill">
        <div class="modal-header">
           <h2 class="modal-name">New Skill</h2>
        </div>
        <div class="modal-body field-stack">
          <label class="field"><span class="field-label">Skill ID</span><input v-model="newSkillForm.id" class="input mono" placeholder="e.g. system-prompt" /></label>
          <label class="field"><span class="field-label">Name</span><input v-model="newSkillForm.name" class="input" placeholder="Display name" /></label>
          <label class="field"><span class="field-label">Description</span><input v-model="newSkillForm.description" class="input" placeholder="Short intro" /></label>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-white" @click="addSkillDialog = false">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="!newSkillForm.id">Create</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive, onMounted } from 'vue'
import { Plus, Pencil, Trash2, FileText, ChevronDown, Check, Loader2, Bot, Cpu, Sparkles } from 'lucide-vue-next'
import BaseSelect from '~/components/BaseSelect.vue'
import { toast } from 'vue-sonner'
import { aiConfigAPI, agentConfigAPI, skillsAPI } from '~/composables/useApi'

const tab = ref('ai')
const showAdvanced = ref(false)
const baseTabs = [
  { id: 'ai', label: 'AI 服务', icon: Cpu },
]
const advancedTabs = [
  { id: 'agents', label: 'Agent 配置', icon: Bot },
  { id: 'skills', label: 'Skills', icon: FileText },
]
watch(showAdvanced, (v) => {
  if (!v && tab.value !== 'ai') tab.value = 'ai'
})

// ===== AI Service Configs =====
const cfgs = ref([])
const cfgDialog = ref(false)
const cfgEditId = ref(null)
const presetDialog = ref(false)
const cfgTesting = ref(false)
const cfgTestResult = ref(null)
const cfgForm = reactive({ name: '', provider: '', api_key: '', base_url: '', modelStr: '', service_type: 'text', priority: 0 })
const weijingForm = reactive({ apiKey: '' })
const serviceTypes = [{ type: 'text', label: '文本' }, { type: 'image', label: '图片' }, { type: 'audio', label: '音频' }]
const providers = ['ali', 'chatfire', 'gemini', 'minimax', 'openai', 'openrouter', 'vidu', 'volcengine']
const providerSelectOptions = computed(() => providers.map(p => ({ label: p, value: p })))
const serviceMeta = {
  text: { label: '文本', desc: '剧本改写、角色场景提取、分镜拆解等 Agent 文本能力' },
  image: { label: '图片', desc: '角色图、场景图、镜头图与首尾帧等静态图像生成' },
  audio: { label: '音频', desc: '角色试听、旁白与对白语音生成' },
}
const providerPresets = {
  text: {
    chatfire: { label: 'ChatFire 推荐', baseUrl: 'https://api.chatfire.site', models: ['gemini-3-pro-preview'] },
    openrouter: { label: 'OpenRouter 推荐', baseUrl: 'https://openrouter.ai/api', models: ['google/gemini-3-flash-preview'] },
    openai: { label: 'OpenAI 推荐', baseUrl: 'https://api.openai.com', models: ['gpt-4.1-mini'] },
  },
  image: {
    chatfire: { label: 'ChatFire 推荐', baseUrl: 'https://api.chatfire.site', models: ['doubao-seedream-4-5-251128'] },
    gemini: { label: 'Gemini 推荐', baseUrl: 'https://api.chatfire.site', models: ['gemini-3-pro-image-preview'] },
    volcengine: { label: '火山推荐', baseUrl: 'https://ark.cn-beijing.volces.com', models: ['doubao-seedream-4-0-250828'] },
  },
  audio: {
    minimax: { label: '微境音频', baseUrl: 'https://api.chatfire.site/minimax', models: ['speech-2.8-hd'] },
  },
}
const weijingPresetCards = [
  { serviceType: 'text', label: '文本', provider: 'chatfire', baseUrl: 'https://api.chatfire.site', model: 'gemini-3-pro-preview', priority: 100 },
  { serviceType: 'image', label: '图片', provider: 'gemini', baseUrl: 'https://api.chatfire.site', model: 'gemini-3-pro-image-preview', priority: 99 },
  { serviceType: 'audio', label: '音频', provider: 'minimax', baseUrl: 'https://api.chatfire.site/minimax', model: 'speech-2.8-hd', priority: 97 },
]
const endpointPrefixes = {
  chatfire: '/v1',
  openai: '/v1',
  openrouter: '/v1',
  minimax: '/v1',
  gemini: '/v1beta',
  volcengine: '/api/v3',
  ali: '/api/v1',
  vidu: '/ent/v2',
}

const endpointHint = computed(() => {
  const provider = cfgForm.provider
  const base = cfgForm.base_url || 'https://...'
  const prefix = endpointPrefixes[provider] || ''
  if (!provider) return '选择服务商后显示推荐端点前缀'
  return `${base}${prefix}`
})

function byType(t) { return cfgs.value.filter(c => c.service_type === t) }
function countActive(t) { return byType(t).filter(c => c.is_active).length }
function fmtModel(m) { return Array.isArray(m) ? m.join(', ') : m || '—' }
function presetsByType(type) {
  const group = providerPresets[type] || {}
  return Object.entries(group).map(([provider, preset]) => ({ provider, ...preset }))
}
function applyProviderPreset(type, provider) {
  const preset = providerPresets[type]?.[provider]
  if (!preset) return
  cfgForm.provider = provider
  cfgForm.base_url = preset.baseUrl
  cfgForm.modelStr = preset.models.join(', ')
  cfgForm.name = `${preset.label}-${serviceMeta[type].label}`
}

async function loadCfgs() { try { cfgs.value = await aiConfigAPI.list() } catch (e) { toast.error(e.message) } }
async function toggleCfg(c) { await aiConfigAPI.update(c.id, { is_active: !c.is_active }); loadCfgs() }
async function delCfg(id) { await aiConfigAPI.del(id); toast.success('已删除'); loadCfgs() }
function startAddCfg(t) {
  cfgEditId.value = null
  cfgTestResult.value = null
  Object.assign(cfgForm, { name: '', provider: '', api_key: '', base_url: '', modelStr: '', service_type: t, priority: 0 })
  const firstPreset = presetsByType(t)[0]
  if (firstPreset) applyProviderPreset(t, firstPreset.provider)
  cfgDialog.value = true
}
function startEditCfg(c) {
  cfgEditId.value = c.id
  cfgTestResult.value = null
  Object.assign(cfgForm, {
    name: c.name || '',
    provider: c.provider,
    api_key: c.api_key || '',
    base_url: c.base_url || '',
    modelStr: fmtModel(c.model),
    service_type: c.service_type,
    priority: c.priority ?? 0,
  })
  cfgDialog.value = true
}
async function testCfgPayload(payload) {
  cfgTesting.value = true
  try {
    cfgTestResult.value = await aiConfigAPI.test(payload)
    if (cfgTestResult.value.reachable) toast.success('端点已响应')
    else toast.warning('端点未通过测试')
  } catch (e) {
    toast.error(e.message)
  } finally {
    cfgTesting.value = false
  }
}
async function testDraftCfg() {
  await testCfgPayload({
    service_type: cfgForm.service_type,
    provider: cfgForm.provider,
    api_key: cfgForm.api_key,
    base_url: cfgForm.base_url,
    model: cfgForm.modelStr.split(',').map(s => s.trim()).filter(Boolean),
  })
}
async function testExistingCfg(c) {
  startEditCfg(c)
  await testCfgPayload({
    service_type: c.service_type,
    provider: c.provider,
    api_key: c.api_key || '',
    base_url: c.base_url || '',
    model: Array.isArray(c.model) ? c.model : [],
  })
}
async function saveCfg() {
  if (!cfgForm.provider) { toast.warning('选择服务商'); return }
  const models = cfgForm.modelStr.split(',').map(s => s.trim()).filter(Boolean)
  try {
    if (cfgEditId.value) await aiConfigAPI.update(cfgEditId.value, { name: cfgForm.name, provider: cfgForm.provider, api_key: cfgForm.api_key, base_url: cfgForm.base_url, model: models, priority: cfgForm.priority })
    else await aiConfigAPI.create({ service_type: cfgForm.service_type, provider: cfgForm.provider, name: cfgForm.name || `${cfgForm.provider}-${cfgForm.service_type}`, api_key: cfgForm.api_key, base_url: cfgForm.base_url, model: models, priority: cfgForm.priority })
    cfgDialog.value = false; toast.success('已保存'); loadCfgs()
  } catch (e) { toast.error(e.message) }
}
async function applyWeijingPreset() {
  if (!weijingForm.apiKey) {
    toast.warning('请填写 Weijing API Key')
    return
  }
  try {
    await aiConfigAPI.weijingPreset(weijingForm.apiKey)
    await loadCfgs()
    await loadAgents()
    presetDialog.value = false
    toast.success('微境推荐配置与默认 Agent LLM 已写入')
  } catch (e) {
    toast.error(e.message)
  }
}

// ===== Agent Configs =====
const agentCfgs = ref([])
const editingAgent = ref(null)
const agentSaving = ref(false)
const agentSaved = ref(null)
const agentForm = reactive({ model: '', temperature: 0.7, max_tokens: 4096, system_prompt: '' })

const agentDefs = [
  { type: 'script_rewriter', label: '剧本改写', icon: '📝' },
  { type: 'extractor', label: '角色场景提取', icon: '🔍' },
  { type: 'storyboard_breaker', label: '分镜拆解', icon: '🎬' },
  { type: 'voice_assigner', label: '音色分配', icon: '🎙' },
  { type: 'grid_prompt_generator', label: '图片提示词生成', icon: '🖼' },
  { type: 'creative_interviewer', label: '创作访谈', icon: '💡' },
]

const defaultPrompts = {
  script_rewriter: `你是专业编剧，擅长将小说改编为短剧剧本。

工作流程：
1. 调用 read_episode_script 读取原始内容
2. 根据读取到的内容，自己进行改写（输出格式化剧本格式）
3. 调用 save_script 保存改写后的完整剧本

格式化剧本格式：
- 场景头：## S编号 | 内景/外景 · 地点 | 时间段
- 动作描写：自然段落，不包含镜头语言
- 对白：角色名：（状态/表情）台词内容
- 每个场景 30-60 秒内容`,
  extractor: `你是制片助理，擅长从剧本中提取角色和场景信息，并在提取时与项目已有数据进行智能去重。

工作流程：
1. 调用 read_script_for_extraction 读取格式化剧本
2. 调用 read_existing_characters 读取项目中已存在的角色列表（用于去重）
3. 调用 read_existing_scenes 读取项目中已存在的场景列表（用于去重）
4. 分析剧本内容，提取所有角色信息
5. 对每个角色：若同名已存在则合并更新，若不存在则新增
6. 调用 save_dedup_characters 保存角色（去重合并，自动处理新增和更新）
7. 分析剧本内容，提取所有场景信息
8. 对每个场景：若同地点+时间段已存在则复用，若不存在则新增
9. 调用 save_dedup_scenes 保存场景（去重合并，自动处理新增和复用）

去重规则：
- 角色：按名字精确匹配，同名保留现有（合并信息）
- 场景：按【地点+时间段】精确匹配；同地点不同时段视为新场景

提取要求：
- 角色要包含完整的外貌特征描述（发型、服装、体态等）
- 场景要包含光线、色调、氛围等视觉信息
- 不要遗漏任何有台词或重要动作的角色`,
  storyboard_breaker: `你是资深影视分镜师，擅长将剧本拆解为分镜方案。

工作流程：
1. 调用 read_storyboard_context 读取剧本、角色列表、场景列表
2. 将剧本拆解为镜头序列（每个镜头 10-15 秒）
3. 为每个镜头生成图片提示词（image_prompt）
4. 调用 save_storyboards 保存所有分镜`,
  voice_assigner: `你是配音导演，擅长为角色选择合适的音色。

工作流程：
1. 调用 list_voices 获取可用音色列表
2. 调用 get_characters 获取所有角色信息
3. 根据每个角色的性别、性格、年龄、角色定位，选择最匹配的音色
4. 对每个角色调用 assign_voice 分配音色，并说明选择理由

注意：每个角色都必须分配音色，不要遗漏。`,
  grid_prompt_generator: `你是专业的 AI 图像提示词工程师，擅长为角色、场景和宫格图生成高质量的英文提示词。

你将收到用户的请求，告知要生成哪种类型的提示词：
- "角色" → 生成角色图片提示词
- "场景" → 生成场景图片提示词
- "宫格" → 生成宫格图提示词

## 角色图片提示词

工作流程：
1. 调用 read_characters 读取所有角色信息
2. 根据角色外貌特征（appearance）、性格（personality）、定位（role）生成英文提示词
3. 提示词结构：[外貌描述]，[性格/气质]，[角色定位]，[电影感]，[高质量]，[无文字水印]

## 场景图片提示词

工作流程：
1. 调用 read_scenes 读取所有场景信息
2. 根据场景地点（location）、时间段（time）、已有描述（prompt）生成英文提示词
3. 提示词结构：[地点]，[时间/光线/氛围]，[已有描述]，[电影感场景]，[高质量]，[无文字水印]

## 宫格图提示词（参考 skills/grid-image-generator/SKILL.md）

工作流程：
1. 调用 read_shots_for_grid 读取选中镜头的详细信息
2. 根据 mode 调用 generate_grid_prompt：
   - first_frame 模式：每格=一个镜头的首帧，NxN 风格统一
   - first_last 模式：每个镜头占2格（左首右尾），同一行风格连续
   - multi_ref 模式：所有格子都是同一镜头的不同参考角度
3. 返回 grid_prompt（整体提示词）和 cell_prompts（每格提示词）

提示词规范：
- 使用英文提示词
- 必须包含 "consistent art style" 保持风格统一
- 必须包含 "cinematic quality"
- 避免出现文字或水印`,
  creative_interviewer: `你是微境剧场的创作访谈师，擅长通过多轮反问帮助新手用户确定整剧或单集创作方向。

工作原则：
1. 一次只问一个最关键的问题
2. 优先锁定题材、受众、卖点和人物关系
3. 随对话持续沉淀创作简报、人物设定、世界观和大纲
4. 信息足够时再进入定稿，不要草率结束`,
}

function getAgentCfg(type) {
  return agentCfgs.value.find(a => a.agent_type === type)
}

const textModelGroups = computed(() => {
  return cfgs.value
    .filter(c => c.service_type === 'text' && c.is_active && c.api_key)
    .map(c => ({
      label: `${c.provider} — ${c.name}`,
      models: Array.isArray(c.model) ? c.model : (c.model ? [c.model] : []),
    }))
    .filter(g => g.models.length > 0)
})

const textModelSelectOptions = computed(() =>
  textModelGroups.value.map(g => ({
    label: g.label,
    options: g.models.map(m => ({ label: m, value: m })),
  }))
)

async function loadAgents() {
  try { agentCfgs.value = await agentConfigAPI.list() }
  catch (e) { toast.error(e.message) }
}

function toggleAgentEdit(type) {
  if (editingAgent.value === type) { editingAgent.value = null; return }
  const cfg = getAgentCfg(type)
  agentForm.model = cfg?.model || ''
  agentForm.temperature = cfg?.temperature ?? 0.7
  agentForm.max_tokens = cfg?.max_tokens ?? 4096
  agentForm.system_prompt = cfg?.system_prompt || defaultPrompts[type] || ''
  agentSaved.value = null
  editingAgent.value = type
}

function resetAgentPrompt(type) {
  agentForm.system_prompt = defaultPrompts[type] || ''
  toast.info('已恢复默认提示词，点击保存生效')
}

async function saveAgentCfg(type) {
  agentSaving.value = true
  agentSaved.value = null
  try {
    const existing = getAgentCfg(type)
    const data = {
      agent_type: type,
      name: agentDefs.find(a => a.type === type)?.label || type,
      model: agentForm.model,
      temperature: agentForm.temperature,
      max_tokens: agentForm.max_tokens,
      system_prompt: agentForm.system_prompt,
    }
    if (existing) {
      await agentConfigAPI.update(existing.id, data)
    } else {
      await agentConfigAPI.create(data)
    }
    await loadAgents()
    agentSaved.value = type
    toast.success(`${agentDefs.find(a => a.type === type)?.label} 配置已保存`)
    setTimeout(() => { if (agentSaved.value === type) agentSaved.value = null }, 3000)
  } catch (e) {
    toast.error(e.message)
  } finally {
    agentSaving.value = false
  }
}

// ===== Skills =====
const selectedAgent = ref('script_rewriter')
const allSkills = ref([])   // { id, name, description, runtime_enabled, load_order_index }[]
const skillPacks = ref([])
const editingSkill = ref(null)
const skillContent = ref('')
const skillSaving = ref(false)
const skillSaved = ref(null)
const packSaving = ref(false)
const addSkillDialog = ref(false)
const newSkillForm = reactive({ id: '', name: '', description: '' })
const packForm = reactive({
  question_depth: 'deep',
  output_template: 'brief-outline-script',
  default_enabled_skills: [],
})

const selectedAgentType = computed(() => selectedAgent.value)
const selectedAgentLabel = computed(() => agentDefs.find(a => a.type === selectedAgent.value)?.label || '')
const selectedAgentIcon = computed(() => agentDefs.find(a => a.type === selectedAgent.value)?.icon || '')
const currentPack = computed(() => skillPacks.value.find(p => p.agent_type === selectedAgent.value) || null)

function agentSkillCount(type) {
  return allSkills.value.filter(s => s.id === type || s.id.startsWith(type + '/')).length
}

const currentSkills = computed(() =>
  allSkills.value
    .filter(s => s.id === selectedAgent.value || s.id.startsWith(selectedAgent.value + '/'))
    .sort((a, b) => {
      const ai = a.load_order_index ?? Number.MAX_SAFE_INTEGER
      const bi = b.load_order_index ?? Number.MAX_SAFE_INTEGER
      if (ai !== bi) return ai - bi
      return a.id.localeCompare(b.id)
    })
)

async function loadAllSkills() {
  try { allSkills.value = await skillsAPI.list() }
  catch (e) { toast.error(e.message) }
}

async function loadSkillPacks() {
  try { skillPacks.value = await skillsAPI.listPacks() }
  catch (e) { toast.error(e.message) }
}

function syncPackForm() {
  const defaults = currentPack.value?.defaults || {}
  packForm.question_depth = defaults.question_depth || 'deep'
  packForm.output_template = defaults.output_template || 'brief-outline-script'
  packForm.default_enabled_skills = Array.isArray(defaults.default_enabled_skills)
    ? [...defaults.default_enabled_skills]
    : []
}

async function selectAgent(type) {
  selectedAgent.value = type
  editingSkill.value = null
  syncPackForm()
}

function startAddSkill() {
  newSkillForm.id = ''
  newSkillForm.name = ''
  newSkillForm.description = ''
  addSkillDialog.value = true
}

async function confirmAddSkill() {
  if (!newSkillForm.id) return
  const skillId = `${selectedAgent.value}/${newSkillForm.id}`
  try {
    await skillsAPI.create({ id: skillId, name: newSkillForm.name, description: newSkillForm.description })
    addSkillDialog.value = false
    await loadAllSkills()
    await loadSkillPacks()
    toast.success('Skill 创建成功')
  } catch (e) {
    toast.error(e.message)
  }
}

async function deleteSkill(id) {
  if (!confirm(`确定删除 Skill「${id}」？`)) return
  try {
    await skillsAPI.del(id)
    if (editingSkill.value === id) editingSkill.value = null
    await loadAllSkills()
    await loadSkillPacks()
    toast.success('已删除')
  } catch (e) {
    toast.error(e.message)
  }
}

async function toggleSkillEdit(id) {
  if (editingSkill.value === id) { editingSkill.value = null; return }
  try {
    const res = await skillsAPI.get(id)
    skillContent.value = res.content
    skillSaved.value = null
    editingSkill.value = id
  } catch (e) { toast.error(e.message) }
}

async function saveSkill(id) {
  skillSaving.value = true
  skillSaved.value = null
  try {
    await skillsAPI.update(id, skillContent.value)
    await loadAllSkills()
    await loadSkillPacks()
    skillSaved.value = id
    toast.success(`已保存`)
    setTimeout(() => { if (skillSaved.value === id) skillSaved.value = null }, 3000)
  } catch (e) {
    toast.error(e.message)
  } finally {
    skillSaving.value = false
  }
}

function toggleDefaultSkill(id, checked) {
  const next = new Set(packForm.default_enabled_skills)
  if (checked) next.add(id)
  else next.delete(id)
  packForm.default_enabled_skills = [...next]
}

function onToggleDefaultSkill(id, event) {
  toggleDefaultSkill(id, !!event?.target?.checked)
}

async function savePackDefaults() {
  if (!currentPack.value) return
  packSaving.value = true
  try {
    await skillsAPI.updatePack(selectedAgent.value, {
      defaults: {
        ...(currentPack.value.defaults || {}),
        question_depth: packForm.question_depth,
        output_template: packForm.output_template,
        default_enabled_skills: packForm.default_enabled_skills,
      },
    })
    await loadSkillPacks()
    syncPackForm()
    toast.success('Skill Pack 默认配置已保存')
  } catch (e) {
    toast.error(e.message)
  } finally {
    packSaving.value = false
  }
}

watch(currentPack, () => syncPackForm(), { immediate: true })

onMounted(() => { loadCfgs(); loadAgents(); loadAllSkills(); loadSkillPacks() })

</script>

<style scoped>
.settings-page {
  position: relative; height: 100vh; width: 100vw; background: linear-gradient(135deg, #00ff66, #eaff00, #9d00ff, #ff00d4);
  display: flex; justify-content: center; align-items: flex-start; overflow-y: auto; padding: 4vh 4vw;
}
.settings-container {
  width: 100%; max-width: 820px; background: #ffffff; border-radius: var(--radius-lg);
  display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.15); min-height: 80vh;
}
.settings-header { padding: 32px 40px; display: flex; align-items: center; gap: 20px; border-bottom: 1px solid var(--border); }
.settings-brand-mark {
  width: 56px; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
  background: var(--black); box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.settings-brand-logo { width: 32px; height: 32px; filter: invert(1); }
.settings-brand-fallback { font-family: var(--font-sans); color: var(--white); font-weight: 700; font-size: 24px; }
.settings-page-title { font-size: 28px; font-weight: 600; letter-spacing: -0.96px; }
.settings-desc { font-size: 14px; color: var(--text-2); margin-top: 4px; }
.settings-tabs { display: flex; align-items: center; padding: 12px 40px; border-bottom: 1px solid var(--border); background: #ffffff; gap: 12px; }
.settings-tab {
  display: flex; align-items: center; gap: 8px; padding: 6px 16px; border-radius: var(--radius-pill); font-size: 14px;
  font-weight: 500; color: var(--text-2); background: transparent; border: none; cursor: pointer; transition: all 0.2s;
}
.settings-tab:hover { color: var(--black); background: var(--bg-3); }
.settings-tab.active { background: var(--black); color: var(--white); }
.settings-tab:focus-visible { outline: dashed 2px var(--black); outline-offset: 2px; }
.tab-divider { width: 1px; height: 16px; background: var(--border-strong); margin: 0 4px; }
.settings-content-body { padding: 40px; flex: 1; }
.preferences-section { display: flex; flex-direction: column; gap: 12px; margin-bottom: 40px; }
.bordered-sec { padding: 24px; border: 1px solid var(--border); border-radius: var(--radius-md); margin-bottom: 24px; }
.section-kicker { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.8px; text-transform: uppercase; color: var(--text-3); margin-bottom: -4px; }
.section-title-row { display: flex; align-items: center; justify-content: space-between; }
.section-title { font-size: 18px; font-weight: 600; letter-spacing: -0.14px; }
.section-desc { font-size: 14px; color: var(--text-2); max-width: 600px; }
.preset-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
.preset-card { border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; gap: 8px; transition: 0.2s; }
.preset-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm); border-color: var(--black); }
.preset-card-top { display: flex; justify-content: space-between; align-items: center; }
.config-table { border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; margin-top: 12px; }
.config-row { display: flex; align-items: center; gap: 16px; padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--white); transition: all 0.2s; }
.config-row:last-child { border-bottom: none; }
.config-row:hover { background: var(--bg-hover); }
.config-row.is-active { background: rgba(0, 0, 0, 0.02); }
.config-info { flex: 1; min-width: 0; }
.config-name-group { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.config-provider { font-weight: 600; font-size: 14px; }
.config-name { color: var(--text-2); font-size: 13px; }
.config-endpoints { display: flex; gap: 12px; font-size: 12px; color: var(--text-3); }
.config-actions { display: flex; align-items: center; gap: 8px; }
.config-empty { padding: 40px; text-align: center; color: var(--text-3); font-size: 14px; display: flex; flex-direction: column; align-items: center;}
.agent-list { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; margin-top: 12px; }
.agent-accordion { border-bottom: 1px solid var(--border); }
.agent-accordion:last-child { border-bottom: none; }
.accordion-head { display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: var(--white); cursor: pointer; transition: background 0.2s; }
.accordion-head:hover { background: var(--bg-hover); }
.agent-accordion.is-open .accordion-head { background: var(--bg-hover); }
.agent-icon { width: 40px; height: 40px; border-radius: var(--radius-md); background: rgba(0, 0, 0, 0.04); display: flex; align-items: center; justify-content: center; font-size: 18px; }
.agent-icon-sm { width: 24px; height: 24px; border-radius: 4px; background: rgba(0, 0, 0, 0.04); display: flex; align-items: center; justify-content: center; font-size: 12px; }
.agent-identity { flex: 1; }
.agent-label { font-size: 15px; font-weight: 600; }
.agent-type { color: var(--text-3); margin-top: 2px; }
.accordion-arrow { transition: transform 0.2s; }
.agent-accordion.is-open .accordion-arrow { transform: rotate(180deg); }
.accordion-body { padding: 20px; background: #ffffff; display: flex; flex-direction: column; gap: 16px; border-top: 1px solid var(--border); }
.accordion-foot { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; }
.skill-panel-layout { display: flex; margin: -40px; height: calc(100% + 80px); }
.skill-nav { width: 220px; border-right: 1px solid var(--border); background: #ffffff; display: flex; flex-direction: column; padding: 20px 10px; gap: 8px; }
.skill-nav-title { padding-left: 10px; color: var(--text-3); margin-bottom: 8px; }
.skill-nav-btn { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: var(--radius-md); cursor: pointer; border: none; background: transparent; transition: 0.15s; font-size: 13px; font-weight: 500; }
.skill-nav-btn:hover { background: var(--bg-3); }
.skill-nav-btn.active { background: var(--black); color: var(--white); }
.skill-workspace { padding: 40px; flex: 1; overflow-y: auto; }
.pack-order-list { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
.pack-order-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border: 1px solid var(--border); border-radius: var(--radius-md); background: #ffffff; }
.figma-modal { border: 1px solid var(--border-strong); min-width: 480px; padding: 0; gap: 0; border-radius: var(--radius-lg); overflow: hidden; }
.modal-header { background: var(--black); color: var(--white); padding: 24px 32px; display: flex; justify-content: space-between; }
.modal-identity { display: flex; flex-direction: column; gap: 6px; }
.modal-name { font-size: 24px; color: var(--white); font-weight: 600; letter-spacing: -0.6px; }
.modal-body { padding: 32px; display: flex; flex-direction: column; gap: 20px; background: #ffffff; }
.modal-footer { padding: 24px 32px; background: var(--white); border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
.mono-sm { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.4px; text-transform: uppercase; color: var(--text-3); }
.xs { font-size: 10px; }
.sm { font-size: 12px; }
.font-500 { font-weight: 500; }
.font-600 { font-weight: 600; }
.field-stack { display: flex; flex-direction: column; gap: 16px; }
.field-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.border-dashed { border: dashed 2px var(--border); }
.mb-2 { margin-bottom: 8px; }
.color-black { color: var(--black); }
.fade-in { animation: fadeIn 0.25s var(--ease-out); }

/* Force monochrome overrides for generic buttons globally applied to settings page */
:deep(.btn) { border-radius: 50px !important; }
:deep(.btn:focus-visible) { outline: dashed 2px #000000 !important; outline-offset: 2px; }
:deep(.btn-primary) { background: #000000 !important; color: #ffffff !important; border: none !important; }
:deep(.btn-ghost), :deep(.btn-white) { border: 1px solid #e5e5e5; color: #000000 !important; background: transparent !important; }

/* Force tags to monochrome */
:deep(.tag) { background: rgba(0,0,0,0.06) !important; color: #000000 !important; font-family: var(--font-mono); border: none !important; }
:deep(.tag-success), :deep(.tag-error), :deep(.tag-accent) { background: rgba(0,0,0,0.06) !important; color: #000000 !important; border: none !important; }
:deep(.test-result.ok) { background: rgba(0,0,0,0.04); border: 1px solid #000000; }
:deep(.test-result.bad) { background: #000000; color: #ffffff; border: 1px solid #000000; }
</style>