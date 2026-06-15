<template>
  <div class="page" v-if="drama">
    <!-- Header -->
    <div class="page-head">
      <div class="head-left">
        <button class="back-btn" @click="navigateTo('/')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          返回
        </button>
        <div class="head-info">
          <h1 class="page-title">{{ drama.title }}</h1>
          <div class="page-meta">
            <span v-if="drama.style" class="style-chip">{{ drama.style }}</span>
            <span v-if="drama.style" class="meta-divider"></span>
            <span class="meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              {{ drama.characters?.length || 0 }} 角色
            </span>
            <span class="meta-divider"></span>
            <span class="meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
              {{ drama.scenes?.length || 0 }} 场景
            </span>
          </div>
        </div>
      </div>
      <div class="head-actions">
        <button class="btn" @click="creativeDialog = true">创作访谈</button>
        <button class="btn btn-primary" @click="openAddEpisode">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          添加集
        </button>
      </div>
    </div>

    <div class="creative-status card">
      <div class="creative-status-copy">
        <div class="creative-status-title">整剧创作状态</div>
        <div class="creative-status-desc">先通过访谈锁定创作简报、人物设定和分集大纲，再把结果分发到各集。</div>
      </div>
      <div class="creative-status-grid">
        <div class="status-chip" :class="{ done: creativeSummary.hasBrief }">创作简报</div>
        <div class="status-chip" :class="{ done: creativeSummary.hasCharacters }">人物设定</div>
        <div class="status-chip" :class="{ done: creativeSummary.hasWorld }">世界观</div>
        <div class="status-chip" :class="{ done: creativeSummary.hasOutlines }">分集大纲</div>
      </div>
    </div>

    <!-- Episode List -->
    <div class="section-label">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <rect x="2" y="2" width="20" height="20" rx="2.5"/>
        <line x1="7" y1="8" x2="7" y2="16"/>
        <line x1="10" y1="8" x2="10" y2="16"/>
        <line x1="13" y1="8" x2="13" y2="16"/>
        <line x1="16" y1="8" x2="16" y2="16"/>
      </svg>
      剧集列表
    </div>

    <div class="ep-grid">
      <div
        v-for="(ep, i) in drama.episodes"
        :key="ep.id"
        class="card ep-card"
        :style="{ animationDelay: `${i * 0.05}s` }"
        @click="navigateTo(`/drama/${drama.id}/episode/${ep.episode_number || ep.episodeNumber}`)"
      >
        <div class="ep-number">E{{ String(ep.episode_number || ep.episodeNumber).padStart(2, '0') }}</div>
        <div class="ep-body">
          <span class="ep-title">{{ ep.title }}</span>
          <div class="ep-status">
            <span :class="['status-dot', hasScript(ep) ? 'dot-ready' : 'dot-pending']"></span>
            <span class="status-text">{{ hasScript(ep) ? '已完成剧本' : '待编写' }}</span>
            <span v-if="ep.duration" class="ep-duration">{{ ep.duration }}s</span>
          </div>
        </div>
        <div class="ep-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      </div>

      <!-- Empty episode state -->
      <div v-if="!drama.episodes?.length" class="card ep-empty">
        <div class="ep-empty-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
        </div>
        <p>点击上方「添加集」创建第一集</p>
      </div>
    </div>

    <div v-if="addDialog" class="dialog-mask" @click.self="addDialog = false">
      <div class="card dialog">
        <div class="dialog-head">
          <div class="dialog-head-copy">
            <div class="dialog-kicker">Episode Setup</div>
            <div class="dialog-title-row">
              <div class="dialog-title">创建新集</div>
              <span class="dialog-badge">配置将锁定</span>
            </div>
            <div class="dialog-sub">为这一集预先锁定图片和音频生成服务。创建后，这些生成链路将始终跟随当前集配置。</div>
          </div>
          <button class="back-btn" @click="addDialog = false">取消</button>
        </div>
        <div class="dialog-summary">
          <div class="summary-chip">图片 · {{ imageConfigs.length }} 可选</div>
          <div class="summary-chip">音频 · {{ audioConfigs.length }} 可选</div>
        </div>
        <div class="dialog-body">
          <div class="dialog-section">
            <div class="dialog-section-head">
              <span class="dialog-section-title">基础信息</span>
              <span class="dialog-section-copy">这一项只影响显示名称，不影响生成配置</span>
            </div>
            <label class="field">
              <span class="field-label">标题</span>
              <input v-model="newEpisodeTitle" class="input" placeholder="默认按集数自动命名" />
              <span class="field-hint">留空时会自动按集数命名，例如“第 3 集”。</span>
            </label>
          </div>

          <div class="dialog-section">
            <div class="dialog-section-head">
              <span class="dialog-section-title">生成配置</span>
              <span class="dialog-section-copy">创建后不可更改，建议在这里一次性选对</span>
            </div>
            <div class="config-grid">
              <label class="config-card">
                <span class="config-card-kicker">IMAGE</span>
                <span class="field-label">图片配置</span>
                <BaseSelect v-model="newEpisodeImageConfigId" :options="imageConfigOptions" placeholder="选择图片服务" searchable />
              </label>
              <label class="config-card">
                <span class="config-card-kicker">AUDIO</span>
                <span class="field-label">音频配置</span>
                <BaseSelect v-model="newEpisodeAudioConfigId" :options="audioConfigOptions" placeholder="选择音频服务" searchable />
              </label>
            </div>
          </div>
        </div>
        <div class="dialog-foot">
          <div class="dialog-foot-copy">创建后，工作台中的图片、音频生成入口都会锁定到当前集。</div>
          <button class="btn btn-primary" :disabled="creatingEpisode || !canCreateEpisode" @click="addEpisode">
            {{ creatingEpisode ? '创建中...' : '创建并锁定配置' }}
          </button>
        </div>
      </div>
    </div>

    <CreativeSessionDialog
      v-model="creativeDialog"
      scope="drama"
      :drama-id="dramaId"
      title="整剧创作访谈"
      subtitle="面向整部剧做策划，结果会写回 drama metadata，并同步更新各集描述。"
      @committed="handleCreativeCommitted"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { aiConfigAPI, dramaAPI, episodeAPI } from '~/composables/useApi'

const route = useRoute()
const drama = ref(null)
const dramaId = Number(route.params.id)
const addDialog = ref(false)
const creatingEpisode = ref(false)
const newEpisodeTitle = ref('')
const imageConfigs = ref([])
const audioConfigs = ref([])
const newEpisodeImageConfigId = ref(null)
const newEpisodeAudioConfigId = ref(null)
const creativeDialog = ref(false)

function hasScript(ep) { return !!(ep.script_content || ep.scriptContent) }

const creativeSummary = computed(() => {
  const metadata = (() => {
    try { return drama.value?.metadata ? JSON.parse(drama.value.metadata) : {} } catch { return {} }
  })()
  return {
    hasBrief: !!metadata.creative_brief && Object.keys(metadata.creative_brief).length > 0,
    hasCharacters: !!metadata.character_bible && Object.keys(metadata.character_bible).length > 0,
    hasWorld: !!metadata.world_book && Object.keys(metadata.world_book).length > 0,
    hasOutlines: Array.isArray(metadata.episode_outlines) && metadata.episode_outlines.length > 0,
  }
})

function configLabel(config) {
  if (!config) return ''
  let modelName = ''
  try { const m = JSON.parse(config.model || '[]'); modelName = Array.isArray(m) ? (m[0] || '') : (m || '') } catch { modelName = config.model || '' }
  return modelName ? `${config.name} · ${modelName} (${config.provider})` : `${config.name} (${config.provider})`
}

const imageConfigOptions = computed(() => imageConfigs.value.map(c => ({ label: configLabel(c), value: c.id })))
const audioConfigOptions = computed(() => audioConfigs.value.map(c => ({ label: configLabel(c), value: c.id })))
const canCreateEpisode = computed(() => !!(newEpisodeImageConfigId.value && newEpisodeAudioConfigId.value))

async function load() {
  try {
    drama.value = await dramaAPI.get(dramaId)
  } catch (e) {
    toast.error(e.message)
  }
}

async function loadConfigs() {
  try {
    const [imgs, auds] = await Promise.all([
      aiConfigAPI.list('image'),
      aiConfigAPI.list('audio'),
    ])
    imageConfigs.value = imgs || []
    audioConfigs.value = auds || []
    if (!newEpisodeImageConfigId.value && imageConfigs.value.length) newEpisodeImageConfigId.value = imageConfigs.value[0].id
    if (!newEpisodeAudioConfigId.value && audioConfigs.value.length) newEpisodeAudioConfigId.value = audioConfigs.value[0].id
  } catch (e) {
    toast.error(e.message)
  }
}

function openAddEpisode() {
  newEpisodeTitle.value = ''
  addDialog.value = true
}

async function addEpisode() {
  try {
    creatingEpisode.value = true
    await episodeAPI.create({
      drama_id: dramaId,
      title: newEpisodeTitle.value || undefined,
      image_config_id: newEpisodeImageConfigId.value,
      audio_config_id: newEpisodeAudioConfigId.value,
    })
    toast.success('已添加新集')
    addDialog.value = false
    load()
  } catch (e) {
    toast.error(e.message)
  } finally {
    creatingEpisode.value = false
  }
}

async function handleCreativeCommitted() {
  await load()
}

onMounted(() => { load(); loadConfigs() })
</script>

<style scoped>
.page {
  padding: 40px 48px 48px;
  overflow-y: auto;
  height: 100%;
  animation: fadeUp 0.35s var(--ease-out) both;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  gap: 20px;
}
.head-left { display: flex; align-items: flex-start; gap: 14px; }
.head-info { display: flex; flex-direction: column; gap: 10px; }
.head-actions { display: flex; align-items: center; gap: 10px; }

.back-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 16px; font-size: 14px; font-weight: 400;
  border: 1px solid var(--border); border-radius: var(--radius-pill);
  background: var(--white); color: var(--text-2);
  cursor: pointer; transition: all 0.18s var(--ease-out);
  letter-spacing: -0.14px;
}
.back-btn:hover { background: var(--bg-hover); border-color: var(--black); color: var(--black); }
.back-btn:focus-visible { outline: dashed 2px var(--black); outline-offset: 2px; }

.page-title {
  font-family: var(--font-sans);
  font-size: 40px; font-weight: 400;
  letter-spacing: -0.96px;
  line-height: 1.10;
}

.page-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.style-chip {
  font-size: 12px; font-weight: 400;
  font-family: var(--font-mono);
  padding: 3px 10px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  background: transparent; color: var(--text-2);
  border-radius: var(--radius-pill); border: 1px solid var(--border);
}
.meta-divider { width: 3px; height: 3px; border-radius: var(--radius-circle); background: var(--text-3); }
.meta-item {
  display: flex; align-items: center; gap: 5px;
  font-size: 14px; font-weight: 330; color: var(--text-2); letter-spacing: -0.14px;
}

.creative-status {
  margin-bottom: 24px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 960px;
}

.creative-status-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.14px;
}

.creative-status-desc {
  font-size: 14px;
  font-weight: 320;
  color: var(--text-2);
  margin-top: 6px;
  letter-spacing: -0.14px;
}

.creative-status-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.status-chip {
  padding: 7px 14px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border);
  font-size: 12px;
  font-weight: 400;
  font-family: var(--font-mono);
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-3);
  background: var(--white);
}

.status-chip.done {
  color: var(--white);
  background: var(--black);
  border-color: var(--black);
}

.section-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 400;
  font-family: var(--font-mono);
  color: var(--text-3); letter-spacing: 0.6px;
  text-transform: uppercase;
  margin-bottom: 14px;
}

.ep-grid { display: flex; flex-direction: column; gap: 10px; max-width: 760px; }

.ep-card {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 18px;
  cursor: pointer;
  animation: fadeUp 0.35s var(--ease-out) both;
  transition: transform 0.18s var(--ease-out), box-shadow 0.18s var(--ease-out), border-color 0.18s;
}
.ep-card:hover {
  border-color: var(--black);
  box-shadow: var(--shadow);
  transform: translateX(4px);
}

.ep-number {
  width: 44px; height: 44px; flex-shrink: 0;
  border-radius: var(--radius-md);
  background: var(--bg-2);
  border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-mono);
  font-size: 12px; font-weight: 400;
  letter-spacing: 0.6px;
  color: var(--text-2);
  transition: all 0.18s;
}
.ep-card:hover .ep-number {
  background: var(--black);
  border-color: var(--black);
  color: var(--white);
}

.ep-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.ep-title { font-size: 16px; font-weight: 540; color: var(--black); letter-spacing: -0.14px; }
.ep-status { display: flex; align-items: center; gap: 6px; }
.status-dot { width: 6px; height: 6px; border-radius: var(--radius-circle); }
.dot-ready { background: var(--black); }
.dot-pending { background: var(--text-3); }
.status-text { font-size: 12px; font-weight: 330; color: var(--text-3); letter-spacing: -0.14px; }
.ep-duration { font-size: 12px; color: var(--text-3); font-family: var(--font-mono); margin-left: 4px; letter-spacing: 0.3px; }

.ep-arrow { color: var(--text-3); flex-shrink: 0; transition: transform 0.18s; }
.ep-card:hover .ep-arrow { transform: translateX(3px); color: var(--black); }

.ep-empty {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 56px; text-align: center; color: var(--text-3); font-size: 14px;
  border: dashed 2px var(--border); letter-spacing: -0.14px;
}
.ep-empty-icon {
  width: 52px; height: 52px; border-radius: var(--radius-circle);
  background: var(--bg-2); display: flex; align-items: center; justify-content: center;
}

.dialog-mask {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px; z-index: 100;
}
.dialog {
  width: min(720px, 100%);
  max-height: min(860px, calc(100vh - 48px));
  display: flex; flex-direction: column; gap: 16px;
  padding: 28px;
  border-radius: var(--radius-md);
  background: var(--white);
  overflow: hidden;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-elevated);
}
.dialog-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.dialog-head-copy { display: flex; flex-direction: column; gap: 8px; max-width: 520px; }
.dialog-kicker {
  font-family: var(--font-mono); font-size: 12px; font-weight: 400;
  letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-3);
}
.dialog-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.dialog-title { font-size: 26px; font-weight: 540; color: var(--black); letter-spacing: -0.26px; }
.dialog-badge {
  display: inline-flex; align-items: center; height: 28px; padding: 0 12px;
  border-radius: var(--radius-pill); background: var(--bg-2);
  color: var(--black); font-size: 12px; font-weight: 400; font-family: var(--font-mono);
  letter-spacing: 0.6px; text-transform: uppercase;
}
.dialog-sub { font-size: 16px; font-weight: 320; line-height: 1.7; color: var(--text-2); letter-spacing: -0.14px; }
.dialog-summary { display: flex; gap: 8px; flex-wrap: wrap; }
.summary-chip {
  display: inline-flex; align-items: center; height: 30px; padding: 0 14px;
  border-radius: var(--radius-pill); background: var(--white);
  border: 1px solid var(--border); font-size: 12px;
  font-family: var(--font-mono); letter-spacing: 0.3px; color: var(--text-2);
}
.dialog-body { display: flex; flex-direction: column; gap: 16px; overflow-y: auto; padding-right: 4px; }
.dialog-section {
  display: flex; flex-direction: column; gap: 14px;
  padding: 18px; border-radius: var(--radius-md);
  background: var(--white); border: 1px solid var(--border);
}
.dialog-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.dialog-section-title { font-size: 16px; font-weight: 540; color: var(--black); letter-spacing: -0.14px; }
.dialog-section-copy { font-size: 13px; font-weight: 320; color: var(--text-3); letter-spacing: -0.14px; }
.config-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.config-card {
  display: flex; flex-direction: column; gap: 8px; padding: 16px;
  border-radius: var(--radius-md); background: var(--white); border: 1px solid var(--border);
}
.config-card-kicker {
  font-family: var(--font-mono); font-size: 11px; font-weight: 400;
  letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-3);
}
.dialog-foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-top: 4px; }
.dialog-foot-copy { flex: 1; font-size: 13px; font-weight: 320; line-height: 1.6; color: var(--text-3); letter-spacing: -0.14px; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 14px; font-weight: 480; color: var(--black); letter-spacing: -0.14px; }
.field-hint { font-size: 12px; font-weight: 320; color: var(--text-3); letter-spacing: -0.14px; }

@media (max-width: 860px) {
  .page { padding: 24px; }
  .page-head, .creative-status { flex-direction: column; align-items: stretch; }
  .page-title { font-size: 28px; }
  .head-actions { justify-content: flex-end; }
  .creative-status-grid { justify-content: flex-start; }
  .dialog { width: 100%; max-height: calc(100vh - 24px); padding: 20px; }
  .dialog-title { font-size: 22px; }
  .config-grid { grid-template-columns: 1fr; }
  .dialog-foot { flex-direction: column; align-items: stretch; }
}
</style>