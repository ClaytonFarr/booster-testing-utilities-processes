import type { Process } from './types'
import * as util from './helpers-utils'

export const validateProcessAssertions = (process: Process): boolean | string => {
  let allScenariosAreNamed = false
  let invalid = false
  let errorMessage = ''

  // ✅ validate trigger.name is not blank
  if (!process.name) {
    invalid = true
    errorMessage += '\n- Process name is blank'
  }

  // ✅ validate trigger.name is not blank
  if (!process.trigger.commandName) {
    invalid = true
    errorMessage += '\n- Trigger: command name is blank'
  }

  // ✅ validate trigger.authorized is not empty
  if (process.trigger.type === 'ActorCommand' && process.trigger.authorized.length === 0) {
    invalid = true
    errorMessage += '\n- Trigger: role authorization is blank'
  }

  // ✅ validate scenario array includes at least 1 item
  if (process.scenarios.length === 0) {
    invalid = true
    errorMessage += '\n- Scenario: no scenarios are defined'
  }

  // ✅ validate scenario name is not blank
  if (process.scenarios.some((scenario) => !scenario.name)) {
    invalid = true
    errorMessage += '\n- Scenario: one or more scenario names are blank'
  }

  // ✅ validate all scenarios have unique names
  const scenarioNames = process.scenarios.map((scenario) => scenario.name)
  if (util.hasDuplicates(scenarioNames)) {
    invalid = true
    errorMessage += '\n- Scenario: one or more scenarios have duplicate names'
  }

  if (process.scenarios.every((scenario) => scenario.name)) allScenariosAreNamed = true

  const scenarioErrorMessages: string[] = []
  if (allScenariosAreNamed) {
    for (const scenario of process.scenarios) {
      let thisScenarioHasErrors: boolean
      let thisScenarioErrorMessages = `\n'${scenario.name}'\n--------------------------------------------------------------------`

      // ✅ validate scenario inputs are present
      if (scenario.inputs.length === 0) {
        thisScenarioHasErrors = true
        errorMessage += '\n- Scenario as no inputs'
      }

      // ✅ validate scenario[i].inputs[i].name is not blank
      for (const [key, value] of Object.entries(scenario.inputs)) {
        if (!value) {
          thisScenarioHasErrors = true
          thisScenarioErrorMessages += `\n- Input '${key}' has a blank value`
        }
      }

      // ✅ if present, validate scenario[i].precedingActions[i]
      if (scenario.precedingActions) {
        for (const action of scenario.precedingActions) {
          // ✅ validate commandName is not blank
          if (!action.commandName) {
            thisScenarioHasErrors = true
            thisScenarioErrorMessages += '\n- A preceding action has a blank command name'
          }
          // ✅ validate inputs are present
          if (action.commandName && action.inputs.length === 0) {
            thisScenarioHasErrors = true
            thisScenarioErrorMessages += `\n- The preceding action for '${util.toPascalCase(
              action.commandName
            )}' has no inputs`
          }
          // ✅ validate authorization is not empty
          if (action.authorized.length === 0) {
            thisScenarioHasErrors = true
            thisScenarioErrorMessages += `\n- The preceding action for '${util.toPascalCase(
              action.commandName
            )}' has no authorized roles`
          }
        }
      }

      // ✅ validate scenario state update(s) are present
      if (!scenario.shouldBeRejected && scenario.expectedStateUpdates.length === 0) {
        thisScenarioHasErrors = true
        thisScenarioErrorMessages += '\n- Scenario has no expected state update(s)'
      }

      if (scenario.expectedStateUpdates?.length > 0) {
        for (const expectedStateUpdate of scenario.expectedStateUpdates) {
          // ✅ validate scenario[i].expectedStateUpdates[i].entityName is not blank
          if (!expectedStateUpdate.entityName) {
            thisScenarioHasErrors = true
            thisScenarioErrorMessages += '\n- State update has a blank entity name'
          }

          // ✅ validate scenario[i].expectedStateUpdates[i] has values or notValues data present
          if (!expectedStateUpdate.values && !expectedStateUpdate.notValues) {
            thisScenarioHasErrors = true
            thisScenarioErrorMessages += `\n- State update for '${util.toPascalCase(
              expectedStateUpdate.entityName
            )}' needs \`values\` or \`notValues\``
          }

          // ✅ validate scenario[i].expectedStateUpdates[i].values is not empty (if present)
          if (expectedStateUpdate.values && expectedStateUpdate.values.length === 0) {
            thisScenarioHasErrors = true
            thisScenarioErrorMessages += `\n- State update for '${util.toPascalCase(
              expectedStateUpdate.entityName
            )}' \`values\` expectations is empty`
          }

          // ✅ validate scenario[i].expectedStateUpdates[i].notValues is not empty (if present)
          if (expectedStateUpdate.notValues && expectedStateUpdate.notValues.length === 0) {
            thisScenarioHasErrors = true
            thisScenarioErrorMessages += `\n- State update for '${util.toPascalCase(
              expectedStateUpdate.entityName
            )}' \`notValues\` expectations is empty`
          }

          // ✅ validate scenario[i].expectedStateUpdates[i].values[i].field value is not blank
          if (expectedStateUpdate.values && expectedStateUpdate.values.length > 0) {
            for (const [key, value] of Object.entries(expectedStateUpdate.values)) {
              if (!value) {
                thisScenarioHasErrors = true
                thisScenarioErrorMessages += `\n- State update for \`values\` field '${key}' has a blank value`
              }
            }
          }

          // ✅ validate scenario[i].expectedStateUpdates[i].notValues[i].field value is not blank
          if (expectedStateUpdate.notValues && expectedStateUpdate.notValues.length > 0) {
            for (const [key, value] of Object.entries(expectedStateUpdate.notValues)) {
              if (!value) {
                thisScenarioHasErrors = true
                thisScenarioErrorMessages += `\n- State update for \`notValues\` field '${key}' has a blank value`
              }
            }
          }
        }
      }

      if (scenario.expectedVisibleUpdates?.length > 0) {
        for (const expectedVisibleUpdate of scenario.expectedVisibleUpdates) {
          // ✅ validate scenario[i].expectedVisibleUpdates[i].entityName is not blank
          if (!expectedVisibleUpdate.readModelName) {
            thisScenarioHasErrors = true
            thisScenarioErrorMessages += '\n- Visible update has a blank read model name'
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i] has values or notValues data present
          if (!expectedVisibleUpdate.values && !expectedVisibleUpdate.notValues) {
            thisScenarioHasErrors = true
            thisScenarioErrorMessages += `\n- Visible update for '${util.toPascalCase(
              expectedVisibleUpdate.readModelName
            )}' needs \`values\` or \`notValues\``
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i].values[i].field value is not blank
          for (const [key, value] of Object.entries(expectedVisibleUpdate.values)) {
            if (!value) {
              thisScenarioHasErrors = true
              thisScenarioErrorMessages += `\n- Visible update field '${key}' has a blank value`
            }
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i].values is not empty, if present
          if (expectedVisibleUpdate.values && expectedVisibleUpdate.values.length === 0) {
            thisScenarioHasErrors = true
            thisScenarioErrorMessages += `\n- Visible update for '${util.toPascalCase(
              expectedVisibleUpdate.readModelName
            )}' \`values\` expectations is empty`
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i].notValues is not empty, if present
          if (expectedVisibleUpdate.notValues && expectedVisibleUpdate.notValues.length === 0) {
            thisScenarioHasErrors = true
            thisScenarioErrorMessages += `\n- Visible update for '${util.toPascalCase(
              expectedVisibleUpdate.readModelName
            )}' \`notValues\` expectations is empty`
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i].values[i].field value is not blank
          if (expectedVisibleUpdate.values && expectedVisibleUpdate.values.length > 0) {
            for (const [key, value] of Object.entries(expectedVisibleUpdate.values)) {
              if (!value) {
                thisScenarioHasErrors = true
                thisScenarioErrorMessages += `\n- Visible update for \`values\` field '${key}' has a blank value`
              }
            }
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i].notValues[i].field value is not blank
          if (expectedVisibleUpdate.notValues && expectedVisibleUpdate.notValues.length > 0) {
            for (const [key, value] of Object.entries(expectedVisibleUpdate.notValues)) {
              if (!value) {
                thisScenarioHasErrors = true
                thisScenarioErrorMessages += `\n- Visible update for \`notValues\` field '${key}' has a blank value`
              }
            }
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i].authorized is not empty, if present
          if (!expectedVisibleUpdate.authorized || expectedVisibleUpdate.authorized.length === 0) {
            thisScenarioHasErrors = true
            thisScenarioErrorMessages += `\n- Visible update for '${util.toPascalCase(
              expectedVisibleUpdate.readModelName
            )}' has no authorization defined`
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i].authorized is an array if value is not 'all'
          if (typeof expectedVisibleUpdate.authorized === 'string' && expectedVisibleUpdate.authorized !== 'all') {
            thisScenarioHasErrors = true
            thisScenarioErrorMessages += `\n- Visible update for '${util.toPascalCase(
              expectedVisibleUpdate.readModelName
            )}' roles should be inside an array`
          }
        }
      }

      if (thisScenarioHasErrors) {
        invalid = true
        scenarioErrorMessages.push(thisScenarioErrorMessages)
      }
    }
  }

  if (scenarioErrorMessages.length > 0) {
    errorMessage += `${scenarioErrorMessages.join('\n')}`
  }

  if (invalid && errorMessage.length > 0) {
    // alphabetize error messages
    // errorMessage = errorMessage.split('\n').sort().join('\n')
    const errorMessageHeading = `\n\n'${process.name}' Assertion Issues\n=====================================================================`
    // prepend heading to error messages
    errorMessage = `${errorMessageHeading}\n${errorMessage}`
  }

  // fail with errors if any of the above fail
  if (invalid) return errorMessage

  // if all valid
  return true
}
