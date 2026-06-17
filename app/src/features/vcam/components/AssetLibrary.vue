<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '@/entities/app/model/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FolderOpen } from 'lucide-vue-next'
import { open, save } from '@tauri-apps/plugin-dialog'
import { copyImageToLocal } from '@/shared/lib/fs'
import { ImagePlus, Download, QrCode } from 'lucide-vue-next'
import AssetGrid from './AssetGrid.vue'
import CodeGeneratorPanelWidget from './CodeGeneratorPanel.vue'
import { useI18n } from 'vue-i18n'
import JSZip from 'jszip'
import { onMounted, onUnmounted } from 'vue'
import { readDir, readFile, writeFile } from '@tauri-apps/plugin-fs'
import { join } from '@tauri-apps/api/path'

const { t } = useI18n()
const appStore = useAppStore()
const searchQuery = ref('')

onMounted(() => {
  window.addEventListener('trigger-add-image', handleAddImage)
})

onUnmounted(() => {
  window.removeEventListener('trigger-add-image', handleAddImage)
})

async function handleAddImage() {
  if (!appStore.activeGroupId) {
    alert('Vui lòng chọn hoặc tạo Scene trước khi thêm ảnh.')
    return
  }
  
  const selected = await open({
    multiple: true,
    filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }]
  })

  if (Array.isArray(selected)) {
    for (const path of selected) {
      try {
        const localPath = await copyImageToLocal(path)
        const name = path.split('\\').pop()?.split('/').pop() || 'Untitled'
        await appStore.addImage(appStore.activeGroupId, { name, path: localPath, shortcut: '' })
      } catch (e) {
        console.error(e)
      }
    }
  } else if (typeof selected === 'string') {
    try {
      const pathStr = selected as string
      const localPath = await copyImageToLocal(pathStr)
      const name = pathStr.split('\\').pop()?.split('/').pop() || 'Untitled'
      await appStore.addImage(appStore.activeGroupId, { name, path: localPath, shortcut: '' })
    } catch (e) {
      console.error(e)
    }
  }
}

async function handleAddFolder() {
  if (!appStore.activeGroupId) {
    alert('Vui lòng chọn hoặc tạo Scene trước khi thêm thư mục.')
    return
  }

  const selectedDir = await open({
    directory: true,
    multiple: false
  })

  if (typeof selectedDir === 'string') {
    try {
      const entries = await readDir(selectedDir)
      const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp']
      
      for (const entry of entries) {
        if (entry.isFile) {
          const ext = entry.name?.split('.').pop()?.toLowerCase()
          if (ext && imageExtensions.includes(ext)) {
            const fullPath = await join(selectedDir, entry.name!)
            try {
              const localPath = await copyImageToLocal(fullPath)
              await appStore.addImage(appStore.activeGroupId, { name: entry.name || 'Untitled', path: localPath, shortcut: '' })
            } catch (e) {
              console.error(e)
            }
          }
        }
      }
    } catch (e) {
      console.error(e)
    }
  }
}

async function handleExportAll() {
  const group = appStore.activeGroup
  if (!group || group.images.length === 0) {
    alert(t('assets.empty_export'))
    return
  }

  const savePath = await save({
    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
    defaultPath: `${group.name || 'Scene'}_assets.zip`,
    title: t('assets.select_export_dir')
  })

  if (savePath) {
    try {
      const zip = new JSZip()
      let successCount = 0
      
      const usedNames = new Set<string>()
      
      for (const img of group.images) {
        try {
          const data = await readFile(img.path)
          
          // Restore original extension if the user renamed it without one
          const originalExt = img.path.split('.').pop() || 'png'
          let exportName = img.name
          if (!exportName.toLowerCase().includes('.')) {
            exportName = `${exportName}.${originalExt}`
          }
          
          // Prevent overwriting files with the exact same name
          let finalName = exportName
          let counter = 1
          while (usedNames.has(finalName)) {
            // Split name and extension to inject the counter
            const lastDotIndex = exportName.lastIndexOf('.')
            if (lastDotIndex > 0) {
              const base = exportName.substring(0, lastDotIndex)
              const ext = exportName.substring(lastDotIndex)
              finalName = `${base} (${counter})${ext}`
            } else {
              finalName = `${exportName} (${counter})`
            }
            counter++
          }
          usedNames.add(finalName)
          
          zip.file(finalName, data)
          successCount++
        } catch (e) {
          console.error(`Failed to read ${img.name} for zip:`, e)
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: 'uint8array' })
      await writeFile(savePath, zipBlob)
      
      alert(t('assets.export_success').replace('{count}', successCount.toString()))
    } catch (err) {
      console.error("Zip export error:", err)
      alert("Export failed!")
    }
  }
}
</script>

<template>
  <div class="h-full flex-shrink-0 flex flex-col bg-card">
    <div v-show="!appStore.isGeneratorOpen" class="flex flex-col h-full overflow-hidden">
      <!-- Toolbar -->
      <div class="px-4 py-3 flex flex-col gap-3 border-b border-border/60 shrink-0">
        <!-- Title & Utility -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{{ t('assets.title') }}</span>
          <Button size="icon" variant="ghost" class="w-6 h-6 text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors" @click="handleExportAll" :title="t('assets.export_all')">
            <Download class="w-3.5 h-3.5" />
          </Button>
        </div>
        
        <div class="flex gap-1.5 w-full">
          <Button size="sm" variant="outline" class="flex-1 h-7 px-1 text-[10px] bg-secondary/30 border-border hover:border-accent/50 hover:bg-accent/10 hover:text-accent transition-colors" @click="handleAddImage" :title="t('assets.add_file')">
            <ImagePlus class="w-3.5 h-3.5 shrink-0" /> <span class="hidden xl:inline truncate ml-1.5">{{ t('assets.add_file') }}</span>
          </Button>
          <Button size="sm" variant="outline" class="flex-1 h-7 px-1 text-[10px] bg-secondary/30 border-border hover:border-accent/50 hover:bg-accent/10 hover:text-accent transition-colors" @click="handleAddFolder" :title="t('assets.add_folder')">
            <FolderOpen class="w-3.5 h-3.5 shrink-0" /> <span class="hidden xl:inline truncate ml-1.5">{{ t('assets.add_folder') }}</span>
          </Button>
          <Button size="sm" variant="outline" class="flex-1 h-7 px-1 text-[10px] bg-secondary/30 border-border hover:border-accent/50 hover:bg-accent/10 hover:text-accent transition-colors" @click="appStore.isGeneratorOpen = true; appStore.generatorMode = 'asset'" title="Tạo QR">
            <QrCode class="w-3.5 h-3.5 shrink-0" /> <span class="hidden xl:inline truncate ml-1.5">Tạo QR</span>
          </Button>
        </div>

        <!-- Search -->
        <Input 
          v-model="searchQuery" 
          placeholder="Tìm kiếm..." 
          class="h-7 w-full text-[11px] bg-surface border-border/60 px-2.5 focus-visible:ring-1 focus-visible:ring-accent/50" 
        />
      </div>

      <!-- Asset Grid -->
      <AssetGrid :searchQuery="searchQuery" />

      <!-- Footer -->
      <div class="p-2 border-t border-border/50 text-[10px] text-muted-foreground flex justify-between items-center bg-card shrink-0">
        <span class="opacity-60">{{ appStore.activeGroup?.images.length || 0 }} {{ t('main.assets').toLowerCase() }}</span>
      </div>
    </div>

    <!-- Generator Panel -->
    <CodeGeneratorPanelWidget v-show="appStore.isGeneratorOpen" v-model:open="appStore.isGeneratorOpen" />
  </div>
</template>
