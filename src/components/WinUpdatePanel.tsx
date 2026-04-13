import { useState, useEffect } from 'react'

interface UpdateCache {
  path: string
  size: number
  description: string
  safeToDelete: boolean
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function WinUpdatePanel() {
  const [caches, setCaches] = useState<UpdateCache[]>([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [selectedCaches, setSelectedCaches] = useState<Set<string>>(new Set())

  const handleDetect = async () => {
    try {
      setScanning(true)
      const result = await window.api.winupdate.detect()
      setCaches(result)
      setSelectedCaches(new Set(result.filter(c => c.safeToDelete).map(c => c.path)))
    } catch (error) {
      console.error('Detect failed:', error)
    } finally {
      setScanning(false)
    }
  }

  const handleClean = async () => {
    const pathsToClean = Array.from(selectedCaches)
    
    if (pathsToClean.length === 0) {
      await window.api.dialog.showMessage({
        type: 'info',
        title: '提示',
        message: '请选择要清理的项目',
        buttons: ['确定']
      })
      return
    }

    const result = await window.api.dialog.showMessage({
      type: 'warning',
      title: '确认清理',
      message: `确定要清理选中的 ${pathsToClean.length} 个项目吗？`,
      detail: `此操作将释放约 ${formatSize(
        caches.filter(c => selectedCaches.has(c.path)).reduce((sum, c) => sum + c.size, 0)
      )} 空间\n\n注意：\n- 标记为"不安全删除"的项目可能影响系统恢复\n- 建议清理前创建系统还原点`,
      buttons: ['取消', '清理'],
      defaultId: 0,
      cancelId: 0
    })

    if (result.response === 1) {
      setCleaning(true)
      try {
        const cleanResult = await window.api.winupdate.clean(pathsToClean)
        
        if (cleanResult.success) {
          await window.api.dialog.showMessage({
            type: 'info',
            title: '清理完成',
            message: `成功释放 ${formatSize(cleanResult.freedSpace)} 空间`,
            detail: cleanResult.errors.length > 0 
              ? `部分文件清理失败:\n${cleanResult.errors.join('\n')}`
              : '所有选中的项目已清理完成',
            buttons: ['确定']
          })
          handleDetect()
        } else {
          await window.api.dialog.showMessage({
            type: 'error',
            title: '清理失败',
            message: cleanResult.errors.join('\n'),
            buttons: ['确定']
          })
        }
      } finally {
        setCleaning(false)
      }
    }
  }

  const toggleSelect = (path: string) => {
    const newSelected = new Set(selectedCaches)
    if (newSelected.has(path)) {
      newSelected.delete(path)
    } else {
      newSelected.add(path)
    }
    setSelectedCaches(newSelected)
  }

  const selectAll = (safeOnly: boolean) => {
    if (safeOnly) {
      setSelectedCaches(new Set(caches.filter(c => c.safeToDelete).map(c => c.path)))
    } else {
      setSelectedCaches(new Set(caches.map(c => c.path)))
    }
  }

  const totalSize = caches.reduce((sum, c) => sum + c.size, 0)
  const selectedSize = caches
    .filter(c => selectedCaches.has(c.path))
    .reduce((sum, c) => sum + c.size, 0)

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Windows更新清理</h2>
        
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleDetect}
            disabled={scanning}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {scanning ? '检测中...' : '检测更新残留'}
          </button>

          {caches.length > 0 && (
            <>
              <button
                onClick={() => selectAll(true)}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                选中安全的
              </button>
              <button
                onClick={() => selectAll(false)}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                全选
              </button>
              <button
                onClick={() => setSelectedCaches(new Set())}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                取消全选
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {caches.length === 0 && !scanning ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <p className="text-4xl mb-4">🧹</p>
              <p>点击"检测更新残留"开始扫描</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {caches.map((cache) => (
              <div
                key={cache.path}
                className={`p-4 border rounded-lg transition-colors ${
                  selectedCaches.has(cache.path)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                } ${!cache.safeToDelete ? 'border-l-4 border-l-yellow-500' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedCaches.has(cache.path)}
                    onChange={() => toggleSelect(cache.path)}
                    className="mt-1 w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 dark:text-white">
                        {cache.description}
                      </span>
                      {!cache.safeToDelete && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                          建议保留
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {cache.path}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                      大小: {formatSize(cache.size)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span>检测到 {caches.length} 个项目</span>
            <span className="mx-2">|</span>
            <span>总计: {formatSize(totalSize)}</span>
            <span className="mx-2">|</span>
            <span>选中: {formatSize(selectedSize)}</span>
          </div>
          <button
            onClick={handleClean}
            disabled={cleaning || selectedCaches.size === 0}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cleaning ? '清理中...' : '清理选中项目'}
          </button>
        </div>
      </div>
    </div>
  )
}
