import type { EventEnvelope } from '@boostercloud/framework-types'
import type { FetchResult } from 'apollo-link'
import { applicationUnderTest, unAuthGraphQLclient, authGraphQLclient } from './helpers-infrastructure'
import { faker } from '@faker-js/faker'
import * as command from './helpers-command'
import * as readModel from './helpers-readmodel'
import * as type from './types'
import * as util from './helpers-utils'
import fs from 'fs'

// ======================================================================================

export const confirmAssertions = async (
  assertions: type.Assertions,
  filePaths: Record<string, string>,
  resultWaitTime = 5000
): Promise<string | boolean> => {
  const processName = assertions.processName
  const path = filePaths
  let invalid = false
  let errorMessage = ''

  // Confirm assertions data is present
  // ===============================================================================================
  const expectedAssertionGroups = ['trigger', 'scenarios', 'roles', 'allInputs', 'allEntities']
  if (
    Object.keys(assertions).length === 0 ||
    !expectedAssertionGroups.every((key) => Object.keys(assertions).includes(key))
  )
    return `\n\n'${processName}' Test Assertions Issue\n=====================================================================\nAssertions data missing or incomplete`

  // If trigger is an Actor Command...
  // ===============================================================================================

  if (assertions.trigger.type === 'ActorCommand') {
    //
    // Gather trigger assertions
    // -----------------------------------------------------------------------------------------------
    const triggerCommandName = assertions.trigger.commandName
    const triggerSubmitRoles = assertions.roles.triggerWrite
    const triggerInputAssertions = assertions.allInputs
    const triggerInputValues = assertions.scenarios.reduce((acc, scenario) => {
      acc = { ...acc, ...scenario.inputs }
      return acc
    }, {})

    // Create cross-test resources
    // -----------------------------------------------------------------------------------------------
    const triggerGraphQLclient = triggerSubmitRoles.includes('all')
      ? unAuthGraphQLclient
      : authGraphQLclient(triggerSubmitRoles[0])
    const triggerDefaultTestInputs: type.CommandInput[] = util.convertScenarioInputsToCommandInputs(
      triggerInputValues,
      triggerInputAssertions
    )
    const triggerDefaultMutation = command.createCommandMutation(triggerCommandName, triggerDefaultTestInputs)
    const triggerDefaultVariables = command.createAllVariables(triggerDefaultTestInputs)
    const triggerDefaultVariablesEmpty = command.createEmptyVariables(triggerDefaultTestInputs)

    // 🚫 Confirm trigger command will THROW ERROR if INPUTS values are EMPTY
    // ===============================================================================================
    let triggerCommandThrowsError: boolean
    try {
      await triggerGraphQLclient.mutate({
        variables: triggerDefaultVariablesEmpty,
        mutation: triggerDefaultMutation,
      })
    } catch (error) {
      triggerCommandThrowsError = !!error
    }
    if (!triggerCommandThrowsError) {
      invalid = true
      errorMessage += `\n✨ Trigger '${util.toPascalCase(
        triggerCommandName
      )}' does not throw error when input values are empty`
    }

    // 🔑 Confirm trigger command CAN BE CALLED with ALL ROLES (if additional roles specified)
    // ===============================================================================================
    if (!triggerSubmitRoles.includes('all') && triggerSubmitRoles.length > 2) {
      triggerSubmitRoles.shift() // skip first role since already tested above if present
      triggerSubmitRoles.forEach(async (role) => {
        const check = await command.wasAuthorizedRequestAllowed(role, triggerDefaultMutation, triggerDefaultVariables)
        if (!check) {
          invalid = true
          errorMessage += `\n🔑 Role '${role}' was not authorized to call trigger '${util.toPascalCase(
            triggerCommandName
          )}' as expected`
        }
      })
    }

    // Execute command(s) for each scenario and evaluate results
    // -----------------------------------------------------------------------------------------------

    const scenarioErrorMessages: string[] = []
    for (const scenario of assertions.scenarios) {
      let thisScenarioHasErrors: boolean
      let thisScenarioErrorMessages = `\n'${scenario.name}'\n--------------------------------------------------------------------`

      //
      // ⏪ Execute any PRECEDING ACTIONS for scenario
      // ===============================================================================================
      if (scenario.precedingActions) {
        for (const actionSet of assertions.precedingActions) {
          if (actionSet.scenarioName === scenario.name) {
            for (const action of actionSet.actions) {
              //
              // Check if command input(s) need to be called as required or optional
              // ------------------------------------------------------------------------------------------
              const paCommandInputs = []
              const paCommandFileName = util.toKebabCase(action.commandName)
              const paCommandFileExists = fs.existsSync(`${path.commandsDirectoryPath}/${paCommandFileName}.ts`)
              let paCommandFile: string
              if (paCommandFileExists)
                paCommandFile = fs.readFileSync(`${path.commandsDirectoryPath}/${paCommandFileName}.ts`, 'utf8')
              if (paCommandFile) {
                const paCommandInputsArray = [...paCommandFile.matchAll(/readonly ([a-zA-Z?]+):\s*(.+)/g)]
                paCommandInputsArray.forEach((input) => {
                  let inputTypes = input[2].replace(/,|\/\/.*/g, '').split(' | ')
                  inputTypes = inputTypes.map((type) => type.trim())
                  paCommandInputs.push({
                    name: input[1].replace(/\?/g, ''),
                    type: inputTypes,
                    required: input[1].includes('?') ? false : true,
                  })
                })
              }
              // ...update action.inputs with required values from command inputs
              action.inputs = action.inputs.map((input) => {
                const paCommandInput = paCommandInputs.find((paInput) => paInput.name === input.name)
                if (paCommandInput) {
                  input.required = paCommandInput.required
                }
                return input
              })

              // Execute preceding action's command with asserted values
              // ------------------------------------------------------------------------------------------
              const paCommandName = action.commandName
              const correspondingScenario = assertions.scenarios.find((s) => s.name === scenario.name)
              const correspondingScenarioPa = correspondingScenario?.precedingActions?.find(
                (pa) => util.toPascalCase(pa.commandName) === util.toPascalCase(paCommandName)
              )

              // ...select appropriate role + client
              const paCommandRoles = util.gatherRoles(action.authorized)
              const paCommandGraphQLclient = paCommandRoles?.includes('all')
                ? unAuthGraphQLclient
                : authGraphQLclient(paCommandRoles[0])

              // ...create specific test resources
              const paCommandInputAssertions = action.inputs
              const paCommandInputValues = correspondingScenarioPa?.inputs
              const tid = (paCommandInputValues?.tid as string) ?? faker.datatype.uuid().toString() // test reference ID
              const commandInputs = { tid, ...paCommandInputValues } // add tid input variable if not defined in scenario
              const acceptedInputs: type.CommandInput[] = util.convertScenarioInputsToCommandInputs(
                commandInputs,
                paCommandInputAssertions
              )
              const paCommandVariables = command.createAllVariables(acceptedInputs)
              const paCommandMutation = command.createCommandMutation(paCommandName, acceptedInputs)

              // ...call command with inputs using accepted role
              let paCommandCall: FetchResult<unknown, Record<string, unknown>, Record<string, unknown>>
              try {
                paCommandCall = await paCommandGraphQLclient.mutate({
                  variables: paCommandVariables,
                  mutation: paCommandMutation,
                })
              } catch (error) {
                paCommandCall = error
              }

              // alert if unable to complete command request
              if (paCommandCall instanceof Error) {
                thisScenarioHasErrors = true
                thisScenarioErrorMessages += `\n⏪ Preceding action command '${util.toPascalCase(
                  paCommandName
                )}' returned error\n\nREQUEST:\n\n${JSON.stringify(
                  paCommandVariables,
                  null,
                  2
                )}\n\nRESPONSE:\n\n${JSON.stringify(paCommandCall, null, 2)}\n`
              }
            }
          }
        }
      }

      // ✨ Execute TRIGGER command
      // ===============================================================================================

      // ...create test reference ID
      const tid = (scenario.inputs?.tid as string) ?? faker.datatype.uuid().toString()

      // ...create specific test resources
      const scenarioInputs = { tid, ...scenario.inputs } // add tid input if not defined in scenario
      const acceptedInputs: type.CommandInput[] = util.convertScenarioInputsToCommandInputs(
        scenarioInputs,
        triggerInputAssertions
      )
      const triggerCommandVariables = command.createAllVariables(acceptedInputs)
      const triggerCommandMutation = command.createCommandMutation(triggerCommandName, acceptedInputs)

      // ...call command with inputs using accepted role
      let scenarioCommandCall: FetchResult<unknown, Record<string, unknown>, Record<string, unknown>>
      try {
        scenarioCommandCall = await triggerGraphQLclient.mutate({
          variables: triggerCommandVariables,
          mutation: triggerCommandMutation,
        })
      } catch (error) {
        scenarioCommandCall = error
      }

      // Evaluate results
      // ===============================================================================================

      // 🚫 If scenario should fail, confirm error message received
      // ---------------------------------------------------------------------------------------------
      if (scenario.shouldBeRejected) {
        if (!(scenarioCommandCall instanceof Error)) {
          thisScenarioHasErrors = true
          thisScenarioErrorMessages += `\n✨ Trigger '${util.toPascalCase(
            triggerCommandName
          )}' was expected to be rejected but was not`
        }
      }

      // If scenario should succeed...
      // (default behavior if 'shouldBeRejected' is not explicitly defined in scenario)
      if (!scenario.shouldBeRejected) {
        //
        // alert if unable to complete command request
        if (scenarioCommandCall instanceof Error) {
          thisScenarioHasErrors = true
          thisScenarioErrorMessages += `\n✨ Trigger '${util.toPascalCase(
            triggerCommandName
          )}' returned error\n\nREQUEST:\n\n${JSON.stringify(
            triggerCommandVariables,
            null,
            2
          )}\n\nRESPONSE:\n\n${JSON.stringify(scenarioCommandCall, null, 2)}`
        }

        // 👽 Confirm expected STATE CHANGE occurred for each entity
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
                  stateUpdateCheckErrors += `\n\nField '${key}' value IS:\n\n\`${JSON.stringify(
                    matchingUpdate.value[key],
                    null,
                    2
                  )}\`\n\nEXPECTED:\n\n\`${JSON.stringify(value, null, 2)}\`\n`
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
                    stateUpdateCheckErrors += `\n\nField '${key}' value IS:\n\n\`${JSON.stringify(
                      matchingUpdate.value[key],
                      null,
                      2
                    )}\`\n\nEXPECTED:\n\n\`${JSON.stringify(value, null, 2)}\`\n`
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

        // 🔭 Confirm expected VISIBLE CHANGE occurred for each read model
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
      const errorMessageHeading = `\n\n'${processName}' Test Assertions Issues\n=====================================================================`
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
