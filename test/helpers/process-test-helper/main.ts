import type { Process, Assertions, LocalBoosterFilePaths } from './types'
import { validateProcessInputs } from './validate-process'
import { gatherAssertions } from './gather-assertions'
import { confirmFiles } from './confirm-files'
import { confirmAssertions } from './confirm-assertions'
import { describe, it, expect } from 'vitest'
import * as log from './reporter'

// ======================================================================================

export const testProcess = (process: Process, filePaths?: LocalBoosterFilePaths): void => {
  const useFilePaths: LocalBoosterFilePaths = {
    commandsDirectoryPath: filePaths?.commandsDirectoryPath ?? 'src/commands',
    scheduledCommandsDirectoryPath: filePaths?.scheduledCommandsDirectoryPath ?? 'src/scheduled-commands',
    eventHandlersDirectoryPath: filePaths?.eventHandlersDirectoryPath ?? 'src/event-handlers',
    eventsDirectoryPath: filePaths?.eventsDirectoryPath ?? 'src/events',
    entitiesDirectoryPath: filePaths?.entitiesDirectoryPath ?? 'src/entities',
    readModelsDirectoryPath: filePaths?.readModelsDirectoryPath ?? 'src/read-models',
    rolesPath: filePaths?.rolesPath ?? 'src/roles.ts',
  }

  // Notes:
  // - The `log` utility is used here and within methods to print issues/result messages
  // - Vitest is used as test runner (with HMR) and its methods used here to assert test results in CI

  describe(`Process: '${process.name}'`, async () => {
    log.processHeader(process.name)

    // 1. Validate process inputs
    const validInputCheck = validateProcessInputs(process)
    const validInputPass = validInputCheck === true ? true : false

    //
    it('Has valid assertions for scenario(s)', async () => expect(validInputPass).toBe(true))

    // 2. Gather assertions from process
    let processAssertions: Assertions
    if (validInputPass === true) processAssertions = gatherAssertions(process)

    // 3. Confirm application files needed exist and are well-formed
    //    - will default to checking files unless process.confirmFiles explicitly set to false
    const checkFiles = process.confirmFiles === false ? process.confirmFiles : true
    let filesPresentCheck: boolean | string[]
    let filesPresentPass: boolean
    if (validInputPass === true && checkFiles) {
      filesPresentCheck = confirmFiles(processAssertions, useFilePaths)
      filesPresentPass = filesPresentCheck === true ? true : false

      //
      it('Has all files for scenario(s)', async () => expect(filesPresentPass).toBe(true))
    }

    // 4. Test if process assertions are met by application
    let expectationsCheck: boolean | string[]
    let expectationsPass: boolean
    if (validInputPass === true && filesPresentCheck === true) {
      expectationsCheck = await confirmAssertions(processAssertions, useFilePaths)
      expectationsPass = expectationsCheck === true ? true : false
      if (expectationsPass) log.testStepSuccessMessage('All process expectations met')

      //
      it('Meets all scenario expectations', async () => expect(expectationsPass).toBe(true))
    }

    if (!expectationsPass) log.processFooter()
  })
}
