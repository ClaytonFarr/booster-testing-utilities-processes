import type { Process, Assertions } from './types'
import { validateProcessAssertions } from './validate-assertions'
import { gatherProcessAssertions } from './gather-assertions'
import { confirmProcessFiles } from './confirm-files'
import { testProcessExpectations } from './confirm-expectations'
import { describe, it, expect } from 'vitest'

// ======================================================================================

export const testProcess = (process: Process): void => {
  describe(`Process: '${process.name}'`, async () => {
    let testMessage = ''

    // 1. Validate process inputs
    const validInputCheck = validateProcessAssertions(process)
    const validInputPass = validInputCheck === true ? true : false
    if (typeof validInputCheck === 'string') testMessage = validInputCheck
    it('Should have valid assertions for scenario(s)', async () => {
      expect(validInputPass).toBe(true)
    })

    // 2. Gather assertions from process
    let processAssertions: Assertions
    if (validInputCheck === true) processAssertions = gatherProcessAssertions(process)

    // 3. Confirm application files needed exist and are well-formed
    //    - will default to checking files unless process.confirmFiles explicitly set to false
    const checkFiles = process.confirmFiles === false ? process.confirmFiles : true
    let filesPresentCheck: string | boolean
    let filesPresentPass: boolean
    if (validInputCheck === true && checkFiles) {
      filesPresentCheck = await confirmProcessFiles(process, processAssertions)
      filesPresentPass = filesPresentCheck === true ? true : false
      if (typeof filesPresentCheck === 'string') testMessage += filesPresentCheck
      it('Should have all files for scenario(s)', async () => {
        expect(filesPresentPass).toBe(true)
      })
    }

    // 4. Test if process expectations are met by application
    let expectationsCheck: string | boolean
    let expectationsPass: boolean
    if (validInputCheck === true && filesPresentCheck === true) {
      expectationsCheck = await testProcessExpectations(process, processAssertions)
      expectationsPass = expectationsCheck === true ? true : false
      if (typeof expectationsCheck === 'string') testMessage += expectationsCheck
      it('Should meet all scenario expectations', async () => {
        expect(expectationsPass).toBe(true)
      })
    }

    console.log(testMessage)
  })
}
