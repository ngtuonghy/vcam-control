<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAssetStore } from '@/stores/assets'
import { useUiStore } from '@/stores/ui'
import { getAssetUrl } from '@/utils/fs'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Edit2, Clapperboard, QrCode } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { useSortable } from '@vueuse/integrations/useSortable'

const { t } = useI18n()
const assetStore = useAssetStore()
const uiStore = useUiStore()

const isAddGroupOpen = ref(false)
const newGroupName = ref('')

const editingGroupId = ref('')
const editingGroupName = ref('')

async function handleAddGroup() {
  if (newGroupName.value.trim()) {
    await assetStore.addGroup(newGroupName.value.trim())
    newGroupName.value = ''
    isAddGroupOpen.value = false
  }
}

function startEditing(id: string, name: string, e: Event) {
  e.stopPropagation()
  editingGroupId.value = id
  editingGroupName.value = name
}

async function saveEdit() {
  if (editingGroupName.value.trim() && editingGroupId.value) {
    await assetStore.renameGroup(editingGroupId.value, editingGroupName.value.trim())
  }
  editingGroupId.value = ''
}

async function handleDelete(id: string, e: Event) {
  e.stopPropagation()
  if (confirm(t('sidebar.confirm_delete'))) {
    await assetStore.deleteGroup(id)
  }
}

function handleSelectScene(id: string) {
  assetStore.setActiveGroup(id)
  uiStore.isGeneratorOpen = false
  assetStore.clearLiveCodeOverride()
}

const groupListRef = ref<HTMLElement | null>(null)
const displayGroups = computed(() => assetStore.groups)

const sortableOptions = {
  animation: 200,
  delay: 0,
  delayOnTouchOnly: false,
  fallbackTolerance: 3,
  forceFallback: true,
  fallbackOnBody: true,
  ghostClass: 'opacity-40',
  dragClass: 'scale-95',
  fallbackClass: 'opacity-80 shadow-lg',
  onUpdate: (e: any) => {
    const { oldIndex, newIndex } = e
    if (oldIndex === undefined || newIndex === undefined) return
    assetStore.saveData()
  }
}

useSortable(groupListRef, displayGroups, sortableOptions as any)

const vFocus = {
  mounted: (el: HTMLElement) => {
    const input = el.tagName === 'INPUT' ? el : el.querySelector('input')
    if (input) input.focus()
  }
}
</script>

<template>
  <aside class="h-full flex flex-col bg-card select-none overflow-hidden">
    <!-- Header -->
    <div class="px-4 py-2 flex items-center justify-between border-b border-border/40 shrink-0 h-10">
      <span class="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{{ t('sidebar.scenes') }}</span>
      <div class="flex items-center gap-1">
        <Button variant="ghost" size="icon" class="h-6 w-6 text-muted-foreground hover:text-foreground" @click="isAddGroupOpen = true; newGroupName = ''">
          <Plus class="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
    
    <!-- Scene List (Vertical) -->
    <div class="flex-1 w-full overflow-y-auto custom-scrollbar p-2.5 flex flex-col gap-2" ref="groupListRef">
      <!-- Inline Add Form -->
      <div v-if="isAddGroupOpen" class="group relative flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all border border-border/60 bg-secondary/10 w-full">
        <div class="w-16 h-10 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center border border-border/40 bg-surface relative">
          <Clapperboard class="w-4 h-4 text-muted-foreground/30" />
        </div>
        <div class="flex-1 min-w-0 pr-1 flex flex-col justify-center">
          <input 
            v-model="newGroupName" 
            :placeholder="t('sidebar.scene_name_placeholder')"
            class="h-5 text-xs font-semibold bg-transparent border-none outline-none w-full placeholder:text-muted-foreground/50 placeholder:font-normal text-foreground"
            @blur="handleAddGroup"
            @keyup.enter="handleAddGroup"
            @keyup.esc="isAddGroupOpen = false"
            v-focus
          />
        </div>
      </div>

      <template v-if="displayGroups.length > 0">
        <div 
          v-for="group in displayGroups" 
          :key="group.id"
          @click="handleSelectScene(group.id)"
          class="group relative flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all border select-none w-full"
          :class="(assetStore.activeGroupId === group.id && !uiStore.isGeneratorOpen)
            ? 'bg-accent/5 border-accent/30 text-accent font-medium shadow-sm' 
            : 'border-border/60 text-muted-foreground hover:bg-secondary/40 hover:text-foreground bg-secondary/10'"
        >
          
          <!-- Thumbnail (on left) -->
          <div class="w-16 h-10 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center border border-border/40 bg-surface relative">
            <Clapperboard v-if="!group.images.length" class="w-4 h-4 text-muted-foreground/30" />
            <img v-else :src="getAssetUrl(group.images[0].path)" class="w-full h-full object-cover" draggable="false" />
          </div>
          
          <!-- Name & Assets Count (on right) -->
          <div class="flex-1 min-w-0 pr-1 flex flex-col justify-center">
            <div v-if="editingGroupId === group.id" class="w-full">
              <input 
                v-model="editingGroupName" 
                class="h-5 text-xs font-semibold bg-transparent border-none outline-none w-full text-foreground"
                @blur="saveEdit"
                @keyup.enter="saveEdit"
                @click.stop
                v-focus
              />
            </div>
            <template v-else>
              <p class="text-xs font-semibold truncate leading-snug" :title="group.name">{{ group.name }}</p>
              <p class="text-[9px] text-muted-foreground/70 mt-0.5 leading-none">{{ group.images.length }} {{ t('main.assets') }}</p>
            </template>
          </div>

          <!-- Hover Actions -->
          <div v-if="editingGroupId !== group.id" class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/90 backdrop-blur-sm rounded-md p-1 shadow-sm">
            <button @click.stop="startEditing(group.id, group.name, $event)" class="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:bg-accent/10 hover:text-accent transition-colors">
              <Edit2 class="w-3.5 h-3.5" />
            </button>
            <button @click.stop="handleDelete(group.id, $event)" class="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </template>
      <div v-else-if="!isAddGroupOpen" class="flex-1 flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
        <Clapperboard class="w-10 h-10 text-muted-foreground/60 stroke-[1.5] opacity-50" />
        <p class="text-[11px] text-muted-foreground/80">{{ t('sidebar.empty_scenes') }}</p>
        <Button size="sm" variant="outline" class="h-8 text-xs px-3 border-border/50 bg-secondary/20 hover:bg-secondary/60 transition-all" @click="isAddGroupOpen = true; newGroupName = ''">
          <Plus class="w-3.5 h-3.5 mr-1.5" /> {{ t('sidebar.create_scene') }}
        </Button>
      </div>
    </div>
    
    <!-- Bottom Tool Button -->
    <div class="p-3 border-t border-border/40 shrink-0 bg-card">
      <Button 
        variant="ghost"
        class="w-full relative overflow-hidden transition-all duration-300 font-semibold flex items-center justify-center gap-1.5 h-8 border text-xs rounded-md" 
        :class="(uiStore.isGeneratorOpen && uiStore.generatorMode === 'quick')
          ? 'bg-accent/10 hover:bg-accent/20 border-accent/40 text-accent shadow-sm'
          : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500/50 shadow-md shadow-indigo-600/20 hover:text-white'"
        @click="uiStore.isGeneratorOpen = true; uiStore.generatorMode = 'quick'"
      >
        <div 
          v-if="uiStore.isGeneratorOpen && uiStore.generatorMode === 'quick'" 
          class="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r bg-accent"
        ></div>
        <QrCode class="w-3.5 h-3.5 shrink-0" />
        <span>{{ t('generator.title') }}</span>
      </Button>
    </div>
  </aside>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: hsl(var(--border) / 0.6);
  border-radius: 99px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground) / 0.4);
}
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--border) / 0.6) transparent;
}
</style>


