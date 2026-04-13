import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import log from 'electron-log'
import { fileScanner } from './services/fileScanner'
import { appAnalyzer } from './services/appAnalyzer'
import { winUpdateCleanup } from './services/winUpdateCleanup'
import { symlinkManager } from './services/symlinkManager'

log.initialize()
log.transports.file.level = 'info'
log.info('Cpressure starting...')

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error)
  app.exit(1)
})

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Rejection:', reason)
})

let mainWindow: BrowserWindow | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    title: 'Cpressure - C盘空间释放工具',
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    log.info('Main window ready')
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // 尝试多种路径以确保找到前端资源
    const possiblePaths = [
      path.join(__dirname, '../dist/index.html'),
      path.join(__dirname, 'dist/index.html'),
      path.join(app.getAppPath(), 'dist/index.html')
    ]

    let indexPath = ''
    for (const path of possiblePaths) {
      if (fs.existsSync(path)) {
        indexPath = path
        break
      }
    }

    if (indexPath) {
      log.info('Loading index.html from:', indexPath)
      mainWindow.loadFile(indexPath)
    } else {
      log.error('Cannot find index.html. Possible paths checked:', possiblePaths)
      dialog.showMessageBox(mainWindow!, {
        type: 'error',
        title: '错误',
        message: '无法找到前端资源',
        detail: '请重新安装应用程序'
      })
      app.exit(1)
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()
  registerIpcHandlers()
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function registerIpcHandlers() {
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    })
    return result.filePaths[0] || null
  })

  ipcMain.handle('dialog:showMessage', async (_, options) => {
    return dialog.showMessageBox(mainWindow!, options)
  })

  ipcMain.handle('shell:openPath', async (_, filePath: string) => {
    return shell.openPath(filePath)
  })

  ipcMain.handle('shell:showItemInFolder', (_, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle('file:scanLargeFiles', async (_, dirPath: string, minSize: number = 100 * 1024 * 1024) => {
    try {
      return await fileScanner.scanLargeFiles(dirPath, minSize)
    } catch (error) {
      log.error('Scan large files error:', error)
      throw error
    }
  })

  ipcMain.handle('file:scanDirectory', async (_, dirPath: string) => {
    try {
      return await fileScanner.scanDirectory(dirPath)
    } catch (error) {
      log.error('Scan directory error:', error)
      throw error
    }
  })

  ipcMain.handle('file:delete', async (_, filePath: string) => {
    try {
      return await fileScanner.deleteFile(filePath)
    } catch (error) {
      log.error('Delete file error:', error)
      throw error
    }
  })

  ipcMain.handle('file:getDrives', async () => {
    try {
      return await fileScanner.getDrives()
    } catch (error) {
      log.error('Get drives error:', error)
      throw error
    }
  })

  ipcMain.handle('app:listInstalled', async () => {
    try {
      return await appAnalyzer.listInstalledApps()
    } catch (error) {
      log.error('List installed apps error:', error)
      throw error
    }
  })

  ipcMain.handle('app:getAppCacheDirs', async (_, appPath: string) => {
    try {
      return await appAnalyzer.getAppCacheDirs(appPath)
    } catch (error) {
      log.error('Get app cache dirs error:', error)
      throw error
    }
  })

  ipcMain.handle('symlink:create', async (_, source: string, target: string) => {
    try {
      return await symlinkManager.createSymlink(source, target)
    } catch (error) {
      log.error('Create symlink error:', error)
      throw error
    }
  })

  ipcMain.handle('symlink:checkAdmin', async () => {
    return symlinkManager.isAdmin()
  })

  ipcMain.handle('winupdate:detect', async () => {
    try {
      return await winUpdateCleanup.detectUpdateCache()
    } catch (error) {
      log.error('Detect update cache error:', error)
      throw error
    }
  })

  ipcMain.handle('winupdate:clean', async (_, paths: string[]) => {
    try {
      return await winUpdateCleanup.cleanUpdateCache(paths)
    } catch (error) {
      log.error('Clean update cache error:', error)
      throw error
    }
  })
}