import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface UpdateCache {
  path: string
  size: number
  description: string
  safeToDelete: boolean
}

function calculateDirSize(dirPath: string): number {
  let size = 0
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      try {
        if (entry.isDirectory()) {
          size += calculateDirSize(fullPath)
        } else {
          const stats = fs.statSync(fullPath)
          size += stats.size
        }
      } catch {}
    }
  } catch {}
  return size
}

export async function detectUpdateCache(): Promise<UpdateCache[]> {
  const updateCaches: UpdateCache[] = []

  const possibleLocations = [
    {
      path: 'C:\\Windows\\SoftwareDistribution\\Download',
      description: 'Windows更新下载缓存',
      safeToDelete: false
    },
    {
      path: 'C:\\Windows\\SoftwareDistribution\\Backup',
      description: 'Windows更新备份',
      safeToDelete: true
    },
    {
      path: 'C:\\Windows\\Installer\\$PatchCache$',
      description: '补丁缓存',
      safeToDelete: false
    },
    {
      path: 'C:\\Windows\\WinSxS\\Backup',
      description: '组件存储备份',
      safeToDelete: true
    },
    {
      path: 'C:\\Windows\\Temp',
      description: '临时文件',
      safeToDelete: true
    },
    {
      path: process.env.TEMP || 'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Temp',
      description: '用户临时文件',
      safeToDelete: true
    },
    {
      path: 'C:\\Windows\\Prefetch',
      description: '预读取文件',
      safeToDelete: true
    }
  ]

  for (const location of possibleLocations) {
    try {
      if (fs.existsSync(location.path)) {
        const size = calculateDirSize(location.path)
        if (size > 0) {
          updateCaches.push({
            path: location.path,
            size,
            description: location.description,
            safeToDelete: location.safeToDelete
          })
        }
      }
    } catch {}
  }

  try {
    const { stdout } = await execAsync(
      'wmic datafile where "Drive=\'C:\'" and (Extension=\'msu\' or Extension=\'cab\') get Caption,FileSize /format:csv'
    )
    const lines = stdout.split('\n').filter(l => l.includes(',') && !l.startsWith('Node'))
    
    if (lines.length > 0) {
      let otherSize = 0
      for (const line of lines) {
        const parts = line.split(',')
        if (parts.length >= 3) {
          const fileSize = parseInt(parts[1]) || 0
          if (fileSize > 0) {
            otherSize += fileSize
          }
        }
      }
      
      if (otherSize > 0) {
        updateCaches.push({
          path: 'C:\\Windows\\System32\\DriverStore',
          size: otherSize,
          description: '旧版驱动文件',
          safeToDelete: false
        })
      }
    }
  } catch {}

  return updateCaches.sort((a, b) => b.size - a.size)
}

export async function cleanUpdateCache(paths: string[]): Promise<{ success: boolean; freedSpace: number; errors: string[] }> {
  let freedSpace = 0
  const errors: string[] = []

  for (const targetPath of paths) {
    try {
      if (!fs.existsSync(targetPath)) continue

      const entries = fs.readdirSync(targetPath, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(targetPath, entry.name)
        try {
          const entrySize = entry.isDirectory() ? calculateDirSize(fullPath) : fs.statSync(fullPath).size
          if (entry.isDirectory()) {
            fs.rmSync(fullPath, { recursive: true, force: true })
          } else {
            fs.unlinkSync(fullPath)
          }
          freedSpace += entrySize
        } catch (error: any) {
          errors.push(`${entry.name}: ${error.message}`)
        }
      }
    } catch (error: any) {
      errors.push(`${targetPath}: ${error.message}`)
    }
  }

  return { success: errors.length === 0, freedSpace, errors }
}

export const winUpdateCleanup = {
  detectUpdateCache,
  cleanUpdateCache
}
