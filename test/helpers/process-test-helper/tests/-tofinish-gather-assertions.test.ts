/* eslint-disable prettier/prettier */
import * as type from '../types'
import { UUID } from '@boostercloud/framework-types'
import { describe, it, expect } from 'vitest'
import { faker } from '@faker-js/faker'
import * as auth from '../helpers-authorization'
import * as util from '../helpers-utils'
import * as ga from '../gather-assertions'

// Tests Input
// =============================================================================

// Test input utilities
// -----------------------------------------------------------------------------

const generateSimpleValueFromType = (type: string): string | number | boolean | UUID => {
  switch (type) {
    case 'string':
      return faker.random.words(3)
    case 'number':
      return faker.random.numeric(3)
    case 'boolean':
      return faker.datatype.boolean()
    case 'uuid':
      return faker.datatype.uuid() as UUID
    default:
      throw new Error(`Unsupported type: ${type}`)
  }
}
const generateAnyValueFromType = (
  type: string
): string | number | boolean | UUID | Record<string, unknown> | unknown[] => {
  switch (type) {
    case 'string':
      return faker.random.words(3)
    case 'number':
      return faker.random.numeric(3)
    case 'boolean':
      return faker.datatype.boolean()
    case 'uuid':
      return faker.datatype.uuid() as UUID
    case 'objectData':
      return {
        nameOne: `"${faker.random.words(3)}"`,
        nameTwo: faker.random.numeric(3),
      }
    case 'arrayDataString':
      return [faker.random.word(), faker.random.word(), faker.random.word()]
    case 'arrayDataNumber':
      return [faker.random.numeric(3), faker.random.numeric(3), faker.random.numeric(3)]
    case 'arrayDataBoolean':
      return [faker.datatype.boolean(), faker.datatype.boolean(), faker.datatype.boolean()]
    case 'arrayDataObject':
      return [
        { nameOne: `"${faker.random.words(3)}"`, nameTwo: faker.random.numeric(3) },
        { nameOne: `"${faker.random.words(3)}"`, nameTwo: faker.random.numeric(3) },
        { nameOne: `"${faker.random.words(3)}"`, nameTwo: faker.random.numeric(3) },
      ]
    default:
      throw new Error(`Unsupported type: ${type}`)
  }
}
const createInputValues = (types: string[]): (string | number | boolean | UUID)[] => types.map(generateSimpleValueFromType)
const createDataValues = (types: string[]): (string | number | boolean | UUID | Record<string, unknown> | unknown[])[] => types.map(generateAnyValueFromType)

// Test input data
// (Process definition and variables used within it)
// -----------------------------------------------------------------------------

const processEntities = ['Entity One', 'Entity Two', 'Entity Three']
const processReadModels = ['Read Model One', 'Read Model Two', 'Entity Three']

const inputATypes = ['string', 'number', 'uuid']
const inputAValues = createInputValues(inputATypes)
const inputBTypes = ['boolean', 'number', 'string']
const inputBValues = createInputValues(inputBTypes)
const inputCTypes = ['string', 'number', 'boolean', 'uuid']
const inputCValues = createInputValues(inputCTypes)

const fieldATypes = ['string', 'number', 'uuid']
const fieldAValues = createDataValues(fieldATypes)
const fieldBTypes = ['boolean', 'number', 'string']
const fieldBValues = createDataValues(fieldBTypes)
const fieldCTypes = ['string', 'number', 'boolean', 'uuid']
const fieldCValues = createDataValues(fieldCTypes)

const itemId01 = faker.random.alphaNumeric(10)
const itemId02 = faker.random.alphaNumeric(10)
const itemId03 = faker.random.alphaNumeric(10)
const processIds = [itemId01, itemId02, itemId03]


const assertionsInput: type.Process = {
  name: 'Process Name',

  trigger: {
    type: 'ActorCommand',
    commandName: 'Trigger Command Name',
    authorized: 'all',
  },

  scenarios: [
    {
      name: 'Scenario One',
      inputs: {
        inputA: inputAValues[0],
        inputB: inputBValues[0],
      },

      precedingActions: [
        {
          commandName: 'Preceding Action One',
          inputs: {
            inputC: inputCValues[0],
          },
          authorized: 'all',
        },
      ],

      expectedStateUpdates: [
        {
          entityName: processEntities[0],
          itemId: processIds[0],
          values: {
            fieldA: fieldAValues[0],
            fieldB: fieldBValues[0],
            fieldC: fieldCValues[0],
          },
        },
        {
          entityName: processEntities[1],
          itemId: processIds[1],
          notValues: {
            fieldA: fieldAValues[1],
            fieldB: fieldBValues[1],
            fieldC: fieldCValues[1],
          },
        },
      ],

      expectedVisibleUpdates: [
        {
          readModelName: processReadModels[0],
          itemId: processIds[0],
          values: {
            fieldA: fieldAValues[0],
            fieldB: fieldBValues[0],
          },
          notValues: {
            fieldA: fieldAValues[1],
            fieldB: fieldBValues[1],
          },
          authorized: ['User'],
        },
      ],
    },

    {
      name: 'Scenario Two',
      inputs: {
        inputA: inputAValues[1],
        inputB: inputBValues[1],
      },

      precedingActions: [
        {
          commandName: 'Preceding Action One',
          inputs: {
            inputC: inputCValues[0],
          },
          authorized: ['User'],
        },
      ],

      expectedStateUpdates: [
        {
          entityName: processEntities[1],
          itemId: processIds[1],
          values: {
            fieldA: fieldAValues[1],
            fieldB: fieldBValues[1],
            fieldC: fieldCValues[1],
          },
        },
        {
          entityName: processEntities[2],
          itemId: processIds[2],
          notValues: {
            fieldA: fieldAValues[2],
            fieldB: fieldBValues[2],
            fieldC: fieldCValues[2],
          },
        },
      ],

      expectedVisibleUpdates: [
        {
          readModelName: processReadModels[1],
          itemId: processIds[1],
          values: {
            fieldA: fieldAValues[1],
            fieldB: fieldBValues[1],
          },
          notValues: {
            fieldA: fieldAValues[2],
            fieldB: fieldBValues[2],
          },
          authorized: ['Admin'],
        },
      ],
    },
  ],
}

// Test result data
// (tested methods called here, populating single object with results)
// -----------------------------------------------------------------------------
const assertionsOutput: type.Assertions = {
  processName: ga.gatherProcessName(assertionsInput),
  trigger: ga.gatherTriggerInfo(assertionsInput),
  scenarios: ga.gatherScenarioInfo(assertionsInput),
  roles: ga.gatherAllRoles(assertionsInput),
  precedingActions: ga.gatherPrecedingActions(assertionsInput),
  allScenarioInputs: ga.gatherScenarioInputs(assertionsInput),
  allEntities: ga.gatherEntities(assertionsInput),
  allReadModels: ga.gatherReadModels(assertionsInput),
}

// Tests
// =============================================================================

describe('Gather Assertions', async () => {
  //
  it('Process name', async () => expect(assertionsOutput.processName).toEqual(assertionsInput.name))

  describe('Process trigger', async () => {
    //
    const assertedTrigger = assertionsInput.trigger as type.ActorCommand
    const gatheredTrigger = assertionsOutput.trigger as type.ActorCommand
    it('- trigger command name (as PascalCase)', async () => expect(gatheredTrigger.commandName).toEqual(util.toPascalCase(assertedTrigger.commandName)))
    it('- trigger authorization, when present', async () => expect(gatheredTrigger.authorized).toEqual(assertedTrigger.authorized))
    // LATER: add tests for scheduled commands when functionality added to testing tools
  })

  //
  describe('Process scenarios', async () => {
    for (const gatheredScenario of assertionsOutput.scenarios) {
      describe('Each scenario', async () => {
        //
        const gatheredScenarioIndex = assertionsOutput.scenarios.indexOf(gatheredScenario)
        const assertedScenario = assertionsInput.scenarios[gatheredScenarioIndex]
        it('- scenario name', async () => expect(gatheredScenario.name).toEqual(assertedScenario.name))
        it('- scenario inputs', async () => expect(gatheredScenario.inputs).toEqual(assertedScenario.inputs))
        it('- scenario preceding actions, when present', async () => expect(gatheredScenario.precedingActions).toEqual(assertedScenario.precedingActions))
        it('- scenario expected state updates', async () => expect(gatheredScenario.expectedStateUpdates).toEqual(assertedScenario.expectedStateUpdates))
        it('- scenario expected visible updates, when present', async () => expect(gatheredScenario.expectedVisibleUpdates).toEqual(assertedScenario.expectedVisibleUpdates))
      })
    }
  })

  //
  describe('Process roles', async () => {
    //
    const assertedTrigger = assertionsInput.trigger as type.ActorCommand
    const assertedTriggerRolesTransformed = auth.gatherAssertedRoles(assertedTrigger.authorized)
    const gatheredTriggerRoles = assertionsOutput.roles.triggerWrite
    it('- trigger roles', async () => expect(gatheredTriggerRoles).toEqual(assertedTriggerRolesTransformed))
    //
    const assertedPaRolesTransformed = assertionsInput.scenarios.map((sc) => sc.precedingActions.map((pa) => auth.gatherAssertedRoles(pa.authorized)))
    const assertedPaRolesFlattened = assertedPaRolesTransformed.flat(10)
    const assertedPaRolesDeDuped = [ ...new Set(assertedPaRolesFlattened) ]
    const assertedPaRolesSorted = assertedPaRolesDeDuped.sort()
    const gatheredPaRoles = assertionsOutput.roles.paWrite
    it('- all preceding action roles, when present', async () => expect(gatheredPaRoles).toEqual(assertedPaRolesSorted))
    //
    const assertedReadRolesTransformed = [ ...new Set(assertionsInput.scenarios.map((sc) => sc.expectedVisibleUpdates.map((evu) => auth.gatherAssertedRoles(evu.authorized)))) ]
    const assertedReadRolesFlattened = assertedReadRolesTransformed.flat(10)
    const assertedReadRolesDeDuped = [ ...new Set(assertedReadRolesFlattened) ]
    const assertedReadRolesSorted = assertedReadRolesDeDuped.sort()
    const gatheredReadRoles = assertionsOutput.roles.read
    it('- all visible update roles', async () => expect(gatheredReadRoles).toEqual(assertedReadRolesSorted))
    //
    const assertedAllRolesTransformed = [ ...new Set([...assertedTriggerRolesTransformed, ...assertedPaRolesTransformed, ...assertedReadRolesTransformed]) ]
    const assertedAllRolesFlattened = assertedAllRolesTransformed.flat(10)
    const assertedAllRolesDeDuped = [ ...new Set(assertedAllRolesFlattened) ]
    const assertedAllRolesSorted = assertedAllRolesDeDuped.sort()
    const gatheredAllRoles = assertionsOutput.roles.all
    it('- merged list of all roles', async () => expect(gatheredAllRoles).toEqual(assertedAllRolesSorted))
  })

  //
  describe("Process scenarios' preceding actions", async () => {
    for (const gatheredPaSet of assertionsOutput.precedingActions) {
      describe(`Preceding action set for '${gatheredPaSet.scenarioName}'`, async () => {
        //
        const assertedScenario = assertionsInput.scenarios.find((sc) => sc.name === gatheredPaSet.scenarioName)
        it('- corresponding scenario name', async () =>
          expect(gatheredPaSet.scenarioName).toEqual(assertedScenario.name))
        //
        for (const gatheredPa of gatheredPaSet.actions) {
          const gatheredPaIndex = gatheredPaSet.actions.indexOf(gatheredPa)
          describe(`Preceding action #${gatheredPaIndex + 1}`, async () => {
            //
            const assertedScenarioPa = assertedScenario.precedingActions[gatheredPaIndex]
            it('- command name (as PascalCase)', async () => expect(gatheredPa.commandName).toEqual(util.toPascalCase(assertedScenarioPa.commandName)))
            //
            const assertedPaInputsTransformed = []
            for (const [key, value] of Object.entries(assertedScenarioPa.inputs)) assertedPaInputsTransformed.push(util.convertKeyValueToNameAndType(key, value))
            it('- inputs', async () => expect(gatheredPa.inputs).toEqual(assertedPaInputsTransformed))
            //
            it('- authorization', async () => expect(gatheredPa.authorized).toEqual(assertedScenarioPa.authorized))
          })
        }
      })
    }
  })

  // ! LEFT OFF HERE 

  //
  describe("Process scenarios' inputs", async () => {
    //
    // for (const assertedScenario of assertionsInput.scenarios) {
    describe('Each scenario', async () => {
      //
      it('- all input names (as camelCase)', async () => expect(true).toEqual(true))
      it('- all types for each input', async () => expect(true).toEqual(true))
      it('- requirement type for each input', async () => expect(true).toEqual(true))
    })
    // }
  })

  //
  describe("Process scenarios' entities", async () => {
    //
    it('- something', async () => expect(true).toEqual(true))
  })

  //
  describe("Process scenarios' read models", async () => {
    //
    it('- something', async () => expect(true).toEqual(true))
  })
})
