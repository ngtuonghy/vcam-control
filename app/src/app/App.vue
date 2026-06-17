<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppStore } from '@/entities/app/model/store'
import MainPage from '@/pages/main/MainPage.vue'

const appStore = useAppStore()

// Initialize theme immediately to avoid styling flash and ensure correct initial state for components
const savedTheme = localStorage.getItem('theme')
if (savedTheme === 'light') {
  document.documentElement.classList.remove('dark')
} else if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark')
} else {
  // If not set, check the computer's/system's preferred color scheme
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  if (systemPrefersDark) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

onMounted(async () => {
  await appStore.loadData()
})
</script>

<template>
  <MainPage />
</template>
