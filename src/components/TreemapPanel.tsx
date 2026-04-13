import { useState, useEffect, useRef } from 'react'
import ReactECharts from 'echarts-for-react'

interface FileInfo {
  name: string
  path: string
  size: number
  isDirectory: boolean
  children?: FileInfo[]
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

interface TreemapNode {
  name: string
  value: number
  path: string
  children?: TreemapNode[]
}

function buildTreemapData(fileInfo: FileInfo): TreemapNode {
  const node: TreemapNode = {
    name: fileInfo.name,
    value: fileInfo.size || 1,
    path: fileInfo.path
  }

  if (fileInfo.children && fileInfo.children.length > 0) {
    node.children = fileInfo.children
      .filter(child => child.size > 0)
      .map(child => buildTreemapData(child))
  }

  return node
}

const COLORS = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ff8c00',
  '#8bc34a', '#00bcd4', '#9c27b0', '#ff5722', '#607d8b'
]

export default function TreemapPanel() {
  const [drives, setDrives] = useState<DriveInfo[]>([])
  const [selectedDrive, setSelectedDrive] = useState<string>('')
  const [rootData, setRootData] = useState<FileInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [currentPath, setCurrentPath] = useState<string>('')
  const [breadcrumbs, setBreadcrumbs] = useState<{ name: string; path: string }[]>([])
  const chartRef = useRef<any>(null)

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
      const result = await window.api.file.scanDirectory(selectedDrive)
      setRootData(result)
      setCurrentPath(selectedDrive)
      setBreadcrumbs([{ name: result.name, path: result.path }])
    } catch (error) {
      console.error('Scan failed:', error)
    } finally {
      setScanning(false)
    }
  }

  const getCurrentData = (): FileInfo | null => {
    if (!rootData) return null
    
    let current: FileInfo = rootData
    for (let i = 1; i < breadcrumbs.length; i++) {
      const child = current.children?.find(c => c.path === breadcrumbs[i].path)
      if (!child) return current
      current = child
    }
    return current
  }

  const handleDrillDown = (path: string, name: string) => {
    const current = getCurrentData()
    if (!current) return
    
    const child = current.children?.find(c => c.path === path)
    if (child && child.isDirectory) {
      setBreadcrumbs([...breadcrumbs, { name: child.name, path: child.path }])
    }
  }

  const handleBreadcrumbClick = (index: number) => {
    setBreadcrumbs(breadcrumbs.slice(0, index + 1))
  }

  const getChartOption = () => {
    const current = getCurrentData()
    if (!current || !current.children) {
      return {
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'center',
          textStyle: { color: '#999' }
        }
      }
    }

    const treemapData = current.children.map((child, index) => ({
      name: child.name,
      value: child.size || 1,
      path: child.path,
      itemStyle: {
        color: COLORS[index % COLORS.length]
      }
    }))

    return {
      tooltip: {
        formatter: (info: any) => {
          return `<div class="p-2">
            <div class="font-bold">${info.name}</div>
            <div>大小: ${formatSize(info.value)}</div>
            <div class="text-xs mt-1">${info.data?.path || ''}</div>
          </div>`
        }
      },
      series: [
        {
          type: 'treemap',
          data: treemapData,
          label: {
            show: true,
            formatter: '{b}',
            fontSize: 12,
            color: '#fff',
            textShadowColor: '#000',
            textShadowBlur: 2
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1,
            gapWidth: 1
          },
          breadcrumb: {
            show: false
          },
          roam: true,
          nodeClick: 'zoom',
          levels: [
            {
              itemStyle: {
                borderColor: '#fff',
                borderWidth: 2,
                gapWidth: 2
              }
            }
          ]
        }
      ]
    }
  }

  const current = getCurrentData()

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">空间分析</h2>
        
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
                  {drive.name} ({formatSize(drive.freeSize)} 可用)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleScan}
            disabled={scanning || !selectedDrive}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scanning ? '扫描中...' : '开始分析'}
          </button>
        </div>

        {breadcrumbs.length > 0 && (
          <div className="mt-4 flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.path} className="flex items-center">
                {index > 0 && <span className="mx-2 text-gray-400">/</span>}
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className={`px-2 py-1 rounded ${
                    index === breadcrumbs.length - 1
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 p-4">
        {scanning ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">正在扫描...</p>
            </div>
          </div>
        ) : (
          <ReactECharts
            ref={chartRef}
            option={getChartOption()}
            style={{ height: '100%', width: '100%' }}
            onEvents={{
              'click': (params: any) => {
                if (params.data?.path) {
                  handleDrillDown(params.data.path, params.name)
                }
              }
            }}
          />
        )}
      </div>

      {current && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            当前目录: {current.name} | 大小: {formatSize(current.size)} | 子目录: {current.children?.length || 0}
          </span>
        </div>
      )}
    </div>
  )
}
