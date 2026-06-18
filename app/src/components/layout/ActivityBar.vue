<script setup lang="ts">
import { computed } from 'vue'
import { Camera, Settings, Code2, Database, LayoutTemplate } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'

const uiStore = useUiStore()

// Props for active tool state managed by parent
const props = defineProps<{
  activeTool: string
}>()

const emit = defineEmits<{
  (e: 'update:activeTool', tool: string): void
}>()

const topTools = [
  { id: 'vcam', icon: Camera, label: 'Virtual Camera' },
  { id: 'web-inspector', icon: Code2, label: 'Web Inspector' },
  { id: 'database', icon: Database, label: 'Database Viewer' },
  { id: 'ui-builder', icon: LayoutTemplate, label: 'UI Builder' },
]

const activeIndex = computed(() => {
  return topTools.findIndex(t => t.id === props.activeTool)
})
</script>

<template>
  <aside class="w-[76px] bg-background/25 backdrop-blur-xl border-r border-border/40 flex flex-col items-center py-6 shrink-0 z-20 transition-all duration-300 relative select-none">
    
    <!-- Dock Container -->
    <div class="relative flex flex-col gap-1.5 p-1.5 bg-secondary/20 border border-border/20 rounded-2xl shadow-sm">
      
      <!-- Sliding Highlight Background -->
      <div 
        class="absolute left-1.5 w-11 h-11 bg-accent/15 border border-accent/20 rounded-xl transition-all duration-300 ease-out z-0"
        :style="{
          transform: `translateY(${activeIndex * 50}px)`
        }"
      ></div>

      <!-- Tools -->
      <button
        v-for="tool in topTools"
        :key="tool.id"
        @click="emit('update:activeTool', tool.id)"
        class="relative w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 group z-10"
        :class="activeTool === tool.id ? 'text-accent' : 'text-muted-foreground hover:text-foreground'"
      >
        <component 
          :is="tool.icon" 
          class="w-5 h-5 transition-transform duration-300 group-hover:scale-110" 
          :class="activeTool === tool.id ? 'stroke-[2.5px]' : ''" 
        />
        
        <!-- Tooltip -->
        <span class="absolute left-16 bg-popover text-popover-foreground border border-border text-[11px] py-1 px-2 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1.5 transition-all duration-200 shadow-md whitespace-nowrap z-30 font-medium">
          {{ tool.label }}
        </span>
      </button>
    </div>

    <!-- Bottom Settings -->
    <div class="mt-auto relative flex flex-col gap-1.5 p-1.5 bg-secondary/20 border border-border/20 rounded-2xl shadow-sm">
      <button
        @click="uiStore.isSettingsOpen = true"
        class="w-11 h-11 flex items-center justify-center rounded-xl text-muted-foreground hover:text-accent transition-all duration-200 group relative"
      >
        <!-- Sliding Highlight Hover Background (Only on hover, mimicking active state) -->
        <div class="absolute inset-0 bg-accent/10 border border-accent/15 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-0"></div>
        
        <Settings class="w-5 h-5 transition-transform duration-500 group-hover:rotate-45 relative z-10" />
        
        <!-- Tooltip -->
        <span class="absolute left-16 bg-popover text-popover-foreground border border-border text-[11px] py-1 px-2 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1.5 transition-all duration-200 shadow-md whitespace-nowrap z-30 font-medium">
          Cài đặt
        </span>
      </button>
    </div>
  </aside>
</template>

