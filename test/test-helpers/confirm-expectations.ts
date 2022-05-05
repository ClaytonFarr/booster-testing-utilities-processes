import type { EventEnvelope } from '@boostercloud/framework-types'
import { applicationUnderTest, unAuthGraphQLclient, authGraphQLclient } from './infrastructure'
import { faker } from '@faker-js/faker'
import * as command from './command-helpers'
import * as type from './types'
import * as util from './utils'
import * as vit from 'vitest'

// ======================================================================================

export const testProcessExpectations = async (
  process: type.Process,
  assertions: type.Assertions,
  describe = vit.describe,
  it = vit.it,
  expect = vit.expect,
  resultWaitTime = 5000
): Promise<string | void> => {
  // Confirm assertions data present
  // -----------------------------------------------------------------------------------------------
  const expectedAssertionGroups = ['roles', 'allInputs', 'allEntities']
  if (
    Object.keys(assertions).length === 0 ||
    !expectedAssertionGroups.every((key) => Object.keys(assertions).includes(key))
  )
    return `\n\n'${process.name}' Test Expectations Issue\n=====================================================================\nAssertions data missing or incomplete`

  // Gather Assertions
  // -----------------------------------------------------------------------------------------------
  const scenarios = assertions.scenarios
  const authorizedRoles = assertions.roles.write
  const commandName = assertions.trigger.commandName
  const isActorCommand = assertions.trigger.type === 'ActorCommand'
  const allInputs = process.scenarios.reduce((acc, scenario) => {
    acc = { ...acc, ...scenario.inputs }
    return acc
  }, {})

  // Create Test Resources
  // -----------------------------------------------------------------------------------------------
  const graphQLclient = authorizedRoles.includes('all') ? unAuthGraphQLclient : authGraphQLclient(authorizedRoles[0])
  const defaultTestInputs: type.CommandInput[] = util.convertScenarioInputsToCommandInputs(allInputs)
  const defaultMutation = command.createCommandMutation(commandName, defaultTestInputs)
  const defaultVariables = command.createAllVariables(defaultTestInputs)
  const defaultVariablesEmpty = command.createEmptyVariables(defaultTestInputs)

  describe(`Process: ${process.name}`, async () => {
    // If Actor Command, confirm scenarios' expectations, roles, and input validation
    if (isActorCommand) {
      //
      // Call command for each scenario and evaluate results
      for (const scenario of scenarios) {
        describe(`Scenario: ${scenario.name}`, async () => {
          //
          // ...create reference value
          const tid = scenario.inputs?.tid ?? faker.datatype.uuid().toString()

          // ...create test resources
          const scenarioInputs = { tid, ...scenario.inputs } // add tid input if not already present in scenario
          const acceptedInputs: type.CommandInput[] = util.convertScenarioInputsToCommandInputs(scenarioInputs)
          const commandVariables = command.createAllVariables(acceptedInputs)
          const commandMutation = command.createCommandMutation(commandName, acceptedInputs)

          // ...call command with inputs using one of accepted roles
          await graphQLclient.mutate({ variables: commandVariables, mutation: commandMutation })

          // Confirm expected state changes occurred for each entity
          let stateUpdateResults: boolean[]
          for (const stateUpdate of scenario.expectedStateUpdates) {
            it(`should update entity '${stateUpdate.entityName}' correctly`, async () => {
              const primaryKey = `${stateUpdate.entityName}-${tid}-snapshot`

              // ...wait until command has been processed
              try {
                await util.waitForIt(
                  () => applicationUnderTest.query.events(primaryKey),
                  (matches) => matches?.length > 0,
                  500,
                  resultWaitTime
                )
              } catch (error) {
                console.log(
                  `💥 'did not update state for '${stateUpdate.entityName}' within ${resultWaitTime / 1000} seconds`
                )
              }

              // check if any matching snapshots exist for entity
              const matchingUpdate = (
                await applicationUnderTest.query.events(primaryKey)
              )[0] as unknown as EventEnvelope

              // confirm snapshot updated state as expected
              let updateHasCorrectState: boolean[]
              for (const [key, value] of Object.entries(stateUpdate.values)) {
                let stateCheck: boolean
                const isTestableValue = util.isTestableValue(value)
                if (isTestableValue) stateCheck = !!matchingUpdate.value[key] === value
                if (!isTestableValue) stateCheck = !!matchingUpdate.value[key] // if no value present check if key is has any value
                updateHasCorrectState.push(stateCheck)
              }
              const stateUpdatedCorrectly = matchingUpdate && !updateHasCorrectState.includes(false)
              stateUpdateResults.push(stateUpdatedCorrectly)
              expect(stateUpdatedCorrectly).toBe(true)
            })
          }

          // If state updates completed correctly...
          if (
            stateUpdateResults.length === scenario.expectedStateUpdates.length &&
            !stateUpdateResults.includes(false)
          ) {
            // Confirm expected visible changes are true, if any, for each read model
            for (const visibleUpdate of scenario.expectedVisibleUpdates) {
              it(`should update read model '${visibleUpdate.readModelName}' correctly`, async () => {
                // !
                // ! LEFT OFF HERE
                // !
              })
            }
          }
        })
      }

      // Confirm command can be executed with additional roles, if specified
      if (!authorizedRoles.includes('all') && authorizedRoles.length > 2) {
        authorizedRoles.shift() // skip first role since already tested above if present
        authorizedRoles.forEach(async (role) => {
          it(`'${process.trigger.commandName}' command should allow '${role}' role to make request`, async () => {
            const check = await command.wasAuthorizedRequestAllowed(role, defaultMutation, defaultVariables)
            expect(check).toBe(true)
          })
        })
      }

      // Confirm command will throw errors if input values are empty
      it(`'${process.trigger.commandName}' command should throw error when inputs are passed with empty values`, async () => {
        // submit command
        try {
          await graphQLclient.mutate({
            variables: defaultVariablesEmpty,
            mutation: defaultMutation,
          })
        } catch (error) {
          // evaluate command response
          expect(error).not.toBeNull()
          expect(error?.message).toBeTruthy()
        }
      })

      // LATER: Confirm Command can receive same input data without creating incorrect state

      // LATER: Confirm any Event Handlers can receive same event data without creating incorrect state
    }

    // LATER: Confirm Scheduled Command performs on expected schedule
  })
}
