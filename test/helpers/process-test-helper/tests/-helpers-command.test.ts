/* eslint-disable prettier/prettier */
import { UUID } from '@boostercloud/framework-types'
import { describe, it, expect } from 'vitest'
import * as type from '../types'
import * as com from '../helpers-command'

describe('Process - Command Helpers', async () => {

  describe('Command Inputs', async () => {
    //
    const testUUID = UUID.generate()
    const allVariablesInput: type.CommandInput[] = [
      // passing in 'validExample' for all to use known values in expectedResult (otherwise it will use faker)
      { name: 'moab', type: 'String', required: true, validExample: 'hike' },
      { name: 'paris', type: 'Float', required: true, validExample: 1789 },
      { name: 'nyc', type: 'string', required: true, validExample: 'food' },
      { name: 'austin', type: 'ID', validExample: testUUID },
      { name: 'key west', type: 'Boolean', validExample: true },
    ]
    const allVariablesTestResult = com.createAllVariables(allVariablesInput)
    const allVariablesExpectedResult = { moab: 'hike', paris: 1789, nyc: 'food', austin: testUUID, 'key west': true
    }
    it('- create all variables content', async () => expect(allVariablesTestResult).toEqual(allVariablesExpectedResult))
    //
    const emptyVariablesTestResult = com.createEmptyVariables(allVariablesInput)
    const emptyVariablesExpectedResult = { moab: '', paris: '', nyc: '', austin: '', 'key west': '' }
    it('- create empty variables content', async () => expect(emptyVariablesTestResult).toEqual(emptyVariablesExpectedResult))
    //
    const testScenarioInputs = { snack: 'apple', qty: 1, drink: 'water', rush: false }
    const testInputAssertions: type.AssertionInput[] = [
      { name: 'snack', types: ['string'], required: true },
      { name: 'qty', types: ['number'], required: true },
      { name: 'drink', types: ['string'], required: false },
      { name: 'rush', types: ['boolean'], required: false },
    ]
    const convertInputsTestResult: type.CommandInput[] = com.convertScenarioInputsToCommandInputs(testScenarioInputs, testInputAssertions)
    const convertInputsExpectedResult: type.CommandInput[] = [
      { name: 'snack', type: 'String', validExample: 'apple', required: true },
      { name: 'qty', type: 'Float', validExample: 1, required: true },
      { name: 'drink', type: 'String', validExample: 'water', required: false },
      { name: 'rush', type: 'Boolean', validExample: false, required: false }
    ]
    it('- convert scenario inputs to command inputs', async () => expect(convertInputsTestResult).toEqual(convertInputsExpectedResult))
  })

  // ! LEFT OFF HERE

  describe('Command Mutation', async () => {
    //
    it('- create mutation input variables', async () => expect(true).toEqual(true))
    //
    it('- create mutation inputs', async () => expect(true).toEqual(true))
    //
    it('- create mutation content', async () => expect(true).toEqual(true))
    //
    it('- create mutation', async () => expect(true).toEqual(true))
  })
//
})
