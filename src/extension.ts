import path from 'path'
import { commands, window, workspace } from 'vscode'
import type { ExtensionContext,
  TextEditor,
  Disposable } from 'vscode'
import {
  StatusBarAlignment,
} from 'vscode'

type ProjectSetting = Record<
  string,
  Partial<{
    color: string
    name: string
    icon: string
  }>
>

function getProjectPath(): string | undefined {
  if (Array.isArray(workspace.workspaceFolders)) {
    if (workspace.workspaceFolders.length === 1) {
      return workspace.workspaceFolders[0].uri.path
    }
    else if (workspace.workspaceFolders.length > 1) {
      const activeTextEditor: TextEditor | undefined = window.activeTextEditor
      if (activeTextEditor) {
        const workspaceFolder = workspace.workspaceFolders.find(
          (folder: any) => {
            return activeTextEditor.document.uri.path.startsWith(folder.uri.path)
          },
        )
        if (workspaceFolder) {
          return workspaceFolder.uri.path
        }
      }
    }
  }
}

function getAlign(): StatusBarAlignment {
  const align: string = workspace
    .getConfiguration('fine-me')
    .get('align') as string
  switch (align) {
    case 'left':
      return StatusBarAlignment.Left
    case 'right':
      return StatusBarAlignment.Right
    default:
      return StatusBarAlignment.Left
  }
}

function getProjectSetting(): ProjectSetting {
  return workspace
    .getConfiguration('fine-me')
    .get('projectSetting') as ProjectSetting
}

function getColorful(): boolean {
  return workspace.getConfiguration('fine-me').get('colorful') as boolean
}

function getColor(): string {
  return workspace.getConfiguration('fine-me').get('color') as string
}

function getTextTransform(): string {
  return workspace.getConfiguration('fine-me').get('textTransform') as string
}

function alignPriority(): number {
  return +(workspace
    .getConfiguration('fine-me')
    .get('alignPriority') as string)
}

const textTransforms: Record<string, (t: string) => string> = {
  uppercase: (t: string) => t.toUpperCase(),
  lowercase: (t: string) => t.toLowerCase(),
  capitalize: (t: string) => t.charAt(0).toUpperCase() + t.slice(1),
}

function getProjectName(projectPath: string): string {
  const projectName = path.basename(projectPath)
  const transform = getTextTransform()

  if (textTransforms[transform]) {
    return textTransforms[transform](projectName)
  }
  return projectName
}

function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  let color = '#'
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff
    color += (`00${value.toString(16)}`).substr(-2)
  }
  return color
}

function getProjectColor(projectName: string) {
  if (!getColorful()) {
    return
  }

  if (!projectName) {
    return getColor() || undefined
  }

  return getColor() || stringToColor(projectName)
}

export function activate(context: ExtensionContext) {
  const statusBarItem = window.createStatusBarItem(getAlign(), alignPriority())
  let projectPath: string | undefined
  let projectName = ''
  let statusBarName: string | undefined
  let statusBarColor: string | undefined

  let onDidChangeWorkspaceFoldersDisposable: Disposable | undefined
  let onDidChangeActiveTextEditorDisposable: Disposable | undefined

  function updateStatusBarItem() {
    projectPath = getProjectPath()

    if (!projectPath) {
      statusBarItem.text = ''
      statusBarItem.hide()
      return
    }

    const projectSetting = getProjectSetting()[projectPath]
    projectName = projectSetting?.name || getProjectName(projectPath)

    statusBarItem.text = `${projectName}`
    statusBarColor = projectSetting?.color || getProjectColor(projectName)
    statusBarItem.color = statusBarColor
    statusBarItem.command = 'workbench.action.quickSwitchWindow'
    statusBarItem.show()
  }

  function updateSubscription() {
    if (!onDidChangeWorkspaceFoldersDisposable) {
      onDidChangeWorkspaceFoldersDisposable
        = workspace.onDidChangeWorkspaceFolders(() => {
          updateSubscription()
          updateStatusBarItem()
        })
    }

    if (Array.isArray(workspace.workspaceFolders)) {
      if (workspace.workspaceFolders.length > 1) {
        if (!onDidChangeActiveTextEditorDisposable) {
          onDidChangeActiveTextEditorDisposable
            = window.onDidChangeActiveTextEditor(() => {
              updateStatusBarItem()
            })
        }
      }
      else {
        if (onDidChangeActiveTextEditorDisposable) {
          onDidChangeActiveTextEditorDisposable.dispose()
        }
      }
    }
  }

  context.subscriptions.push(statusBarItem)

  updateSubscription()
  updateStatusBarItem()
}

export function deactivate() {}
