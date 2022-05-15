import type { Process } from './types'
import { addMessage as msg, assertionIssues as is } from './issue-messages'
import * as util from './helpers-utils'
import * as log from './reporter'

const validateProcessLogHeader = (): void => log.issueGroupHeader(is.assertionIssuesHeader)

export const validateProcessInputs = (process: Process): boolean | string[] => {
  let allScenariosAreNamed = false
  let invalid = false
  let issueHeaderPrinted = false
  const issues = []

  // ✅ validate trigger.name is not blank
  if (!process.name) {
    issues.push(msg(is.processNameBlank))
  }

  // ✅ validate trigger.name is not blank
  if (!process.trigger.commandName) {
    issues.push(msg(is.triggerNameBlank))
  }

  // ✅ validate trigger.authorized is not empty
  if (process.trigger.type === 'ActorCommand' && process.trigger.authorized.length === 0) {
    issues.push(msg(is.triggerAuthBlank))
  }

  // ✅ validate scenario array includes at least 1 item
  if (process.scenarios.length === 0) {
    issues.push(msg(is.scenariosNotDefined))
  }

  // ✅ validate scenario name is not blank
  if (process.scenarios.some((scenario) => !scenario.name)) {
    issues.push(msg(is.scenariosNameBlank))
  }

  // ✅ validate all scenarios have unique names
  const scenarioNames = process.scenarios.map((scenario) => scenario.name)
  if (util.hasDuplicates(scenarioNames)) {
    issues.push(msg(is.scenariosNameDuplicate))
  }

  if (issues.length > 0) {
    validateProcessLogHeader()
    log.issueNotes(issues)
    issueHeaderPrinted = true
    invalid = true
  }

  if (process.scenarios.every((scenario) => scenario.name)) allScenariosAreNamed = true

  if (allScenariosAreNamed) {
    for (const scenario of process.scenarios) {
      const scenarioIssues = []

      // ✅ validate scenario inputs are present
      if (scenario.inputs.length === 0) {
        scenarioIssues.push(msg(is.scenarioInputsEmpty))
      }

      // ✅ validate scenario[i].inputs[i].name is not blank
      for (const [key, value] of Object.entries(scenario.inputs)) {
        if (!value) {
          scenarioIssues.push(msg(is.scenarioInputKeyBlank, [key]))
        }
      }

      // ✅ if present, validate scenario[i].precedingActions[i]
      if (scenario.precedingActions) {
        for (const action of scenario.precedingActions) {
          // ✅ validate commandName is not blank
          if (!action.commandName) {
            scenarioIssues.push(msg(is.scenarioPaCommandNameBlank))
          }
          // ✅ validate inputs are present
          if (action.commandName && action.inputs?.length === 0) {
            scenarioIssues.push(msg(is.scenarioPaInputsEmpty, [util.toPascalCase(action.commandName)]))
          }
          // ✅ validate authorization is not empty
          if (action.authorized.length === 0) {
            scenarioIssues.push(msg(is.scenarioPaAuthBlank, [util.toPascalCase(action.commandName)]))
          }
        }
      }

      // ✅ validate scenario state update(s) are present
      if (!scenario.shouldBeRejected && scenario.expectedStateUpdates.length === 0) {
        scenarioIssues.push(msg(is.scenarioSuEmpty))
      }

      if (scenario.expectedStateUpdates?.length > 0) {
        for (const expectedStateUpdate of scenario.expectedStateUpdates) {
          const entityNameFormatted = util.toPascalCase(expectedStateUpdate.entityName)

          // ✅ validate scenario[i].expectedStateUpdates[i].entityName is not blank
          if (!expectedStateUpdate.entityName) {
            scenarioIssues.push(msg(is.scenarioSuEntityNameBlank))
          }

          // ✅ validate scenario[i].expectedStateUpdates[i] has values or notValues data present
          if (!expectedStateUpdate.values && !expectedStateUpdate.notValues) {
            scenarioIssues.push(msg(is.scenarioSuEntityMissingValueBlocks), [entityNameFormatted])
          }

          // ✅ validate scenario[i].expectedStateUpdates[i].values is not empty (if present)
          if (expectedStateUpdate.values && expectedStateUpdate.values.length === 0) {
            scenarioIssues.push(msg(is.scenarioSuEntityValuesEmpty), [entityNameFormatted])
          }

          // ✅ validate scenario[i].expectedStateUpdates[i].notValues is not empty (if present)
          if (expectedStateUpdate.notValues && expectedStateUpdate.notValues.length === 0) {
            scenarioIssues.push(msg(is.scenarioSuEntityNotValuesEmpty), [entityNameFormatted])
          }

          // ✅ validate scenario[i].expectedStateUpdates[i].values[i].field value is not blank
          if (expectedStateUpdate.values && expectedStateUpdate.values.length > 0) {
            for (const [key, value] of Object.entries(expectedStateUpdate.values)) {
              if (!value) {
                scenarioIssues.push(msg(is.scenarioSuEntityValuesFieldBlank, [key]))
              }
            }
          }

          // ✅ validate scenario[i].expectedStateUpdates[i].notValues[i].field value is not blank
          if (expectedStateUpdate.notValues && expectedStateUpdate.notValues.length > 0) {
            for (const [key, value] of Object.entries(expectedStateUpdate.notValues)) {
              if (!value) {
                scenarioIssues.push(msg(is.scenarioSuEntityNotValuesFieldBlank, [key]))
              }
            }
          }
        }
      }

      if (scenario.expectedVisibleUpdates?.length > 0) {
        for (const expectedVisibleUpdate of scenario.expectedVisibleUpdates) {
          const rmNameFormatted = util.toPascalCase(expectedVisibleUpdate.readModelName)

          // ✅ validate scenario[i].expectedVisibleUpdates[i].entityName is not blank
          if (!expectedVisibleUpdate.readModelName) {
            scenarioIssues.push(msg(is.scenarioVuRmNameBlank))
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i] has values or notValues data present
          if (!expectedVisibleUpdate.values && !expectedVisibleUpdate.notValues) {
            scenarioIssues.push(msg(is.scenarioVuRmMissingValueBlocks), [rmNameFormatted])
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i].values is not empty, if present
          if (expectedVisibleUpdate.values && expectedVisibleUpdate.values.length === 0) {
            scenarioIssues.push(msg(is.scenarioVuRmValuesEmpty, [rmNameFormatted]))
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i].notValues is not empty, if present
          if (expectedVisibleUpdate.notValues && expectedVisibleUpdate.notValues.length === 0) {
            scenarioIssues.push(msg(is.scenarioVuRmNotValuesEmpty, [rmNameFormatted]))
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i].values[i].field value is not blank
          if (expectedVisibleUpdate.values && expectedVisibleUpdate.values.length > 0) {
            for (const [key, value] of Object.entries(expectedVisibleUpdate.values)) {
              if (!value) {
                scenarioIssues.push(msg(is.scenarioVuRmValuesFieldBlank, [key]))
              }
            }
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i].noValues[i].field value is not blank
          if (expectedVisibleUpdate.notValues && expectedVisibleUpdate.notValues.length > 0) {
            for (const [key, value] of Object.entries(expectedVisibleUpdate.notValues)) {
              if (!value) {
                scenarioIssues.push(msg(is.scenarioVuRmNotValuesFieldBlank, [key]))
              }
            }
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i].authorized is not empty, if present
          if (!expectedVisibleUpdate.authorized || expectedVisibleUpdate.authorized.length === 0) {
            scenarioIssues.push(msg(is.scenarioVuRmNAuthEmpty, [rmNameFormatted]))
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i].authorized is an array if value is not 'all'
          if (typeof expectedVisibleUpdate.authorized === 'string' && expectedVisibleUpdate.authorized !== 'all') {
            scenarioIssues.push(msg(is.scenarioVuRmNAuthRolesOutsideArray, [rmNameFormatted]))
          }
        }
      }

      if (scenarioIssues.length > 0) {
        issues.push(...scenarioIssues)
        if (!issueHeaderPrinted) {
          validateProcessLogHeader()
          issueHeaderPrinted = true
        }
        log.issueGroupSubheader(`'${scenario.name}'`)
        log.issueNotes(scenarioIssues)
        invalid = true
      }
    }
  }

  // if any above INVALID, fail with issues
  if (invalid) return issues

  // if all valid
  return true
}
