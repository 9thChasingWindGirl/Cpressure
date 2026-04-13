import { useState } from 'react'
import LargeFilesPanel from './components/LargeFilesPanel'
import TreemapPanel from './components/TreemapPanel'
import AppAnalyzerPanel from './components/AppAnalyzerPanel'
import WinUpdatePanel from './components/WinUpdatePanel'
import DevCleanPanel from './components/DevCleanPanel'
import SettingsPanel from './components/SettingsPanel'
import Sidebar from './components/Sidebar'

type TabType = 'largefiles' | 'treemap' | 'appanalyzer' | 'winupdate' | 'devclean' | 'settings'

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('largefiles')

  const renderContent = () => {
    switch (activeTab) {
      case 'largefiles':
        return <LargeFilesPanel />
      case 'treemap':
        return <TreemapPanel />
      case 'appanalyzer':
        return <AppAnalyzerPanel />
      case 'winupdate':
        return <WinUpdatePanel />
      case 'devclean':
        return <DevCleanPanel />
      case 'settings':
        return <SettingsPanel />
      default:
        return <LargeFilesPanel />
    }
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>
    </div>
  )
}

export default App
