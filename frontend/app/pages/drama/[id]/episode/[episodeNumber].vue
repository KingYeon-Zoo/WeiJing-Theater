
<template>
  <div class="figma-editor" v-if="drama">
    <!-- TOOLBAR (Top Chrome) -->
    <header class="figma-topbar">
      <!-- Left side: Identity and Window controls -->
      <div class="topbar-left">
        <button class="topbar-btn icon-btn rounded-full focus:outline-none focus:ring-0 focus:border-black focus:border-[2px] focus:border-dashed" title="Back to Project" @click="navigateTo(`/drama/${dramaId}`)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div class="topbar-identity">
          <span class="file-name">{{ drama.title }} <span class="file-slash">/</span> E{{ String(episodeNumber).padStart(2,'0') }}</span>
        </div>
      </div>

      <!-- Center: Pipeline Tabs -->
      <nav class="topbar-center figma-tabs">
        <button class="tab rounded-[50px] focus:outline-none focus:ring-0 focus:border-black focus:border-[2px] focus:border-dashed" :class="{active: scriptStep === 0 || scriptStep === 1}" @click="scriptStep = 1">1. 剧本</button>
        <button class="tab rounded-[50px] focus:outline-none focus:ring-0 focus:border-black focus:border-[2px] focus:border-dashed" :class="{active: scriptStep === 2}" :disabled="!scriptContent" @click="scriptStep = 2">2. 角色解析</button>
        <button class="tab rounded-[50px] focus:outline-none focus:ring-0 focus:border-black focus:border-[2px] focus:border-dashed" :class="{active: scriptStep === 3}" :disabled="!chars || !chars.length" @click="scriptStep = 3">3. 选角配置</button>
        <button class="tab rounded-[50px] focus:outline-none focus:ring-0 focus:border-black focus:border-[2px] focus:border-dashed" :class="{active: scriptStep === 4}" :disabled="!chars || !chars.length" @click="scriptStep = 4">4. 镜头拆解</button>
        <button class="tab rounded-[50px] focus:outline-none focus:ring-0 focus:border-black focus:border-[2px] focus:border-dashed" :class="{active: scriptStep === 5}" :disabled="!sbs || !sbs.length" @click="scriptStep = 5">5. 生成制作</button>
      </nav>

      <!-- Right side: Actions -->
      <div class="topbar-right">
        <span class="topbar-meta mono">{{ chars.length }} Chars · {{ sbs.length }} Shots</span>
      </div>
    </header>

    <!-- WORKSPACE -->
    <div class="figma-workspace">
      
      <!-- LAYERS PANEL (Left Chrome) -->
      <aside class="figma-layers">
        <div class="layers-header">
          <span class="layers-title">{{ currentStageLabel }}</span>
        </div>
        
        <div class="layers-content">
          <!-- SCRIPT (0,1) -->
          <template v-if="scriptStep === 0 || scriptStep === 1">
            <div class="layer-item" :class="{active: scriptStep === 0}" @click="scriptStep = 0">原始素材</div>
            <div class="layer-item" :class="{active: scriptStep === 1}" @click="scriptStep = 1">改写剧本</div>
          </template>
          
          <!-- EXTRACT (2) -->
          <template v-else-if="scriptStep === 2">
            <div class="layer-group">登场角色 ({{chars.length}})</div>
            <div class="layer-item leaf" v-for="(c, i) in chars" :key="'char-'+i" @click="panel = 'char-'+i">{{c.name}}</div>
            <div class="layer-group">场景列表 ({{scenes.length}})</div>
            <div class="layer-item leaf" v-for="(s, i) in scenes" :key="'scene-'+i" @click="panel = 'scene-'+i">{{s.name}}</div>
          </template>
          
          <!-- CAST (3) -->
          <template v-else-if="scriptStep === 3">
            <div class="layer-group">配音设定 ({{chars.length}})</div>
            <div class="layer-item leaf" :class="{'is-voiced': c.voice||c.voice_style||c.voiceStyle}" v-for="(c, i) in chars" :key="'v-'+i" @click="panel = 'v-'+i">{{c.name}}</div>
          </template>
          
          <!-- BREAKDOWN (4) -->
          <template v-else-if="scriptStep === 4">
            <div class="layer-group">分镜序列 ({{sbs.length}})</div>
            <div class="layer-item leaf" v-for="(sb, i) in sbs" :key="'sb-'+i" :class="{active: panel === 'sb-'+i}" @click="panel = 'sb-'+i; focusSb(i)">镜头 {{String(i+1).padStart(3,'0')}}</div>
          </template>
          
          <!-- PRODUCTION (5) -->
          <template v-else-if="scriptStep === 5">
            <div class="layer-item" :class="{active: prodTabIdx === 0}" @click="prodTabIdx = 0">角色</div>
            <div class="layer-item" :class="{active: prodTabIdx === 1}" @click="prodTabIdx = 1">场景</div>
            <div class="layer-item" :class="{active: prodTabIdx === 2}" @click="prodTabIdx = 2">配音</div>
            <div class="layer-item" :class="{active: prodTabIdx === 3}" @click="prodTabIdx = 3">画面</div>
          </template>
        </div>
      </aside>

      <!-- CANVAS (Center) & INSPECTOR (Right) -->
      <main class="figma-canvas-container">
        <!-- STEP 0: RAW -->
        <div v-if="scriptStep === 0" class="canvas-wrapper">
          <div class="canvas-header">
            <h2 class="canvas-title hero-gradient-text">原始导入</h2>
            <button class="btn btn-primary" @click="saveRaw">保存原始素材</button>
          </div>
          <div class="canvas-scroll">
            <textarea class="figma-textarea hero-focus input shadow-sm" v-model="localRaw" placeholder="Paste your raw story here..."></textarea>
          </div>
        </div>

        <!-- STEP 1: REWRITE -->
        <div v-if="scriptStep === 1" class="canvas-wrapper">
          <div class="canvas-header">
            <h2 class="canvas-title hero-gradient-text">剧本构建</h2>
            <div class="actions hero-gradient-group">
               <button class="btn btn-ghost" @click="skipRewrite()">跳过</button>
               <button class="btn btn-primary" @click="doRewrite(true)">AI 智能改写</button>
               <button class="btn btn-primary" @click="saveScr()">保存剧本内容</button>
            </div>
          </div>
          <div class="canvas-scroll">
             <textarea class="figma-textarea hero-focus input shadow-sm" v-model="scriptContent" placeholder="Script Content..."></textarea>
          </div>
        </div>

        <!-- STEP 2: EXTRACT -->
        <div v-if="scriptStep === 2" class="canvas-wrapper split" :class="{'has-inspector': panel && panel.startsWith('char-') || panel && panel.startsWith('scene-')}">
          <div class="canvas-area bg-dotted">
             <div class="canvas-header">
               <h2 class="canvas-title hero-gradient-text">信息提取引擎</h2>
               <button class="btn btn-primary" @click="doExtract">提取实体信息</button>
             </div>
             
             <!-- Gallery View -->
             <div class="entity-gallery">
               <div class="entity-group">
                 <h3 class="mono-label hero-gradient-text">Characters</h3>
                 <div class="card-grid">
                   <div v-for="(c, i) in chars" :key="c.id" class="figma-card" :class="{active: panel === 'char-'+i}" @click="panel = 'char-'+i">
                     <div class="figma-card-img" :class="{'bg-hero-gradient': !(c.imageUrl||c.image_url)}" :style="(c.imageUrl||c.image_url) ? { backgroundImage: 'url(/'+(c.imageUrl||c.image_url)+')'} : {}">
                       <span v-if="!(c.imageUrl||c.image_url)" class="figma-placeholder-text">{{c.name[0]}}</span>
                     </div>
                     <div class="figma-card-body">
                       <div class="font-600 truncate">{{ c.name }}</div>
                       <div class="mono xs dim">{{ c.gender || 'Unknown' }}</div>
                     </div>
                   </div>
                 </div>
               </div>
               
               <div class="entity-group mt-6">
                 <h3 class="mono-label hero-gradient-text">Scenes</h3>
                 <div class="card-grid">
                   <div v-for="(s, i) in scenes" :key="s.id" class="figma-card" :class="{active: panel === 'scene-'+i}" @click="panel = 'scene-'+i">
                     <div class="figma-card-img landscape" :class="{'bg-hero-gradient': !(s.imageUrl||s.image_url)}" :style="(s.imageUrl||s.image_url) ? { backgroundImage: 'url(/'+(s.imageUrl||s.image_url)+')'} : {}">
                       <span v-if="!(s.imageUrl||s.image_url)" class="figma-placeholder-text">{{s.name[0]}}</span>
                     </div>
                     <div class="figma-card-body">
                       <div class="font-600 truncate">{{ s.name }}</div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
          </div>
          
          <!-- Inspector -->
          <aside class="figma-inspector" v-if="panel && panel.startsWith('char-')">
            <div class="inspector-header">
              <span class="mono-sm">角色属性</span>
              <button class="btn btn-icon btn-ghost" @click="panel=''"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div class="inspector-body" v-if="chars[parseInt(panel.split('-')[1])]">
              <label class="field"><span class="field-label">姓名</span><input class="input" v-model="chars[parseInt(panel.split('-')[1])].name" /></label>
              <label class="field"><span class="field-label">性别</span><input class="input" v-model="chars[parseInt(panel.split('-')[1])].gender" /></label>
              <label class="field"><span class="field-label">外貌描述</span><textarea class="textarea" v-model="chars[parseInt(panel.split('-')[1])].appearance" rows="6"></textarea></label>
            </div>
          </aside>
          <aside class="figma-inspector" v-if="panel && panel.startsWith('scene-')">
            <div class="inspector-header">
              <span class="mono-sm">场景属性</span>
              <button class="btn btn-icon btn-ghost" @click="panel=''"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div class="inspector-body" v-if="scenes[parseInt(panel.split('-')[1])]">
              <label class="field"><span class="field-label">姓名</span><input class="input" v-model="scenes[parseInt(panel.split('-')[1])].name" /></label>
              <label class="field"><span class="field-label">年代</span><input class="input" v-model="scenes[parseInt(panel.split('-')[1])].period" /></label>
              <label class="field"><span class="field-label">光影</span><input class="input" v-model="scenes[parseInt(panel.split('-')[1])].lighting" /></label>
              <label class="field"><span class="field-label">视觉氛围</span><textarea class="textarea" v-model="scenes[parseInt(panel.split('-')[1])].visual_feel" rows="6"></textarea></label>
            </div>
          </aside>
        </div>

        <!-- STEP 3: VOICES -->
        <div v-if="scriptStep === 3" class="canvas-wrapper split" :class="{'has-inspector': panel && panel.startsWith('v-')}">
          <div class="canvas-area bg-dotted">
            <div class="canvas-header">
               <h2 class="canvas-title hero-gradient-text">声音选角</h2>
               <button class="btn btn-primary" @click="doVoice">自动分配关联声线</button>
            </div>
            <div class="card-grid">
               <div v-for="(c, i) in chars" :key="'vc-'+i" class="figma-card" :class="{active: panel === 'v-'+i}" @click="panel = 'v-'+i">
                 <div class="figma-card-body">
                   <div class="flex items-center gap-2 mb-2">
                     <span class="avatar-circle" :class="(c.voice||c.voice_style||c.voiceStyle) ? 'bg-success' : 'bg-hero-gradient'">{{c.name[0]}}</span>
                     <div class="font-600 truncate">{{ c.name }}</div>
                   </div>
                   <div class="tag" :class="(c.voice||c.voice_style||c.voiceStyle) ? 'tag-accent' : 'tag-error'">
                     {{ (c.voice||c.voice_style||c.voiceStyle) ? (Object.values(voiceProfiles).find(vp => vp.voice_id === (c.voice||c.voice_style||c.voiceStyle))?.name || (c.voice||c.voice_style||c.voiceStyle)) : 'No Voice Assigned' }}
                   </div>
                 </div>
               </div>
            </div>
          </div>
          <aside class="figma-inspector" v-if="panel && panel.startsWith('v-')">
            <div class="inspector-header">
              <span class="mono-sm">音频环境配置</span>
              <button class="btn btn-icon btn-ghost" @click="panel=''"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div class="inspector-body" v-if="chars[parseInt(panel.split('-')[1])]">
               <h3 class="font-600">{{ chars[parseInt(panel.split('-')[1])].name }}</h3>
               <label class="field mt-4">
                 <span class="field-label">已选分配声线</span>
                 <select class="input" :value="chars[parseInt(panel.split('-')[1])].voice||chars[parseInt(panel.split('-')[1])].voice_style||chars[parseInt(panel.split('-')[1])].voiceStyle" @change="e => { const c=chars[parseInt(panel.split('-')[1])]; c.voice=e.target.value; c.voice_style=e.target.value; c.voiceStyle=e.target.value; }" >
                   <option value="">-- 自动推测声线 --</option>
                   <option v-for="vp in voiceProfiles" :key="vp.voice_id" :value="vp.voice_id">{{vp.name}} ({{vp.gender}})</option>
                 </select>
               </label>
            </div>
          </aside>
        </div>

        <!-- STEP 4: BREAKDOWN (Storyboards) -->
        <div v-if="scriptStep === 4" class="canvas-wrapper split" :class="{'has-inspector': panel && panel.startsWith('sb-')}">
          <div class="canvas-area timeline-view bg-dotted scroll-y">
            <div class="canvas-header sticky-header">
               <h2 class="canvas-title hero-gradient-text">分镜序列大纲</h2>
               <div class="actions">
                 <button class="btn btn-ghost" @click="addShot(-1)">+ 增加首镜头</button>
                 <button class="btn btn-primary" @click="doBreakdown">AI 分镜拆解</button>
               </div>
            </div>
            <div class="timeline-container">
              <div class="timeline-line"></div>
              <div v-for="(sb, i) in sbs" :key="'sbflow-'+i" class="timeline-node" :class="{active: panel === 'sb-'+i}">
                <div class="timeline-marker hero-gradient"></div>
                <div class="timeline-card" @click="panel = 'sb-'+i; focusSb(i)">
                  <div class="sb-kicker mono-sm">SHOT {{String(i+1).padStart(3,'0')}}</div>
                  <div class="sb-narrative line-clamp-3">{{ sb.narrative }}</div>
                  <div class="flex gap-2 items-center mt-2">
                    <span v-if="getSceneName(sb.scene_id)" class="tag"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3h18v18H3z"/><path d="M9 3v18"/><path d="M15 3v18"/></svg> {{ getSceneName(sb.scene_id) }}</span>
                    <span v-for="cid in getStoryboardCharacterIds(sb.id)" :key="cid" class="tag"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="7" r="4"/><path d="M5.5 21v-2a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v2"/></svg> {{ chars.find(c => c.id===cid)?.name }}</span>
                    <span class="tag tag-success">{{ sb.camera_shot }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside class="figma-inspector" v-if="panel && panel.startsWith('sb-')">
            <div class="inspector-header">
              <span class="mono-sm">镜头检查器</span>
              <button class="btn btn-icon btn-ghost" @click="panel=''"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div class="inspector-body" v-if="sbs[parseInt(panel.split('-')[1])]">
               <div class="flex justify-between items-center mb-4">
                 <h3 class="font-600">镜头 {{String(parseInt(panel.split('-')[1])+1).padStart(3,'0')}}</h3>
                 <button class="btn btn-ghost btn-sm" style="color:var(--error)" @click="deleteShot(parseInt(panel.split('-')[1]))">删除</button>
               </div>
               
               <label class="field mb-4">
                 <span class="field-label">镜头动作说明 / 旁白</span>
                 <textarea class="textarea" rows="4" v-model="sbs[parseInt(panel.split('-')[1])].narrative"></textarea>
               </label>
               
               <div class="field-grid-2 mb-4">
                 <label class="field">
                    <span class="field-label">镜头景别</span>
                    <input class="input mono xs" v-model="sbs[parseInt(panel.split('-')[1])].camera_shot" />
                 </label>
                 <label class="field">
                    <span class="field-label">运镜方式</span>
                    <input class="input mono xs" v-model="sbs[parseInt(panel.split('-')[1])].camera_movement" />
                 </label>
               </div>
               
               <label class="field mb-4">
                 <span class="field-label">视觉提示词参考</span>
                 <textarea class="textarea mono" rows="3" v-model="sbs[parseInt(panel.split('-')[1])].image_prompt"></textarea>
               </label>

               <label class="field">
                 <span class="field-label">涉及登场角色</span>
                 <div class="flex gap-2 flex-wrap mt-1">
                    <div 
                      v-for="c in chars" :key="c.id" 
                      class="tag" 
                      :class="{'tag-accent': isStoryboardCharacterSelected(sbs[parseInt(panel.split('-')[1])], c.id)}"
                      @click="toggleStoryboardCharacter(sbs[parseInt(panel.split('-')[1])], c.id)"
                      style="cursor:pointer;"
                    >
                      {{ c.name }}
                    </div>
                 </div>
               </label>
               
            </div>
          </aside>
        </div>
        
        <!-- STEP 5: PRODUCTION (Generations) -->
        <div v-if="scriptStep === 5" class="canvas-wrapper">
           <div class="canvas-header">
             <h2 class="canvas-title hero-gradient-text">生成引擎车间</h2>
             <div class="actions">
                <button class="btn btn-primary" v-if="prodTabIdx===0" @click="batchCharImages">生成所有角色头像</button>
                <button class="btn btn-primary" v-if="prodTabIdx===1" @click="batchSceneImages">生成所有场景背景</button>
                <button class="btn btn-primary" v-if="prodTabIdx===2" @click="batchShotTTS">生成所有对话配音</button>
             </div>
           </div>
           
           <div class="canvas-scroll bg-dotted prod-view">
             <!-- Characters Prod -->
             <div v-if="prodTabIdx === 0" class="prod-grid">
               <div v-for="c in chars" :key="'p-c-'+c.id" class="prod-card">
                 <div class="prod-card-vis" :style="(c.imageUrl||c.image_url) ? {backgroundImage: 'url(/'+((c.imageUrl||c.image_url))+')'} : {}">
                    <div v-if="!(c.imageUrl||c.image_url)" class="prod-placeholder bg-hero-gradient">待生成</div>
                 </div>
                 <div class="prod-card-info">
                   <div class="font-600">{{c.name}}</div>
                   <button class="btn btn-ghost btn-sm border-dashed" @click="genCharImg(c)">生成</button>
                 </div>
               </div>
             </div>
             
             <!-- Scenes Prod -->
             <div v-if="prodTabIdx === 1" class="prod-grid landscape-grid">
               <div v-for="s in scenes" :key="'p-s-'+s.id" class="prod-card">
                 <div class="prod-card-vis landscape" :style="(s.imageUrl||s.image_url) ? {backgroundImage: 'url(/'+((s.imageUrl||s.image_url))+')'} : {}">
                    <div v-if="!(s.imageUrl||s.image_url)" class="prod-placeholder bg-hero-gradient">待生成</div>
                 </div>
                 <div class="prod-card-info">
                   <div class="font-600">{{s.name}}</div>
                   <button class="btn btn-ghost btn-sm border-dashed" @click="genSceneImg(s)">生成</button>
                 </div>
               </div>
             </div>
             
             <!-- Dialogues Prod -->
             <div v-if="prodTabIdx === 2" class="voice-list">
               <div v-for="sb in sbs" :key="'v-'+sb.id" class="voice-item">
                 <div v-if="hasDialogue(sb)" class="flex justify-between items-center w-100">
                    <div class="flex flex-col gap-1 w-70">
                       <span class="mono-sm">Shot ID: {{sb.id}} -- {{getDialogueSpeaker(sb)}}</span>
                       <span class="font-500 line-clamp-3">"{{getDialogueText(sb)}}"</span>
                       <audio v-if="hasTTS(sb)" controls :src="getTTSUrl(sb)" class="mt-2"></audio>
                    </div>
                    <button class="btn btn-ghost border-dashed" @click="genShotTTS(sb)">生成 Audio</button>
                 </div>
               </div>
             </div>

             <!-- Frames Prod -->
             <div v-if="prodTabIdx === 3" class="prod-grid landscape-grid">
               <div v-for="sb in sbs" :key="'f-'+sb.id" class="prod-card">
                 <div class="prod-card-vis landscape" :style="hasImg(sb) ? {backgroundImage: 'url('+getStoryboardCover(sb)+')'} : {}">
                    <div v-if="!hasImg(sb)" class="prod-placeholder bg-hero-gradient">待生成</div>
                 </div>
                 <div class="prod-card-info">
                   <div class="mono-sm text-center w-100 line-clamp-2">{{sb.image_prompt}}</div>
                   <button class="btn btn-ghost btn-sm border-dashed w-100 mt-2" @click="genShotFrame(sb)">生成首尾帧</button>
                 </div>
               </div>
             </div>
           </div>
        </div>

      </main>
    </div>
  </div>
</template>

<script setup>

import { ref, computed, watch, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { toast } from 'vue-sonner'
import { Users, MapPin, ImageIcon, Layers, Mic2, FileText, FolderKanban, Clapperboard, Download } from 'lucide-vue-next'
import { dramaAPI, episodeAPI, storyboardAPI, characterAPI, sceneAPI, imageAPI, gridAPI, aiConfigAPI, voicesAPI } from '~/composables/useApi'
import { useAgent } from '~/composables/useAgent'
import BaseSelect from '~/components/BaseSelect.vue'

definePageMeta({ layout: 'studio' })

const route = useRoute()
const dramaId = Number(route.params.id)
const episodeNumber = Number(route.params.episodeNumber)
const creativeEpisodeDialog = ref(false)

const drama = ref(null), episode = ref(null), chars = ref([]), scenes = ref([]), sbs = ref([])
const panel = ref('script')
const { running: rn, runningType: rt, run: runAgent } = useAgent()

const localRaw = ref(''), localScript = ref('')
const rawContent = computed(() => episode.value?.content || '')
const scriptContent = computed(() => episode.value?.script_content || episode.value?.scriptContent || '')
const epId = computed(() => episode.value?.id || 0)
const rawLen = computed(() => localRaw.value.replace(/\s/g, '').length || 0)
const scriptLen = computed(() => localScript.value.replace(/\s/g, '').length || 0)
const charsVoiced = computed(() => chars.value.filter(c => c.voice_style || c.voiceStyle).length)
const voiceSampleCount = computed(() => chars.value.filter(c => c.voice_sample_url || c.voiceSampleUrl).length)

const scriptStep = ref(0)
const prodTab = ref('chars')
const prodTabIdx = computed({
  get: () => prodTabDefs.value.findIndex(t => t.id === prodTab.value),
  set: (v) => { prodTab.value = prodTabDefs.value[v]?.id || 'chars' },
})
const frameMode = ref('first')
const fallbackVoiceProfiles = [
  { id: 'alloy', label: 'Alloy', gender: '中性', traits: '平衡、自然、克制', suitable: '通用叙述、旁白、需要稳定输出的角色' },
  { id: 'echo', label: 'Echo', gender: '男声', traits: '低沉、稳重、冷静', suitable: '成熟男性、父辈、旁白、压迫感角色' },
  { id: 'fable', label: 'Fable', gender: '男声', traits: '温暖、讲述感、表现力强', suitable: '男主、成长型角色、叙事担当' },
  { id: 'onyx', label: 'Onyx', gender: '男声', traits: '深沉、有力、权威', suitable: '反派、强势角色、掌控型人物' },
  { id: 'nova', label: 'Nova', gender: '女声', traits: '温柔、甜润、亲和', suitable: '女主、母亲、柔和配角' },
  { id: 'shimmer', label: 'Shimmer', gender: '女声', traits: '明亮、活泼、年轻', suitable: '少女、轻快角色、跳脱配角' },
]
const voiceProfiles = ref(fallbackVoiceProfiles)
const voiceSelectOptions = computed(() => voiceProfiles.value.map(v => ({ label: `${v.label} · ${v.traits}`, value: v.id })))
const frameModeOptions = [{ label: '仅首帧', value: 'first' }, { label: '首尾帧', value: 'first_last' }]
const gridLayoutOptions = [
  { label: '2x2', value: '2x2' },
  { label: '3x3', value: '3x3' },
  { label: '4x4', value: '4x4' },
  { label: '5x5', value: '5x5' },
]
const imageConfigs = ref([])
const audioConfigs = ref([])
const pendingCharImageIds = ref([])
const pendingSceneImageIds = ref([])
const pendingShotFrameKeys = ref([])
const imageViewer = ref({ open: false, src: '', title: '' })

function configLabel(config) {
  if (!config) return '未配置'
  let modelName = ''
  try { const m = JSON.parse(config.model || '[]'); modelName = Array.isArray(m) ? (m[0] || '') : (m || '') } catch { modelName = config.model || '' }
  return modelName ? `${config.name} · ${modelName} (${config.provider})` : `${config.name} (${config.provider})`
}

function isPendingCharImage(id) {
  return pendingCharImageIds.value.includes(id)
}

function openImageViewer(src, title = '') {
  if (!src) return
  imageViewer.value = { open: true, src, title }
}

function closeImageViewer() {
  imageViewer.value = { open: false, src: '', title: '' }
}

function handleImageViewerKeydown(event) {
  if (event.key === 'Escape' && imageViewer.value.open) closeImageViewer()
}

onMounted(() => {
  window.addEventListener('keydown', handleImageViewerKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleImageViewerKeydown)
})

function isPendingSceneImage(id) {
  return pendingSceneImageIds.value.includes(id)
}

function framePendingKey(id, frameType) {
  return `${id}:${frameType}`
}

function isPendingShotFrame(id, frameType) {
  return pendingShotFrameKeys.value.includes(framePendingKey(id, frameType))
}





function isNarratorCharacter(char) {
  const text = `${char?.name || ''} ${char?.role || ''}`.toLowerCase()
  return text.includes('旁白') || text.includes('narrator') || text.includes('画外音')
}

const visualChars = computed(() => chars.value.filter(c => !isNarratorCharacter(c)))

const lockedImageConfigId = computed(() => episode.value?.image_config_id || episode.value?.imageConfigId || null)

const lockedAudioConfigId = computed(() => episode.value?.audio_config_id || episode.value?.audioConfigId || null)
const lockedAudioProvider = computed(() => audioConfigs.value.find(c => c.id === lockedAudioConfigId.value)?.provider || '')
const lockedImageConfigLabel = computed(() => configLabel(imageConfigs.value.find(c => c.id === lockedImageConfigId.value)))
const gridTotalCells = computed(() => {
  return gridLayoutShape.value.rows * gridLayoutShape.value.cols
})

const gridCanStart = computed(() => {
  if (gridMode.value === 'multi_ref') return !!gridSingleTarget.value
  return gridSelected.value.length > 0
})

const gridSummary = computed(() => {
  if (gridMode.value === 'multi_ref') {
    const idx = sbs.value.findIndex(s => s.id === gridSingleTarget.value) + 1
    return gridSingleTarget.value ? `${gridLayoutShape.value.rows}x${gridLayoutShape.value.cols} 参考图 → 镜头 #${idx}` : '请选择一个镜头'
  }
  if (!gridSelected.value.length) return '请选择镜头'
  const count = gridSelected.value.length
  if (gridMode.value === 'first_last') {
    const { rows, cols } = gridLayoutShape.value
    return `${count} 个镜头 → ${rows}x${cols} 宫格（按首尾帧风格生成，切分后再手动分配）`
  }
  const { rows, cols } = gridLayoutShape.value
  const cells = rows * cols
  return `${count} 个镜头 → ${rows}x${cols} 宫格（先生成宫格图，切分后再手动分配）`
})

function createGridAssignments() {
  return Array.from({ length: gridActualLayout.value.rows * gridActualLayout.value.cols }, () => ({
    storyboard_id: null,
    frame_type: 'first_frame',
  }))
}

const gridAssignments = computed(() => gridAssignmentsState.value)
const gridAssignableShotIds = computed(() => {
  const assignedIds = [...new Set(gridAssignments.value.map(item => item?.storyboard_id).filter(Boolean))]
  const ids = Array.isArray(gridActiveShotIds.value) && gridActiveShotIds.value.length
    ? gridActiveShotIds.value
    : assignedIds.length
      ? assignedIds
    : gridMode.value === 'multi_ref'
      ? (gridSingleTarget.value ? [gridSingleTarget.value] : [])
      : gridSelected.value.length
        ? [...gridSelected.value]
        : sbs.value.map(s => s.id)
  return ids.filter(id => sbs.value.some(s => s.id === id))
})
const gridAssignmentShotOptions = computed(() => [
  { label: '未分配', value: null },
  ...gridAssignableShotIds.value.map((id) => {
    const index = sbs.value.findIndex(s => s.id === id) + 1
    const sb = sbs.value.find(s => s.id === id)
    return {
      label: `#${String(index).padStart(2, '0')} ${sb?.title || sb?.description || '镜头'}`,
      value: id,
    }
  }),
])
const gridFrameTypeOptions = computed(() => {
  return [
    { label: '首帧', value: 'first_frame' },
    { label: '尾帧', value: 'last_frame' },
    { label: '参考图', value: 'reference' },
  ]
})
const gridAssignedCount = computed(() => gridAssignments.value.filter(item => !!item.storyboard_id).length)
const gridAssignmentPageSize = computed(() => {
  if (gridAssignments.value.length >= 25) return 8
  if (gridAssignments.value.length >= 16) return 10
  if (gridAssignments.value.length >= 9) return 9
  return Math.max(1, gridAssignments.value.length || 1)
})
const gridAssignmentTotalPages = computed(() => Math.max(1, Math.ceil(gridAssignments.value.length / gridAssignmentPageSize.value)))
const gridAssignmentPageStart = computed(() => gridAssignmentPage.value * gridAssignmentPageSize.value)
const gridAssignmentPageEnd = computed(() => Math.min(gridAssignments.value.length, gridAssignmentPageStart.value + gridAssignmentPageSize.value))
const pagedGridAssignments = computed(() => {
  return gridAssignments.value
    .slice(gridAssignmentPageStart.value, gridAssignmentPageEnd.value)
    .map((assignment, offset) => ({
      assignment,
      index: gridAssignmentPageStart.value + offset,
    }))
})

function resetGridAssignments() {
  gridAssignmentsState.value = createGridAssignments()
  activeGridCell.value = 0
  gridAssignmentPage.value = 0
}

function gridCellLabel(a) {
  if (!a?.storyboard_id) return '未分配'
  const idx = sbs.value.findIndex(s => s.id === a.storyboard_id) + 1
  const suffix = { first_frame: '首', last_frame: '尾', reference: '参' }[a.frame_type] || ''
  return `#${idx}${suffix ? ` ${suffix}` : ''}`
}

function gridCellTitle(id) {
  if (!id) return '未分配'
  const idx = sbs.value.findIndex(s => s.id === id) + 1
  const sb = sbs.value.find(s => s.id === id)
  return `#${String(idx).padStart(2, '0')} ${sb?.title || sb?.description || '镜头'}`
}

function updateGridAssignment(index, field, value) {
  const next = [...gridAssignmentsState.value]
  next[index] = { ...next[index], [field]: value }
  gridAssignmentsState.value = next
  activeGridCell.value = index
  if (gridImagePath.value) persistGridImagePath(gridImagePath.value)
}

function focusGridCell(index) {
  activeGridCell.value = index
  gridAssignmentPage.value = Math.floor(index / gridAssignmentPageSize.value)
}

const gridOverlayStyle = computed(() => {
  const { rows, cols } = gridActualLayout.value
  return { 'grid-template-columns': `repeat(${cols}, 1fr)`, 'grid-template-rows': `repeat(${rows}, 1fr)` }
})

const gridAutoLayout = computed(() => {
  return gridLayoutShape.value
})

const gridBlankStyle = computed(() => {
  const { rows, cols } = gridAutoLayout.value
  return { 'grid-template-columns': `repeat(${cols}, 1fr)`, 'grid-template-rows': `repeat(${rows}, 1fr)` }
})

// Production step helpers
function prodStepDone(id) {
  if (id === 'chars') return !visualCharTotal.value || charImgCount.value === visualCharTotal.value
  if (id === 'scenes') return !!scenes.value.length && sceneImgCount.value === scenes.value.length
  if (id === 'dubbing') return !!sbs.value.length && (!ttsEligibleCount.value || ttsGeneratedCount.value === ttsEligibleCount.value)
  if (id === 'shots') return !!sbs.value.length && shotImgCount.value === sbs.value.length
  return false
}
function goNextProd() {
  if (prodTabIdx.value < prodTabDefs.value.length - 1) {
    prodTabIdx.value++
  } else {
    panel.value = 'export'
  }
}

// Script step navigation
const stepLabels = ['原始内容', 'AI 改写', '提取', '音色', '分镜']
const prevStepLabel = computed(() => scriptStep.value > 0 ? stepLabels[scriptStep.value - 1] : '')
const nextStepLabel = computed(() => {
  if (scriptStep.value === 4) return '进入制作'
  return stepLabels[scriptStep.value + 1] || ''
})
const canGoNext = computed(() => {
  if (scriptStep.value === 0) return !!localRaw.value.trim()
  if (scriptStep.value === 1) return !!localScript.value.trim() || !!scriptContent.value
  if (scriptStep.value === 2) return chars.value.length > 0
  if (scriptStep.value === 3) return charsVoiced.value > 0
  if (scriptStep.value === 4) return sbs.value.length > 0
  return false
})
function goPrevStep() { if (scriptStep.value > 0) scriptStep.value-- }
function goNextStep() {
  if (scriptStep.value === 0 && localRaw.value.trim()) { saveRaw() }
  if (scriptStep.value === 1 && localScript.value.trim()) { saveScr() }
  if (scriptStep.value === 4) { panel.value = 'production'; return }
  if (canGoNext.value) scriptStep.value++
}

function gridSelectAll() {
  if (gridSelected.value.length === sbs.value.length) gridSelected.value = []
  else gridSelected.value = sbs.value.map(s => s.id)
}

function openGridTool() {
  gridStep.value = 0
  gridSelected.value = []
  gridSingleTarget.value = null
  gridActiveShotIds.value = []
  gridPromptText.value = ''
  gridCellPrompts.value = []
  gridPromptSource.value = ''
  gridPromptStatus.value = ''
  gridAssignmentsState.value = []
  gridDialog.value = true
}

function persistGridImagePath(value) {
  if (typeof window === 'undefined') return
  if (!value) {
    window.localStorage.removeItem(gridStorageKey.value)
    return
  }
  const current = restoreGridState() || {}
  const entries = current.entries || {}
  entries[value] = {
    generationId: gridGenId.value,
    layout: gridActualLayout.value,
    shotIds: gridActiveShotIds.value,
    assignments: gridAssignmentsState.value,
    recoveredAt: gridRecoveredAt.value,
    recoveredMode: gridRecoveredMode.value,
  }
  const payload = {
    activeImagePath: value,
    entries,
  }
  window.localStorage.setItem(gridStorageKey.value, JSON.stringify(payload))
}

function restoreGridState() {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(gridStorageKey.value)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return { activeImagePath: raw, entries: { [raw]: {} } }
  }
}

function applyGridState(imagePath, meta = {}) {
  gridImagePath.value = imagePath || ''
  gridGenId.value = meta.generationId || meta.id || null
  if (meta.layout?.rows && meta.layout?.cols) gridActualLayout.value = meta.layout
  if (Array.isArray(meta.shotIds)) gridActiveShotIds.value = meta.shotIds
  else gridActiveShotIds.value = []
  if (Array.isArray(meta.assignments)) gridAssignmentsState.value = meta.assignments
  else gridAssignmentsState.value = []
  gridRecoveredAt.value = meta.recoveredAt || meta.createdAtLabel || ''
  gridRecoveredMode.value = meta.recoveredMode || meta.modeLabel || ''
}

function selectGridHistory(item) {
  const cached = restoreGridState()
  const cachedEntry = cached?.entries?.[item.localPath] || {}
  applyGridState(item.localPath, {
    ...item,
    ...cachedEntry,
    generationId: cachedEntry.generationId || item.id,
    recoveredAt: cachedEntry.recoveredAt || item.createdAtLabel,
    recoveredMode: cachedEntry.recoveredMode || item.modeLabel,
  })
  if (!gridAssignmentsState.value.length) resetGridAssignments()
  persistGridImagePath(item.localPath)
}

function reopenGridPreview() {
  if (!gridImagePath.value) {
    openGridTool()
    return
  }
  gridDialog.value = true
  if (!gridAssignmentsState.value.length) resetGridAssignments()
  gridStep.value = 3
}

function parseGridLayoutFromFrameType(value) {
  const match = String(value || '').match(/grid_[^_]+_(\d+)x(\d+)$/)
  if (!match) return null
  return { rows: Number(match[1]) || 3, cols: Number(match[2]) || 3 }
}

function continueGridSplit() {
  if (!gridImagePath.value) {
    toast.warning('还没有可继续切割的宫格图')
    return
  }
  if (!gridAssignmentsState.value.length) resetGridAssignments()
  gridDialog.value = true
  gridStep.value = 3
}

function getGridPromptShotIds() {
  if (gridMode.value === 'multi_ref') return gridSingleTarget.value ? [gridSingleTarget.value] : []
  if (gridMode.value === 'first_last') return [...gridSelected.value]
  return gridSelected.value.slice(0, gridTotalCells.value)
}

async function generateGridPrompt() {
  if (!gridCanStart.value) {
    toast.warning('请先选择镜头')
    return
  }
  gridPromptLoading.value = true
  gridPromptStatus.value = '正在调用 AI 生成宫格提示词...'
  gridPromptText.value = ''
  gridCellPrompts.value = []
  gridPromptSource.value = ''
  try {
    const shotIds = getGridPromptShotIds()
    const { rows, cols } = gridAutoLayout.value

    const res = await gridAPI.prompt({
      storyboard_ids: shotIds,
      drama_id: dramaId,
      episode_id: epId.value,
      rows,
      cols,
      mode: gridMode.value,
    })

    gridPromptText.value = res?.grid_prompt || ''
    gridCellPrompts.value = Array.isArray(res?.cell_prompts) ? res.cell_prompts : []
    gridPromptSource.value = res?.source || ''

    if (gridPromptText.value) {
      resetGridAssignments()
      gridPromptStatus.value = gridPromptSource.value === 'agent' ? 'AI 提示词已生成' : '已使用模板提示词'
      gridStep.value = 1
    } else {
      gridPromptStatus.value = ''
      toast.error('提示词生成失败')
    }
  } catch (e) {
    gridPromptStatus.value = ''
    toast.error(e?.message || '生成提示词失败')
  } finally {
    gridPromptLoading.value = false
  }
}

async function startGridGen() {
  let rows, cols, ids
  if (gridMode.value === 'multi_ref') {
    rows = gridAutoLayout.value.rows; cols = gridAutoLayout.value.cols; ids = [gridSingleTarget.value]
  } else {
    rows = gridAutoLayout.value.rows; cols = gridAutoLayout.value.cols; ids = gridSelected.value.slice(0, gridTotalCells.value)
    if (gridMode.value === 'first_last') ids = [...gridSelected.value]
  }
  gridActiveShotIds.value = ids.filter(Boolean)
  gridActualLayout.value = { rows, cols }
  if (!gridAssignmentsState.value.length) resetGridAssignments()
  gridStep.value = 2
  gridStatusText.value = '提交生成请求...'
  try {
    const res = await gridAPI.generate({
      storyboard_ids: ids,
      drama_id: dramaId,
      rows,
      cols,
      mode: gridMode.value,
      custom_prompt: gridPromptText.value || undefined,
    })
    gridGenId.value = res.image_generation_id
    gridActualLayout.value = res.grid || { rows, cols }
    gridStatusText.value = '等待图片生成...'
    pollGridStatus()
  } catch (e) {
    toast.error(e.message)
    gridStep.value = 0
  }
}

async function pollGridStatus() {
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 3000))
    try {
      const res = await gridAPI.status(gridGenId.value)
      gridStatusText.value = `状态: ${res.status}`
      if (res.status === 'completed' && res.local_path) {
        gridImagePath.value = res.local_path
        gridGenId.value = gridGenId.value || res.id || null
        persistGridImagePath(res.local_path)
        gridStep.value = 3
        return
      }
      if (res.status === 'failed') {
        toast.error(res.error_msg || '生成失败')
        gridStep.value = 0
        return
      }
    } catch {}
  }
  toast.error('生成超时'); gridStep.value = 0
}

async function loadLatestGridImage() {
  try {
    const rows = await imageAPI.list({ drama_id: dramaId })
    const list = Array.isArray(rows) ? rows : []
    const grids = list
      .filter((row) => row?.status === 'completed' && String(row?.frame_type || row?.frameType || '').startsWith('grid_') && (row?.local_path || row?.localPath))
      .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0))
      .map((row) => {
        const frameType = String(row?.frame_type || row?.frameType || '')
        const parsedLayout = parseGridLayoutFromFrameType(frameType) || { rows: 3, cols: 3 }
        return {
          id: row.id,
          localPath: row?.local_path || row?.localPath || '',
          layout: parsedLayout,
          modeLabel: frameType.replace(/^grid_/, '').replace(/_/g, ' · '),
          createdAtLabel: row?.created_at || row?.createdAt || '',
        }
      })

    gridHistory.value = grids

    const cached = restoreGridState()
    const preferredPath = cached?.activeImagePath && grids.some(item => item.localPath === cached.activeImagePath)
      ? cached.activeImagePath
      : grids[0]?.localPath
    const current = grids.find(item => item.localPath === preferredPath)
    if (current) {
      const cachedEntry = cached?.entries?.[current.localPath] || {}
      applyGridState(current.localPath, {
        ...current,
        ...cachedEntry,
        generationId: cachedEntry.generationId || current.id,
        recoveredAt: cachedEntry.recoveredAt || current.createdAtLabel,
        recoveredMode: cachedEntry.recoveredMode || current.modeLabel,
      })
      if (!gridAssignmentsState.value.length) resetGridAssignments()
      persistGridImagePath(current.localPath)
      return
    }
  } catch {}

  const cached = restoreGridState()
  if (cached?.activeImagePath) {
    const cachedEntry = cached?.entries?.[cached.activeImagePath] || {}
    applyGridState(cached.activeImagePath, {
      ...cachedEntry,
      recoveredAt: cachedEntry.recoveredAt || '',
      recoveredMode: cachedEntry.recoveredMode || '',
    })
  }
}

async function doGridSplit() {
  const { rows, cols } = gridActualLayout.value
  try {
    const assignments = gridAssignments.value
      .filter(item => !!item.storyboard_id)
      .map(item => ({ storyboard_id: item.storyboard_id, frame_type: item.frame_type }))
    if (!assignments.length) {
      toast.warning('请至少分配一个格子')
      return
    }
    await gridAPI.split({ image_generation_id: gridGenId.value, rows, cols, assignments })
    persistGridImagePath(gridImagePath.value)
    gridStep.value = 4
    toast.success('切分分配完成')
  } catch (e) {
    toast.error(e.message)
  }
}

const charImgCount = computed(() => visualChars.value.filter(c => c.image_url || c.imageUrl).length)
const sceneImgCount = computed(() => scenes.value.filter(s => s.image_url || s.imageUrl).length)
const ttsEligibleCount = computed(() => sbs.value.filter(s => hasDialogue(s)).length)
const ttsGeneratedCount = computed(() => sbs.value.filter(s => hasDialogue(s) && hasTTS(s)).length)
const shotImgCount = computed(() => sbs.value.filter(s => s.first_frame_image || s.firstFrameImage || s.last_frame_image || s.lastFrameImage || s.composed_image || s.composedImage).length)
const visualCharTotal = computed(() => visualChars.value.length)

const prodTabDefs = computed(() => [
  { id: 'chars', label: '角色形象', icon: Users, badge: visualCharTotal.value ? `${charImgCount.value}/${visualCharTotal.value}` : '' },
  { id: 'scenes', label: '场景图片', icon: MapPin, badge: sceneImgCount.value ? `${sceneImgCount.value}/${scenes.value.length}` : '' },
  { id: 'dubbing', label: '配音生成', icon: Mic2, badge: '' },
  { id: 'shots', label: '镜头图片', icon: ImageIcon, badge: shotImgCount.value ? `${shotImgCount.value}/${sbs.value.length}` : '' },
])

const mainStageDefs = [
  { id: 'script', label: '剧本', desc: '内容改写与整理', icon: FileText },
  { id: 'assets', label: '资产', desc: '角色、场景与音色', icon: FolderKanban },
  { id: 'storyboard', label: '分镜', desc: '镜头制作与合成', icon: Clapperboard },
  { id: 'export', label: '导出', desc: '拼接与成片输出', icon: Download },
]

const sidebarSections = computed(() => ([
  {
    id: 'script',
    label: '剧本',
    items: [
      { key: 'script:raw', label: '原始内容', desc: '', icon: FileText, done: !!rawContent.value },
      { key: 'script:rewrite', label: 'AI 改写', desc: '', icon: FileText, done: !!scriptContent.value },
      { key: 'script:extract', label: '提取', desc: '', icon: Users, done: !!chars.value.length },
      { key: 'script:voice', label: '音色', desc: '', icon: Mic2, done: !!chars.value.length && charsVoiced.value === chars.value.length },
      { key: 'script:storyboard', label: '分镜', desc: '', icon: Clapperboard, done: !!sbs.value.length },
    ],
  },
  {
    id: 'production',
    label: '制作',
    items: [
      { key: 'prod:chars', label: '角色形象', desc: '', icon: Users, done: prodStepDone('chars') },
      { key: 'prod:scenes', label: '场景图片', desc: '', icon: MapPin, done: prodStepDone('scenes') },
      { key: 'prod:dubbing', label: '配音生成', desc: '', icon: Mic2, done: prodStepDone('dubbing') },
      { key: 'prod:shots', label: '镜头图片', desc: '', icon: ImageIcon, done: prodStepDone('shots') },
    ],
  },
  {
    id: 'export',
    label: '导出',
    items: [
    ],
  },
]))

const activeMainStage = computed(() => {
  if (panel.value === 'export') return 'export'
  if (panel.value === 'production') {
    return ['chars', 'scenes'].includes(prodTab.value) ? 'assets' : 'storyboard'
  }
  if (scriptStep.value <= 1) return 'script'
  if (scriptStep.value <= 3) return 'assets'
  return 'storyboard'
})

function mainStageDone(stageId) {
  if (stageId === 'script') return !!scriptContent.value
  if (stageId === 'assets') {
    const charsReady = !!chars.value.length && charsVoiced.value === chars.value.length
    const charImagesReady = !visualCharTotal.value || charImgCount.value === visualCharTotal.value
    const sceneImagesReady = !scenes.value.length || sceneImgCount.value === scenes.value.length
    return charsReady && charImagesReady && sceneImagesReady
  }
  if (stageId === 'storyboard') {
    if (!sbs.value.length) return false
    const ttsReady = !ttsEligibleCount.value || ttsGeneratedCount.value === ttsEligibleCount.value
    return ttsReady
      && shotImgCount.value === sbs.value.length
  }
  return false
}

function goMainStage(stageId) {
  if (stageId === 'script') {
    panel.value = 'script'
    scriptStep.value = Math.min(scriptStep.value, 1)
    return
  }
  if (stageId === 'assets') {
    const hasAssetWorkspace = !!visualCharTotal.value || !!scenes.value.length
    const hasPendingAssetGeneration = (visualCharTotal.value && charImgCount.value < visualCharTotal.value)
      || (scenes.value.length && sceneImgCount.value < scenes.value.length)
    if (panel.value === 'production' || hasPendingAssetGeneration || hasAssetWorkspace) {
      panel.value = 'production'
      prodTab.value = ['chars', 'scenes'].includes(prodTab.value) ? prodTab.value : 'chars'
      return
    }
    panel.value = 'script'
    scriptStep.value = chars.value.length ? 3 : 2
    return
  }
  if (stageId === 'storyboard') {
    if (panel.value === 'production') {
      prodTab.value = ['dubbing', 'shots'].includes(prodTab.value) ? prodTab.value : 'dubbing'
      return
    }
    panel.value = 'script'
    scriptStep.value = 4
    return
  }
  panel.value = 'export'
}

const activeSubSteps = computed(() => {
  if (activeMainStage.value === 'script') {
    return [
      { key: 'script:raw', label: '原始内容', done: !!rawContent.value },
      { key: 'script:rewrite', label: 'AI 改写', done: !!scriptContent.value },
    ]
  }
  if (activeMainStage.value === 'assets') {
    return [
      { key: 'script:extract', label: '提取角色场景', done: !!chars.value.length },
      { key: 'script:voice', label: '分配音色', done: !!chars.value.length && charsVoiced.value === chars.value.length },
      { key: 'prod:chars', label: '角色形象', done: !visualCharTotal.value || charImgCount.value === visualCharTotal.value },
      { key: 'prod:scenes', label: '场景图片', done: !scenes.value.length || sceneImgCount.value === scenes.value.length },
    ]
  }
  if (activeMainStage.value === 'storyboard') {
    return [
      { key: 'script:storyboard', label: '分镜拆解', done: !!sbs.value.length },
      { key: 'prod:dubbing', label: '配音生成', done: !ttsEligibleCount.value || ttsGeneratedCount.value === ttsEligibleCount.value },
      { key: 'prod:shots', label: '镜头图片', done: !!sbs.value.length && shotImgCount.value === sbs.value.length },
    ]
  }
  return [
  ]
})

const activeSubStepKey = computed(() => {
  if (panel.value === 'script') {
    if (scriptStep.value === 0) return 'script:raw'
    if (scriptStep.value === 1) return 'script:rewrite'
    if (scriptStep.value === 2) return 'script:extract'
    if (scriptStep.value === 3) return 'script:voice'
    return 'script:storyboard'
  }
  if (panel.value === 'production') return `prod:${prodTab.value}`
  return 'export:merge'
})

const sidebarJumpSteps = computed(() => {
  const section = sidebarSections.value.find((item) => item.items.some(step => step.key === activeSubStepKey.value))
  return section?.items || []
})

const bubbleSteps = computed(() => {
  if (panel.value === 'script') {
    return [
      { key: 'script:raw', label: '原始内容', done: !!rawContent.value },
      { key: 'script:rewrite', label: 'AI 改写', done: !!scriptContent.value },
      { key: 'script:extract', label: '提取', done: !!chars.value.length },
      { key: 'script:voice', label: '音色', done: !!chars.value.length && charsVoiced.value === chars.value.length },
      { key: 'script:storyboard', label: '分镜', done: !!sbs.value.length },
    ]
  }
  if (panel.value === 'production') {
    return prodTabDefs.value.map(step => ({
      key: `prod:${step.id}`,
      label: step.label,
      done: prodStepDone(step.id),
    }))
  }
  return []
})

const activeBubbleKey = computed(() => {
  if (panel.value === 'script') return activeSubStepKey.value
  if (panel.value === 'production') return `prod:${prodTab.value}`
  return ''
})

const showBottomBubble = computed(() => panel.value === 'script' || panel.value === 'production')

function goSubStep(key) {
  if (key.startsWith('script:')) {
    panel.value = 'script'
    const stepMap = {
      'script:raw': 0,
      'script:rewrite': 1,
      'script:extract': 2,
      'script:voice': 3,
      'script:storyboard': 4,
    }
    scriptStep.value = stepMap[key] ?? 0
    return
  }
  if (key.startsWith('prod:')) {
    panel.value = 'production'
    prodTab.value = key.replace('prod:', '')
    return
  }
  panel.value = 'export'
}

const pipelineProgress = computed(() => {
  let p = 0
  if (rawContent.value) p++
  if (scriptContent.value) p++
  if (chars.value.length) p++
  if (charsVoiced.value) p++
  if (sbs.value.length) p++
  if (sbs.value.length && (!ttsEligibleCount.value || ttsGeneratedCount.value === ttsEligibleCount.value)) p++
  if (sbs.value.some(s => s.composed_image || s.composedImage)) p++
  return p
})

const currentStageLabel = computed(() => {
  if (panel.value === 'script') return `剧本阶段 · ${stepLabels[scriptStep.value]}`
  if (panel.value === 'production') return `制作阶段 · ${prodTabDefs.value[prodTabIdx.value]?.label || '制作'}`
})

const currentMainStageLabel = computed(() => {
  const current = mainStageDefs.find(stage => stage.id === activeMainStage.value)
  return current?.label || '工作台'
})

const currentSubStageLabel = computed(() => {
  const current = activeSubSteps.value.find(step => step.key === activeSubStepKey.value)
  return current?.label || currentStageLabel.value
})

function updateCharVoice(charId, voiceId) {
  characterAPI.update(charId, { voice_style: voiceId, voice_provider: lockedAudioProvider.value || undefined })
  const c = chars.value.find(ch => ch.id === charId)
  if (c) {
    c.voice_style = voiceId
    c.voiceStyle = voiceId
    c.voice_provider = lockedAudioProvider.value || ''
    c.voiceProvider = lockedAudioProvider.value || ''
    c.voice_sample_url = ''
    c.voiceSampleUrl = ''
  }
}
function getVoiceProfile(voiceId) {
  return voiceProfiles.value.find(v => v.id === voiceId) || null
}
const totalDuration = computed(() => sbs.value.reduce((s, sb) => s + (sb.duration || 10), 0))

const selectedSb = ref(null)
const shotTypes = [
  '大远景', '远景', '全景', '中景', '中近景', '近景', '特写', '大特写',
  '双人镜头', '三人镜头', '群像', '背影', '侧面', '正面', '俯视', '仰视',
  '过肩', '主观视角', '航拍', '运动镜头',
]
const shotAngles = ['平视', '仰视', '俯视', '侧拍', '背拍', '斜侧', '主观视角', '过肩']
const shotMovements = ['固定', '推镜', '拉镜', '摇镜', '移镜', '跟拍', '升降', '手持', '环绕']

function updateField(sb, field, value) {
  const current = sb[field] ?? sb[toCamel(field)]
  if (current === value) return
  sb[field] = value
  const camelField = toCamel(field)
  if (camelField !== field) sb[camelField] = value
  storyboardAPI.update(sb.id, { [field]: value })
}

function toCamel(field) {
  return field.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function getStoryboardCharacterIds(sb) {
  return sb?.character_ids || sb?.characterIds || []
}

function getStoryboardCharacterNames(sb) {
  const ids = getStoryboardCharacterIds(sb)
  return chars.value.filter(char => ids.includes(char.id)).map(char => char.name)
}

function isStoryboardCharacterSelected(sb, charId) {
  return getStoryboardCharacterIds(sb).includes(charId)
}

function toggleStoryboardCharacter(sb, charId) {
  const currentIds = getStoryboardCharacterIds(sb)
  const nextIds = currentIds.includes(charId)
    ? currentIds.filter(id => id !== charId)
    : [...currentIds, charId]
  updateField(sb, 'character_ids', nextIds)
}

function getSceneName(sb) {
  const sceneId = sb?.scene_id || sb?.sceneId
  if (!sceneId) return '未绑定场景'
  const scene = scenes.value.find(s => s.id === sceneId)
  return scene ? `${scene.location} · ${scene.time || '未设时间'}` : `场景 #${sceneId}`
}

async function deleteShot(sb) {
  if (!confirm('确定删除此镜头？')) return
  const idx = sbs.value.indexOf(sb)
  await storyboardAPI.del(sb.id)
  await refresh()
  if (sbs.value.length) selectedSb.value = sbs.value[Math.min(idx, sbs.value.length - 1)]
  else selectedSb.value = null
}

const scriptSteps = computed(() => {
  const hasScript = !!scriptContent.value
  const hasChars = chars.value.length > 0 && hasScript
  const hasVoice = charsVoiced.value > 0 && hasChars
  const hasSbs = sbs.value.length > 0
  return [
    { label: '原始内容', state: rawContent.value ? 'done' : 'active', spinning: false },
    { label: 'AI 改写', state: hasScript ? 'done' : (rawContent.value ? 'active' : ''), spinning: rt.value === 'script_rewriter' },
    { label: '提取', state: hasChars ? 'done' : (hasScript ? 'active' : ''), spinning: rt.value === 'extractor' },
    { label: '音色', state: hasVoice ? 'done' : (hasChars ? 'active' : ''), spinning: rt.value === 'voice_assigner' },
    { label: '分镜', state: hasSbs ? 'done' : (hasVoice ? 'active' : ''), spinning: rt.value === 'storyboard_breaker' },
  ]
})

watch(rawContent, v => { localRaw.value = v }, { immediate: true })
watch(scriptContent, v => { localScript.value = v }, { immediate: true })

async function refresh() {
  try {
    drama.value = await dramaAPI.get(dramaId)
    const ep = drama.value.episodes?.find(e => (e.episode_number || e.episodeNumber) === episodeNumber)
    if (ep) {
      episode.value = ep
      try { chars.value = await episodeAPI.characters(ep.id) } catch { chars.value = [] }
      try { scenes.value = await episodeAPI.scenes(ep.id) } catch { scenes.value = [] }
      sbs.value = await episodeAPI.storyboards(ep.id)
      if (sbs.value.length && !selectedSb.value) selectedSb.value = sbs.value[0]

      const epHasContent = !!(episode.value?.content)
      const epHasScript = !!(episode.value?.script_content || episode.value?.scriptContent)
      const epHasSbs = sbs.value.length > 0

      if (epHasSbs) scriptStep.value = 4
      else if (epHasScript && chars.value.some(c => c.voice_style || c.voiceStyle)) scriptStep.value = 3
      else if (epHasScript && chars.value.length) scriptStep.value = 2
      else if (epHasScript || epHasContent) scriptStep.value = 1
      else scriptStep.value = 0
      await loadLatestGridImage()
    }
  } catch (e) {
    toast.error(e.message)
  }
}

function saveRaw() { episodeAPI.update(epId.value, { content: localRaw.value }); episode.value.content = localRaw.value }
function saveScr() { episodeAPI.update(epId.value, { script_content: localScript.value }); episode.value.script_content = localScript.value }
function doRewrite() { saveRaw(); runAgent('script_rewriter', '请读取剧本并改写为格式化剧本，然后保存', dramaId, epId.value, refresh) }
function skipRewrite() {
  const raw = (localRaw.value || rawContent.value || '').trim()
  if (!raw) {
    toast.warning('请先填写原始内容')
    return
  }
  localScript.value = raw
  saveScr()
  toast.success('已跳过 AI 改写，当前将直接使用原始内容')
  scriptStep.value = 2
}
function doExtract() { saveScr(); runAgent('extractor', '请从剧本中提取所有角色和场景信息，提取时自动与项目已有数据进行去重合并', dramaId, epId.value, refresh) }
function doVoice() { runAgent('voice_assigner', '请为所有角色分配合适的音色', dramaId, epId.value, refresh) }
async function batchGenSamples() {
  const pending = chars.value.filter(c => (c.voice_style || c.voiceStyle) && !(c.voice_sample_url || c.voiceSampleUrl))
  if (!pending.length) {
    toast.info(charsVoiced.value ? '所有角色的试听文件已生成' : '请先分配音色')
    return
  }
  const results = await Promise.allSettled(pending.map(c => characterAPI.voiceSample(c.id, epId.value)))
  const okCount = results.filter(r => r.status === 'fulfilled').length
  const failCount = results.length - okCount
  if (okCount) toast.success(`已生成 ${okCount} 份试听文件`)
  if (failCount) toast.error(`${failCount} 份试听文件生成失败`)
  await refresh()
}
function doBreakdown() {
  runAgent('storyboard_breaker', '请拆解分镜', dramaId, epId.value, refresh)
}
async function handleEpisodeCreativeCommitted() {
  await refresh()
}
async function handleEpisodeRewriteCommitted() {
  await refresh()
  if (!(episode.value?.content || localRaw.value || rawContent.value)) {
    toast.warning('当前集还没有可改写的初稿内容')
    return
  }
  panel.value = 'script'
  scriptStep.value = 1
  doRewrite()
}
async function genSample(id) { try { await characterAPI.voiceSample(id, epId.value); toast.success('试听已生成'); refresh() } catch (e) { toast.error(e.message) } }
async function addShot() { await storyboardAPI.create({ episode_id: epId.value, storyboard_number: sbs.value.length + 1, title: `镜头${sbs.value.length + 1}`, duration: 10 }); refresh() }

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function watchAsyncResult(check, attempts = 24, delay = 2500) {
  void (async () => {
    for (let i = 0; i < attempts; i++) {
      await sleep(delay)
      await refresh()
      if (check()) return
    }
  })()
}

async function genCharImg(id) {
  try {
    if (!isPendingCharImage(id)) pendingCharImageIds.value.push(id)
    await characterAPI.generateImage(id, epId.value)
    toast.success('角色图片生成中')
    await refresh()
    watchAsyncResult(() => {
      const char = chars.value.find(c => c.id === id)
      const done = !!(char?.image_url || char?.imageUrl)
      if (done) pendingCharImageIds.value = pendingCharImageIds.value.filter(item => item !== id)
      return done
    })
  } catch (e) {
    pendingCharImageIds.value = pendingCharImageIds.value.filter(item => item !== id)
    toast.error(e.message)
  }
}
function batchCharImages() {
  const ids = visualChars.value.filter(c => !(c.image_url || c.imageUrl)).map(c => c.id)
  if (!ids.length) { toast.info('所有角色图片已生成'); return }
  pendingCharImageIds.value = [...new Set([...pendingCharImageIds.value, ...ids])]
  characterAPI.batchImages(ids, epId.value).then(async () => {
    toast.success('角色图片批量生成中')
    await refresh()
    watchAsyncResult(() => ids.every(id => {
      const char = chars.value.find(c => c.id === id)
      const done = !!(char?.image_url || char?.imageUrl)
      if (done) pendingCharImageIds.value = pendingCharImageIds.value.filter(item => item !== id)
      return done
    }), 36)
  }).catch(e => {
    pendingCharImageIds.value = pendingCharImageIds.value.filter(item => !ids.includes(item))
    toast.error(e.message)
  })
}
async function genSceneImg(id) {
  try {
    if (!isPendingSceneImage(id)) pendingSceneImageIds.value.push(id)
    await sceneAPI.generateImage(id, epId.value)
    toast.success('场景图片生成中')
    await refresh()
    watchAsyncResult(() => {
      const scene = scenes.value.find(s => s.id === id)
      const done = !!(scene?.image_url || scene?.imageUrl)
      if (done) pendingSceneImageIds.value = pendingSceneImageIds.value.filter(item => item !== id)
      return done
    })
  } catch (e) {
    pendingSceneImageIds.value = pendingSceneImageIds.value.filter(item => item !== id)
    toast.error(e.message)
  }
}
function batchSceneImages() {
  const ids = scenes.value.filter(s => !(s.image_url || s.imageUrl)).map(s => s.id)
  if (!ids.length) { toast.info('所有场景图片已生成'); return }
  pendingSceneImageIds.value = [...new Set([...pendingSceneImageIds.value, ...ids])]
  ids.forEach(id => { sceneAPI.generateImage(id, epId.value).then(() => refresh()).catch(e => toast.error(e.message)) })
  toast.success('场景图片批量生成中')
  watchAsyncResult(() => ids.every(id => {
    const scene = scenes.value.find(s => s.id === id)
    const done = !!(scene?.image_url || scene?.imageUrl)
    if (done) pendingSceneImageIds.value = pendingSceneImageIds.value.filter(item => item !== id)
    return done
  }), 36)
}

const IGNORE_TTS_SPEAKERS = /^(环境音|环境声|音效|效果音|sfx|sound ?effect|bgm|背景音|背景音乐|ambient)$/i
const IGNORE_TTS_TEXT = /^(无|无对白|无台词|无旁白|无需配音|无需对白|none|null|n\/a|na|环境音|环境声|音效|效果音|纯音效|纯环境音|只有环境音|仅环境音|背景音|背景音乐|bgm|sfx|ambient)$/i

function getDialogueSpeakerRaw(sb) {
  const dialogue = sb?.dialogue?.trim() || ''
  const match = dialogue.match(/^(.+?)[:：]/)
  return match ? match[1].replace(/[（(].+?[)）]/g, '').trim() : ''
}

function getDialogueText(sb) {
  const dialogue = sb?.dialogue?.trim() || ''
  return dialogue ? dialogue.replace(/^.+?[:：]\s*/, '').trim() : ''
}

function isTTSIgnorable(sb) {
  const speaker = getDialogueSpeakerRaw(sb)
  const text = getDialogueText(sb)
  if (!sb?.dialogue?.trim()) return true
  if (speaker && IGNORE_TTS_SPEAKERS.test(speaker)) return true
  if (!text) return true
  if (IGNORE_TTS_TEXT.test(text)) return true
  return false
}

function hasDialogue(sb) { return !isTTSIgnorable(sb) }
function hasTTS(sb) { return !!(sb?.tts_audio_url || sb?.ttsAudioUrl) }
function getTTSUrl(sb) { return sb?.tts_audio_url || sb?.ttsAudioUrl || '' }
function getDialogueSpeaker(sb) {
  const speaker = getDialogueSpeakerRaw(sb)
  if (!speaker) return '旁白'
  return speaker
}
async function genShotTTS(sb) {
  try {
    await storyboardAPI.generateTTS(sb.id)
    toast.success(`镜头 #${sb.storyboard_number || sb.storyboardNumber || sb.id} 配音已生成`)
    await refresh()
  } catch (e) { toast.error(e.message) }
}
async function batchShotTTS() {
  const pending = sbs.value.filter(sb => hasDialogue(sb) && !hasTTS(sb))
  if (!pending.length) {
    toast.info(ttsEligibleCount.value ? '所有镜头配音已生成' : '当前没有可生成的对白或旁白')
    return
  }
  const results = await Promise.allSettled(pending.map(sb => storyboardAPI.generateTTS(sb.id)))
  const okCount = results.filter(r => r.status === 'fulfilled').length
  const failCount = results.length - okCount
  if (okCount) toast.success(`已生成 ${okCount} 条镜头配音`)
  if (failCount) toast.error(`${failCount} 条镜头配音生成失败`)
  await refresh()
}

function getFirstFrame(s) { return s?.first_frame_image || s?.firstFrameImage || null }
function getLastFrame(s) { return s?.last_frame_image || s?.lastFrameImage || null }
function getStoryboardCover(s) { return s?.composed_image || s?.composedImage || getFirstFrame(s) || getLastFrame(s) || null }
function hasImg(s) { return !!getStoryboardCover(s) }

function getShotReferenceImages(sb) {
  const refs = []
  const pushRef = (value) => {
    if (!value || refs.includes(value) || refs.length >= 6) return
    refs.push(value)
  }
  const sceneId = sb?.scene_id || sb?.sceneId
  const scene = scenes.value.find(item => item.id === sceneId)
  pushRef(scene?.image_url || scene?.imageUrl)
  for (const charId of getStoryboardCharacterIds(sb)) {
    const char = chars.value.find(item => item.id === charId)
    pushRef(char?.image_url || char?.imageUrl)
  }
  for (const ref of getRefs(sb)) {
    pushRef(ref)
  }
  const first = getFirstFrame(sb)
  const last = getLastFrame(sb)
  pushRef(first)
  pushRef(last)
  return refs.filter(Boolean).slice(0, 6)
}

function buildShotImagePrompt(sb, frameType) {
  const title = sb.title || ''
  const description = sb.image_prompt || sb.imagePrompt || sb.description || ''
  const shotType = sb.shot_type || sb.shotType || ''
  const angle = sb.angle || ''
  const movement = sb.movement || ''
  const location = sb.location || getSceneName(sb)
  const time = sb.time || ''
  const charactersText = getStoryboardCharacterNames(sb).join('、')
  const action = sb.action || ''
  const atmosphere = sb.atmosphere || ''
  const frameHint = frameType === 'first_frame'
    ? '生成这个镜头的起始关键帧，突出建立关系和动作开始瞬间'
    : '生成这个镜头的结束关键帧，突出动作结束、情绪落点或结果状态'

  return [
    title ? `镜头标题：${title}` : '',
    description ? `画面描述：${description}` : '',
    shotType ? `景别：${shotType}` : '',
    angle ? `机位：${angle}` : '',
    movement ? `运镜：${movement}` : '',
    charactersText ? `角色：${charactersText}` : '',
    location ? `地点：${location}` : '',
    time ? `时间：${time}` : '',
    action ? `动作：${action}` : '',
    atmosphere ? `氛围：${atmosphere}` : '',
    frameHint,
  ].filter(Boolean).join('；')
}

async function genShotFrame(sb, frameType) {
  const prompt = buildShotImagePrompt(sb, frameType)
  const referenceImages = getShotReferenceImages(sb)
  const key = framePendingKey(sb.id, frameType)
  try {
    if (!pendingShotFrameKeys.value.includes(key)) pendingShotFrameKeys.value.push(key)
    const body = {
      storyboard_id: sb.id,
      drama_id: dramaId,
      prompt,
      frame_type: frameType,
      reference_images: referenceImages.length ? referenceImages : undefined,
    }
    await imageAPI.generate(body)
    toast.success(frameType === 'first_frame' ? '首帧生成中' : '尾帧生成中')
    await refresh()
    watchAsyncResult(() => {
      const target = sbs.value.find(s => s.id === sb.id)
      const done = frameType === 'first_frame' ? !!getFirstFrame(target) : !!getLastFrame(target)
      if (done) pendingShotFrameKeys.value = pendingShotFrameKeys.value.filter(item => item !== key)
      return done
    })
  } catch (e) {
    pendingShotFrameKeys.value = pendingShotFrameKeys.value.filter(item => item !== key)
    toast.error(e.message)
  }
}


function getRefs(sb) {
  const raw = sb.reference_images || sb.referenceImages
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

async function loadConfigs() {
  try {
    const [imgCfgs, audCfgs] = await Promise.all([
      aiConfigAPI.list('image'),
      aiConfigAPI.list('audio'),
    ])
    imageConfigs.value = imgCfgs || []
    audioConfigs.value = audCfgs || []
  } catch (e) { console.error('Failed to load AI configs', e) }
}

function inferVoiceGender(name, desc = []) {
  const text = `${name} ${Array.isArray(desc) ? desc.join(' ') : ''}`
  if (/[男|青年|大爷|学长|boy|man|male]/i.test(text)) return '男声'
  if (/[女|少女|御姐|奶奶|girl|woman|female]/i.test(text)) return '女声'
  return '中性'
}

function mapVoiceProfile(v) {
  const desc = Array.isArray(v.description) ? v.description : []
  return {
    id: v.voice_id,
    label: v.voice_name || v.voice_id,
    gender: inferVoiceGender(v.voice_name || v.voice_id, desc),
    traits: desc.length ? desc.slice(0, 2).join('、') : `${v.language || '多语言'}音色`,
    suitable: desc.length > 2 ? desc.slice(2).join('、') : `${v.language || '通用'}角色`,
  }
}

async function loadVoices() {
  try {
    const provider = lockedAudioProvider.value || 'minimax'
    const rows = await voicesAPI.list(provider)
    voiceProfiles.value = rows?.length ? rows.map(mapVoiceProfile) : fallbackVoiceProfiles
  } catch (e) {
    console.error('Failed to load voices', e)
    voiceProfiles.value = fallbackVoiceProfiles
  }
}

watch([lockedAudioConfigId, audioConfigs], () => { loadVoices() }, { deep: true })
onMounted(() => { refresh(); loadConfigs(); loadVoices() })


function focusSb(index) {}
</script>

<style scoped>
/* === FIGMA EDITOR LAYOUT === */
.figma-editor {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: var(--bg-1);
  overflow: hidden;
}

/* TOPBAR */
.figma-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 48px;
  background: var(--white);
  border-bottom: 1px solid var(--border);
  padding: 0 16px;
  flex-shrink: 0;
  z-index: 10;
}
.topbar-left, .topbar-center, .topbar-right {
  display: flex; align-items: center; gap: 12px; flex: 1;
}
.topbar-center {
  justify-content: center; flex: 2; gap: 4px;
}
.topbar-right {
  justify-content: flex-end;
}
.icon-btn {
  background: transparent; border: none; padding: 6px; cursor: pointer; border-radius: var(--radius-circle);
  color: var(--black); transition: 0.2s;
}
.icon-btn:hover { background: var(--bg-2); }
.file-name { font-weight: 500; font-size: 14px; letter-spacing: -0.14px; }
.file-slash { color: var(--text-3); margin: 0 4px; }
.topbar-meta { font-size: 12px; color: var(--text-2); background: var(--bg-2); padding: 4px 10px; border-radius: var(--radius-pill); }

/* TABS */
.figma-tabs .tab {
  padding: 6px 16px; background: transparent; border: none; border-radius: var(--radius-pill);
  font-size: 13px; font-weight: 500; color: var(--text-2); cursor: pointer; transition: 0.2s;
  letter-spacing: -0.14px;
}
.figma-tabs .tab:hover:not(:disabled) { background: var(--bg-2); color: var(--black); }
.figma-tabs .tab.active { background: var(--black); color: var(--white); }
.figma-tabs .tab:disabled { opacity: 0.3; cursor: not-allowed; }
.figma-tabs .tab:focus-visible { outline: dashed 2px var(--black); }

/* WORKSPACE */
.figma-workspace {
  display: flex; flex: 1; min-height: 0;
}

/* LAYERS PANEL */
.figma-layers {
  width: 240px;
  background: var(--bg-0);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
}
.layers-header {
  height: 48px; border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 16px;
}
.layers-title { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.6px; color: var(--black); font-weight: 600; text-transform: uppercase; }
.layers-content {
  flex: 1; overflow-y: auto; padding: 8px 0;
}
.layer-item {
  padding: 8px 16px; font-size: 13px; color: var(--text-1); cursor: pointer; display: flex; align-items: center;
  transition: 0.1s; letter-spacing: -0.14px; font-weight: 400;
}
.layer-item:hover { background: var(--bg-2); }
.layer-item.active { background: var(--glass-dark); color: var(--black); font-weight: 600; }
.layer-group {
  padding: 16px 16px 4px; font-family: var(--font-mono); font-size: 10px; font-weight: 500; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.6px;
}
.layer-item.leaf { padding-left: 32px; font-size: 12.5px; }

/* CANVAS & INSPECTOR */
.figma-canvas-container {
  flex: 1; display: flex; min-width: 0; position: relative; background: var(--bg-1);
}
.canvas-wrapper {
  flex: 1; display: flex; flex-direction: column; min-width: 0; height: 100%;
}
.canvas-wrapper.split { flex-direction: row; }
.canvas-area {
  flex: 1; display: flex; flex-direction: column; min-width: 0; height: 100%; overflow: hidden;
}
.bg-dotted {
  background-image: radial-gradient(var(--border) 1px, transparent 1px);
  background-size: 24px 24px;
}

/* CANVAS HEADER */
.canvas-header {
  padding: 24px 40px 16px; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;
  border-bottom: dashed 1px var(--border);
}
.canvas-header.sticky-header {
  position: sticky; top: 0; background: rgba(250,250,250,0.8); backdrop-filter: blur(8px); z-index: 10;
}
.canvas-title { font-size: 24px; font-weight: 600; letter-spacing: -0.4px; }
.actions { display: flex; gap: 8px; }

/* CANVAS SCROLL */
.canvas-scroll {
  flex: 1; overflow-y: auto; padding: 24px 40px 40px; display: flex; flex-direction: column;
}
.scroll-y { overflow-y: auto; overflow-x: hidden; }

/* TEXTAREA */
.figma-textarea {
  flex: 1; resize: none; border: none; font-family: var(--font-mono); font-size: 14px;
  line-height: 1.8; padding: 40px; border-radius: var(--radius-lg); background: var(--white);
  box-shadow: var(--shadow-sm); outline: none; border: 1px solid var(--border);
  transition: all 0.3s; width: 100%; max-width: 900px; margin: 0 auto;
}
.figma-textarea:focus {
  outline: dashed 2px var(--black);
  outline-offset: 2px;
  border-color: var(--black);
}
.hero-focus:focus {
  outline: dashed 2px var(--black) !important;
  border-color: var(--black) !important;
  caret-color: var(--black) !important;
}

/* HERO GRADIENTS */
.hero-gradient-text {
  background: var(--hero-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.bg-hero-gradient { background: var(--hero-gradient); color: var(--white); }

/* GALLERY GRID */
.entity-gallery { padding: 40px; max-width: 1200px; margin: 0 auto; width: 100%; }
.mt-6 { margin-top: 32px; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; padding: 20px 40px; }
.figma-card {
  background: var(--white); border-radius: var(--radius-md); border: 1px solid var(--border);
  overflow: hidden; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column;
}
.figma-card:hover { border-color: var(--border-strong); box-shadow: var(--shadow-sm); transform: translateY(-2px); }
.figma-card.active { outline: dashed 2px var(--black); outline-offset: 2px; border-color: var(--black); }
.figma-card-img { width: 100%; aspect-ratio: 1/1; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid var(--border); }
.figma-card-img.landscape { aspect-ratio: 16/9; }
.figma-placeholder-text { font-size: 40px; font-weight: 700; opacity: 0.4; }
.figma-card-body { padding: 12px; display: flex; flex-direction: column; gap: 4px; }

/* INSPECTOR */
.figma-inspector {
  width: 280px; background: var(--white); border-left: 1px solid var(--border);
  display: flex; flex-direction: column; flex-shrink: 0;
  box-shadow: -4px 0 24px rgba(0,0,0,0.03); z-index: 5;
}
.inspector-header {
  height: 48px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; padding: 0 16px;
}
.inspector-body { padding: 20px; flex: 1; overflow-y: auto; }
.field { display: flex; flex-direction: column; gap: 6px; }
.field-label { font-size: 11px; font-family: var(--font-mono); font-weight: 500; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-2); }
.input, .textarea, select.input {
  border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; font-size: 13px; outline: none; transition: 0.2s; background: var(--bg-1); width: 100%; font-family: var(--font-sans); letter-spacing: -0.14px;
}
.input:focus, .textarea:focus, select.input:focus { border-color: var(--black); background: var(--white); box-shadow: none; outline: dashed 2px var(--black); outline-offset: 1px; }
.textarea { resize: vertical; line-height: 1.5; }

/* TIMELINE (Storyboard Breakdown) */
.timeline-view { padding: 0; }
.timeline-container { padding: 40px 80px; display: flex; flex-direction: column; gap: 24px; position: relative; max-width: 900px; margin: 0 auto; }
.timeline-line { position: absolute; left: 96px; top: 0; bottom: 0; width: 2px; background: dashed 2px var(--border); z-index: 0; }
.timeline-node { display: flex; gap: 24px; position: relative; z-index: 1; align-items: flex-start; }
.timeline-marker { width: 32px; height: 32px; border-radius: var(--radius-circle); flex-shrink: 0; border: 4px solid var(--bg-1); box-shadow: 0 0 0 1px var(--border); z-index: 2; margin-top: 4px; }
.timeline-card {
  flex: 1; background: var(--white); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px;
  cursor: pointer; transition: 0.2s;
}
.timeline-card:hover { border-color: var(--border-strong); box-shadow: var(--shadow-sm); }
.timeline-node.active .timeline-card { outline: dashed 2px var(--black); outline-offset: 2px; border-color: var(--black); }
.timeline-node.active .timeline-marker { border-color: var(--black); }
.sb-kicker { margin-bottom: 8px; color: var(--text-3); font-weight: 600; }
.sb-narrative { font-size: 14px; line-height: 1.6; color: var(--black); }

/* PROD GRID */
.prod-view { display: flex; flex-direction: column; gap: 24px; }
.prod-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 24px; }
.prod-grid.landscape-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.prod-card { background: var(--white); border-radius: var(--radius-md); border: 1px solid var(--border); overflow: hidden; display: flex; flex-direction: column; }
.prod-card-vis { width: 100%; aspect-ratio: 1/1; background-size: cover; background-position: center; border-bottom: 1px solid var(--border); }
.prod-card-vis.landscape { aspect-ratio: 16/9; }
.prod-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--white); opacity: 0.8; }
.prod-card-info { padding: 16px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.voice-list { display: flex; flex-direction: column; gap: 16px; max-width: 800px; margin: 0 auto; width: 100%; }
.voice-item { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px 20px; }
.w-100 { width: 100%; }
.w-70 { width: 70%; }

/* UTILS */
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.bg-success { background: var(--success); color: var(--white); }
.mb-4 { margin-bottom: 16px; }
.mt-4 { margin-top: 16px; }
.avatar-circle { width: 28px; height: 28px; border-radius: var(--radius-circle); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
</style>
