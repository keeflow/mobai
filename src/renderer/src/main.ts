import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { installTheme } from './theme'
import './assets/main.css'

installTheme()

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
