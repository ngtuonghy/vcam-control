<script setup lang="ts">
import { useTheme } from './composables/useTheme'
import SiteHeader from './components/SiteHeader.vue'
import HeroSection from './components/HeroSection.vue'
import FeaturesSection from './components/FeaturesSection.vue'
import SiteFooter from './components/SiteFooter.vue'

// Initialize theme
useTheme()
</script>

<template>
  <div class="min-h-screen bg-background text-foreground flex flex-col font-sans break-words">
    <SiteHeader />
    <HeroSection />
    <FeaturesSection />
    <SiteFooter />
  </div>
</template>
