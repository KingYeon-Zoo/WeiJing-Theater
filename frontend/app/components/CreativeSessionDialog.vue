<template>
  <div v-if="modelValue" class="creative-mask" @click.self="close">
    <div class="creative-dialog card">
      <div class="creative-head">
        <div>
          <div class="creative-kicker">{{ scope === 'drama' ? 'Drama Planning' : 'Episode Revision' }}</div>
          <div class="creative-title">{{ title }}</div>
          <div class="creative-subtitle">{{ subtitleText }}</div>
        </div>
        <button class="btn btn-ghost btn-sm" @click="close">关闭</button>
      </div>

      <div class="creative-body">
        <aside class="creative-draft">
          <div class="draft-head">
            <span>结构化草稿</span>
            <span class="tag">{{ session?.status || 'active' }}</span>
          </div>
          <div v-if="draftSections.length" class="draft-sections">
            <section v-for="section in draftSections" :key="section.key" class="draft-section">
              <div class="draft-section-title">{{ section.label }}</div>
              <pre class="draft-section-content">{{ section.value }}</pre>
            </section>
          </div>
          <div v-else class="draft-empty">访谈进行中，草稿会随着对话自动沉淀。</div>
        </aside>

        <section class="creative-chat">
          <div class="chat-stream" ref="chatStreamRef">
            <div v-for="msg in messages" :key="msg.id" :class="['chat-bubble', msg.role === 'assistant' ? 'is-assistant' : 'is-user']">
              <div class="chat-role">{{ msg.role === 'assistant' ? '访谈师' : '你' }}</div>
              <div class="chat-content">{{ msg.content }}</div>
              <div v-if="msg.attachment?.focus && msg.role === 'assistant'" class="chat-focus">当前焦点：{{ msg.attachment.focus }}</div>
            </div>
            <div v-if="loading || sending" class="chat-loading">
              <span class="loader-dot"></span>
              正在整理下一步问题...
            </div>
          </div>

          <div class="chat-composer">
            <textarea
              v-model="input"
              class="textarea"
              rows="4"
              :disabled="loading || sending"
              :placeholder="placeholderText"
            />
            <div class="chat-actions">
              <span class="dim">{{ readyHint }}</span>
              <button class="btn btn-primary btn-sm ml-auto" :disabled="!canSend" @click="sendMessage">
                发送
              </button>
            </div>
          </div>
        </section>
      </div>

      <div class="creative-foot">
        <span class="dim">{{ footerHint }}</span>
        <button class="btn" :disabled="committing || !session" @click="commit(false)">
          {{ committing ? '提交中...' : '提交定稿' }}
        </button>
        <button
          v-if="allowRewriteCommit"
          class="btn btn-primary"
          :disabled="committing || !session"
          @click="commit(true)"
        >
          {{ committing ? '提交中...' : '提交并进入 AI 改写' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { toast } from 'vue-sonner'
import { creativeAPI } from '~/composables/useApi'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  scope: { type: String, required: true },
  dramaId: { type: Number, required: true },
  episodeId: { type: Number, default: null },
  title: { type: String, default: '创作访谈' },
  subtitle: { type: String, default: '' },
  allowRewriteCommit: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'committed', 'rewrite-committed'])

const loading = ref(false)
const sending = ref(false)
const committing = ref(false)
const session = ref(null)
const messages = ref([])
const input = ref('')
const bootstrapped = ref(false)
const chatStreamRef = ref(null)

const subtitleText = computed(() =>
  props.subtitle || (props.scope === 'drama'
    ? '先定整剧方向，再沉淀人物与分集大纲。'
    : '基于整剧上下文，只修订当前集目标与初稿。'))

const placeholderText = computed(() =>
  props.scope === 'drama'
    ? '例如：我想做一个女性逆袭题材，节奏要快，适合短视频平台。'
    : '例如：这一集我要强化反转，让女主更主动一些。'
)

const footerHint = computed(() =>
  props.allowRewriteCommit
    ? '提交后会把当前集草稿同步到内容区，并继续走现有 AI 改写链路。'
    : '提交后会把结构化结果写回整剧元数据，并可同步更新各集基础描述。'
)

const canSend = computed(() => !!input.value.trim() && !loading.value && !sending.value && !!session.value)

const latestAssistantAttachment = computed(() => {
  const list = [...messages.value].reverse()
  return list.find(msg => msg.role === 'assistant' && msg.attachment)?.attachment || null
})

const readyHint = computed(() => latestAssistantAttachment.value?.ready_to_commit
  ? '当前草稿已接近可提交状态'
  : '访谈师会一次只追问一个最关键的问题')

const draftSections = computed(() => {
  const draft = session.value?.structured_draft || {}
  const mapping = [
    ['brief', '创作简报'],
    ['character_bible', '人物设定'],
    ['world_book', '世界观'],
    ['episode_outlines', '分集大纲'],
    ['current_episode', '当前集草稿'],
  ]

  return mapping
    .filter(([key]) => draft[key] && (Array.isArray(draft[key]) ? draft[key].length : Object.keys(draft[key]).length))
    .map(([key, label]) => ({
      key,
      label,
      value: JSON.stringify(draft[key], null, 2),
    }))
})

async function ensureSession() {
  if (session.value) return
  loading.value = true
  try {
    const res = await creativeAPI.createSession({
      scope: props.scope,
      drama_id: props.dramaId,
      episode_id: props.episodeId,
    })
    session.value = res.session
    messages.value = res.messages || []
  } catch (e) {
    toast.error(e.message)
  } finally {
    loading.value = false
  }
}

async function bootstrapIfNeeded() {
  if (!props.modelValue || bootstrapped.value) return
  if (!session.value || messages.value.length) {
    bootstrapped.value = true
    return
  }

  bootstrapped.value = true
  input.value = props.scope === 'drama'
    ? '开始本次创作访谈，请先结合已有上下文问我一个最关键的问题，并给出你的初步判断。'
    : '开始当前集补充访谈，请先基于整剧上下文问我一个最关键的问题，并说明你认为这一集最需要补强什么。'
  await sendMessage()
}

async function refreshSession(sessionId = session.value?.id) {
  if (!sessionId) return
  const res = await creativeAPI.getSession(sessionId)
  session.value = res.session
  messages.value = res.messages || []
}

async function sendMessage() {
  if (!canSend.value) return

  const userText = input.value.trim()
  
  // 乐观更新 UI：立即添加用户消息并清空输入
  messages.value.push({
    id: `temp-${Date.now()}`,
    role: 'user',
    content: userText
  })
  input.value = ''

  sending.value = true
  try {
    const res = await creativeAPI.sendMessage(session.value.id, userText)
    session.value = res.session
    messages.value = res.messages || []
  } catch (e) {
    toast.error(e.message)
    // 失败时移除刚才乐观添加的消息，并恢复输入内容
    messages.value.pop()
    input.value = userText
  } finally {
    sending.value = false
  }
}

async function commit(rewriteAfter) {
  if (!session.value) return
  committing.value = true
  try {
    const res = await creativeAPI.commitSession(session.value.id, {
      apply_outline_to_episodes: true,
    })
    session.value = res.session
    messages.value = res.messages || []
    toast.success('创作结果已提交')
    emit(rewriteAfter ? 'rewrite-committed' : 'committed', res)
    close()
  } catch (e) {
    toast.error(e.message)
  } finally {
    committing.value = false
  }
}

function close() {
  emit('update:modelValue', false)
}

watch(() => props.modelValue, async (visible) => {
  if (!visible) {
    input.value = ''
    session.value = null
    messages.value = []
    bootstrapped.value = false
    return
  }

  await ensureSession()
  await refreshSession()
  await bootstrapIfNeeded()
}, { immediate: true })

watch(messages, async () => {
  await nextTick()
  if (chatStreamRef.value) {
    chatStreamRef.value.scrollTop = chatStreamRef.value.scrollHeight
  }
}, { deep: true })
</script>

<style scoped>
.creative-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(6px);
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.creative-dialog {
  width: min(1180px, 100%);
  height: min(860px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  background: var(--white);
}

.creative-head,
.creative-foot,
.chat-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.creative-head,
.creative-foot {
  justify-content: space-between;
}

.creative-kicker {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-3);
}

.creative-title {
  font-family: var(--font-sans);
  font-size: 26px;
  font-weight: 540;
  color: var(--black);
  margin-top: 4px;
  letter-spacing: -0.26px;
}

.creative-subtitle {
  font-size: 14px;
  font-weight: 320;
  color: var(--text-2);
  margin-top: 6px;
  letter-spacing: -0.14px;
}

.creative-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 14px;
}

.creative-draft,
.creative-chat {
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--white);
  min-height: 0;
}

.creative-draft {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.draft-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 540;
  letter-spacing: -0.14px;
}

.draft-sections {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.draft-section {
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--bg-1);
  border: 1px solid var(--border);
}

.draft-section-title {
  font-size: 12px;
  font-weight: 540;
  margin-bottom: 8px;
  letter-spacing: -0.14px;
}

.draft-section-content {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-2);
  font-family: var(--font-mono);
  letter-spacing: 0.3px;
}

.draft-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-3);
  font-size: 14px;
  font-weight: 320;
  letter-spacing: -0.14px;
}

.creative-chat {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chat-stream {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-bubble {
  max-width: 82%;
  padding: 14px 16px;
  border-radius: var(--radius-md);
}

.is-assistant {
  align-self: flex-start;
  background: var(--bg-1);
  border: 1px solid var(--border);
}

.is-user {
  align-self: flex-end;
  background: var(--black);
  color: var(--white);
}

.chat-role {
  font-size: 11px;
  font-weight: 400;
  font-family: var(--font-mono);
  letter-spacing: 0.6px;
  text-transform: uppercase;
  opacity: 0.6;
  margin-bottom: 6px;
}

.chat-content {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  font-size: 14px;
  font-weight: 330;
  letter-spacing: -0.14px;
}

.chat-focus {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 320;
  color: var(--text-3);
  letter-spacing: -0.14px;
}

.chat-loading {
  font-size: 13px;
  font-weight: 330;
  color: var(--text-3);
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: -0.14px;
}

.loader-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-circle);
  background: var(--black);
  animation: pulse 0.9s ease-in-out infinite;
}

.chat-composer {
  padding: 14px 16px 16px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-actions {
  justify-content: flex-end;
}

@keyframes pulse {
  0%, 100% { transform: scale(0.8); opacity: 0.6; }
  50% { transform: scale(1); opacity: 1; }
}

@media (max-width: 960px) {
  .creative-dialog {
    height: calc(100vh - 24px);
    width: calc(100vw - 24px);
    padding: 16px;
  }

  .creative-body {
    grid-template-columns: 1fr;
  }

  .creative-draft {
    max-height: 220px;
  }

  .chat-bubble {
    max-width: 100%;
  }

  .creative-foot {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
