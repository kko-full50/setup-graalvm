import * as core from '@actions/core'
import {execSync} from 'child_process'
import {existsSync} from 'fs'

// Keep in sync with https://github.com/actions/virtual-environments
const KNOWN_VISUAL_STUDIO_INSTALLATIONS = [
  'C:\\Program Files (x86)\\Microsoft Visual Studio\\2017\\Enterprise', // 'windows-2016'
  'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Enterprise', // 'windows-2019' and 'windows-latest'
  'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise' // 'windows-2022'
]
const VCVARSALL_SUBPATH = '\\VC\\Auxiliary\\Build\\vcvarsall.bat'

function findVcvarsallPath(): string {
  for (const installation of KNOWN_VISUAL_STUDIO_INSTALLATIONS) {
    const candidate = `${installation}${VCVARSALL_SUBPATH}`
    if (existsSync(candidate)) {
      return candidate
    }
  }
  throw new Error('Failed to find vcvarsall.bat')
}

export function setUpWindowsEnvironment(): void {
  core.startGroup('Updating Windows environment...')

  const vcvarsallPath = findVcvarsallPath()
  core.debug(`Calling "${vcvarsallPath}"...`)
  const [originalEnv, vcvarsallOutput, updatedEnv] = execSync(
    `set && cls && "${vcvarsallPath}" x64 && cls && set`,
    {shell: 'cmd'}
  )
    .toString()
    .split('\f') // form feed page break (printed by `cls`)
  core.debug(vcvarsallOutput)

  const originalEnvMap = new Map<string, string>()
  for (const line of originalEnv.split('\r\n')) {
    if (line.includes('=')) {
      const [name, value] = line.split('=')
      originalEnvMap.set(name, value)
    } else if (line) {
      core.debug(`Skipping ${line} (does not include '=')...`)
    }
  }

  for (const line of updatedEnv.split('\r\n')) {
    if (line.includes('=')) {
      const [name, value] = line.split('=')
      const originalValue = originalEnvMap.get(name)
      if (value !== originalValue) {
        core.exportVariable(name, value)
        core.debug(`"${name}" set to "${value}"`)
      }
    } else if (line) {
      core.debug(`Skipping ${line} (does not include '=')...`)
    }
  }

  core.endGroup()
}
