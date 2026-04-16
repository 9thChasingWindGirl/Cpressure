import { useState, useEffect } from 'react'

interface InstalledApp {
  name: string
  path: string
  publisher: string
  version: string
}

interface CacheDir {
  path: string
  size: number
  type: 'cache' | 'config' | 'data' | 'temp'
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function AppAnalyzerPanel() {
  const [apps, setApps] = useState<InstalledApp[]>([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [selectedApp, setSelectedApp] = useState<InstalledApp | null>(null)
  const [cacheDirs, setCacheDirs] = useState<CacheDir[]>([])
  const [loadingCache, setLoadingCache] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      const admin = await window.api.symlink.checkAdmin()
      setIsAdmin(admin)
    } catch (error) {
      console.error('Failed to check admin:', error)
    }
  }

  const handleScanApps = async () => {
    try {
      setScanning(true)
      const result = await window.api.app.listInstalled()
      setApps(result)
    } catch (error) {
      console.error('Scan apps failed:', error)
    } finally {
      setScanning(false)
    }
  }

  const handleSelectApp = async (app: InstalledApp) => {
    setSelectedApp(app)
    setLoadingCache(true)
    try {
      const dirs = await window.api.app.getAppCacheDirs(app.name)
      setCacheDirs(dirs)
    } catch (error) {
      console.error('Get cache dirs failed:', error)
      setCacheDirs([])
    } finally {
      setLoadingCache(false)
    }
  }

  const handleMigrate = async (cacheDir: CacheDir) => {
    const result = await window.api.dialog.showMessage({
      type: 'warning',
      title: '迁移目录',
      message: `确定要将 "${cacheDir.path}" 迁移到其他盘符吗？`,
      detail: `类型: ${cacheDir.type}\n大小: ${formatSize(cacheDir.size)}\n\n操作原理：\n1. 将目录移动到目标位置\n2. 在原位置创建符号链接指向新位置\n\n⚠️ 注意：迁移后应用需要重启才能正常使用`,
      buttons: ['取消', '继续'],
      defaultId: 0,
      cancelId: 0
    })

    if (result.response === 1) {
      const targetDir = await window.api.dialog.openDirectory()
      if (!targetDir) return

      setMigrating(true)
      try {
        const newPath = targetDir + '\\' + cacheDir.path.split('\\').pop()
        const migrateResult = await window.api.symlink.create(cacheDir.path, newPath)
        
        if (migrateResult.success) {
          await window.api.dialog.showMessage({
            type: 'info',
            title: '迁移成功',
            message: '目录已成功迁移！',
            detail: `原位置: ${cacheDir.path}\n新位置: ${newPath}\n\n请重启相关应用程序使更改生效。`,
            buttons: ['确定']
          })
          handleSelectApp(selectedApp!)
        } else {
          await window.api.dialog.showMessage({
            type: 'error',
            title: '迁移失败',
            message: migrateResult.error || '无法迁移目录',
            buttons: ['确定']
          })
        }
      } finally {
        setMigrating(false)
      }
    }
  }

  const handleOpenLocation = (path: string) => {
    window.api.shell.showItemInFolder(path)
  }

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.publisher?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalCacheSize = cacheDirs.reduce((sum, dir) => sum + dir.size, 0)

  return (
    <div className="h-full flex bg-white dark:bg-gray-800">
      <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">已安装应用</h2>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleScanApps}
              disabled={scanning}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {scanning ? '扫描中...' : '扫描应用'}
            </button>
            
            <input
              type="text"
              placeholder="搜索应用..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            />
          </div>

          {!isAdmin && (
            <div className="mb-4 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                ⚠️ 部分功能需要管理员权限才能使用
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto">
          {apps.length === 0 && !scanning ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p className="text-4xl mb-4">📱</p>
                <p>点击"扫描应用"查找已安装程序</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredApps.map((app) => (
                <div
                  key={app.path}
                  onClick={() => handleSelectApp(app)}
                  className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedApp?.path === app.path ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="font-medium text-gray-800 dark:text-white">{app.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {app.publisher && <span>{app.publisher}</span>}
                    {app.version && <span className="ml-2">v{app.version}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            共 {apps.length} 个应用
          </span>
        </div>
      </div>

      <div className="w-1/2 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">缓存目录</h2>
          {selectedApp && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {selectedApp.name}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          {!selectedApp ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>选择一个应用查看缓存目录</p>
            </div>
          ) : loadingCache ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : cacheDirs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>未找到缓存目录</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm text-blue-700 dark:text-blue-400">
                  总计: {formatSize(totalCacheSize)}
                </span>
              </div>

              {cacheDirs.map((dir) => (
                <div
                  key={dir.path}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-800 dark:text-white">
                        {dir.path.split('\\').pop()}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {dir.path}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          dir.type === 'cache' ? 'bg-green-100 text-green-700' :
                          dir.type === 'config' ? 'bg-blue-100 text-blue-700' :
                          dir.type === 'data' ? 'bg-purple-100 text-purple-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {dir.type}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {formatSize(dir.size)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenLocation(dir.path)}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                      >
                        打开
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleMigrate(dir)}
                          disabled={migrating}
                          className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                        >
                          {migrating ? '迁移中...' : '迁移'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
