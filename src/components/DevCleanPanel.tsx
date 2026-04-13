import { useState } from 'react'

interface CleanTarget {
  id: string
  name: string
  description: string
  path: string
  size: number
  selected: boolean
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function DevCleanPanel() {
  const [targets, setTargets] = useState<CleanTarget[]>([
    { id: 'node_modules', name: 'node_modules', description: 'Node.js 项目依赖', path: 'node_modules', size: 0, selected: true },
    { id: 'dist', name: 'dist', description: 'Vite 构建产物', path: 'dist', size: 0, selected: true },
    { id: 'dist-electron', name: 'dist-electron', description: 'Electron 构建产物', path: 'dist-electron', size: 0, selected: true },
    { id: 'release', name: 'release', description: 'Electron 发布目录', path: 'release', size: 0, selected: false },
    { id: '.vite', name: '.vite', description: 'Vite 缓存', path: '.vite', size: 0, selected: true },
    { id: '.cache', name: '.cache', description: '通用缓存目录', path: '.cache', size: 0, selected: false },
    { id: 'pnpm-cache', name: 'pnpm-cache', description: 'pnpm 包管理器缓存', path: 'pnpm', size: 0, selected: false },
    { id: 'npm-cache', name: 'npm-cache', description: 'npm 包管理器缓存', path: 'npm', size: 0, selected: false },
    { id: 'yarn-cache', name: 'yarn-cache', description: 'yarn 包管理器缓存', path: 'yarn', size: 0, selected: false },
    { id: '__pycache__', name: '__pycache__', description: 'Python 字节码缓存', path: '__pycache__', size: 0, selected: false },
    { id: '.pytest_cache', name: '.pytest_cache', description: 'Pytest 测试缓存', path: '.pytest_cache', size: 0, selected: false },
    { id: 'pycache', name: '*.pyc', description: 'Python 编译文件', path: '*.pyc', size: 0, selected: false },
    { id: 'venv', name: 'venv', description: 'Python 虚拟环境', path: 'venv', size: 0, selected: false },
    { id: '.venv', name: '.venv', description: 'Python 虚拟环境 (dot)', path: '.venv', size: 0, selected: false },
    { id: 'env', name: 'env', description: 'Python 虚拟环境 (env)', path: 'env', size: 0, selected: false },
    { id: '.mypy_cache', name: '.mypy_cache', description: 'Mypy 类型检查缓存', path: '.mypy_cache', size: 0, selected: false },
    { id: '.ruff_cache', name: '.ruff_cache', description: 'Ruff linter 缓存', path: '.ruff_cache', size: 0, selected: false },
    { id: '.idea', name: '.idea', description: 'IntelliJ IDEA 配置', path: '.idea', size: 0, selected: false },
    { id: '.vscode', name: '.vscode', description: 'VS Code 配置', path: '.vscode', size: 0, selected: false },
    { id: '*.log', name: '*.log', description: '日志文件', path: '*.log', size: 0, selected: false },
  ])
  const [cleaning, setCleaning] = useState(false)
  const [log, setLog] = useState<string[]>([])

  const toggleSelect = (id: string) => {
    setTargets(targets.map(t => 
      t.id === id ? { ...t, selected: !t.selected } : t
    ))
  }

  const selectAll = () => {
    setTargets(targets.map(t => ({ ...t, selected: true })))
  }

  const deselectAll = () => {
    setTargets(targets.map(t => ({ ...t, selected: false })))
  }

  const getSelectedPaths = (): string[] => {
    return targets.filter(t => t.selected).map(t => t.path)
  }

  const addLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }

  const handleClean = async () => {
    const selected = getSelectedPaths()
    if (selected.length === 0) {
      await window.api.dialog.showMessage({
        type: 'warning',
        title: '提示',
        message: '请选择要清理的项目',
        buttons: ['确定']
      })
      return
    }

    const result = await window.api.dialog.showMessage({
      type: 'warning',
      title: '确认清理',
      message: `确定要清理选中的 ${selected.length} 个项目吗？`,
      detail: '此操作将删除所选目录，无法恢复！',
      buttons: ['取消', '确认清理'],
      defaultId: 0,
      cancelId: 0
    })

    if (result.response === 1) {
      setCleaning(true)
      setLog([])
      addLog('开始清理...')

      try {
        for (const target of targets.filter(t => t.selected)) {
          addLog(`正在清理: ${target.path}...`)
          
          const cleanResult = await (window.api as any).devClean?.clean(target.path)
          
          if (cleanResult?.success) {
            addLog(`✓ ${target.path} 清理完成 (释放 ${formatSize(cleanResult.freedSpace || 0)})`)
          } else if (cleanResult?.error?.includes('not found') || cleanResult?.error?.includes('不存在')) {
            addLog(`○ ${target.path} 不存在，跳过`)
          } else if (cleanResult?.error) {
            addLog(`✗ ${target.path} 清理失败: ${cleanResult.error}`)
          } else {
            addLog(`✓ ${target.path} 清理完成`)
          }
        }
        
        addLog('清理完成!')
        
        await window.api.dialog.showMessage({
          type: 'info',
          title: '清理完成',
          message: '开发环境清理完成',
          buttons: ['确定']
        })
      } catch (error: any) {
        addLog(`✗ 清理失败: ${error.message}`)
      } finally {
        setCleaning(false)
      }
    }
  }

  const selectedCount = targets.filter(t => t.selected).length
  const totalSize = targets.reduce((sum, t) => sum + (t.selected ? t.size : 0), 0)

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">开发环境清理</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          清理项目中的缓存和构建产物，释放磁盘空间
        </p>
      </div>

      <div className="p-4 flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={selectAll}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          全选
        </button>
        <button
          onClick={deselectAll}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          取消全选
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          {targets.map(target => (
            <div
              key={target.id}
              className={`p-4 border rounded-lg transition-colors ${
                target.selected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={target.selected}
                  onChange={() => toggleSelect(target.id)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-800 dark:text-white">
                    {target.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {target.description}
                  </div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {target.size > 0 ? formatSize(target.size) : '?'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {log.length > 0 && (
          <div className="mt-4 p-3 bg-gray-900 rounded-lg max-h-48 overflow-auto">
            <div className="text-xs font-mono text-gray-300 space-y-1">
              {log.map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            已选择 {selectedCount} 项
          </div>
          <button
            onClick={handleClean}
            disabled={cleaning || selectedCount === 0}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cleaning ? '清理中...' : '开始清理'}
          </button>
        </div>
      </div>
    </div>
  )
}
