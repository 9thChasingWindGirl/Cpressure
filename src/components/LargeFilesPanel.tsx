import { useState, useEffect } from 'react'

interface FileInfo {
  name: string
  path: string
  size: number
  isDirectory: boolean
  modifiedTime?: number
}

interface DriveInfo {
  name: string
  path: string
  totalSize: number
  freeSize: number
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

export default function LargeFilesPanel() {
  const [drives, setDrives] = useState<DriveInfo[]>([])
  const [selectedDrive, setSelectedDrive] = useState<string>('')
  const [files, setFiles] = useState<FileInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [minSize, setMinSize] = useState(100)
  const [sortBy, setSortBy] = useState<'size' | 'name' | 'time'>('size')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null)

  useEffect(() => {
    loadDrives()
  }, [])

  const loadDrives = async () => {
    try {
      setLoading(true)
      const driveList = await window.api.file.getDrives()
      setDrives(driveList)
      if (driveList.length > 0) {
        setSelectedDrive(driveList[0].path)
      }
    } catch (error) {
      console.error('Failed to load drives:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async () => {
    if (!selectedDrive) return
    
    try {
      setScanning(true)
      const minSizeBytes = minSize * 1024 * 1024
      const result = await window.api.file.scanLargeFiles(selectedDrive, minSizeBytes)
      setFiles(result)
    } catch (error) {
      console.error('Scan failed:', error)
    } finally {
      setScanning(false)
    }
  }

  const handleDelete = async (file: FileInfo) => {
    const result = await window.api.dialog.showMessage({
      type: 'warning',
      title: '确认删除',
      message: `确定要删除 "${file.name}" 吗？`,
      detail: `路径: ${file.path}\n大小: ${formatSize(file.size)}`,
      buttons: ['取消', '删除'],
      defaultId: 0,
      cancelId: 0
    })

    if (result.response === 1) {
      const deleteResult = await window.api.file.delete(file.path)
      if (deleteResult.success) {
        setFiles(files.filter(f => f.path !== file.path))
      } else {
        await window.api.dialog.showMessage({
          type: 'error',
          title: '删除失败',
          message: deleteResult.error || '无法删除文件',
          buttons: ['确定']
        })
      }
    }
  }

  const handleOpenLocation = (file: FileInfo) => {
    window.api.shell.showItemInFolder(file.path)
  }

  const sortedFiles = [...files].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'size':
        comparison = a.size - b.size
        break
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'time':
        comparison = (a.modifiedTime || 0) - (b.modifiedTime || 0)
        break
    }
    return sortOrder === 'desc' ? -comparison : comparison
  })

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">大文件管理</h2>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">选择驱动器:</label>
            <select
              value={selectedDrive}
              onChange={(e) => setSelectedDrive(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            >
              {drives.map(drive => (
                <option key={drive.path} value={drive.path}>
                  {drive.name} ({formatSize(drive.freeSize)} 可用 / {formatSize(drive.totalSize)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">最小文件大小:</label>
            <select
              value={minSize}
              onChange={(e) => setMinSize(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            >
              <option value={10}>10 MB</option>
              <option value={50}>50 MB</option>
              <option value={100}>100 MB</option>
              <option value={500}>500 MB</option>
              <option value={1000}>1 GB</option>
            </select>
          </div>

          <button
            onClick={handleScan}
            disabled={scanning || !selectedDrive}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanning ? '扫描中...' : '开始扫描'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {files.length === 0 && !scanning ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <p className="text-4xl mb-4">📁</p>
              <p>点击"开始扫描"查找大文件</p>
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer"
                  onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }}
                >
                  文件名 {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer"
                  onClick={() => { setSortBy('size'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }}
                >
                  大小 {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer"
                  onClick={() => { setSortBy('time'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc') }}
                >
                  修改时间 {sortBy === 'time' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedFiles.map((file, index) => (
                <tr 
                  key={file.path + index}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedFile?.path === file.path ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  onClick={() => setSelectedFile(file)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{file.isDirectory ? '📁' : '📄'}</span>
                      <span className="text-gray-800 dark:text-white font-medium truncate max-w-md" title={file.path}>
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {formatSize(file.size)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                    {file.modifiedTime ? formatDate(file.modifiedTime) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenLocation(file); }}
                        className="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                      >
                        打开位置
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(file); }}
                        className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          共找到 {files.length} 个大文件
        </span>
      </div>
    </div>
  )
}
