import * as fs from 'fs'
import * as path from 'path'
import { spawn } from 'child_process'

export interface SpaceSnifferStatus {
  installed: boolean
  executablePath: string | null
}

const DEFAULT_CANDIDATES = [
  'C:\\Program Files\\SpaceSniffer\\SpaceSniffer.exe',
  'C:\\Program Files (x86)\\SpaceSniffer\\SpaceSniffer.exe',
  'C:\\Tools\\SpaceSniffer\\SpaceSniffer.exe',
  'C:\\SpaceSniffer\\SpaceSniffer.exe'
]

export async function detectSpaceSniffer(): Promise<SpaceSnifferStatus> {
  const envPath = process.env.SPACESNIFFER_PATH
  const candidates = envPath ? [envPath, ...DEFAULT_CANDIDATES] : DEFAULT_CANDIDATES

  for (const executable of candidates) {
    if (executable && fs.existsSync(executable)) {
      return {
        installed: true,
        executablePath: executable
      }
    }
  }

  return {
    installed: false,
    executablePath: null
  }
}

export async function launchSpaceSniffer(scanPath: string): Promise<{ success: boolean; error?: string }> {
  const status = await detectSpaceSniffer()
  if (!status.installed || !status.executablePath) {
    return { success: false, error: '未检测到 SpaceSniffer，请先安装或配置 SPACESNIFFER_PATH 环境变量。' }
  }

  try {
    const normalizedPath = path.resolve(scanPath)
    const child = spawn(status.executablePath, [normalizedPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    })
    child.unref()
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || '无法启动 SpaceSniffer' }
  }
}

export const spaceSniffer = {
  detectSpaceSniffer,
  launchSpaceSniffer
}
