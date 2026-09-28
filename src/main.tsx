import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './globals'
import { App } from './App'
import './styles.css'
import './app-enhancements.css'
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
