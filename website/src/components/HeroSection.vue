<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { animate, spring, stagger } from 'animejs'

const { t } = useI18n()
const downloadUrl = ref<string>('https://github.com/ngtuonghy/vcam-control/releases/latest')

async function fetchLatestRelease() {
  try {
    const response = await fetch('https://api.github.com/repos/ngtuonghy/vcam-control/releases')
    if (response.ok) {
      const releases = await response.json()
      if (Array.isArray(releases)) {
        for (const release of releases) {
          const asset = release.assets.find((a: any) => a.name.endsWith('-setup.exe') || a.name.endsWith('.exe'))
          if (asset) {
            downloadUrl.value = asset.browser_download_url
            break
          }
        }
      }
    }
  } catch (error) {
    console.error(error)
  }
}

function initAnimations() {
  animate(document.querySelectorAll('.anim-blob-1'), {
    scale: [1, 1.1, 1],
    translateX: ['-50%', '-45%', '-50%'],
    translateY: ['-50%', '-55%', '-50%'],
    ease: 'inOutSine',
    duration: 8000,
    loop: true
  })
  
  animate(document.querySelectorAll('.anim-blob-2'), {
    scale: [1, 1.2, 1],
    translateX: ['-50%', '-55%', '-50%'],
    translateY: ['-50%', '-45%', '-50%'],
    ease: 'inOutSine',
    duration: 10000,
    loop: true
  })

  animate(document.querySelectorAll('.anim-hero-title'), {
    translateY: [60, 0],
    opacity: [0, 1],
    ease: spring({ mass: 1, stiffness: 100, damping: 12, velocity: 0 }),
    delay: 100
  })

  animate(document.querySelectorAll('.anim-hero'), {
    translateY: [30, 0],
    opacity: [0, 1],
    ease: 'outExpo',
    duration: 1000,
    delay: stagger(150, { start: 200 })
  })
}

function scrollToFeatures() {
  const el = document.querySelector('#features')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
    if (typeof history !== 'undefined') {
      history.pushState(null, '', '#features')
    }
  }
}

onMounted(() => {
  fetchLatestRelease()
  setTimeout(() => {
    initAnimations()
  }, 50)
})
</script>

<template>
  <main class="relative flex-grow flex flex-col items-center justify-center px-4 sm:px-6 py-16 sm:py-24 md:py-32 text-center overflow-hidden z-0">
    <div class="absolute inset-0 bg-grid -z-20 pointer-events-none"></div>
    <div class="anim-blob-1 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-primary/20 rounded-full blur-3xl -z-10 pointer-events-none"></div>
    <div class="anim-blob-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] md:w-[400px] md:h-[400px] bg-accent/20 rounded-full blur-3xl -z-10 pointer-events-none"></div>

    <h1 class="anim-hero-title opacity-0 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight sm:tracking-tighter mb-6 max-w-4xl leading-[1.2] sm:leading-[1.1]" v-html="t('heroTitle')"></h1>
    <p class="anim-hero opacity-0 text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed px-4">
      {{ t('heroDesc') }}
    </p>
    <div class="anim-hero opacity-0 flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0">
      <a :href="downloadUrl" class="px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-lg shadow-lg shadow-primary/25 transition-all text-center">
        {{ t('downloadBtn') }}
      </a>
      <a href="#features" @click.prevent="scrollToFeatures" class="px-8 py-4 bg-secondary text-secondary-foreground font-semibold rounded-lg transition-all border border-border text-center">
        {{ t('exploreBtn') }}
      </a>
    </div>
    <p class="anim-hero opacity-0 mt-6 text-sm text-muted-foreground/60">
      {{ t('osNote') }}
    </p>
  </main>
</template>
