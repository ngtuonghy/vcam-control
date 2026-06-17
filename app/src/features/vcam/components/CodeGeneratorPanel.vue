<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '@/entities/app/model/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QrCode, Barcode, Wifi, Contact, Mail, Phone, MessageSquare, Trash2, Settings2, ChevronLeft } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'
import { appDataDir, join } from '@tauri-apps/api/path'
import { writeFile, mkdir } from '@tauri-apps/plugin-fs'
import { v4 as uuidv4 } from 'uuid'
import { convertFileSrc } from '@tauri-apps/api/core'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const { t } = useI18n()
const appStore = useAppStore()

defineModel<boolean>('open', { default: false })

const codeType = ref<'url' | 'text' | 'wifi' | 'vcard' | 'email' | 'phone' | 'sms' | 'barcode'>(localStorage.getItem('generatorCodeType') as any || 'url')

// Form states
const contentUrl = ref('')
const contentText = ref('')
const wifiSsid = ref('')
const wifiPass = ref('')
const wifiHidden = ref(false)
const vcardName = ref('')
const vcardPhone = ref('')
const vcardEmail = ref('')
const emailAddress = ref('')
const emailSubject = ref('')
const phoneNumber = ref('')
const smsNumber = ref('')
const smsMessage = ref('')
const barcodeContent = ref('')

const qrSubtype = ref(localStorage.getItem('generatorQrSubtype') || 'url')

const types = [
  { id: 'url', icon: QrCode, label: 'QR Code' },
  { id: 'barcode', icon: Barcode, label: 'Barcode' },
  { id: 'wifi', icon: Wifi, label: 'Wifi' },
  { id: 'vcard', icon: Contact, label: 'vCard' },
  { id: 'email', icon: Mail, label: 'Email' },
  { id: 'phone', icon: Phone, label: 'Phone' },
  { id: 'sms', icon: MessageSquare, label: 'SMS' },
] as const

const defaultRandomLengths = {
  url: 8,
  text: 12,
  wifi: 8,
  vcard: 5,
  email: 5,
  phone: 9,
  sms: 6,
  barcode: 10
}
const savedLengths = JSON.parse(localStorage.getItem('generatorRandomLengths') || '{}')
const randomLengths = reactive<Record<string, number>>({ ...defaultRandomLengths, ...savedLengths })

watch(codeType, (val) => localStorage.setItem('generatorCodeType', val))
watch(qrSubtype, (val) => localStorage.setItem('generatorQrSubtype', val))
watch(randomLengths, (val) => localStorage.setItem('generatorRandomLengths', JSON.stringify(val)), { deep: true })

function generateRandomString(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
  return result
}

function generateRandomPhone() {
  let result = '0'
  for (let i = 0; i < 9; i++) result += Math.floor(Math.random() * 10)
  return result
}

function getPayloadAndName(): { payload: string, name: string } {
  let payload = ''
  let name = ''
  const rLen = Number(randomLengths[codeType.value]) || 8

  switch (codeType.value) {
    case 'url':
      if (qrSubtype.value === 'url') {
        payload = contentUrl.value.trim() || `https://${generateRandomString(rLen)}.com`
        name = payload
      } else {
        payload = contentText.value.trim() || generateRandomString(rLen)
        name = payload
      }
      break
    case 'wifi':
      const ssid = wifiSsid.value.trim() || `Guest_${generateRandomString(4)}`
      const pass = wifiPass.value.trim() || generateRandomString(rLen)
      const hidden = wifiHidden.value ? 'true' : 'false'
      payload = `WIFI:T:WPA;S:${ssid};P:${pass};H:${hidden};;`
      name = ssid
      break
    case 'vcard':
      const vName = vcardName.value.trim() || `User_${generateRandomString(rLen)}`
      const vPhone = vcardPhone.value.trim() || generateRandomPhone()
      const vEmail = vcardEmail.value.trim() || `${vName.toLowerCase()}@example.com`
      payload = `BEGIN:VCARD\nVERSION:3.0\nN:${vName}\nFN:${vName}\nTEL:${vPhone}\nEMAIL:${vEmail}\nEND:VCARD`
      name = vName
      break
    case 'email':
      const eAddr = emailAddress.value.trim() || `contact_${generateRandomString(rLen)}@example.com`
      const eSubj = emailSubject.value.trim()
      payload = `MATMSG:TO:${eAddr};SUB:${eSubj};BODY:;;`
      name = eAddr
      break
    case 'phone':
      const pNum = phoneNumber.value.trim() || generateRandomPhone()
      payload = `tel:${pNum}`
      name = pNum
      break
    case 'sms':
      const sNum = smsNumber.value.trim() || generateRandomPhone()
      const sMsg = smsMessage.value.trim() || `Hello ${generateRandomString(rLen)}`
      payload = `smsto:${sNum}:${sMsg}`
      name = sNum
      break
    case 'barcode':
      payload = barcodeContent.value.trim() || generateRandomString(rLen).toUpperCase()
      name = payload
      break
  }

  return { payload, name }
}

async function handleGenerate() {
  if (!appStore.activeGroupId) {
    alert(t('generator.select_scene_alert'))
    return
  }

  try {
    const { payload, name } = getPayloadAndName()
    
    const dir = await appDataDir()
    await mkdir(dir, { recursive: true }).catch(() => {})
    const fileName = `code_${uuidv4().substring(0,8)}.png`
    const filePath = await join(dir, fileName)

    if (codeType.value === 'barcode') {
      const canvas = document.createElement('canvas')
      JsBarcode(canvas, payload, {
        format: "CODE128",
        width: 2,
        height: 100,
        displayValue: true
      })
      const dataUrl = canvas.toDataURL('image/png')
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "")
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
      await writeFile(filePath, buffer)
    } else {
      const dataUrl = await QRCode.toDataURL(payload, { width: 600, margin: 2 })
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "")
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
      await writeFile(filePath, buffer)
    }

    const previousCode = appStore.generatorHistory?.find(item => item.generatorType === codeType.value)

    const newCodeItem = {
      id: `live-code-${Date.now()}`,
      name,
      path: filePath,
      shortcut: '',
      generatorType: (codeType.value === 'url' && qrSubtype.value === 'text') ? 'text' : codeType.value,
      transform: previousCode?.transform ? JSON.parse(JSON.stringify(previousCode.transform)) : {
        alignment: 0,
        boundsAlignment: 0,
        boundsHeight: 800,
        boundsType: "OBS_BOUNDS_SCALE_INNER",
        boundsWidth: 1200,
        cropBottom: 0,
        cropLeft: 0,
        cropRight: 0,
        cropTop: 0,
        positionX: 360,
        positionY: 140,
        rotation: 0,
        scaleX: 1,
        scaleY: 1
      }
    }

    // Tự động chiếu (hiển thị live) mã vừa tạo
    appStore.setLiveCodeOverride(newCodeItem)

    // Lưu vào lịch sử
    if (!appStore.generatorHistory) {
      appStore.generatorHistory = []
    }
    appStore.generatorHistory.unshift(newCodeItem)
    if (appStore.generatorHistory.length > 20) {
      appStore.generatorHistory.pop()
    }
    appStore.saveData()

  } catch (e) {
    console.error(e)
    alert(t('generator.generate_error'))
  }
}

async function handleSaveToScene() {
  if (!appStore.activeGroupId) {
    alert(t('generator.select_scene_alert'))
    return
  }

  try {
    const { payload, name } = getPayloadAndName()
    
    const dir = await appDataDir()
    await mkdir(dir, { recursive: true }).catch(() => {})
    const fileName = `code_${uuidv4().substring(0,8)}.png`
    const filePath = await join(dir, fileName)

    if (codeType.value === 'barcode') {
      const canvas = document.createElement('canvas')
      JsBarcode(canvas, payload, {
        format: "CODE128",
        width: 2,
        height: 100,
        displayValue: true
      })
      const dataUrl = canvas.toDataURL('image/png')
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "")
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
      await writeFile(filePath, buffer)
    } else {
      const dataUrl = await QRCode.toDataURL(payload, { width: 600, margin: 2 })
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "")
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
      await writeFile(filePath, buffer)
    }
    const previousCode = appStore.generatorHistory?.find(item => item.generatorType === codeType.value)

    const newCodeItem = {
      name,
      path: filePath,
      shortcut: '',
      generatorType: (codeType.value === 'url' && qrSubtype.value === 'text') ? 'text' : codeType.value,
      transform: previousCode?.transform ? JSON.parse(JSON.stringify(previousCode.transform)) : {
        alignment: 0,
        boundsAlignment: 0,
        boundsHeight: 800,
        boundsType: "OBS_BOUNDS_SCALE_INNER",
        boundsWidth: 1200,
        cropBottom: 0,
        cropLeft: 0,
        cropRight: 0,
        cropTop: 0,
        positionX: 360,
        positionY: 140,
        rotation: 0,
        scaleX: 1,
        scaleY: 1
      }
    }

    // Add to Asset list
    await appStore.addImage(appStore.activeGroupId, newCodeItem)
    
    // Automatically select it to show it
    const group = appStore.activeGroup
    if (group) {
      const idx = group.images.length - 1
      await appStore.triggerImage(newCodeItem.path, idx)
    }
    
    // Đóng panel
    appStore.isGeneratorOpen = false

  } catch (e) {
    console.error(e)
    alert(t('generator.generate_error'))
  }
}

function removeFromHistory(id: string) {
  if (!appStore.generatorHistory) return

  const index = appStore.generatorHistory.findIndex(item => item.id === id)
  if (index === -1) return

  appStore.generatorHistory = appStore.generatorHistory.filter(item => item.id !== id)

  if (appStore.liveCodeOverride?.id === id) {
    if (appStore.generatorHistory.length > 0) {
      const nextIndex = Math.min(index, appStore.generatorHistory.length - 1)
      const nextItem = appStore.generatorHistory[nextIndex]
      handleHistoryClick(nextItem)
    } else {
      appStore.clearLiveCodeOverride()
    }
  }

  appStore.saveData()
}

function handleHistoryClick(item: any) {
  appStore.setLiveCodeOverride(item)
  if (item.generatorType) {
    if (item.generatorType === 'text') {
      codeType.value = 'url'
      qrSubtype.value = 'text'
    } else {
      codeType.value = item.generatorType
      if (item.generatorType === 'url') {
        qrSubtype.value = 'url'
      }
    }
  }
}

watch(() => appStore.isGeneratorOpen, (isOpen) => {
  if (isOpen) {
    // Tự động chọn và chiếu mã gần nhất trong lịch sử khi vừa mở Generator
    if (appStore.generatorHistory && appStore.generatorHistory.length > 0) {
      handleHistoryClick(appStore.generatorHistory[0])
    }
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('trigger-generate-qr', handleGenerate)
})

onUnmounted(() => {
  window.removeEventListener('trigger-generate-qr', handleGenerate)
})
</script>

<template>
  <div class="h-full flex flex-col bg-card">
    <div class="px-4 py-3 flex items-center justify-between gap-3 border-b border-border/60 shrink-0">
      <div class="flex items-center gap-2">
        <Button 
          v-if="appStore.generatorMode === 'asset'"
          variant="ghost" 
          size="icon" 
          class="h-6 w-6 text-muted-foreground hover:bg-secondary/80 hover:text-foreground shrink-0 rounded-md" 
          @click="appStore.isGeneratorOpen = false"
        >
          <ChevronLeft class="w-3.5 h-3.5" />
        </Button>
        <span class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {{ t('generator.title') }}
        </span>
      </div>
      <Dialog>
        <DialogTrigger as-child>
          <Button variant="ghost" size="icon" class="h-6 w-6 rounded-md hover:bg-accent/10 hover:text-accent">
            <Settings2 class="w-3.5 h-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{{ t('generator.settings_title') }}</DialogTitle>
          </DialogHeader>
          <div class="space-y-4 py-2">
            <div class="space-y-2">
              <Label class="text-sm font-semibold">{{ t('generator.random_length') }} ({{ types.find(t => t.id === codeType)?.label }})</Label>
              <p class="text-xs text-muted-foreground leading-relaxed">
                {{ t('generator.random_length_desc') }}
              </p>
              <div class="flex items-center gap-3 pt-2">
                <Input type="number" v-model="randomLengths[codeType]" min="4" max="64" class="h-9 w-24 bg-surface" />
                <span class="text-sm text-muted-foreground">{{ t('generator.characters') }}</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    
    <div class="flex flex-col flex-1 min-h-0">
      <div class="p-4 pb-0 flex flex-col gap-6 shrink-0">
        
        <!-- Code Type Selector -->
        <div class="flex flex-wrap gap-2 pb-2">
          <button
            v-for="type in types"
            :key="type.id"
            @click="codeType = type.id"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap transition-all border"
            :class="codeType === type.id 
              ? 'bg-accent text-white border-accent shadow-sm' 
              : 'bg-surface text-muted-foreground border-border hover:bg-secondary hover:text-foreground'"
          >
            <component :is="type.icon" class="w-3.5 h-3.5" />
            {{ type.label }}
          </button>
        </div>

        <!-- Dynamic Form Fields -->
        <div class="space-y-4">
          <template v-if="codeType === 'url'">
            <div class="flex items-center gap-4 mb-2">
              <label class="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                <input type="radio" v-model="qrSubtype" value="url" class="accent-accent w-3.5 h-3.5" />
                <span>{{ t('generator.website_url') }}</span>
              </label>
              <label class="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                <input type="radio" v-model="qrSubtype" value="text" class="accent-accent w-3.5 h-3.5" />
                <span>{{ t('generator.plain_text') }}</span>
              </label>
            </div>

            <div v-if="qrSubtype === 'url'" class="space-y-1.5">
              <Label class="text-xs font-semibold text-foreground/80 hidden">{{ t('generator.website_url') }}</Label>
              <Input v-model="contentUrl" placeholder="https://example.com" class="h-9 text-sm bg-surface/50 border-border/50 focus-visible:ring-accent/30" @keydown.enter="handleGenerate" />
            </div>

            <div v-if="qrSubtype === 'text'" class="space-y-1.5">
              <Label class="text-xs font-semibold text-foreground/80 hidden">{{ t('generator.text') }}</Label>
              <textarea v-model="contentText" :placeholder="$t('generator.text_placeholder')" class="flex min-h-[80px] w-full rounded-md border border-input bg-surface/50 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/30 resize-none" @keydown.ctrl.enter="handleGenerate"></textarea>
            </div>
          </template>

          <template v-else-if="codeType === 'wifi'">
            <div class="space-y-1.5">
              <Label class="text-xs">{{ t('generator.wifi_ssid') }}</Label>
              <Input v-model="wifiSsid" :placeholder="t('generator.wifi_ssid')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
            </div>
            <div class="space-y-1.5">
              <Label class="text-xs">{{ t('generator.wifi_pass') }}</Label>
              <Input v-model="wifiPass" :placeholder="t('generator.wifi_pass')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
            </div>
            <label class="flex items-center gap-2 text-xs">
              <input type="checkbox" v-model="wifiHidden" class="rounded border-border bg-surface" />
              {{ t('generator.wifi_hidden') }}
            </label>
          </template>

          <template v-else-if="codeType === 'vcard'">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <Label class="text-xs">{{ t('generator.vcard_name') }}</Label>
                <Input v-model="vcardName" :placeholder="t('generator.vcard_name')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
              </div>
              <div class="space-y-1.5">
                <Label class="text-xs">{{ t('generator.vcard_phone') }}</Label>
                <Input v-model="vcardPhone" :placeholder="t('generator.vcard_phone')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
              </div>
              <div class="space-y-1.5 col-span-2">
                <Label class="text-xs">{{ t('generator.vcard_email') }}</Label>
                <Input v-model="vcardEmail" :placeholder="t('generator.vcard_email')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
              </div>
            </div>
          </template>

          <template v-else-if="codeType === 'email'">
            <div class="space-y-1.5">
              <Label class="text-xs">{{ t('generator.email_address') }}</Label>
              <Input v-model="emailAddress" :placeholder="t('generator.email_address')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
            </div>
            <div class="space-y-1.5">
              <Label class="text-xs">{{ t('generator.email_subject') }}</Label>
              <Input v-model="emailSubject" :placeholder="t('generator.email_subject')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
            </div>
          </template>

          <template v-else-if="codeType === 'phone'">
            <div class="space-y-1.5">
              <Label class="text-xs">{{ t('generator.vcard_phone') }}</Label>
              <Input v-model="phoneNumber" :placeholder="t('generator.vcard_phone')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
            </div>
          </template>

          <template v-else-if="codeType === 'sms'">
            <div class="space-y-1.5">
              <Label class="text-xs">{{ t('generator.vcard_phone') }}</Label>
              <Input v-model="smsNumber" :placeholder="t('generator.vcard_phone')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
            </div>
            <div class="space-y-1.5">
              <Label class="text-xs">{{ t('generator.sms_message') }}</Label>
              <Input v-model="smsMessage" :placeholder="t('generator.sms_message')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
            </div>
          </template>

          <template v-else-if="codeType === 'barcode'">
            <div class="space-y-1.5">
              <Label class="text-xs">{{ t('generator.barcode_content') }}</Label>
              <Input v-model="barcodeContent" :placeholder="t('generator.barcode_content')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
            </div>
          </template>
        </div>

        <div class="flex gap-2 mt-2">
          <Button 
            v-if="appStore.generatorMode === 'quick'"
            class="flex-1 bg-accent hover:bg-accent/90 text-white font-semibold h-8 text-xs shadow-md shadow-accent/20 transition-all rounded-md"
            @click="handleGenerate"
          >
            {{ t('generator.generate') }}
          </Button>
          <Button 
            v-if="appStore.generatorMode === 'asset'"
            class="flex-1 bg-secondary/80 hover:bg-secondary text-secondary-foreground font-semibold h-8 text-xs transition-all border border-border/50 rounded-md"
            @click="handleSaveToScene"
            :title="t('generator.save_to_scene')"
          >
            {{ t('generator.save_to_scene') }}
          </Button>
        </div>
      </div>

      <!-- History Section -->
      <div v-if="appStore.generatorMode === 'quick' && appStore.generatorHistory && appStore.generatorHistory.length > 0" class="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 mt-4 min-h-0">
        <div class="border-t border-border/40 pt-4">
          <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">{{ t('generator.history_title') }}</p>
          <div class="flex flex-col gap-2">
            <div 
              v-for="item in appStore.generatorHistory" 
              :key="item.id"
              class="group/item flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all"
              :class="[
                appStore.liveCodeOverride?.id === item.id 
                  ? 'border-accent bg-accent/10 shadow-sm ring-1 ring-accent/50' 
                  : 'border-border/40 bg-secondary/5 hover:bg-secondary/20 hover:border-border/60'
              ]"
              @click="handleHistoryClick(item)"
            >
              <div class="w-10 h-10 bg-white rounded border flex items-center justify-center p-1 shrink-0">
                <img :src="convertFileSrc(item.path)" class="max-w-full max-h-full object-contain" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold truncate">{{ item.name }}</p>
                <p class="text-[10px] text-muted-foreground truncate uppercase">{{ item.generatorType }}</p>
              </div>
              <button class="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive shrink-0 opacity-0 group-hover/item:opacity-100 transition-all" @click.stop="removeFromHistory(item.id)">
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
