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

export interface UpdateCache {
  path: string
  size: number
  description: string
  safeToDelete: boolean
}

export interface SpaceSnifferStatus {
  installed: boolean
  executablePath: string | null
}

export interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning'
  title?: string
  message: string
  detail?: string
  buttons?: string[]
  defaultId?: number
  cancelId?: number
}

export interface MessageBoxResult {
  response: number
}

export interface DeleteResult {
  success: boolean
  error?: string
}

export interface CleanResult {
  success: boolean
  freedSpace: number
  errors: string[]
}

export interface ElectronAPI {
  dialog: {
    openDirectory: () => Promise<string | null>
    showMessage: (options: MessageBoxOptions) => Promise<MessageBoxResult>
  }
  shell: {
    openPath: (filePath: string) => Promise<string>
    showItemInFolder: (filePath: string) => void
  }
  file: {
    scanLargeFiles: (dirPath: string, minSize?: number) => Promise<FileInfo[]>
    scanDirectory: (dirPath: string) => Promise<FileInfo>
    delete: (filePath: string) => Promise<DeleteResult>
    getDrives: () => Promise<DriveInfo[]>
  }
  app: {
    listInstalled: () => Promise<InstalledApp[]>
    getAppCacheDirs: (appPath: string) => Promise<CacheDir[]>
  }
  symlink: {
    create: (source: string, target: string) => Promise<DeleteResult>
    checkAdmin: () => Promise<boolean>
  }
  winupdate: {
    detect: () => Promise<UpdateCache[]>
    clean: (paths: string[]) => Promise<CleanResult>
  }
  spacesniffer: {
    status: () => Promise<SpaceSnifferStatus>
    launch: (scanPath: string) => Promise<DeleteResult>
  }
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}

export {}
