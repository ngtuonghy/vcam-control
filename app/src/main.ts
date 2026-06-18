import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './styles/globals.css'
import { i18n } from './utils/i18n'
import App from './app/App.vue'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(i18n)
app.mount('#app')
