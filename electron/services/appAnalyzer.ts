import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface InstalledApp {
  name: string
  path: string
  publisher: string
  version: string
}

export interface CacheDir {
  path: string
  size: number
  type: 'cache' | 'config' | 'data' | 'temp'
}

async function queryRegistry(keyPath: string): Promise<InstalledApp[]> {
  const apps: InstalledApp[] = []
  
  try {
    const { stdout } = await execAsync(
      `reg query "${keyPath}" /s /v "DisplayName" 2>nul`,
      { maxBuffer: 50 * 1024 * 1024 }
    )
    
    const lines = stdout.split('\n')
    let currentApp: Partial<InstalledApp> = {}
    
    for (const line of lines) {
      if (line.includes('DisplayName') && line.includes('REG_SZ')) {
        const match = line.match(/DisplayName\s+REG_SZ\s+(.+)/)
        if (match) {
          if (currentApp.name) {
            apps.push(currentApp as InstalledApp)
          }
          currentApp = { name: match[1].trim() }
        }
      } else if (line.includes('InstallLocation') && line.includes('REG_SZ')) {
        const match = line.match(/InstallLocation\s+REG_SZ\s+(.+)/)
        if (match) {
          currentApp.path = match[1].trim()
        }
      } else if (line.includes('Publisher') && line.includes('REG_SZ')) {
        const match = line.match(/Publisher\s+REG_SZ\s+(.+)/)
        if (match) {
          currentApp.publisher = match[1].trim()
        }
      } else if (line.includes('DisplayVersion') && line.includes('REG_SZ')) {
        const match = line.match(/DisplayVersion\s+REG_SZ\s+(.+)/)
        if (match) {
          currentApp.version = match[1].trim()
        }
      }
    }
    
    if (currentApp.name) {
      apps.push(currentApp as InstalledApp)
    }
  } catch (error) {
    console.error('Registry query error:', error)
  }
  
  return apps
}

export async function listInstalledApps(): Promise<InstalledApp[]> {
  const apps: InstalledApp[] = []
  
  const keyPaths = [
    'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
  ]
  
  for (const keyPath of keyPaths) {
    const appsInKey = await queryRegistry(keyPath)
    apps.push(...appsInKey)
  }
  
  const uniqueApps = apps.filter((app, index, self) => 
    index === self.findIndex(a => a.name === app.name)
  )
  
  return uniqueApps.sort((a, b) => a.name.localeCompare(b.name))
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

export async function getAppCacheDirs(appName: string): Promise<CacheDir[]> {
  const cacheDirs: CacheDir[] = []
  const normalizedName = appName.toLowerCase().replace(/[^a-z0-9]/g, '')
  
  const possiblePaths = [
    { type: 'cache' as const, base: process.env.LOCALAPPDATA || 'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local', pattern: normalizedName },
    { type: 'cache' as const, base: process.env.APPDATA || 'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Roaming', pattern: normalizedName },
    { type: 'config' as const, base: process.env.LOCALAPPDATA, pattern: normalizedName },
    { type: 'config' as const, base: process.env.APPDATA, pattern: normalizedName },
    { type: 'data' as const, base: process.env.LOCALAPPDATA, pattern: normalizedName },
    { type: 'temp' as const, base: process.env.TEMP, pattern: '' }
  ]
  
  for (const { type, base, pattern } of possiblePaths) {
    if (!base) continue
    
    try {
      if (fs.existsSync(base)) {
        const entries = fs.readdirSync(base, { withFileTypes: true })
        for (const entry of entries) {
          const normalizedEntry = entry.name.toLowerCase().replace(/[^a-z0-9]/g, '')
          if (pattern && !normalizedEntry.includes(pattern)) {
            continue
          }
          
          const fullPath = path.join(base, entry.name)
          if (!fullPath.toUpperCase().startsWith('C:\\')) {
            continue
          }
          if (entry.isDirectory()) {
            const size = calculateDirSize(fullPath)
            if (size > 0) {
              cacheDirs.push({
                path: fullPath,
                size,
                type
              })
            }
          }
        }
      }
    } catch {}
  }
  
  return cacheDirs.sort((a, b) => b.size - a.size)
}

export const appAnalyzer = {
  listInstalledApps,
  getAppCacheDirs
}
