import type * as type from './types'
import { addMessage as msg, assertionIssues as is } from './issue-messages'
import * as util from './helpers-utils'
import * as log from './reporter'

const validateProcessLogHeader = (): void => log.issueGroupHeader(is.assertionIssuesHeader)

export const validateProcessInputs = (process: type.Process): boolean | string[] => {
  let allScenariosAreNamed = false
  let invalid = false
  let issueHeaderPrinted = false
  const issues = []

  // ✅ validate process.name is not blank
  if (processNameBlank(process)) issues.push(msg(is.processNameBlank))

  // ✅ validate trigger.name is not blank
  if (triggerCommandNameBlank(process)) issues.push(msg(is.triggerNameBlank))

  // ✅ validate trigger.authorized is not empty
  if (triggerAuthEmpty(process)) issues.push(msg(is.triggerAuthEmpty))

  // ✅ validate scenario array includes at least 1 item
  if (scenariosEmpty(process)) issues.push(msg(is.scenariosNotDefined))

  // ✅ validate scenario name is not blank
  if (scenarioNameBlank(process)) issues.push(msg(is.scenariosNameBlank))

  // ✅ validate all scenarios have unique names
  if (scenariosHaveDuplicateNames(process)) issues.push(msg(is.scenariosNameDuplicate))

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

      // ✅ if preceding actions present in scenario, validate each one
      if (scenario.precedingActions) {
        for (const action of scenario.precedingActions) {
          // ✅ validate commandName is not blank
          if (scenarioPaCommandNameBlank(action)) scenarioIssues.push(msg(is.scenarioPaCommandNameBlank))

          // ✅ validate inputs are present
          if (scenarioPaInputsEmpty(action))
            scenarioIssues.push(msg(is.scenarioPaInputsEmpty, [util.toPascalCase(action.commandName)]))

          // ✅ validate authorization is not empty
          if (scenarioPaAuthEmpty(action))
            scenarioIssues.push(msg(is.scenarioPaAuthEmpty, [util.toPascalCase(action.commandName)]))
        }
      }

      // ✅ if trigger is Actor Command, validate scenario inputs are present
      if (scenarioInputsEmpty(process, scenario)) scenarioIssues.push(msg(is.scenarioInputsEmpty))

      // ✅ validate scenario[i].inputs[i].name is not blank
      for (const [key, value] of Object.entries(scenario.inputs))
        if (scenarioInputValueBlank(value)) scenarioIssues.push(msg(is.scenarioInputKeyBlank, [key]))

      // ✅ validate scenario state update(s) are present
      if (scenarioStateUpdatesEmpty(scenario)) scenarioIssues.push(msg(is.scenarioSuEmpty))

      if (scenario.expectedStateUpdates?.length > 0) {
        for (const expectedStateUpdate of scenario.expectedStateUpdates) {
          // ✅ validate scenario[i].expectedStateUpdates[i].entityName is not blank
          if (scenarioStateUpdateEntityNameBlank(expectedStateUpdate))
            scenarioIssues.push(msg(is.scenarioSuEntityNameBlank))

          if (!scenarioStateUpdateEntityNameBlank(expectedStateUpdate)) {
            const entityNameFormatted = util.toPascalCase(expectedStateUpdate.entityName)

            // ✅ validate scenario[i].expectedStateUpdates[i].itemId is not blank
            if (scenarioStateUpdateItemIdBlank(expectedStateUpdate))
              scenarioIssues.push(msg(is.scenarioSuItemIdBlank, [entityNameFormatted]))

            // ✅ validate scenario[i].expectedStateUpdates[i] has values or notValues data present
            if (scenarioStateUpdateValuesBlocksMissing(expectedStateUpdate))
              scenarioIssues.push(msg(is.scenarioSuEntityMissingValueBlocks, [entityNameFormatted]))

            // ✅ validate scenario[i].expectedStateUpdates[i].values is not empty (if present)
            if (scenarioStateUpdateValuesEmpty(expectedStateUpdate))
              scenarioIssues.push(msg(is.scenarioSuEntityValuesEmpty, [entityNameFormatted]))

            // ✅ validate scenario[i].expectedStateUpdates[i].notValues is not empty (if present)
            if (scenarioStateUpdateNotValuesEmpty(expectedStateUpdate))
              scenarioIssues.push(msg(is.scenarioSuEntityNotValuesEmpty, [entityNameFormatted]))

            // ✅ validate scenario[i].expectedStateUpdates[i].values[i].field value is not blank
            if (expectedStateUpdate.values && expectedStateUpdate.values.length > 0) {
              for (const [key, value] of Object.entries(expectedStateUpdate.values))
                if (scenarioStateUpdateValueBlank(value))
                  scenarioIssues.push(msg(is.scenarioSuEntityValuesFieldBlank, [key]))
            }

            // ✅ validate scenario[i].expectedStateUpdates[i].notValues[i].field value is not blank
            if (expectedStateUpdate.notValues && expectedStateUpdate.notValues.length > 0) {
              for (const [key, value] of Object.entries(expectedStateUpdate.notValues))
                if (scenarioStateUpdateNotValueBlank(value))
                  scenarioIssues.push(msg(is.scenarioSuEntityNotValuesFieldBlank, [key]))
            }
          }
        }
      }

      if (scenario.expectedVisibleUpdates?.length > 0) {
        for (const expectedVisibleUpdate of scenario.expectedVisibleUpdates) {
          const rmNameFormatted = util.toPascalCase(expectedVisibleUpdate.readModelName)

          // ✅ validate scenario[i].expectedVisibleUpdates[i].entityName is not blank
          if (scenarioVisibleUpdateReadModelNameBlank(expectedVisibleUpdate))
            scenarioIssues.push(msg(is.scenarioVuRmNameBlank))

          // ✅ validate scenario[i].expectedVisibleUpdates[i].itemId is not blank
          if (scenarioVisibleUpdateItemIdBlank(expectedVisibleUpdate))
            scenarioIssues.push(msg(is.scenarioVuRmItemIdBlank, [rmNameFormatted]))

          // ✅ validate scenario[i].expectedVisibleUpdates[i].idKey is not blank
          if (expectedVisibleUpdate.idKey && scenarioVisibleUpdateIdKeyBlank(expectedVisibleUpdate))
            scenarioIssues.push(msg(is.scenarioVuRmIdKeyBlank, [rmNameFormatted]))

          // ✅ validate scenario[i].expectedVisibleUpdates[i] has values or notValues data present
          if (scenarioVisibleUpdateValuesBlocksMissing(expectedVisibleUpdate))
            scenarioIssues.push(msg(is.scenarioVuRmMissingValueBlocks, [rmNameFormatted]))

          // ✅ validate scenario[i].expectedVisibleUpdates[i].values is not empty, if present
          if (scenarioVisibleUpdateValuesEmpty(expectedVisibleUpdate))
            scenarioIssues.push(msg(is.scenarioVuRmValuesEmpty, [rmNameFormatted]))

          // ✅ validate scenario[i].expectedVisibleUpdates[i].notValues is not empty, if present
          if (scenarioVisibleUpdateNotValuesEmpty(expectedVisibleUpdate))
            scenarioIssues.push(msg(is.scenarioVuRmNotValuesEmpty, [rmNameFormatted]))

          // ✅ validate scenario[i].expectedVisibleUpdates[i].values[i].field value is not blank
          if (expectedVisibleUpdate.values && expectedVisibleUpdate.values.length > 0) {
            for (const [key, value] of Object.entries(expectedVisibleUpdate.values)) {
              if (scenarioVisibleUpdateValueBlank(value))
                scenarioIssues.push(msg(is.scenarioVuRmValuesFieldBlank, [key]))
            }
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i].noValues[i].field value is not blank
          if (expectedVisibleUpdate.notValues && expectedVisibleUpdate.notValues.length > 0) {
            for (const [key, value] of Object.entries(expectedVisibleUpdate.notValues)) {
              if (scenarioVisibleUpdateNotValueBlank(value))
                scenarioIssues.push(msg(is.scenarioVuRmNotValuesFieldBlank, [key]))
            }
          }

          // ✅ validate scenario[i].expectedVisibleUpdates[i].authorized is not empty, if present
          if (scenarioVisibleUpdateAuthBlank(expectedVisibleUpdate))
            scenarioIssues.push(msg(is.scenarioVuRmNAuthEmpty, [rmNameFormatted]))
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

// ----------------------------------------------------------------------------
// Discrete test functions (created to afford testing of process testing tools)

/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-extra-parens */

export const valueIsBlank = (value: unknown): boolean => {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    value === ' ' ||
    (typeof value === 'object' && Object.keys(value).length === 0) ||
    (Array.isArray(value) && value.length === 0)
  )
}
// Top-level blank values (that can still pass type validation)
export const processNameBlank = (process: type.Process): boolean => valueIsBlank(process.name)
export const triggerCommandNameBlank = (process: type.Process): boolean => (process.trigger.type === 'ActorCommand' ||process.trigger.type === 'ScheduledCommand') && valueIsBlank(process.trigger.commandName)
export const triggerAuthEmpty = (process: type.Process): boolean =>
  process.trigger.type === 'ActorCommand' && valueIsBlank(process.trigger.authorized)
export const scenariosEmpty = (process: type.Process): boolean => valueIsBlank(process.scenarios)

// Scenario: Names
export const scenarioNameBlank = (process: type.Process): boolean =>
  process.scenarios.some((scenario) => !scenario.name)
export const scenariosHaveDuplicateNames = (process: type.Process): boolean => {
  const scenarioNames = process.scenarios.map((scenario) => scenario.name)
  return util.stringArrayHasDuplicates(scenarioNames)
}

// Scenario: Preceding Actions
export const scenarioPaCommandNameBlank = (action: type.PrecedingAction): boolean => valueIsBlank(action.commandName)
export const scenarioPaInputsEmpty = (action: type.PrecedingAction): boolean => valueIsBlank(action.inputs)
export const scenarioPaAuthEmpty = (action: type.PrecedingAction): boolean => valueIsBlank(action.authorized)

// if trigger is Actor Command, Scenario: Inputs
export const scenarioInputsEmpty = (process: type.Process, scenario: type.Scenario): boolean => process.trigger.type === 'ActorCommand' && valueIsBlank(scenario.inputs)
export const scenarioInputValueBlank = (value: unknown): boolean => valueIsBlank(value)

// Scenario: State Updates
export const scenarioStateUpdatesEmpty = (scenario: type.Scenario): boolean =>
  !scenario.shouldBeRejected && valueIsBlank(scenario.expectedStateUpdates)
export const scenarioStateUpdateEntityNameBlank = (stateUpdate: type.StateUpdate): boolean =>
  valueIsBlank(stateUpdate.entityName)
export const scenarioStateUpdateItemIdBlank = (stateUpdate: type.StateUpdate): boolean =>
  valueIsBlank(stateUpdate.itemId)
export const scenarioStateUpdateValuesBlocksMissing = (stateUpdate: type.StateUpdate): boolean =>
  !stateUpdate.values && !stateUpdate.notValues
export const scenarioStateUpdateValuesEmpty = (stateUpdate: type.StateUpdate): boolean =>
  stateUpdate.values && valueIsBlank(stateUpdate.values)
export const scenarioStateUpdateNotValuesEmpty = (stateUpdate: type.StateUpdate): boolean =>
  stateUpdate.notValues && valueIsBlank(stateUpdate.notValues)
export const scenarioStateUpdateValueBlank = (value: unknown): boolean => valueIsBlank(value)
export const scenarioStateUpdateNotValueBlank = (value: unknown): boolean => valueIsBlank(value)

// Scenario: Visible Updates
export const scenarioVisibleUpdatesEmpty = (scenario: type.Scenario): boolean =>
  valueIsBlank(scenario.expectedVisibleUpdates)
export const scenarioVisibleUpdateReadModelNameBlank = (visibleUpdate: type.VisibleUpdate): boolean =>
  valueIsBlank(visibleUpdate.readModelName)
export const scenarioVisibleUpdateItemIdBlank = (visibleUpdate: type.VisibleUpdate): boolean =>
  valueIsBlank(visibleUpdate.itemId)
export const scenarioVisibleUpdateIdKeyBlank = (visibleUpdate: type.VisibleUpdate): boolean =>
  valueIsBlank(visibleUpdate.idKey)
export const scenarioVisibleUpdateValuesBlocksMissing = (visibleUpdate: type.VisibleUpdate): boolean =>
  !visibleUpdate.values && !visibleUpdate.notValues
export const scenarioVisibleUpdateValuesEmpty = (visibleUpdate: type.VisibleUpdate): boolean =>
  visibleUpdate.values && valueIsBlank(visibleUpdate.values)
export const scenarioVisibleUpdateNotValuesEmpty = (visibleUpdate: type.VisibleUpdate): boolean =>
  visibleUpdate.notValues && valueIsBlank(visibleUpdate.notValues)
export const scenarioVisibleUpdateValueBlank = (value: unknown): boolean => valueIsBlank(value)
export const scenarioVisibleUpdateNotValueBlank = (value: unknown): boolean => valueIsBlank(value)
export const scenarioVisibleUpdateAuthBlank = (visibleUpdate: type.VisibleUpdate): boolean =>
  valueIsBlank(visibleUpdate.authorized)
