const fs = require('fs');
const path = 'frontend/app/pages/drama/[id]/episode/[episodeNumber].vue';
const scriptContent = fs.readFileSync('.gemini/scratch/episode_script.txt', 'utf8');

const newTemplate = `
<template>
  <div class="figma-editor" v-if="drama">
    <!-- TOOLBAR (Top Chrome) -->
    <header class="figma-topbar">
      <!-- Left side: Identity and Window controls -->
      <div class="topbar-left">
        <button class="topbar-btn icon-btn" title="Back to Project" @click="navigateTo(\`/drama/\${dramaId}\`)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <div class="topbar-identity">
          <span class="file-name">{{ drama.title }} <span class="file-slash">/</span> E{{ String(episodeNumber).padStart(2,'0') }}</span>
        </div>
      </div>

      <!-- Center: Pipeline Tabs -->
      <nav class="topbar-center figma-tabs">
        <button class="tab" :class="{active: scriptStep === 0 || scriptStep === 1}" @click="scriptStep = 1">1. Script</button>
        <button class="tab" :class="{active: scriptStep === 2}" :disabled="!scriptContent" @click="scriptStep = 2">2. Extract</button>
        <button class="tab" :class="{active: scriptStep === 3}" :disabled="!chars || !chars.length" @click="scriptStep = 3">3. Cast</button>
        <button class="tab" :class="{active: scriptStep === 4}" :disabled="!chars || !chars.length" @click="scriptStep = 4">4. Breakdown</button>
        <button class="tab" :class="{active: scriptStep === 5}" :disabled="!sbs || !sbs.length" @click="scriptStep = 5">5. Production</button>
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
            <div class="layer-item" :class="{active: scriptStep === 0}" @click="scriptStep = 0">RAW MATERIAL</div>
            <div class="layer-item" :class="{active: scriptStep === 1}" @click="scriptStep = 1">REWRITTEN SCRIPT</div>
          </template>
          
          <!-- EXTRACT (2) -->
          <template v-else-if="scriptStep === 2">
            <div class="layer-group">Characters ({{chars.length}})</div>
            <div class="layer-item leaf" v-for="(c, i) in chars" :key="'char-'+i" @click="panel = 'char-'+i">{{c.name}}</div>
            <div class="layer-group">Scenes ({{scenes.length}})</div>
            <div class="layer-item leaf" v-for="(s, i) in scenes" :key="'scene-'+i" @click="panel = 'scene-'+i">{{s.name}}</div>
          </template>
          
          <!-- CAST (3) -->
          <template v-else-if="scriptStep === 3">
            <div class="layer-group">Voice Casting ({{chars.length}})</div>
            <div class="layer-item leaf" :class="{'is-voiced': c.voice}" v-for="(c, i) in chars" :key="'v-'+i" @click="panel = 'v-'+i">{{c.name}}</div>
          </template>
          
          <!-- BREAKDOWN (4) -->
          <template v-else-if="scriptStep === 4">
            <div class="layer-group">Storyboards ({{sbs.length}})</div>
            <div class="layer-item leaf" v-for="(sb, i) in sbs" :key="'sb-'+i" :class="{active: panel === 'sb-'+i}" @click="panel = 'sb-'+i; focusSb(i)">Shot {{String(i+1).padStart(3,'0')}}</div>
          </template>
          
          <!-- PRODUCTION (5) -->
          <template v-else-if="scriptStep === 5">
            <div class="layer-item" :class="{active: prodTabIdx === 0}" @click="prodTabIdx = 0">Chars</div>
            <div class="layer-item" :class="{active: prodTabIdx === 1}" @click="prodTabIdx = 1">Scenes</div>
            <div class="layer-item" :class="{active: prodTabIdx === 2}" @click="prodTabIdx = 2">Voiceovers</div>
            <div class="layer-item" :class="{active: prodTabIdx === 3}" @click="prodTabIdx = 3">Frames</div>
          </template>
        </div>
      </aside>

      <!-- CANVAS (Center) & INSPECTOR (Right) -->
      <main class="figma-canvas-container">
        <!-- STEP 0: RAW -->
        <div v-if="scriptStep === 0" class="canvas-wrapper">
          <div class="canvas-header">
            <h2 class="canvas-title hero-gradient-text">Raw Import</h2>
            <button class="btn btn-primary" @click="saveRaw">Save Raw Material</button>
          </div>
          <div class="canvas-scroll">
            <textarea class="figma-textarea hero-focus input shadow-sm" v-model="localRaw" placeholder="Paste your raw story here..."></textarea>
          </div>
        </div>

        <!-- STEP 1: REWRITE -->
        <div v-if="scriptStep === 1" class="canvas-wrapper">
          <div class="canvas-header">
            <h2 class="canvas-title hero-gradient-text">Script Construction</h2>
            <div class="actions hero-gradient-group">
               <button class="btn btn-ghost" @click="skipRewrite()">Skip</button>
               <button class="btn btn-primary" @click="doRewrite(true)">AI Rewrite</button>
               <button class="btn btn-primary" @click="saveScr()">Save Content</button>
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
               <h2 class="canvas-title hero-gradient-text">Extraction Engine</h2>
               <button class="btn btn-primary" @click="doExtract">Extract Entities</button>
             </div>
             
             <!-- Gallery View -->
             <div class="entity-gallery">
               <div class="entity-group">
                 <h3 class="mono-label hero-gradient-text">Characters</h3>
                 <div class="card-grid">
                   <div v-for="(c, i) in chars" :key="c.id" class="figma-card" :class="{active: panel === 'char-'+i}" @click="panel = 'char-'+i">
                     <div class="figma-card-img" :class="{'bg-hero-gradient': !c.imageUrl}" :style="c.imageUrl ? { backgroundImage: 'url('+c.imageUrl+')'} : {}">
                       <span v-if="!c.imageUrl" class="figma-placeholder-text">{{c.name[0]}}</span>
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
                     <div class="figma-card-img landscape" :class="{'bg-hero-gradient': !s.imageUrl}" :style="s.imageUrl ? { backgroundImage: 'url('+s.imageUrl+')'} : {}">
                       <span v-if="!s.imageUrl" class="figma-placeholder-text">{{s.name[0]}}</span>
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
              <span class="mono-sm">Character Properties</span>
              <button class="btn btn-icon btn-ghost" @click="panel=''"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div class="inspector-body" v-if="chars[parseInt(panel.split('-')[1])]">
              <label class="field"><span class="field-label">Name</span><input class="input" v-model="chars[parseInt(panel.split('-')[1])].name" /></label>
              <label class="field"><span class="field-label">Gender</span><input class="input" v-model="chars[parseInt(panel.split('-')[1])].gender" /></label>
              <label class="field"><span class="field-label">Appearance</span><textarea class="textarea" v-model="chars[parseInt(panel.split('-')[1])].appearance" rows="6"></textarea></label>
            </div>
          </aside>
          <aside class="figma-inspector" v-if="panel && panel.startsWith('scene-')">
            <div class="inspector-header">
              <span class="mono-sm">Scene Properties</span>
              <button class="btn btn-icon btn-ghost" @click="panel=''"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div class="inspector-body" v-if="scenes[parseInt(panel.split('-')[1])]">
              <label class="field"><span class="field-label">Name</span><input class="input" v-model="scenes[parseInt(panel.split('-')[1])].name" /></label>
              <label class="field"><span class="field-label">Period</span><input class="input" v-model="scenes[parseInt(panel.split('-')[1])].period" /></label>
              <label class="field"><span class="field-label">Lighting</span><input class="input" v-model="scenes[parseInt(panel.split('-')[1])].lighting" /></label>
              <label class="field"><span class="field-label">Visual Feel</span><textarea class="textarea" v-model="scenes[parseInt(panel.split('-')[1])].visual_feel" rows="6"></textarea></label>
            </div>
          </aside>
        </div>

        <!-- STEP 3: VOICES -->
        <div v-if="scriptStep === 3" class="canvas-wrapper split" :class="{'has-inspector': panel && panel.startsWith('v-')}">
          <div class="canvas-area bg-dotted">
            <div class="canvas-header">
               <h2 class="canvas-title hero-gradient-text">Voice Casting</h2>
               <button class="btn btn-primary" @click="doVoice">Auto Assign Voices</button>
            </div>
            <div class="card-grid">
               <div v-for="(c, i) in chars" :key="'vc-'+i" class="figma-card" :class="{active: panel === 'v-'+i}" @click="panel = 'v-'+i">
                 <div class="figma-card-body">
                   <div class="flex items-center gap-2 mb-2">
                     <span class="avatar-circle" :class="c.voice ? 'bg-success' : 'bg-hero-gradient'">{{c.name[0]}}</span>
                     <div class="font-600 truncate">{{ c.name }}</div>
                   </div>
                   <div class="tag" :class="c.voice ? 'tag-accent' : 'tag-error'">
                     {{ c.voice ? (Object.values(voiceProfiles).find(vp => vp.voice_id === c.voice)?.name || 'Custom Voice') : 'No Voice Assigned' }}
                   </div>
                 </div>
               </div>
            </div>
          </div>
          <aside class="figma-inspector" v-if="panel && panel.startsWith('v-')">
            <div class="inspector-header">
              <span class="mono-sm">Audio Configuration</span>
              <button class="btn btn-icon btn-ghost" @click="panel=''"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div class="inspector-body" v-if="chars[parseInt(panel.split('-')[1])]">
               <h3 class="font-600">{{ chars[parseInt(panel.split('-')[1])].name }}</h3>
               <label class="field mt-4">
                 <span class="field-label">Selected Voice</span>
                 <select class="input" v-model="chars[parseInt(panel.split('-')[1])].voice">
                   <option value="">-- Auto Model Voice --</option>
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
               <h2 class="canvas-title hero-gradient-text">Storyboard Sequences</h2>
               <div class="actions">
                 <button class="btn btn-ghost" @click="addShot(-1)">+ Add First</button>
                 <button class="btn btn-primary" @click="doBreakdown">Breakdown AI</button>
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
              <span class="mono-sm">Shot Inspector</span>
              <button class="btn btn-icon btn-ghost" @click="panel=''"><svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div class="inspector-body" v-if="sbs[parseInt(panel.split('-')[1])]">
               <div class="flex justify-between items-center mb-4">
                 <h3 class="font-600">Shot {{String(parseInt(panel.split('-')[1])+1).padStart(3,'0')}}</h3>
                 <button class="btn btn-ghost btn-sm" style="color:var(--error)" @click="deleteShot(parseInt(panel.split('-')[1]))">Delete</button>
               </div>
               
               <label class="field mb-4">
                 <span class="field-label">Action / Narrative</span>
                 <textarea class="textarea" rows="4" v-model="sbs[parseInt(panel.split('-')[1])].narrative"></textarea>
               </label>
               
               <div class="field-grid-2 mb-4">
                 <label class="field">
                    <span class="field-label">Camera Shot</span>
                    <input class="input mono xs" v-model="sbs[parseInt(panel.split('-')[1])].camera_shot" />
                 </label>
                 <label class="field">
                    <span class="field-label">Movement</span>
                    <input class="input mono xs" v-model="sbs[parseInt(panel.split('-')[1])].camera_movement" />
                 </label>
               </div>
               
               <label class="field mb-4">
                 <span class="field-label">Reference Prompt (Visuals)</span>
                 <textarea class="textarea mono" rows="3" v-model="sbs[parseInt(panel.split('-')[1])].image_prompt"></textarea>
               </label>

               <label class="field">
                 <span class="field-label">Characters Triggered</span>
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
             <h2 class="canvas-title hero-gradient-text">Engine Room</h2>
             <div class="actions">
                <button class="btn btn-primary" v-if="prodTabIdx===0" @click="batchCharImages">Gen All Character Avatars</button>
                <button class="btn btn-primary" v-if="prodTabIdx===1" @click="batchSceneImages">Gen All Scene Backdrops</button>
                <button class="btn btn-primary" v-if="prodTabIdx===2" @click="batchShotTTS">Gen All Dialogues Voiceover</button>
             </div>
           </div>
           
           <div class="canvas-scroll bg-dotted prod-view">
             <!-- Characters Prod -->
             <div v-if="prodTabIdx === 0" class="prod-grid">
               <div v-for="c in chars" :key="'p-c-'+c.id" class="prod-card">
                 <div class="prod-card-vis" :style="c.imageUrl ? {backgroundImage: 'url('+c.imageUrl+')'} : {}">
                    <div v-if="!c.imageUrl" class="prod-placeholder bg-hero-gradient">Gen Required</div>
                 </div>
                 <div class="prod-card-info">
                   <div class="font-600">{{c.name}}</div>
                   <button class="btn btn-ghost btn-sm border-dashed" @click="genCharImg(c)">Generate</button>
                 </div>
               </div>
             </div>
             
             <!-- Scenes Prod -->
             <div v-if="prodTabIdx === 1" class="prod-grid landscape-grid">
               <div v-for="s in scenes" :key="'p-s-'+s.id" class="prod-card">
                 <div class="prod-card-vis landscape" :style="s.imageUrl ? {backgroundImage: 'url('+s.imageUrl+')'} : {}">
                    <div v-if="!s.imageUrl" class="prod-placeholder bg-hero-gradient">Gen Required</div>
                 </div>
                 <div class="prod-card-info">
                   <div class="font-600">{{s.name}}</div>
                   <button class="btn btn-ghost btn-sm border-dashed" @click="genSceneImg(s)">Generate</button>
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
                    <button class="btn btn-ghost border-dashed" @click="genShotTTS(sb)">Generate Audio</button>
                 </div>
               </div>
             </div>

             <!-- Frames Prod -->
             <div v-if="prodTabIdx === 3" class="prod-grid landscape-grid">
               <div v-for="sb in sbs" :key="'f-'+sb.id" class="prod-card">
                 <div class="prod-card-vis landscape" :style="hasImg(sb) ? {backgroundImage: 'url('+getStoryboardCover(sb)+')'} : {}">
                    <div v-if="!hasImg(sb)" class="prod-placeholder bg-hero-gradient">Gen Required</div>
                 </div>
                 <div class="prod-card-info">
                   <div class="mono-sm text-center w-100 line-clamp-2">{{sb.image_prompt}}</div>
                   <button class="btn btn-ghost btn-sm border-dashed w-100 mt-2" @click="genShotFrame(sb)">Generate Frame</button>
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
\${scriptContent}

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
  background: transparent; border: none; padding: 6px; cursor: pointer; border-radius: var(--radius-sm);
  color: var(--black); transition: 0.2s;
}
.icon-btn:hover { background: var(--bg-2); }
.file-name { font-weight: 500; font-size: 14px; letter-spacing: -0.14px; }
.file-slash { color: var(--text-3); margin: 0 4px; }
.topbar-meta { font-size: 12px; color: var(--text-2); background: var(--bg-2); padding: 4px 10px; border-radius: var(--radius-pill); }

/* TABS */
.figma-tabs .tab {
  padding: 6px 16px; background: transparent; border: none; border-radius: var(--radius-md);
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
  border-left: solid 4px #000;
}
.hero-focus:focus {
  outline: solid 4px rgba(213, 0, 249, 0.4) !important;
  border-color: #00c853 !important;
  caret-color: #d500f9 !important;
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
  border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; font-size: 13px; outline: none; transition: 0.2s; background: var(--bg-1); width: 100%; font-family: var(--font-sans);
}
.input:focus, .textarea:focus, select.input:focus { border-color: var(--black); background: var(--white); box-shadow: 0 0 0 2px rgba(0,0,0,0.1); }
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
`;
fs.writeFileSync(path, newTemplate);
console.log('Episode rewritten.');
