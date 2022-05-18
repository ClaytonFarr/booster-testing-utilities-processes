/* eslint-disable prettier/prettier */
import { UUID } from '@boostercloud/framework-types'
import { describe, it, expect } from 'vitest'
import * as rm from '../helpers-readmodel'

describe('Process - Read Model Helpers', async () => {

  describe('Read Model Queries', async () => {
    //
    const testUUID = UUID.generate()
    const filterStringInput = { one: 'clayton', two: 'string', three: true, four: 4, five: testUUID, six: { sixOne: 1 }, seven: [ 'booster' ], eight: [1, 2, 3] }
    const testFilterString = rm.createQueryFilterString(filterStringInput)
    const expectedFilterString = `{
      one: { contains: "clayton" },
      two: { isDefined: true },
      three: { eq: true },
      four: { eq: 4 },
      five: { eq: "${testUUID}" },
      six: { sixOne: { eq: 1 } },
      seven: { includes: "booster" },
      and: [
        { eight: { includes: 1 } },
        { eight: { includes: 2 } },
        { eight: { includes: 3 } },
      ],
    }`
    const testResult = testFilterString.replace(/ /g, '')
    const expectedResult = expectedFilterString.replace(/ |\n/g, '')
    it('- create query filter string', async () => expect(testResult).toEqual(expectedResult))
    //
    const variablesFilterByInput = { one: { eq: 2 } }
    const variablesSortByInput = { one: 'ASC' }
    const variablesLimitToInput = 10
    const testQueryVariablesOutput = rm.createQueryVariables(variablesFilterByInput, variablesSortByInput, variablesLimitToInput)
    const expectedQueryVariablesOutput = { filterBy: { one: { eq: 2 } }, sortBy: { one: 'ASC' }, limitTo: 10 }
    it('- create query variables', async () => expect(testQueryVariablesOutput).toEqual(expectedQueryVariablesOutput))
    //
    const readModelNameInput = 'ThisReadModel'
    const fieldsToReturn = 'one,two,three'
    const testReadModelQuery = rm.createReadModelQuery(readModelNameInput, fieldsToReturn)
    const testReadModelQueryStringified = JSON.stringify(testReadModelQuery)
    const expectedReadModelQueryName = `List${readModelNameInput}`
    const expectedFieldCalls = fieldsToReturn.split(',').map(field => `"kind": "Field","name":{"kind": "Name","value": "${field}"},`)
    it('- create read model query with correct name', async () => expect(testReadModelQueryStringified).toContain(expectedReadModelQueryName))
    //
    const fieldCallChecks: boolean[] = []
    for (const fieldCall of expectedFieldCalls) {
      const fieldCheck = testReadModelQueryStringified.includes(fieldCall.replace(/ /g, ''))
      fieldCallChecks.push(fieldCheck)
    }
    it('- create read model query with correct fields', async () => expect(fieldCallChecks.includes(false)).toBe(false))
    //
    it('- query read model with filters', async () => {
      // LATER: determine how to set up local test content & server to test GraphQL query methods
      expect(true).toEqual(true)
    })
  })
//
})
