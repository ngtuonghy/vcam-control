<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Edit2, RotateCcw, X } from 'lucide-vue-next'

const { t } = useI18n()

const props = defineProps<{
  modelValue?: any
  title?: string
  assignedShortcuts?: Record<string, string>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'save'): void
}>()

const isOpen = ref(false)
const tempShortcut = ref(props.modelValue || '')

watch(isOpen, (newVal) => {
  if (newVal) {
    tempShortcut.value = props.modelValue || ''
    window.addEventListener('keydown', handleKeyDown, { capture: true })
  } else {
    window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown, { capture: true })
})

function formatKeyName(key: string) {
  const keyMap: Record<string, string> = {
    'CommandOrControl': 'Ctrl',
    'Super': 'Win',
    'Return': 'Enter',
    'Up': '↑',
    'Down': '↓',
    'Left': '←',
    'Right': '→',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Equal': '=',
    'Minus': '-',
    'Space': '␣',
    'Backspace': '⌫',
    'Escape': 'Esc',
    'Delete': 'Del',
  }
  return keyMap[key] || key
}

function handleKeyDown(e: KeyboardEvent) {
  e.preventDefault()
  e.stopPropagation()

  const keys: string[] = []

  // Modifiers
  if (e.metaKey && !navigator.platform.includes('Mac')) {
    keys.push('Super') // Windows Key
  } else if (e.ctrlKey || e.metaKey) {
    keys.push('CommandOrControl')
  }
  
  if (e.shiftKey) keys.push('Shift')
  if (e.altKey) keys.push('Alt')

  const code = e.code

  let keyName = ''

  if (code.startsWith('Key')) keyName = code.replace('Key', '')
  else if (code.startsWith('Digit')) keyName = code.replace('Digit', '')
  else if (code === 'Space') keyName = 'Space'
  else if (code === 'Backspace') keyName = 'Backspace'
  else if (code === 'Enter' || code === 'NumpadEnter') keyName = 'Return'
  else if (code === 'Escape') keyName = 'Escape'
  else if (code === 'Tab') keyName = 'Tab'
  else if (code.startsWith('Arrow')) keyName = code.replace('Arrow', '')
  else if (code.startsWith('F') && code.length <= 3) keyName = code // F1-F12
  else if (code === 'Equal') keyName = 'Equal'
  else if (code === 'Minus') keyName = 'Minus'
  else if (code === 'BracketLeft') keyName = '['
  else if (code === 'BracketRight') keyName = ']'
  else if (code === 'Backquote') keyName = '`'
  else if (code === 'Quote') keyName = "'"
  else if (code === 'Comma') keyName = ','
  else if (code === 'Period') keyName = '.'
  else if (code === 'Slash') keyName = '/'
  else if (code === 'Backslash') keyName = '\\'
  
  // Exclude modifier keys from the "keyName" slot
  if (['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'OSLeft', 'OSRight'].includes(code)) {
    keyName = ''
  }

  if (keyName) {
    keys.push(keyName)
  }

  tempShortcut.value = keys.join('+')
}

const isConflict = computed(() => {
  if (!tempShortcut.value || !props.assignedShortcuts) return false
  return !!props.assignedShortcuts[tempShortcut.value]
})

const conflictingActionName = computed(() => {
  if (!isConflict.value || !props.assignedShortcuts) return ''
  return props.assignedShortcuts[tempShortcut.value]
})

const isValid = computed(() => {
  if (!tempShortcut.value) return true // Empty is valid (cleared)
  if (isConflict.value) return false // Conflict is invalid
  const parts = tempShortcut.value.split('+')
  const lastPart = parts[parts.length - 1]
  return !['CommandOrControl', 'Shift', 'Alt', 'Super'].includes(lastPart)
})

function clearShortcut() {
  tempShortcut.value = ''
}

function resetShortcut() {
  tempShortcut.value = props.modelValue
}

function saveShortcut() {
  if (!isValid.value) return
  emit('update:modelValue', tempShortcut.value)
  emit('save')
  isOpen.value = false
}
</script>

<template>
  <Dialog :open="isOpen" @update:open="isOpen = $event">
    <DialogTrigger asChild>
      <slot name="trigger">
        <div class="h-8 w-full flex items-center px-2.5 rounded-lg bg-secondary/30 border border-border/30 hover:bg-secondary/60 hover:border-border/50 transition-all cursor-pointer text-muted-foreground group/trigger shadow-sm">
          <span v-if="!modelValue" class="text-xs truncate flex-1 text-left">{{ t('shortcut_recorder.unassigned') }}</span>
          <div v-else class="flex items-center gap-1.5 overflow-hidden flex-1">
            <Kbd v-for="key in modelValue.split('+')" :key="key" class="font-sans text-[10px] uppercase font-bold h-5 px-1.5 rounded bg-background border border-border/60 shadow-sm text-foreground/80 inline-flex items-center justify-center tracking-wider">{{ formatKeyName(key) }}</Kbd>
          </div>
          <Edit2 class="w-3.5 h-3.5 ml-2.5 opacity-0 group-hover/trigger:opacity-70 transition-opacity flex-shrink-0" />
        </div>
      </slot>
    </DialogTrigger>
    
    <DialogContent class="sm:max-w-[460px] bg-card border-border text-card-foreground">
      <DialogHeader>
        <DialogTitle>{{ title || t('shortcut_recorder.default_title') }}</DialogTitle>
        <DialogDescription class="sr-only">Record a new shortcut for this action</DialogDescription>
      </DialogHeader>

      <div class="py-6 flex flex-col items-center justify-center">
        <!-- Big Keys Display -->
        <div 
          class="flex flex-wrap gap-2 items-center justify-center min-h-[90px] w-full rounded-xl p-4 border transition-colors"
          :class="isConflict ? 'bg-destructive/10 border-destructive/50' : 'bg-muted/40 border-border'"
        >
          <div v-if="!tempShortcut" class="text-muted-foreground text-sm font-medium animate-pulse">
            {{ t('shortcut_recorder.waiting') }}
          </div>
          <template v-else>
            <div 
              v-for="(key, idx) in tempShortcut.split('+')" 
              :key="idx" 
              class="px-5 py-4 text-primary-foreground rounded-xl font-bold text-xl shadow-md transition-colors"
              :class="isConflict ? 'bg-destructive' : 'bg-primary'"
            >
              {{ formatKeyName(key) }}
            </div>
          </template>
        </div>
        
        <div v-if="isConflict" class="mt-4 text-sm font-medium text-destructive flex items-center gap-1.5">
          <X class="w-4 h-4" />
          {{ t('shortcut_recorder.conflict') }}: {{ conflictingActionName }}
        </div>
        
        <!-- Controls -->
        <div class="flex gap-6 mt-6">
          <Button variant="ghost" size="sm" class="text-primary hover:text-primary hover:bg-primary/10" @click="resetShortcut">
            <RotateCcw class="w-4 h-4 mr-2" /> {{ t('shortcut_recorder.reset') }}
          </Button>
          <Button variant="ghost" size="sm" class="text-destructive hover:text-destructive hover:bg-destructive/10" @click="clearShortcut">
            <X class="w-4 h-4 mr-2" /> {{ t('shortcut_recorder.clear') }}
          </Button>
        </div>
      </div>

      <DialogFooter class="mt-4 gap-2">
        <Button variant="outline" @click="isOpen = false" class="bg-background text-foreground border-border">{{ t('shortcut_recorder.cancel') }}</Button>
        <Button @click="saveShortcut" :disabled="!isValid">{{ t('shortcut_recorder.save') }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
