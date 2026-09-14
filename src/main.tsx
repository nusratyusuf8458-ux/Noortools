import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './android.css'
import './content.css'
import App from './App'
import Phase2Launcher from './Phase2Launcher'
import Phase23Launcher from './Phase23Launcher'
import GlobalSearchLauncher from './GlobalSearchLauncher'

createRoot(document.getElementById('root')!).render(
  <StrictMode><><App /><Phase2Launcher /><Phase23Launcher /><GlobalSearchLauncher /></></StrictMode>,
)
