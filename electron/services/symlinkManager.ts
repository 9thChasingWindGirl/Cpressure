import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export function isAdmin(): boolean {
  try {
    const { stdout } = require('child_process').execSync('net session', { encoding: 'utf8', stdio: [] })
    return true
  } catch {
    return false
  }
}

export async function createSymlink(sourcePath: string, targetPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: '源路径不存在' }
    }

    if (fs.existsSync(targetPath)) {
      return { success: false, error: '目标路径已存在' }
    }

    const parentDir = path.dirname(targetPath)
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true })
    }

    const sourceStats = fs.statSync(sourcePath)
    if (sourceStats.isDirectory()) {
      fs.renameSync(sourcePath, targetPath)
      fs.symlinkSync(targetPath, sourcePath, 'junction')
    } else {
      fs.renameSync(sourcePath, targetPath)
      fs.symlinkSync(targetPath, sourcePath, 'file')
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function removeSymlink(linkPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const stats = fs.lstatSync(linkPath)
    if (stats.isSymbolicLink()) {
      fs.unlinkSync(linkPath)
    } else if (stats.isDirectory()) {
      fs.rmdirSync(linkPath)
    } else {
      fs.unlinkSync(linkPath)
    }
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export const symlinkManager = {
  isAdmin,
  createSymlink,
  removeSymlink
}
