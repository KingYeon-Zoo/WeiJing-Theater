const fs = require('fs');
const path = 'frontend/app/pages/settings.vue';
const content = fs.readFileSync(path, 'utf-8');

const scriptMatch = content.match(/<script setup>([\\s\\S]*?)<\\/script>/);
if (!scriptMatch) {
  console.error('Could not find script block');
  process.exit(1);
}

const scriptContent = scriptMatch[1];

let newTemplate = `<template>
  <div class="settings-page">
    <div class="settings-container">
      <header class="settings-header">
        <div class="settings-brand-mark">
          <img v-if="showBrandImage" :src="brandLogo" alt="微境剧场" class="settings-brand-logo" @error="showBrandImage = false" />
          <span v-else class="settings-brand-fallback">维</span>
        </div>
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
___SCRIPT_CONTENT___
</script>

<style scoped>
.settings-page {
  position: relative; height: 100vh; width: 100vw; background: var(--black);
  display: flex; justify-content: center; align-items: flex-start; overflow-y: auto; padding: 4vh 4vw;
}
.settings-container {
  width: 100%; max-width: 820px; background: var(--white); border-radius: var(--radius-lg);
  display: flex; flex-direction: column; overflow: hidden; box-shadow: var(--shadow-elevated); min-height: 80vh;
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
.settings-tabs { display: flex; align-items: center; padding: 12px 40px; border-bottom: 1px solid var(--border); background: var(--bg-1); gap: 12px; }
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
.config-row.is-active { background: linear-gradient(90deg, rgba(8, 255, 8, 0.03), transparent 200px); }
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
.agent-icon { width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--bg-2); display: flex; align-items: center; justify-content: center; font-size: 18px; }
.agent-icon-sm { width: 24px; height: 24px; border-radius: 4px; background: var(--bg-2); display: flex; align-items: center; justify-content: center; font-size: 12px; }
.agent-identity { flex: 1; }
.agent-label { font-size: 15px; font-weight: 600; }
.agent-type { color: var(--text-3); margin-top: 2px; }
.accordion-arrow { transition: transform 0.2s; }
.agent-accordion.is-open .accordion-arrow { transform: rotate(180deg); }
.accordion-body { padding: 20px; background: var(--bg-1); display: flex; flex-direction: column; gap: 16px; border-top: 1px solid var(--border); }
.accordion-foot { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; }
.skill-panel-layout { display: flex; margin: -40px; height: calc(100% + 80px); }
.skill-nav { width: 220px; border-right: 1px solid var(--border); background: var(--bg-1); display: flex; flex-direction: column; padding: 20px 10px; gap: 8px; }
.skill-nav-title { padding-left: 10px; color: var(--text-3); margin-bottom: 8px; }
.skill-nav-btn { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: var(--radius-md); cursor: pointer; border: none; background: transparent; transition: 0.15s; font-size: 13px; font-weight: 500; }
.skill-nav-btn:hover { background: var(--bg-3); }
.skill-nav-btn.active { background: var(--black); color: var(--white); }
.skill-workspace { padding: 40px; flex: 1; overflow-y: auto; }
.pack-order-list { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
.pack-order-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-1); }
.figma-modal { border: 1px solid var(--border-strong); min-width: 480px; padding: 0; gap: 0; border-radius: var(--radius-lg); overflow: hidden; }
.modal-header { background: var(--black); color: var(--white); padding: 24px 32px; display: flex; justify-content: space-between; }
.modal-identity { display: flex; flex-direction: column; gap: 6px; }
.modal-name { font-size: 24px; color: var(--white); font-weight: 600; letter-spacing: -0.6px; }
.modal-body { padding: 32px; display: flex; flex-direction: column; gap: 20px; background: var(--bg-1); }
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
</style>`;

newTemplate = newTemplate.replace('___SCRIPT_CONTENT___', scriptContent);
fs.writeFileSync(path, newTemplate);
console.log('Settings rewritten properly.');
