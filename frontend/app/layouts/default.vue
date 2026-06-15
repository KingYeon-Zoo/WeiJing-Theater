<template>
  <div class="shell">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <button class="brand" @click="navigateTo('/')">
          <span class="brand-name">微境剧场</span>
        </button>
      </div>

      <nav class="header-nav">
        <NuxtLink to="/" class="nav-pill" :class="{ active: route.path === '/' }">
          项目
        </NuxtLink>
        <NuxtLink to="/settings" class="nav-pill" :class="{ active: route.path === '/settings' }">
          设置
        </NuxtLink>
      </nav>

      <div class="header-right">
        <button class="btn btn-primary btn-sm" @click="navigateTo('/')">
          开始创作
        </button>
      </div>
    </header>

    <main class="content">
      <slot />
    </main>
  </div>
</template>

<script setup>
const route = useRoute()
</script>

<style scoped>
.shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--white);
}

/* === Header === */
.header {
  display: flex;
  align-items: center;
  height: 56px;
  flex-shrink: 0;
  padding: 0 24px;
  background: var(--white);
  border-bottom: 1px solid var(--border);
  gap: 24px;
}

.header-left {
  display: flex;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
  transition: opacity 0.15s;
}

.brand:hover {
  opacity: 0.6;
}

.brand:focus-visible {
  outline: dashed 2px var(--black);
  outline-offset: 2px;
}

.brand-name {
  font-family: var(--font-sans);
  font-size: 18px;
  font-weight: 700;
  color: var(--black);
  letter-spacing: -0.26px;
  font-feature-settings: "kern" 1;
}

/* Nav — Pill shaped tabs */
.header-nav {
  display: flex;
  gap: 4px;
  flex: 1;
}

.nav-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  border-radius: var(--radius-pill);
  font-size: 16px;
  font-weight: 400;
  font-family: var(--font-sans);
  letter-spacing: -0.14px;
  color: var(--text-2);
  text-decoration: none;
  transition: all 0.15s var(--ease-out);
  border: 1px solid transparent;
}

.nav-pill:hover {
  background: var(--bg-hover);
  color: var(--black);
}

.nav-pill:focus-visible {
  outline: dashed 2px var(--black);
  outline-offset: 2px;
}

.nav-pill.active {
  background: var(--black);
  color: var(--white);
  font-weight: 480;
}

.header-right {
  display: flex;
  align-items: center;
  margin-left: auto;
}

/* Content */
.content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
