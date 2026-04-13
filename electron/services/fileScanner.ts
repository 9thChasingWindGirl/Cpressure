import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface FileInfo {
  name: string
  path: string
  size: number
  isDirectory: boolean
  children?: FileInfo[]
  modifiedTime?: number
}

export interface DriveInfo {
  name: string
  path: string
  totalSize: number
  freeSize: number
}

export async function getDrives(): Promise<DriveInfo[]> {
  const drives: DriveInfo[] = []
  
  try {
    const { stdout } = await execAsync('wmic logicaldisk get Caption,Size,FreeSpace /format:csv')
    const lines = stdout.trim().split('\n').filter(line => line.trim())
    
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',')
      if (parts.length >= 4) {
        const letter = parts[1].trim()
        const freeSpace = parseInt(parts[2].trim()) || 0
        const size = parseInt(parts[3].trim()) || 0
        
        if (letter && size > 0) {
          drives.push({
            name: letter,
            path: letter + '\\',
            totalSize: size,
            freeSize: freeSpace
          })
        }
      }
    }
  } catch (error) {
    const defaultDrives = ['C', 'D', 'E', 'F']
    for (const letter of defaultDrives) {
      const drivePath = letter + ':\\'
      try {
        if (fs.existsSync(drivePath)) {
          drives.push({
            name: letter,
            path: drivePath,
            totalSize: 0,
            freeSize: 0
          })
        }
      } catch {}
    }
  }
  
  return drives
}

export async function scanLargeFiles(dirPath: string, minSize: number = 100 * 1024 * 1024): Promise<FileInfo[]> {
  const results: FileInfo[] = []
  
  async function scanDir(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        try {
          if (entry.isDirectory()) {
            await scanDir(fullPath)
          } else {
            const stats = fs.statSync(fullPath)
            if (stats.size >= minSize) {
              results.push({
                name: entry.name,
                path: fullPath,
                size: stats.size,
                isDirectory: false,
                modifiedTime: stats.mtimeMs
              })
            }
          }
        } catch {}
      }
    } catch {}
  }
  
  await scanDir(dirPath)
  
  return results.sort((a, b) => b.size - a.size).slice(0, 500)
}

export async function scanDirectory(dirPath: string): Promise<FileInfo> {
  function calculateSize(dir: string): number {
    let totalSize = 0
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        try {
          if (entry.isDirectory()) {
            totalSize += calculateSize(fullPath)
          } else {
            const stats = fs.statSync(fullPath)
            totalSize += stats.size
          }
        } catch {}
      }
    } catch {}
    return totalSize
  }
  
  const stats = fs.statSync(dirPath)
  const children: FileInfo[] = []
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      try {
        const entryStats = fs.statSync(fullPath)
        children.push({
          name: entry.name,
          path: fullPath,
          size: entry.isDirectory() ? calculateSize(fullPath) : entryStats.size,
          isDirectory: entry.isDirectory(),
          modifiedTime: entryStats.mtimeMs
        })
      } catch {}
    }
  } catch {}
  
  return {
    name: path.basename(dirPath),
    path: dirPath,
    size: children.reduce((sum, c) => sum + c.size, 0),
    isDirectory: true,
    children: children.sort((a, b) => b.size - a.size),
    modifiedTime: stats.mtimeMs
  }
}

export async function deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const stats = fs.statSync(filePath)
    
    if (stats.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true })
    } else {
      fs.unlinkSync(filePath)
    }
    
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export const fileScanner = {
  getDrives,
  scanLargeFiles,
  scanDirectory,
  deleteFile
}
