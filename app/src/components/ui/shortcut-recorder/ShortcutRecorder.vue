<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Kbd } from '@/components/ui/kbd'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  modelValue: string
  placeholder?: string
}>()

// Dummy read to satisfy TS6133
if (false as boolean) {
  console.log(props.modelValue, props.placeholder)
}


const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const isRecording = ref(false)
const inputRef = ref<HTMLElement | null>(null)

function handleKeyDown(e: KeyboardEvent) {
  if (!isRecording.value) return
  
  e.preventDefault()
  e.stopPropagation()

  const keys: string[] = []

  // Tauri uses CommandOrControl for cross-platform ctrl/cmd
  if (e.ctrlKey || e.metaKey) keys.push('CommandOrControl')
  if (e.shiftKey) keys.push('Shift')
  if (e.altKey) keys.push('Alt')

  const code = e.code // e.g. "KeyA", "Digit1", "ArrowUp", "Equal"

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
  
  // Ignore if only modifiers are pressed
  if (!keyName && ['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(code)) {
    return
  }

  if (keyName) {
    keys.push(keyName)
  }

  const shortcutString = keys.join('+')
  
  if (keyName) {
    emit('update:modelValue', shortcutString)
    isRecording.value = false
    inputRef.value?.blur()
  }
}

function clearShortcut(e: Event) {
  e.stopPropagation()
  emit('update:modelValue', '')
  isRecording.value = false
}

// Global click to stop recording
function handleGlobalClick(e: MouseEvent) {
  if (isRecording.value && inputRef.value && !inputRef.value.contains(e.target as Node)) {
    isRecording.value = false
  }
}

onMounted(() => document.addEventListener('click', handleGlobalClick))
onUnmounted(() => document.removeEventListener('click', handleGlobalClick))
</script>

<template>
  <div 
    ref="inputRef"
    tabindex="0"
    class="relative flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    :class="{ 'ring-2 ring-ring ring-offset-2 border-primary': isRecording }"
    @click="isRecording = true"
    @keydown="handleKeyDown"
  >
    <div v-if="!modelValue && !isRecording" class="text-muted-foreground">
      {{ placeholder || t('shortcut_recorder.placeholder') }}
    </div>
    
    <div v-else-if="isRecording" class="text-primary animate-pulse font-medium">
      {{ t('shortcut_recorder.press_key_prompt') }}
    </div>
    
    <div v-else class="flex flex-wrap gap-1 items-center">
      <template v-for="(key, idx) in (modelValue || '').split('+')" :key="idx">
        <span v-if="idx > 0" class="text-muted-foreground text-[10px]">+</span>
        <Kbd>{{ key }}</Kbd>
      </template>
    </div>

    <button v-if="modelValue && !isRecording" @click="clearShortcut" class="text-muted-foreground hover:text-foreground opacity-50 hover:opacity-100 transition-opacity ml-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
  </div>
</template>
