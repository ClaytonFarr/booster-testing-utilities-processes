import type { EventEnvelope } from '@boostercloud/framework-types'
import type { FetchResult } from 'apollo-link'
import { applicationUnderTest, unAuthGraphQLclient, authGraphQLclient } from './helpers-infrastructure'
import { faker } from '@faker-js/faker'
import * as command from './helpers-command'
import * as readModel from './helpers-readmodel'
import * as util from './helpers-utils'
import * as type from './types'

// ======================================================================================

export const testProcessExpectations = async (
  process: type.Process,
  assertions: type.Assertions,
  resultWaitTime = 5000
): Promise<string | boolean> => {
  let invalid = false
  let errorMessage = ''

  // ! update for preceding actions, for each scenario PA:
  // - add correct calls to PA command(s)

  // Confirm assertions data present
  // ===============================================================================================
  const expectedAssertionGroups = ['roles', 'allInputs', 'allEntities']
  if (
    Object.keys(assertions).length === 0 ||
    !expectedAssertionGroups.every((key) => Object.keys(assertions).includes(key))
  )
    return `\n\n'${process.name}' Test Expectations Issue\n=====================================================================\nAssertions data missing or incomplete`

  // Gather Assertions
  // ===============================================================================================
  const scenarios = assertions.scenarios
  const authorizedSubmitRoles = assertions.roles.triggerWrite
  const commandName = assertions.trigger.commandName
  const isActorCommand = assertions.trigger.type === 'ActorCommand'
  const inputAssertions = assertions.allInputs
  const allInputs = process.scenarios.reduce((acc, scenario) => {
    acc = { ...acc, ...scenario.inputs }
    return acc
  }, {})

  // Create common test resources
  // ===============================================================================================
  const submitGraphQLclient = authorizedSubmitRoles.includes('all')
    ? unAuthGraphQLclient
    : authGraphQLclient(authorizedSubmitRoles[0])
  const defaultTestInputs: type.CommandInput[] = util.convertScenarioInputsToCommandInputs(allInputs, inputAssertions)
  const defaultMutation = command.createCommandMutation(commandName, defaultTestInputs)
  const defaultVariables = command.createAllVariables(defaultTestInputs)
  const defaultVariablesEmpty = command.createEmptyVariables(defaultTestInputs)

  // If Actor Command, confirm scenarios' expectations, roles, and input validation
  // ===============================================================================================

  if (isActorCommand) {
    //
    // Confirm command will THROW ERROR if INPUTS VALUES EMPTY
    // ---------------------------------------------------------------------------------------------
    let commandThrowsError: boolean
    try {
      await submitGraphQLclient.mutate({
        variables: defaultVariablesEmpty,
        mutation: defaultMutation,
      })
    } catch (error) {
      commandThrowsError = !!error
    }
    if (!commandThrowsError) {
      invalid = true
      errorMessage += '\n✨ Command does not throw error when input values are empty'
    }

    // Confirm command CAN BE CALLED with ALL ROLES (if additional roles specified)
    // ---------------------------------------------------------------------------------------------
    if (!authorizedSubmitRoles.includes('all') && authorizedSubmitRoles.length > 2) {
      authorizedSubmitRoles.shift() // skip first role since already tested above if present
      authorizedSubmitRoles.forEach(async (role) => {
        const check = await command.wasAuthorizedRequestAllowed(role, defaultMutation, defaultVariables)
        if (!check) {
          invalid = true
          errorMessage += `\n🔑 Role '${role}' was not authorized to execute command as expected`
        }
      })
    }

    // Confirm expected EXPECTED CHANGES
    // ---------------------------------------------------------------------------------------------

    // call command for each scenario
    const scenarioErrorMessages: string[] = []
    for (const scenario of scenarios) {
      let thisScenarioHasErrors: boolean
      let thisScenarioErrorMessages = `\n'${scenario.name}'\n--------------------------------------------------------------------`

      // ...create reference value
      const tid = (scenario.inputs?.tid as string) ?? faker.datatype.uuid().toString()

      // ...create specific test resources
      const scenarioInputs = { tid, ...scenario.inputs } // add tid input if not already present in scenario
      const acceptedInputs: type.CommandInput[] = util.convertScenarioInputsToCommandInputs(
        scenarioInputs,
        inputAssertions
      )
      const commandVariables = command.createAllVariables(acceptedInputs)
      const commandMutation = command.createCommandMutation(commandName, acceptedInputs)

      // ...call command with inputs using one of accepted roles
      let scenarioCommandCall: FetchResult<unknown, Record<string, unknown>, Record<string, unknown>>
      try {
        scenarioCommandCall = await submitGraphQLclient.mutate({
          variables: commandVariables,
          mutation: commandMutation,
        })
      } catch (error) {
        scenarioCommandCall = error
      }

      // If scenario should fail, confirm error message received
      // ---------------------------------------------------------------------------------------------
      if (scenario.shouldBeRejected) {
        if (!(scenarioCommandCall instanceof Error)) {
          thisScenarioHasErrors = true
          thisScenarioErrorMessages += '\n🔑 Command was expected to be rejected but was not'
        }
      }

      // If scenario should succeed...
      // (this is the default behavior if 'shouldBeRejected' is not defined in scenario)
      if (!scenario.shouldBeRejected) {
        //
        // Confirm expected STATE CHANGE occurred for each entity
        // ---------------------------------------------------------------------------------------------
        for (const stateUpdate of scenario.expectedStateUpdates) {
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
            invalid = true
            errorMessage += `\n👽 No state update found for '${stateUpdate.entityName}' within ${
              resultWaitTime / 1000
            } seconds\n    - Searched for key: '${primaryKey}'`
            continue
          }

          // check if any matching snapshots exist for entity
          const matchingUpdate = (await applicationUnderTest.query.events(primaryKey))[0] as unknown as EventEnvelope
          if (!matchingUpdate) {
            invalid = true
            thisScenarioErrorMessages += `\n👽 No matching state update found for entity '${stateUpdate.entityName}'\n   - Searched for key: '${primaryKey}'`
          }

          // confirm snapshot updated state as expected
          const stateUpdateHasCorrectState: boolean[] = []
          let stateUpdateCheckErrors = ''
          if (matchingUpdate && stateUpdate.values) {
            for (const [key, value] of Object.entries(stateUpdate.values)) {
              let expectedState: boolean
              const valueType = util.inferValueType(value)
              // ...if value is a string, number, boolean, UUID
              if (valueType !== 'object' && valueType !== 'array') {
                const valueIsTestable = !util.valueIsTypeKeyword(value)
                if (valueIsTestable) expectedState = matchingUpdate.value[key] === value
                if (!valueIsTestable) expectedState = !!matchingUpdate.value[key] // if no testable value given confirm key is present with any value
                if (!expectedState) {
                  invalid = true
                  if (valueIsTestable)
                    stateUpdateCheckErrors += `\n   ↪ Field '${key}' value is '${matchingUpdate.value[key]}' (expected '${value}')`
                  if (!valueIsTestable)
                    stateUpdateCheckErrors += `\n   ↪ Field '${key}' is missing (with any ${value} value)`
                }
              }
              // ...if value is a object
              if (valueType === 'object') {
                const matchingUpdateValue = matchingUpdate.value[key]
                expectedState = !!JSON.stringify(matchingUpdateValue).includes(JSON.stringify(value))
                if (!expectedState) {
                  invalid = true
                  stateUpdateCheckErrors += `\n   ↪ Field '${key}' value IS \`${JSON.stringify(
                    matchingUpdate.value[key],
                    null,
                    2
                  )}\` EXPECTED \`${JSON.stringify(value, null, 2)}\``
                }
              }
              // ...if value is an array
              if (valueType === 'array') {
                const matchingUpdateValue = matchingUpdate.value[key]
                const valueArray = value as unknown[]
                // ...if matchingUpdateValue is an array
                if (Array.isArray(matchingUpdateValue)) {
                  // ...check if every item in value array is present in matchingUpdateValue array
                  expectedState = valueArray.every((value) =>
                    matchingUpdateValue.some((matchingValue) =>
                      JSON.stringify(matchingValue).includes(JSON.stringify(value))
                    )
                  )
                  if (!expectedState) {
                    invalid = true
                    stateUpdateCheckErrors += `\n   ↪ Field '${key}' value IS \`${JSON.stringify(
                      matchingUpdate.value[key],
                      null,
                      2
                    )}\` EXPECTED \`${JSON.stringify(value, null, 2)}\``
                  }
                }
                // ...if matchingUpdateValue is not array report mismatch
                if (!Array.isArray(matchingUpdateValue)) {
                  expectedState = false
                  invalid = true
                  stateUpdateCheckErrors += `\n   ↪ Field '${key}' expects an array and the matching updated field type is '${util.inferValueType(
                    matchingUpdateValue
                  )}'`
                }
                // if expected state incorrect add error message
                stateUpdateHasCorrectState.push(expectedState)
              }
            }
          }
          if (matchingUpdate && stateUpdate.notValues) {
            for (const [key, value] of Object.entries(stateUpdate.notValues)) {
              const valueIsTestable = !util.valueIsTypeKeyword(value)
              let expectedState: boolean
              if (valueIsTestable) expectedState = matchingUpdate.value[key] !== value
              if (!valueIsTestable) expectedState = !matchingUpdate.value[key] // if no testable value given confirm key is not present at all
              stateUpdateHasCorrectState.push(expectedState)
              // if expected state incorrect add error message
              if (!expectedState) {
                invalid = true
                if (valueIsTestable)
                  stateUpdateCheckErrors += `\n   ↪ Field '${key}' with '${matchingUpdate.value[key]}' value found (should not be present)`
                if (!valueIsTestable)
                  stateUpdateCheckErrors += `\n   ↪ Field '${key}' is present (should not be present with any value)`
              }
            }
          }

          const stateUpdatedCorrectly = !!matchingUpdate && !stateUpdateHasCorrectState.includes(false)
          if (matchingUpdate && !stateUpdatedCorrectly) {
            thisScenarioHasErrors = true
            thisScenarioErrorMessages += `\n👽 Entity '${util.toPascalCase(
              stateUpdate.entityName
            )}' was not updated as expected`
            thisScenarioErrorMessages += stateUpdateCheckErrors
          }
        }

        const allStateUpdatesCorrect = !thisScenarioHasErrors

        // Confirm expected VISIBLE CHANGE occurred for each read model
        // ---------------------------------------------------------------------------------------------
        if (allStateUpdatesCorrect && scenario.expectedVisibleUpdates) {
          // only check read models if all state updates performed correctly

          for (const visibleUpdate of scenario.expectedVisibleUpdates) {
            // create graphql client with correct authorization
            const readGraphQLclient = visibleUpdate.authorized.includes('all')
              ? unAuthGraphQLclient
              : authGraphQLclient(visibleUpdate.authorized[0])

            // query readModel for expected values
            let shouldHaveItems: Record<string, unknown>[] = []
            if (visibleUpdate.values) {
              shouldHaveItems = await readModel.evaluateReadModelProjection(
                readGraphQLclient,
                visibleUpdate.readModelName,
                visibleUpdate.values
              )
            }
            // query readModel for NOT values
            let shouldNotHaveItems: Record<string, unknown>[] = []
            if (visibleUpdate.notValues) {
              try {
                shouldNotHaveItems = await readModel.evaluateReadModelProjection(
                  readGraphQLclient,
                  visibleUpdate.readModelName,
                  visibleUpdate.notValues
                )
              } catch (error) {
                shouldNotHaveItems = error
              }
            }

            // report any errors
            if (shouldHaveItems.length === 0 || shouldNotHaveItems.length > 0) {
              thisScenarioHasErrors = true
              thisScenarioErrorMessages += `\n🔭 Read model '${util.toPascalCase(
                visibleUpdate.readModelName
              )}' not updated as expected`
            }
            // if no items found for shouldHave
            if (shouldHaveItems.length === 0) {
              thisScenarioErrorMessages += `\n   ↪ Could not find item with values:\n${JSON.stringify(
                visibleUpdate.values,
                null,
                2
              )}`
            }

            // if any items found for shouldNotHave
            if (shouldNotHaveItems.length > 0) {
              thisScenarioErrorMessages += `\n   ↪ Found item that should NOT have values:\n${JSON.stringify(
                visibleUpdate.values,
                null,
                2
              )}`
            }
          }
        }
      }

      if (thisScenarioHasErrors) {
        invalid = true
        scenarioErrorMessages.push(thisScenarioErrorMessages)
      }
    }

    if (scenarioErrorMessages.length > 0) {
      errorMessage += `\n${scenarioErrorMessages.join('\n')}`
    }

    if (invalid && errorMessage.length > 0) {
      const errorMessageHeading = `\n\n'${process.name}' Expectations Issues\n=====================================================================`
      errorMessage = `${errorMessageHeading}${errorMessage}`
    }

    // if any above INVALID, fail with errors
    if (invalid) return errorMessage

    // if all VALID
    return true

    // LATER: Confirm Command can receive same input data without creating incorrect state
    // LATER: Confirm any Event Handlers can receive same event data without creating incorrect state
  }
  // LATER: Confirm Scheduled Command performs on expected schedule
}
