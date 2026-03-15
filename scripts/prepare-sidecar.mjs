import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const workspaceRoot = process.cwd()
const tauriRoot = path.join(workspaceRoot, 'src-tauri')
const triple =
  process.env.TAURI_ENV_TARGET_TRIPLE ||
  process.env.CARGO_BUILD_TARGET ||
  inferTargetTriple(process.platform, process.arch)

const executableName = process.platform === 'win32' ? 'typing-runner.exe' : 'typing-runner'
const sidecarName = `${'typing-runner'}-${triple}${process.platform === 'win32' ? '.exe' : ''}`
const candidatePaths = [
  path.join(tauriRoot, 'runner-target', triple, 'release', executableName),
  path.join(tauriRoot, 'runner-target', 'release', executableName),
  path.join(tauriRoot, 'target', triple, 'release', executableName),
  path.join(tauriRoot, 'target', 'release', executableName),
]

const sourcePath = candidatePaths.find((candidatePath) => fs.existsSync(candidatePath))

if (!sourcePath) {
  throw new Error(`Unable to locate built runner binary for ${triple}`)
}

const binariesDirectory = path.join(tauriRoot, 'binaries')
fs.mkdirSync(binariesDirectory, { recursive: true })
fs.copyFileSync(sourcePath, path.join(binariesDirectory, sidecarName))

function inferTargetTriple(platform, arch) {
  if (platform === 'win32' && arch === 'x64') {
    return 'x86_64-pc-windows-msvc'
  }
  if (platform === 'darwin' && arch === 'arm64') {
    return 'aarch64-apple-darwin'
  }
  if (platform === 'darwin') {
    return 'x86_64-apple-darwin'
  }
  if (platform === 'linux' && arch === 'x64') {
    return 'x86_64-unknown-linux-gnu'
  }

  throw new Error(`Unsupported platform/arch combination: ${platform}/${arch}`)
}
