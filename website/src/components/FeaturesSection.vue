<script setup lang="ts">
import { onMounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { animate, spring, stagger, splitText } from 'animejs'

const { t, locale } = useI18n()

let titleSplitters: any[] = []

function runTextSplits() {
  if (titleSplitters.length) {
    titleSplitters.forEach(s => s.revert())
    titleSplitters = []
  }
  
  const titles = document.querySelectorAll('.anim-card-title')
  if (!titles.length) return

  titles.forEach((title, i) => {
    const splitter = splitText(title, { words: true })
    titleSplitters.push(splitter)
    splitter.addEffect(() => {
      animate(splitter.words, {
        translateY: [15, 0],
        opacity: [0, 1],
        ease: spring({ mass: 1, stiffness: 100, damping: 10, velocity: 0 }),
        delay: stagger(40, { start: 100 + (i * 50) })
      })
    })
  })
}

function initScrollAnimations() {
  const featureSection = document.querySelector('#features')
  if (!featureSection) return

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          observer.disconnect()

          const heading = featureSection.querySelector('.anim-section-title')
          if (heading) {
            animate(heading, {
              translateY: [30, 0],
              opacity: [0, 1],
              ease: 'outExpo',
              duration: 800,
            })
          }

          animate(featureSection.querySelectorAll('.anim-card'), {
            translateY: [50, 0],
            opacity: [0, 1],
            ease: spring({ mass: 1, stiffness: 90, damping: 10, velocity: 0 }),
            delay: stagger(150, { start: 150 })
          })

          animate(featureSection.querySelectorAll('.anim-icon'), {
            scale: [0.2, 1],
            rotate: ['-15deg', '0deg'],
            opacity: [0, 1],
            ease: spring({ mass: 1, stiffness: 80, damping: 10, velocity: 0 }),
            delay: stagger(150, { start: 300 })
          })

          runTextSplits()
        }
      })
    },
    { threshold: 0.1 }
  )

  observer.observe(featureSection)
}

watch(locale, () => {
  nextTick(() => {
    runTextSplits()
  })
})

onMounted(() => {
  setTimeout(() => {
    initScrollAnimations()
  }, 50)
})
</script>

<template>
  <section id="features" class="py-16 sm:py-24 bg-surface border-t border-border">
    <div class="container mx-auto px-4 sm:px-6 max-w-5xl">
      <h2 class="anim-section-title opacity-0 text-2xl sm:text-3xl font-bold tracking-tight mb-8 sm:mb-12 text-center">{{ t('whyUse') }}</h2>
      <div class="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
        <div class="anim-card opacity-0 bg-card p-6 sm:p-8 rounded-lg border border-border shadow-sm">
          <div class="anim-icon opacity-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </div>
          <h3 :key="locale" class="anim-card-title text-xl font-bold mb-3">{{ t('feat1Title') }}</h3>
          <p class="text-muted-foreground leading-relaxed text-sm sm:text-base">{{ t('feat1Desc') }}</p>
        </div>

        <div class="anim-card opacity-0 bg-card p-6 sm:p-8 rounded-lg border border-border shadow-sm">
          <div class="anim-icon opacity-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <h3 :key="locale" class="anim-card-title text-xl font-bold mb-3">{{ t('feat2Title') }}</h3>
          <p class="text-muted-foreground leading-relaxed text-sm sm:text-base">{{ t('feat2Desc') }}</p>
        </div>

        <div class="anim-card opacity-0 bg-card p-6 sm:p-8 rounded-lg border border-border shadow-sm">
          <div class="anim-icon opacity-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </div>
          <h3 :key="locale" class="anim-card-title text-xl font-bold mb-3">{{ t('feat3Title') }}</h3>
          <p class="text-muted-foreground leading-relaxed text-sm sm:text-base">{{ t('feat3Desc') }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
