import { useState } from 'react'

export default function SettingsPanel() {
  const [settings, setSettings] = useState({
    darkMode: false,
    scanHiddenFiles: false,
    confirmBeforeDelete: true,
    defaultMinSize: 100
  })

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">设置</h2>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">外观</h3>
            <label className="flex items-center justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">深色模式</span>
              <input
                type="checkbox"
                checked={settings.darkMode}
                onChange={(e) => setSettings({ ...settings, darkMode: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </label>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">扫描</h3>
            <label className="flex items-center justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">扫描隐藏文件</span>
              <input
                type="checkbox"
                checked={settings.scanHiddenFiles}
                onChange={(e) => setSettings({ ...settings, scanHiddenFiles: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">删除前确认</span>
              <input
                type="checkbox"
                checked={settings.confirmBeforeDelete}
                onChange={(e) => setSettings({ ...settings, confirmBeforeDelete: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
            </label>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">大文件扫描</h3>
            <label className="flex items-center justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">默认最小文件大小 (MB)</span>
              <select
                value={settings.defaultMinSize}
                onChange={(e) => setSettings({ ...settings, defaultMinSize: Number(e.target.value) })}
                className="ml-4 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              >
                <option value={10}>10 MB</option>
                <option value={50}>50 MB</option>
                <option value={100}>100 MB</option>
                <option value={500}>500 MB</option>
                <option value={1000}>1 GB</option>
              </select>
            </label>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">关于</h3>
            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
              <p>Cpressure v0.0.1-beta</p>
              <p>Windows C盘空间释放工具</p>
              <p className="text-xs">帮助您分析磁盘空间，清理无用文件</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
