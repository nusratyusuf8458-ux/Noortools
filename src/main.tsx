import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './android.css'
import './content.css'
import './phase3.css'
import './phase3b.css'
import './phase3c.css'
import App from './App'
import Phase2Launcher from './Phase2Launcher'
import Phase23Launcher from './Phase23Launcher'
import GlobalSearchLauncher from './GlobalSearchLauncher'
import Phase3Launcher from './Phase3Launcher'
import Phase3BLauncher from './Phase3BLauncher'
import Phase3CLauncher from './Phase3CLauncher'

createRoot(document.getElementById('root')!).render(
  <StrictMode><><App /><Phase2Launcher /><Phase23Launcher /><GlobalSearchLauncher /><Phase3Launcher /><Phase3BLauncher /><Phase3CLauncher /></></StrictMode>,
)
