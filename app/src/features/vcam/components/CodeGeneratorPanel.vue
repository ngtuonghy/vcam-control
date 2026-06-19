<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import { useAssetStore } from '@/stores/assets'
import { useUiStore } from '@/stores/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QrCode, Barcode, Wifi, Contact, Mail, Phone, MessageSquare, Trash2, Settings2, ChevronLeft } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { getAssetUrl } from '@/utils/fs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useCodeGenerator } from '../composables/useCodeGenerator'

const { t } = useI18n()
const assetStore = useAssetStore()
const uiStore = useUiStore()



const types = [
  { id: 'url', icon: QrCode, label: 'QR Code' },
  { id: 'barcode', icon: Barcode, label: 'Barcode' },
  { id: 'wifi', icon: Wifi, label: 'Wifi' },
  { id: 'vcard', icon: Contact, label: 'vCard' },
  { id: 'email', icon: Mail, label: 'Email' },
  { id: 'phone', icon: Phone, label: 'Phone' },
  { id: 'sms', icon: MessageSquare, label: 'SMS' },
] as const

const {
  codeType,
  qrSubtype,
  form,
  randomLengths,
  handleGenerate,
  handleSaveToScene,
  removeFromHistory,
  handleHistoryClick
} = useCodeGenerator()

watch(() => uiStore.isGeneratorOpen, (isOpen) => {
  if (isOpen) {
    if (assetStore.generatorHistory && assetStore.generatorHistory.length > 0) {
      handleHistoryClick(assetStore.generatorHistory[0])
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
          v-if="uiStore.generatorMode === 'asset'"
          variant="ghost" 
          size="icon" 
          class="h-6 w-6 text-muted-foreground hover:bg-secondary/80 hover:text-foreground shrink-0 rounded-md" 
          @click="uiStore.isGeneratorOpen = false"
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
        <div class="grid grid-cols-2 gap-1.5 pt-1">
          <button
            v-for="type in types"
            :key="type.id"
            @click="codeType = type.id"
            class="flex items-center gap-2 px-3 py-2 rounded-md text-[11px] font-medium transition-all border"
            :class="codeType === type.id 
              ? 'bg-accent/10 text-accent border-accent/40 shadow-sm ring-1 ring-accent/20' 
              : 'bg-surface text-muted-foreground border-border/40 hover:bg-secondary hover:text-foreground hover:border-border'"
          >
            <component :is="type.icon" class="w-3.5 h-3.5 opacity-80" />
            {{ type.label }}
          </button>
        </div>

        <!-- Dynamic Form Fields -->
        <div class="space-y-4">
          <template v-if="codeType === 'url'">
            <div class="flex bg-secondary/50 p-0.5 rounded-md mb-2 border border-border/50">
              <button 
                class="flex-1 py-1.5 text-xs font-medium rounded-sm transition-all"
                :class="qrSubtype === 'url' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                @click="qrSubtype = 'url'"
              >
                {{ t('generator.website_url') }}
              </button>
              <button 
                class="flex-1 py-1.5 text-xs font-medium rounded-sm transition-all"
                :class="qrSubtype === 'text' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
                @click="qrSubtype = 'text'"
              >
                {{ t('generator.plain_text') }}
              </button>
            </div>

            <div v-if="qrSubtype === 'url'" class="space-y-1.5">
              <Label class="text-xs font-semibold text-foreground/80 hidden">{{ t('generator.website_url') }}</Label>
              <Input v-model="form.contentUrl" placeholder="https://example.com" class="h-9 text-sm bg-surface/50 border-border/50 focus-visible:ring-accent/30" @keydown.enter="handleGenerate" />
            </div>

            <div v-if="qrSubtype === 'text'" class="space-y-1.5">
              <Label class="text-xs font-semibold text-foreground/80 hidden">{{ t('generator.text') }}</Label>
              <textarea v-model="form.contentText" :placeholder="$t('generator.text_placeholder')" class="flex min-h-[80px] w-full rounded-md border border-input bg-surface/50 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/30 resize-none" @keydown.ctrl.enter="handleGenerate"></textarea>
            </div>
          </template>

          <template v-else-if="codeType === 'wifi'">
            <div class="space-y-1.5">
              <Label class="text-xs">{{ t('generator.wifi_ssid') }}</Label>
              <Input v-model="form.wifiSsid" :placeholder="t('generator.wifi_ssid')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
            </div>
            <div class="space-y-1.5">
              <Label class="text-xs">{{ t('generator.wifi_pass') }}</Label>
              <Input v-model="form.wifiPass" :placeholder="t('generator.wifi_pass')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
            </div>
            <label class="flex items-center gap-2 text-xs">
              <input type="checkbox" v-model="form.wifiHidden" class="rounded border-border bg-surface" />
              {{ t('generator.wifi_hidden') }}
            </label>
          </template>

          <template v-else-if="codeType === 'vcard'">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <Label class="text-xs">{{ t('generator.vcard_name') }}</Label>
                <Input v-model="form.vcardName" :placeholder="t('generator.vcard_name')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
              </div>
              <div class="space-y-1.5">
                <Label class="text-xs">{{ t('generator.vcard_phone') }}</Label>
                <Input v-model="form.vcardPhone" :placeholder="t('generator.vcard_phone')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
              </div>
              <div class="space-y-1.5 col-span-2">
                <Label class="text-xs">{{ t('generator.vcard_email') }}</Label>
                <Input v-model="form.vcardEmail" :placeholder="t('generator.vcard_email')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
              </div>
            </div>
          </template>

          <template v-else-if="codeType === 'email'">
            <div class="space-y-1.5">
              <Label class="text-xs">{{ t('generator.email_address') }}</Label>
              <Input v-model="form.emailAddress" :placeholder="t('generator.email_address')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
            </div>
            <div class="space-y-1.5">
              <Label class="text-xs">{{ t('generator.email_subject') }}</Label>
              <Input v-model="form.emailSubject" :placeholder="t('generator.email_subject')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
            </div>
          </template>

          <template v-else-if="codeType === 'phone'">
            <div class="space-y-1.5">
              <Label class="text-xs">{{ t('generator.vcard_phone') }}</Label>
              <Input v-model="form.phoneNumber" :placeholder="t('generator.vcard_phone')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
            </div>
          </template>

          <template v-else-if="codeType === 'sms'">
            <div class="space-y-1.5">
              <Label class="text-xs">{{ t('generator.vcard_phone') }}</Label>
              <Input v-model="form.smsNumber" :placeholder="t('generator.vcard_phone')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
            </div>
            <div class="space-y-1.5">
              <Label class="text-xs">{{ t('generator.sms_message') }}</Label>
              <Input v-model="form.smsMessage" :placeholder="t('generator.sms_message')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
            </div>
          </template>

          <template v-else-if="codeType === 'barcode'">
            <div class="space-y-1.5">
              <Label class="text-xs">{{ t('generator.barcode_content') }}</Label>
              <Input v-model="form.barcodeContent" :placeholder="t('generator.barcode_content')" class="bg-surface text-xs h-9" @keydown.enter="handleGenerate" />
            </div>
          </template>
        </div>

        <div class="flex gap-2 mt-2">
          <Button 
            v-if="uiStore.generatorMode === 'quick'"
            class="flex-1 bg-accent hover:bg-accent/90 text-white font-semibold h-8 text-xs shadow-md shadow-accent/20 transition-all rounded-md"
            @click="handleGenerate"
          >
            {{ t('generator.generate') }}
          </Button>
          <Button 
            v-if="uiStore.generatorMode === 'asset'"
            class="flex-1 bg-accent hover:bg-accent/90 text-white font-semibold h-8 text-xs shadow-md shadow-accent/20 transition-all rounded-md"
            @click="handleSaveToScene"
            :title="t('generator.save_to_scene')"
          >
            {{ t('generator.save_to_scene') }}
          </Button>
        </div>
      </div>

      <!-- History Section -->
      <div v-if="uiStore.generatorMode === 'quick' && assetStore.generatorHistory && assetStore.generatorHistory.length > 0" class="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 mt-4 min-h-0">
        <div class="border-t border-border/40 pt-4">
          <p class="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">{{ t('generator.history_title') }}</p>
          <div class="flex flex-col gap-2">
            <div 
              v-for="item in assetStore.generatorHistory" 
              :key="item.id"
              class="group/item flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-all"
              :class="[
                assetStore.liveCodeOverride?.id === item.id 
                  ? 'border-accent/40 bg-accent/5 shadow-sm' 
                  : 'border-border/40 bg-secondary/5 hover:bg-secondary/20 hover:border-border/60'
              ]"
              @click="handleHistoryClick(item)"
            >
              <div class="w-10 h-10 bg-white rounded border flex items-center justify-center p-1 shrink-0">
                <img :src="getAssetUrl(item.path)" class="max-w-full max-h-full object-contain" />
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




