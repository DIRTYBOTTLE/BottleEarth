import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

window.CESIUM_BASE_URL = '/';
window.tiandituTK = "057532f01c1b949cb43202d3aa352993"
window.cesiumDefaultAccessToken ='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyNDg2NzE0Yy1jNTQzLTQ4NWMtODI0My03OTg5NWZiYWY2YjUiLCJpZCI6NzU0MjYsImlhdCI6MTYzODU5NzkyOH0.nMc5nLbF-KZFbOCPyZeiDSHiX5tCDv8brYBZIElPfKs';

createApp(App).use(ElementPlus).mount('#app')
