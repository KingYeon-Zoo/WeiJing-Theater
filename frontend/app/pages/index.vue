<template>
  <div class="page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-inner">
        <div class="hero-kicker">WEIJING THEATER</div>
        <h1 class="hero-title">微境剧场</h1>
        <p class="hero-subtitle">AI 驱动的短剧创作工作台</p>
        <button class="btn btn-white" @click="showCreate = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          新建项目
        </button>
      </div>
    </section>

    <!-- Projects Section -->
    <div class="projects-section">
      <div class="section-head">
        <div class="section-kicker">PROJECTS</div>
        <h2 class="section-title">短剧项目</h2>
        <p class="section-desc">{{ dramas.length }} 个项目</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="loading-grid">
          <div v-for="i in 3" :key="i" class="skeleton-card"></div>
        </div>
      </div>

      <!-- Grid -->
      <div v-else class="grid">
        <div
          v-for="(d, i) in dramas"
          :key="d.id"
          class="card project-card"
          :style="{ animationDelay: `${i * 0.06}s` }"
          @click="navigateTo(`/drama/${d.id}`)"
        >
          <div class="card-body">
            <div class="card-header">
              <span class="card-ep-count">{{ d.episodes?.length || 0 }} 集</span>
              <button class="btn-icon card-delete" @click.stop="delDrama(d)" title="删除">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>

            <h4 class="project-title">{{ d.title }}</h4>

            <div class="project-meta">
              <span v-if="d.style" class="tag">{{ d.style }}</span>
              <span class="meta-item">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {{ d.characters?.length || 0 }}
              </span>
              <span class="meta-item">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
                {{ d.scenes?.length || 0 }}
              </span>
            </div>
          </div>

          <div class="card-footer">
            <div class="progress-mini">
              <div class="progress-mini-track">
                <div class="progress-mini-fill" :style="{ width: getProgress(d) + '%' }"></div>
              </div>
            </div>
            <span class="card-date">{{ fmtDate(d.updated_at || d.updatedAt) }}</span>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="!dramas.length" class="empty-card" @click="showCreate = true">
          <div class="empty-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </div>
          <p class="empty-title">新建第一个短剧项目</p>
          <p class="empty-desc">从剧本到成片，AI 助力的短剧制作工作台</p>
        </div>
      </div>
    </div>

    <!-- Create Dialog -->
    <div v-if="showCreate" class="overlay" @click.self="showCreate = false">
      <div class="modal card">
        <div class="modal-header">
          <div class="modal-kicker">NEW PROJECT</div>
          <h3 class="modal-title">新建短剧项目</h3>
          <p class="modal-desc">输入项目基本信息，即可开始制作</p>
        </div>
        <form @submit.prevent="create" class="modal-form">
          <label class="field">
            <span class="field-label">项目名称 <span class="required">*</span></span>
            <input v-model="form.title" class="input" placeholder="例如：都市情感短剧《时光邮局》" required autofocus />
          </label>
          <div class="field-row">
            <label class="field">
              <span class="field-label">计划集数</span>
              <input v-model.number="form.total_episodes" class="input" type="number" min="1" max="100" />
            </label>
            <label class="field">
              <span class="field-label">视觉风格</span>
              <BaseSelect v-model="form.style" :options="styleSelectOptions" placeholder="选择风格" searchable />
            </label>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn" @click="showCreate = false">取消</button>
            <button type="submit" class="btn btn-primary">
              创建项目
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, reactive, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { dramaAPI } from '~/composables/useApi'
import BaseSelect from '~/components/BaseSelect.vue'

const dramas = ref([])
const loading = ref(false)
const showCreate = ref(false)
const form = ref({ title: '', total_episodes: 1, style: '' })
const styles = ['realistic', 'anime', 'ghibli', 'cinematic', 'comic', 'watercolor']
const styleSelectOptions = computed(() => styles.map(s => ({ label: s, value: s })))

async function load() {
  loading.value = true
  try {
    const res = await dramaAPI.list()
    dramas.value = res.items || []
  } catch (e) {
    toast.error(e.message)
  } finally {
    loading.value = false
  }
}

async function create() {
  if (!form.value.title?.trim()) return
  try {
    const d = await dramaAPI.create(form.value)
    showCreate.value = false
    navigateTo(`/drama/${d.id}`)
  } catch (e) {
    toast.error(e.message)
  }
}

async function delDrama(d) {
  if (!confirm(`确定删除「${d.title}」？此操作不可恢复。`)) return
  try {
    await dramaAPI.del(d.id)
    toast.success('已删除')
    load()
  } catch (e) {
    toast.error(e.message)
  }
}

function fmtDate(s) {
  if (!s) return ''
  const d = new Date(s)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

function getProgress(d) {
  if (!d.episodes?.length) return 0
  const scripted = d.episodes.filter(e => e.script_content || e.scriptContent).length
  return Math.round((scripted / d.episodes.length) * 100)
}

onMounted(load)
</script>

<style scoped>
.page {
  overflow-y: auto;
  height: 100%;
}

/* === Hero === */
.hero {
  background: var(--hero-gradient);
  padding: 80px 48px 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.hero-inner {
  max-width: 680px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.hero-kicker {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
}

.hero-title {
  font-size: 86px;
  font-weight: 400;
  line-height: 1.00;
  letter-spacing: -1.72px;
  color: var(--white);
}

.hero-subtitle {
  font-size: 20px;
  font-weight: 330;
  line-height: 1.40;
  letter-spacing: -0.14px;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 8px;
}

/* === Projects Section === */
.projects-section {
  padding: 48px 48px 64px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.section-head {
  margin-bottom: 32px;
}

.section-kicker {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 8px;
}

.section-title {
  font-size: 40px;
  font-weight: 400;
  line-height: 1.10;
  letter-spacing: -0.96px;
  color: var(--black);
  margin-bottom: 4px;
}

.section-desc {
  font-size: 16px;
  font-weight: 320;
  color: var(--text-3);
  letter-spacing: -0.14px;
}

/* Grid */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

/* Project Card */
.project-card {
  padding: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: fadeUp 0.4s var(--ease-out) both;
}

.project-card:hover {
  border-color: var(--black);
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}

.card-body {
  padding: 20px 20px 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-ep-count {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-3);
}

.card-delete {
  opacity: 0;
  transition: opacity 0.15s;
}

.project-card:hover .card-delete {
  opacity: 1;
}

.project-title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.14px;
  color: var(--black);
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 330;
  color: var(--text-3);
  letter-spacing: -0.14px;
}

.card-footer {
  padding: 12px 20px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-mini { flex: 1; }

.progress-mini-track {
  height: 2px;
  background: var(--bg-3);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.progress-mini-fill {
  height: 100%;
  background: var(--black);
  border-radius: var(--radius-pill);
  transition: width 0.6s var(--ease-out);
}

.card-date {
  font-size: 12px;
  font-weight: 330;
  color: var(--text-3);
  white-space: nowrap;
  letter-spacing: -0.14px;
}

/* Loading Skeleton */
.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.skeleton-card {
  height: 180px;
  border-radius: var(--radius-md);
  background: linear-gradient(90deg, var(--bg-2) 25%, var(--bg-hover) 50%, var(--bg-2) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border: 1px solid var(--border);
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Empty Card */
.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 56px 32px;
  cursor: pointer;
  border: dashed 2px var(--border);
  border-radius: var(--radius-md);
  text-align: center;
  transition: all 0.2s var(--ease-out);
}

.empty-card:hover {
  border-color: var(--black);
  transform: translateY(-2px);
}

.empty-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-circle);
  background: var(--bg-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-3);
  margin-bottom: 4px;
  transition: all 0.2s;
}

.empty-card:hover .empty-icon {
  background: var(--black);
  color: var(--white);
}

.empty-title {
  font-size: 16px;
  font-weight: 540;
  color: var(--black);
  letter-spacing: -0.14px;
}

.empty-desc {
  font-size: 14px;
  font-weight: 320;
  color: var(--text-3);
  max-width: 220px;
  line-height: 1.6;
  letter-spacing: -0.14px;
}

/* Modal */
.modal {
  padding: 32px;
  width: 460px;
  box-shadow: var(--shadow-elevated);
  animation: scaleIn 0.2s var(--ease-out);
}

.modal-header {
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-kicker {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-3);
}

.modal-title {
  font-size: 26px;
  font-weight: 540;
  letter-spacing: -0.26px;
}

.modal-desc {
  font-size: 16px;
  font-weight: 320;
  color: var(--text-3);
  letter-spacing: -0.14px;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 14px;
  font-weight: 480;
  color: var(--black);
  letter-spacing: -0.14px;
}

.required { color: var(--error); }

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .hero { padding: 48px 24px 40px; }
  .hero-title { font-size: 48px; }
  .projects-section { padding: 32px 24px 48px; }
  .section-title { font-size: 28px; }
  .grid { grid-template-columns: 1fr; }
}
</style>
