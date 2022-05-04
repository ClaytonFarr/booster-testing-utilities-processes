import type { Process } from './process-types'
import { validateProcessAssertions } from './validate-assertions'
import { gatherProcessAssertions } from './gather-assertions'
import { confirmProcessFiles } from './confirm-files'
import { testProcessExpectations } from './test-expectations'
import { describe, it, expect } from 'vitest'

// ======================================================================================

export const testProcess = (process: Process): void => {
  describe(process.name, async () => {
    let testMessage = ''

    // 1. Validate process assertions
    const validInputCheck = validateProcessAssertions(process)
    const validInputPass = validInputCheck === true ? true : false
    if (typeof validInputCheck === 'string') testMessage = validInputCheck
    it('should have valid assertions for scenario(s)', async () => {
      expect(validInputPass).toBe(true)
    })

    // 2. Gather assertions from process
    const processAssertions = gatherProcessAssertions(process)

    // 3. Confirm application files needed exist and are well-formed
    //    - will default to checking files unless process.confirmFiles explicitly set to false
    const checkFiles = process.confirmFiles === false ? process.confirmFiles : true
    let filesPresentCheck: string | boolean
    let filesPresentPass: boolean
    if (validInputCheck === true && checkFiles) {
      filesPresentCheck = await confirmProcessFiles(process, processAssertions)
      filesPresentPass = filesPresentCheck === true ? true : false
      if (typeof filesPresentCheck === 'string') testMessage += filesPresentCheck
      it('should have all files for scenario(s)', async () => {
        expect(filesPresentPass).toBe(true)
      })
    }

    // 4. Test if process expectations are met by application
    if (validInputCheck === true && process.confirmFiles && filesPresentCheck === true) {
      it('should match scenarios(s) expected behavior', async () => {
        testProcessExpectations(process, processAssertions)
      })
    }

    console.log(testMessage)
  })
}
