<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { animate, stagger, splitText } from 'animejs'
import { useTheme } from '../composables/useTheme'
import logoUrl from '../assets/logo.png'

const { locale } = useI18n()
const { theme, cycleTheme } = useTheme()

let authorSplitter: any = null

function runAuthorAnimation() {
  if (authorSplitter) authorSplitter.revert()
  const el = document.querySelectorAll('.anim-author')
  if (!el.length) return
  
  authorSplitter = splitText(el, { chars: true })
  authorSplitter.addEffect(() => {
    animate(authorSplitter.chars, {
      color: ['inherit', '#a855f7', '#ec4899', 'inherit'],
      ease: 'inOutSine',
      duration: 2000,
      delay: stagger(100),
      loop: true
    })
  })
}

watch(locale, () => {
  nextTick(() => {
    runAuthorAnimation()
  })
})

onMounted(() => {
  setTimeout(() => {
    runAuthorAnimation()
  }, 50)
})

function toggleLanguage() {
  const nextLang = locale.value === 'en' ? 'vi' : 'en'
  locale.value = nextLang
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('lang', nextLang)
  }
}
</script>

<template>
  <header class="py-6 px-8 border-b border-border flex justify-between items-center bg-background/80 backdrop-blur-md sticky top-0 z-10">
    <div class="text-xl font-bold tracking-tight flex items-center gap-3">
      <img :src="logoUrl" alt="VCam Control Logo" class="w-10 h-10 rounded-lg shadow-sm shadow-primary/20" />
      <span class="hidden sm:inline">VCam Control</span>
    </div>
    <nav class="flex items-center gap-4 sm:gap-6">
      <span :key="locale" class="anim-author text-sm text-muted-foreground font-medium hidden sm:inline-block">
        <span class="text-primary font-bold">ngtuonghy</span>
      </span>
      <a href="https://github.com/ngtuonghy/vcam-control" target="_blank" rel="noopener noreferrer" class="text-sm font-medium hover:text-primary transition-colors">GitHub</a>
      <div class="flex items-center gap-2 border-l border-border pl-4">
        <button @click="toggleLanguage" class="w-9 h-9 flex items-center justify-center rounded-md bg-surface hover:bg-surface-hover transition-colors text-xs font-bold text-muted-foreground hover:text-foreground border border-border" title="Switch Language">
          {{ locale === 'en' ? 'EN' : 'VI' }}
        </button>
        <button @click="cycleTheme" class="w-9 h-9 flex items-center justify-center rounded-md bg-surface hover:bg-surface-hover transition-colors text-muted-foreground hover:text-foreground border border-border" :title="'Toggle Theme: ' + theme">
          <template v-if="theme === 'light'">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          </template>
          <template v-else-if="theme === 'dark'">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          </template>
          <template v-else>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
          </template>
        </button>
      </div>
    </nav>
  </header>
</template>
