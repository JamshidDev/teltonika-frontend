import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'

// Import global styles
import './style.css'

// Create Vue app
const app = createApp(App)

// Use plugins
app.use(createPinia())  // State management
app.use(router)          // Routing
app.use(i18n)            // Internationalization

// Mount app
app.mount('#app')
