import { ref, reactive, watch } from 'vue';
import { useAssetStore } from '@/stores/assets'
import { useUiStore } from '@/stores/ui';
import { useI18n } from 'vue-i18n';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { appDataDir, join } from '@tauri-apps/api/path';
import { writeFile, mkdir } from '@tauri-apps/plugin-fs';
import { v4 as uuidv4 } from 'uuid';
import { deleteLocalImage } from '@/utils/fs';

export type CodeType = 'url' | 'text' | 'wifi' | 'vcard' | 'email' | 'phone' | 'sms' | 'barcode';

export function useCodeGenerator() {
  const { t } = useI18n();
  const assetStore = useAssetStore()
  const uiStore = useUiStore();

  const codeType = ref<CodeType>((localStorage.getItem('generatorCodeType') as CodeType) || 'url');
  const qrSubtype = ref(localStorage.getItem('generatorQrSubtype') || 'url');

  const form = reactive({
    contentUrl: '',
    contentText: '',
    wifiSsid: '',
    wifiPass: '',
    wifiHidden: false,
    vcardName: '',
    vcardPhone: '',
    vcardEmail: '',
    emailAddress: '',
    emailSubject: '',
    phoneNumber: '',
    smsNumber: '',
    smsMessage: '',
    barcodeContent: ''
  });

  const defaultRandomLengths = {
    url: 8, text: 12, wifi: 8, vcard: 5,
    email: 5, phone: 9, sms: 6, barcode: 10
  };
  const savedLengths = JSON.parse(localStorage.getItem('generatorRandomLengths') || '{}');
  const randomLengths = reactive<Record<string, number>>({ ...defaultRandomLengths, ...savedLengths });

  watch(codeType, (val) => localStorage.setItem('generatorCodeType', val));
  watch(qrSubtype, (val) => localStorage.setItem('generatorQrSubtype', val));
  watch(randomLengths, (val) => localStorage.setItem('generatorRandomLengths', JSON.stringify(val)), { deep: true });

  function generateRandomString(length: number) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  }

  function generateRandomPhone() {
    let result = '0';
    for (let i = 0; i < 9; i++) result += Math.floor(Math.random() * 10);
    return result;
  }

  function getPayloadAndName(): { payload: string, name: string } {
    let payload = '';
    let name = '';
    const rLen = Number(randomLengths[codeType.value]) || 8;

    switch (codeType.value) {
      case 'url':
        if (qrSubtype.value === 'url') {
          payload = form.contentUrl.trim() || `https://${generateRandomString(rLen)}.com`;
          name = payload;
        } else {
          payload = form.contentText.trim() || generateRandomString(rLen);
          name = payload;
        }
        break;
      case 'wifi':
        const ssid = form.wifiSsid.trim() || `Guest_${generateRandomString(4)}`;
        const pass = form.wifiPass.trim() || generateRandomString(rLen);
        const hidden = form.wifiHidden ? 'true' : 'false';
        payload = `WIFI:T:WPA;S:${ssid};P:${pass};H:${hidden};;`;
        name = ssid;
        break;
      case 'vcard':
        const vName = form.vcardName.trim() || `User_${generateRandomString(rLen)}`;
        const vPhone = form.vcardPhone.trim() || generateRandomPhone();
        const vEmail = form.vcardEmail.trim() || `${vName.toLowerCase()}@example.com`;
        payload = `BEGIN:VCARD\nVERSION:3.0\nN:${vName}\nFN:${vName}\nTEL:${vPhone}\nEMAIL:${vEmail}\nEND:VCARD`;
        name = vName;
        break;
      case 'email':
        const eAddr = form.emailAddress.trim() || `contact_${generateRandomString(rLen)}@example.com`;
        const eSubj = form.emailSubject.trim();
        payload = `MATMSG:TO:${eAddr};SUB:${eSubj};BODY:;;`;
        name = eAddr;
        break;
      case 'phone':
        const pNum = form.phoneNumber.trim() || generateRandomPhone();
        payload = `tel:${pNum}`;
        name = pNum;
        break;
      case 'sms':
        const sNum = form.smsNumber.trim() || generateRandomPhone();
        const sMsg = form.smsMessage.trim() || `Hello ${generateRandomString(rLen)}`;
        payload = `smsto:${sNum}:${sMsg}`;
        name = sNum;
        break;
      case 'barcode':
        payload = form.barcodeContent.trim() || generateRandomString(rLen).toUpperCase();
        name = payload;
        break;
    }

    return { payload, name };
  }

  async function generateFile(payload: string): Promise<string> {
    const dir = await appDataDir();
    await mkdir(dir, { recursive: true }).catch(() => {});
    const fileName = `code_${uuidv4().substring(0,8)}.png`;
    const filePath = await join(dir, fileName);

    if (codeType.value === 'barcode') {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, payload, { format: "CODE128", width: 2, height: 100, displayValue: true });
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      await writeFile(filePath, buffer);
    } else {
      const dataUrl = await QRCode.toDataURL(payload, { width: 600, margin: 2 });
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      await writeFile(filePath, buffer);
    }
    return filePath;
  }

  function getBaseTransform() {
    const previousCode = assetStore.generatorHistory?.find(item => item.generatorType === codeType.value);
    return previousCode?.transform ? JSON.parse(JSON.stringify(previousCode.transform)) : {
      alignment: 0,
      boundsAlignment: 0,
      boundsHeight: 800,
      boundsType: "OBS_BOUNDS_SCALE_INNER",
      boundsWidth: 1200,
      cropBottom: 0, cropLeft: 0, cropRight: 0, cropTop: 0,
      positionX: 360, positionY: 140, rotation: 0, scaleX: 1, scaleY: 1
    };
  }

  async function handleGenerate() {
    if (!assetStore.activeGroupId) {
      alert(t('generator.select_scene_alert'));
      return;
    }
    try {
      const { payload, name } = getPayloadAndName();
      const filePath = await generateFile(payload);

      const newCodeItem = {
        id: `live-code-${Date.now()}`,
        name, path: filePath, shortcut: '',
        generatorType: (codeType.value === 'url' && qrSubtype.value === 'text') ? 'text' : codeType.value,
        transform: getBaseTransform()
      };

      assetStore.setLiveCodeOverride(newCodeItem);

      if (!assetStore.generatorHistory) assetStore.generatorHistory = [];
      assetStore.generatorHistory.unshift(newCodeItem);
      
      if (assetStore.generatorHistory.length > 50) {
        const removedItem = assetStore.generatorHistory.pop();
        if (removedItem && removedItem.path) {
          deleteLocalImage(removedItem.path).catch(console.error);
        }
      }
      assetStore.saveData();
    } catch (e) {
      console.error(e);
      alert(t('generator.generate_error'));
    }
  }

  async function handleSaveToScene() {
    if (!assetStore.activeGroupId) {
      alert(t('generator.select_scene_alert'));
      return;
    }
    try {
      const { payload, name } = getPayloadAndName();
      const filePath = await generateFile(payload);

      const newCodeItem = {
        name, path: filePath, shortcut: '',
        generatorType: (codeType.value === 'url' && qrSubtype.value === 'text') ? 'text' : codeType.value,
        transform: getBaseTransform()
      };

      await assetStore.addImage(assetStore.activeGroupId, newCodeItem);
      
      const group = assetStore.activeGroup;
      if (group) {
        const idx = group.images.length - 1;
        await assetStore.triggerImage(newCodeItem.path, idx);
      }
      uiStore.isGeneratorOpen = false;
    } catch (e) {
      console.error(e);
      alert(t('generator.generate_error'));
    }
  }

  function removeFromHistory(id: string) {
    if (!assetStore.generatorHistory) return;
    const index = assetStore.generatorHistory.findIndex(item => item.id === id);
    if (index === -1) return;

    assetStore.generatorHistory = assetStore.generatorHistory.filter(item => item.id !== id);

    if (assetStore.liveCodeOverride?.id === id) {
      if (assetStore.generatorHistory.length > 0) {
        const nextIndex = Math.min(index, assetStore.generatorHistory.length - 1);
        handleHistoryClick(assetStore.generatorHistory[nextIndex]);
      } else {
        assetStore.clearLiveCodeOverride();
      }
    }
    assetStore.saveData();
  }

  function handleHistoryClick(item: any) {
    assetStore.setLiveCodeOverride(item);
    if (item.generatorType) {
      if (item.generatorType === 'text') {
        codeType.value = 'url';
        qrSubtype.value = 'text';
      } else {
        codeType.value = item.generatorType as CodeType;
        if (item.generatorType === 'url') qrSubtype.value = 'url';
      }
    }
  }

  return {
    codeType,
    qrSubtype,
    form,
    randomLengths,
    handleGenerate,
    handleSaveToScene,
    removeFromHistory,
    handleHistoryClick
  };
}

