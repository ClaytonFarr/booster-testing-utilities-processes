import type { Process } from './process-types'
import { validateProcessAssertions } from './validate-assertions'
import { confirmProcessFiles } from './confirm-files'
import { testProcessExpectations } from './test-expectations'
import * as vit from 'vitest'

// ======================================================================================

export const testProcess = (process: Process, describe = vit.describe, it = vit.it, expect = vit.expect): void => {
  describe(process.name, async () => {
    let testMessage = ''

    const validInputCheck = validateProcessAssertions(process)
    const validInputPass = validInputCheck === true ? true : false
    if (typeof validInputCheck === 'string') testMessage = validInputCheck
    it('should have valid assertions for scenario(s)', async () => {
      expect(validInputPass).toBe(true)
    })

    // default to checking files unless process.confirmFiles is explicitly set to false
    const checkFiles = process.confirmFiles === false ? process.confirmFiles : true
    let filesPresentCheck: string | boolean
    let filesPresentPass: boolean
    if (validInputCheck === true && checkFiles) {
      filesPresentCheck = await confirmProcessFiles(process)
      filesPresentPass = filesPresentCheck === true ? true : false
      if (typeof filesPresentCheck === 'string') testMessage += filesPresentCheck
      it('should have all files for scenario(s)', async () => {
        expect(filesPresentPass).toBe(true)
      })
    }

    if (validInputCheck === true && process.confirmFiles && filesPresentCheck === true) {
      it('should match scenarios(s) expected behavior', async () => {
        testProcessExpectations(process, it, expect)
      })
    }

    console.log(testMessage)
  })
}
