import { useState } from 'react'

interface TabItem {
  id: string
  name: string
  icon: string
}

const tabs: TabItem[] = [
  { id: 'largefiles', name: '大文件管理', icon: '📁' },
  { id: 'treemap', name: '空间分析', icon: '📊' },
  { id: 'appanalyzer', name: '应用分析', icon: '📱' },
  { id: 'winupdate', name: '更新清理', icon: '🧹' },
  { id: 'devclean', name: '开发清理', icon: '🗑️' }
]

type TabType = 'largefiles' | 'treemap' | 'appanalyzer' | 'winupdate' | 'devclean' | 'settings'

interface SidebarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-56 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">Cpressure</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">C盘空间释放工具</p>
      </div>
      
      <nav className="flex-1 p-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as TabType)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="font-medium">{tab.name}</span>
          </button>
        ))}
      </nav>

      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onTabChange('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
            activeTab === 'settings'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <span className="text-lg">⚙️</span>
          <span className="font-medium">设置</span>
        </button>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">v0.0.1-beta</p>
      </div>
    </aside>
  )
}
