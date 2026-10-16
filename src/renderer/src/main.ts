import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'

const storedTheme = localStorage.getItem('mobai-theme')
if (storedTheme === 'dark' || storedTheme === 'light') document.documentElement.dataset.theme = storedTheme

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
