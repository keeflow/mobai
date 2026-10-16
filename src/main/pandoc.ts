import { spawn } from 'node:child_process'
import { PANDOC_INSTALL_HINT, type PandocFormat } from '../shared/pandoc'

export function lookForPandoc(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('pandoc', ['-v'], { stdio: ['ignore', 'ignore', 'ignore'] })
    child.on('error', () => resolve(false))
    child.on('close', (code) => resolve(code === 0))
  })
}

export function convertWithPandoc(inputPath: string, outputPath: string, format: PandocFormat): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('pandoc', ['-f', 'markdown', '-t', format, '-o', outputPath, inputPath], {
      stdio: ['ignore', 'ignore', 'pipe']
    })
    let errorText = ''
    child.stderr.on('data', (chunk: Buffer) => {
      errorText += chunk.toString('utf8')
    })
    child.on('error', () => reject(new Error(PANDOC_INSTALL_HINT)))
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(errorText.trim() || 'Pandoc 导出失败'))
    })
  })
}
