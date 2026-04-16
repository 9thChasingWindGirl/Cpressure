import { contextBridge, ipcRenderer } from 'electron'

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

const api = {
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    showMessage: (options: Electron.MessageBoxOptions) => ipcRenderer.invoke('dialog:showMessage', options)
  },
  
  shell: {
    openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),
    showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath)
  },

  file: {
    scanLargeFiles: (dirPath: string, minSize?: number) => 
      ipcRenderer.invoke('file:scanLargeFiles', dirPath, minSize),
    scanDirectory: (dirPath: string) => 
      ipcRenderer.invoke('file:scanDirectory', dirPath),
    delete: (filePath: string) => 
      ipcRenderer.invoke('file:delete', filePath),
    getDrives: () => 
      ipcRenderer.invoke('file:getDrives')
  },

  app: {
    listInstalled: () => ipcRenderer.invoke('app:listInstalled'),
    getAppCacheDirs: (appPath: string) => ipcRenderer.invoke('app:getAppCacheDirs', appPath)
  },

  symlink: {
    create: (source: string, target: string) => ipcRenderer.invoke('symlink:create', source, target),
    checkAdmin: () => ipcRenderer.invoke('symlink:checkAdmin')
  },

  winupdate: {
    detect: () => ipcRenderer.invoke('winupdate:detect'),
    clean: (paths: string[]) => ipcRenderer.invoke('winupdate:clean', paths)
  },

  spacesniffer: {
    status: (): Promise<SpaceSnifferStatus> => ipcRenderer.invoke('spacesniffer:status'),
    launch: (scanPath: string) => ipcRenderer.invoke('spacesniffer:launch', scanPath)
  }
}

contextBridge.exposeInMainWorld('api', api)

declare global {
  interface Window {
    api: typeof api
  }
}
