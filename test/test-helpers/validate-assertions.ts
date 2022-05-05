import type { Process } from './types'

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
  if (process.scenarios.every((scenario) => scenario.name)) allScenariosAreNamed = true

  if (allScenariosAreNamed) {
    for (const scenario of process.scenarios) {
      // ✅ validate scenario inputs are present
      if (scenario.inputs.length === 0) {
        invalid = true
        errorMessage += `\n- ${scenario.name}: has no inputs`
      }

      // ✅ validate scenario[i].inputs[i].name is not blank
      for (const [key, value] of Object.entries(scenario.inputs)) {
        if (!value) {
          invalid = true
          errorMessage += `\n- ${scenario.name}: input '${key}' has a blank value`
        }
      }

      // ✅ validate scenario state update(s) are present
      if (scenario.expectedStateUpdates.length === 0) {
        invalid = true
        errorMessage += `\n- ${scenario.name}: has no expected state update(s)`
      }

      if (scenario.expectedStateUpdates?.length > 0) {
        // ✅ validate scenario[i].expectedStateUpdates[i].entityName is not blank
        for (const expectedStateUpdate of scenario.expectedStateUpdates) {
          if (!expectedStateUpdate.entityName) {
            invalid = true
            errorMessage += `\n- ${scenario.name}: has state update with a blank entity name`
          }
        }

        // ✅ validate scenario[i].expectedStateUpdates[i].values[i].field value is not blank
        for (const expectedStateUpdate of scenario.expectedStateUpdates) {
          for (const [key, value] of Object.entries(expectedStateUpdate.values)) {
            if (!value) {
              invalid = true
              errorMessage += `\n- ${scenario.name}: state update field '${key}' has a blank value`
            }
          }
        }

        // ✅ validate scenario[i].expectedStateUpdates[i].value are not empty
        for (const expectedStateUpdate of scenario.expectedStateUpdates) {
          if (expectedStateUpdate.values.length === 0) {
            invalid = true
            errorMessage += `\n- ${scenario.name}: state update '${expectedStateUpdate.entityName}' has no expected values`
          }
        }
      }

      if (scenario.expectedVisibleUpdates?.length > 0) {
        // ✅ validate scenario[i].expectedVisibleUpdates[i].entityName is not blank
        for (const expectedVisibleUpdate of scenario.expectedVisibleUpdates) {
          if (!expectedVisibleUpdate.readModelName) {
            invalid = true
            errorMessage += `\n- ${scenario.name}: has visible update with a blank read model name`
          }
        }

        // ✅ validate scenario[i].expectedStateUpdates[i].values[i].field value is not blank
        for (const expectedVisibleUpdate of scenario.expectedVisibleUpdates) {
          for (const [key, value] of Object.entries(expectedVisibleUpdate.values)) {
            if (!value) {
              invalid = true
              errorMessage += `\n- ${scenario.name}: visible update field '${key}' has a blank value`
            }
          }
        }

        // ✅ validate scenario[i].expectedVisibleUpdates[i].value are not empty, if present
        for (const expectedVisibleUpdates of scenario.expectedVisibleUpdates) {
          if (expectedVisibleUpdates.values.length === 0) {
            invalid = true
            errorMessage += `\n- ${scenario.name}: visible update '${expectedVisibleUpdates.readModelName}' has no expected values`
          }
        }

        // ✅ validate scenario[i].expectedVisibleUpdates[i].authorized is not empty, if present
        for (const expectedVisibleUpdates of scenario.expectedVisibleUpdates) {
          if (expectedVisibleUpdates.authorized.length === 0) {
            invalid = true
            errorMessage += `\n- ${scenario.name}: visible update '${expectedVisibleUpdates.readModelName}' has no authorization defined`
          }
        }

        // ✅ validate scenario[i].expectedVisibleUpdates[i].authorized is an array if value is not 'all'
        for (const expectedVisibleUpdates of scenario.expectedVisibleUpdates) {
          if (typeof expectedVisibleUpdates.authorized === 'string' && expectedVisibleUpdates.authorized !== 'all') {
            invalid = true
            errorMessage += `\n- ${scenario.name}: visible update '${expectedVisibleUpdates.readModelName}' roles should be inside an array`
          }
        }
      }
    }
  }

  if (invalid && errorMessage.length > 0) {
    // alphabetize error messages
    errorMessage = errorMessage.split('\n').sort().join('\n')
    const errorMessageHeading = `\n\n'${process.name}' Assertion Issues\n=====================================================================`
    // prepend heading to error messages
    errorMessage = `${errorMessageHeading}\n${errorMessage}`
  }

  // fail with errors if any of the above fail
  if (invalid) return errorMessage

  // if all valid
  return true
}
