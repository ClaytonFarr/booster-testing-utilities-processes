import * as types from './types'
import * as util from './helpers-utils'

export const gatherAssertions = (process: types.Process): types.Assertions => {
  // ======================================================================================

  // ⏩ Pass-thru TRIGGER information
  // ======================================================================================
  let triggerInfo: types.ActorCommand | types.ScheduledCommand
  if (process.trigger.type === 'ActorCommand') {
    triggerInfo = {
      type: 'ActorCommand',
      commandName: util.toPascalCase(process.trigger.commandName),
      authorized: process.trigger.authorized,
    }
  } else if (process.trigger.type === 'ScheduledCommand') {
    triggerInfo = {
      type: 'ScheduledCommand',
      commandName: process.trigger.commandName,
      schedule: process.trigger.schedule,
    }
  }

  // ⏩ Pass-thru SCENARIO information
  // ======================================================================================
  const scenarioInfo: types.Scenario[] = []
  for (const scenario of process.scenarios) {
    scenarioInfo.push({
      name: scenario.name,
      inputs: scenario.inputs,
      precedingActions: scenario.precedingActions,
      shouldBeRejected: scenario.shouldBeRejected,
      expectedStateUpdates: scenario.expectedStateUpdates,
      expectedVisibleUpdates: scenario.expectedVisibleUpdates,
    })
  }

  // 🔑 Gather all ROLES
  // ======================================================================================
  // ...gather write roles if an actor command (trigger will have either 'all' OR one or more roles)
  let triggerWriteRoles: string[] = []
  if (process.trigger.type === 'ActorCommand') triggerWriteRoles = util.gatherRoles(process.trigger.authorized)
  // ...gather any write roles across scenario preceding actions
  let paWriteRoles: string[] = []
  for (const scenario of process.scenarios) {
    if (scenario.precedingActions) {
      for (const action of scenario.precedingActions) {
        const paWriteRolesSet = util.gatherRoles(action.authorized)
        paWriteRoles = paWriteRoles.concat(paWriteRolesSet)
      }
    }
  }
  paWriteRoles = [...new Set(paWriteRoles)] // remove duplicates
  // ...gather read roles across scenarios (can be 'all' AND/OR one or more roles across multiple read models)
  let readRoles: string[] = []
  for (const scenario of process.scenarios) {
    if (scenario.expectedVisibleUpdates) {
      for (const expectedVisibleUpdate of scenario.expectedVisibleUpdates) {
        const readRolesSet = util.gatherRoles(expectedVisibleUpdate.authorized)
        readRoles = readRoles.concat(readRolesSet)
      }
    }
  }
  readRoles = [...new Set(readRoles)] // remove duplicates
  const allRoles: string[] = [...new Set([...triggerWriteRoles, ...paWriteRoles, ...readRoles])]
  const roles = {
    triggerWrite: triggerWriteRoles.sort(),
    paWrite: paWriteRoles.sort(),
    read: readRoles.sort(),
    all: allRoles.sort(),
  }

  // ✨ Gather scenario INPUTS for trigger command
  // ======================================================================================
  const inputsKeys = []
  const allScenarioInputsData = []
  for (const scenario of process.scenarios) {
    inputsKeys.push(Object.keys(scenario.inputs))
    for (const [key, value] of Object.entries(scenario.inputs)) {
      allScenarioInputsData.push({
        name: util.toCamelCase(key),
        types: util.inferValueType(value as string),
      })
    }
  }
  // merge all inputs from scenarios into one array
  const allScenarioInputs: types.AssertionInput[] = []
  for (const scenarioInput of allScenarioInputsData) {
    const existingInput = allScenarioInputs.find((input) => input.name === scenarioInput.name)
    if (existingInput) {
      const existingType = existingInput.types.includes(scenarioInput.types)
      if (!existingType) existingInput.types.push(scenarioInput.types)
    } else {
      allScenarioInputs.push({
        name: scenarioInput.name,
        types: [scenarioInput.types],
        required: false,
      })
    }
  }
  // mark inputs that occurred in all scenarios as required
  const inputsKeysCommon = inputsKeys.reduce((acc, curr) => acc.filter((x) => curr.includes(x)), inputsKeys[0])
  for (const input of allScenarioInputs) {
    if (inputsKeysCommon.includes(input.name)) input.required = true
  }

  // ⏪ Gather PRECEDING ACTIONS
  // ======================================================================================
  const precedingActions: types.AssertionPrecedingActionSet[] = []
  for (const scenario of process.scenarios) {
    if (scenario.precedingActions) {
      const scenarioPrecedingActions: types.AssertionPrecedingAction[] = []
      for (const action of scenario.precedingActions) {
        const precedingAction: types.AssertionPrecedingAction = {
          commandName: util.toPascalCase(action.commandName),
          inputs: [],
          authorized: action.authorized,
        }
        const paInputs = []
        for (const [key, value] of Object.entries(action.inputs)) {
          paInputs.push({
            name: util.toCamelCase(key),
            types: [util.inferValueType(value as string)],
          })
        }
        precedingAction.inputs = paInputs
        scenarioPrecedingActions.push(precedingAction)
      }
      precedingActions.push({
        scenarioName: scenario.name,
        actions: scenarioPrecedingActions,
      })
    }
  }

  // 👽 Gather ENTITIES data across all scenarios
  // ======================================================================================
  const allScenarioEntitiesData: types.AssertionEntity[] = []
  for (const scenario of process.scenarios) {
    for (const stateUpdate of scenario.expectedStateUpdates) {
      if (stateUpdate.values) {
        // ...gather entity values
        const fields: types.AssertionValue[] = []
        for (const [key, value] of Object.entries(stateUpdate.values)) {
          fields.push({
            fieldName: util.toCamelCase(key),
            fieldTypes: [util.inferValueType(value as string)],
          })
        }
        // ...enter entity and values
        allScenarioEntitiesData.push({
          entityName: util.toPascalCase(stateUpdate.entityName),
          fields,
        })
      }
    }
  }
  // ...merge data for each entity across scenarios
  const allScenarioEntitiesMerged: types.AssertionEntity[] = []
  for (const entity of allScenarioEntitiesData) {
    // ...if entity not yet in scenarioEntitiesMerged add it
    if (!allScenarioEntitiesMerged.some((scenario) => scenario.entityName === entity.entityName)) {
      allScenarioEntitiesMerged.push(entity)
    } else {
      // ...if entity already exists in allScenarioEntitiesMerged merge additional data
      const matchedIndex = allScenarioEntitiesMerged.findIndex((e) => e.entityName === entity.entityName)
      const existingEntity = allScenarioEntitiesMerged[matchedIndex]
      for (const field of entity.fields) {
        const existingField = existingEntity.fields.find((f) => f.fieldName === field.fieldName)
        if (existingField) {
          // merge any new field types
          const existingTypes = existingField.fieldTypes
          const newTypes = field.fieldTypes
          const mergedTypes = [...new Set([...existingTypes, ...newTypes])]
          existingField.fieldTypes = mergedTypes
        } else {
          existingEntity.fields.push(field)
        }
      }
    }
  }
  // ...reduce duplicate fieldName in values within each entity
  const allScenarioEntities: types.AssertionEntity[] = []
  for (const entity of allScenarioEntitiesMerged) {
    const fields = entity.fields.reduce((acc, value) => {
      if (!acc.some((item) => item.fieldName === value.fieldName)) acc.push(value)
      return acc
    }, [])
    allScenarioEntities.push({
      entityName: entity.entityName,
      fields,
    })
  }

  // 🔭 Gather READ MODELS data across all scenarios
  // ======================================================================================
  const allScenarioReadModelsData: types.AssertionReadModel[] = []
  for (const scenario of process.scenarios) {
    if (scenario.expectedVisibleUpdates) {
      for (const visibleUpdate of scenario.expectedVisibleUpdates) {
        if (visibleUpdate.values) {
          // ...gather read model values
          const fields: types.AssertionValue[] = []
          for (const [key, value] of Object.entries(visibleUpdate.values)) {
            fields.push({
              fieldName: util.toCamelCase(key),
              fieldTypes: [util.inferValueType(value as string)],
            })
          }
          // ...gather read model authorization
          const readModelAuthorization = Array.isArray(visibleUpdate.authorized)
            ? visibleUpdate.authorized.map((item) => util.toPascalCase(item))
            : visibleUpdate.authorized
          // ...enter read model data
          allScenarioReadModelsData.push({
            readModelName: util.toPascalCase(visibleUpdate.readModelName),
            fields,
            authorized: typeof readModelAuthorization === 'string' ? [readModelAuthorization] : readModelAuthorization,
          })
        }
      }
    }
  }
  // ...merge data for each read model across scenarios
  const allScenarioReadModelsMerged: types.AssertionReadModel[] = []
  for (const readModel of allScenarioReadModelsData) {
    // ...if read model not yet in scenarioEntitiesMerged add it
    if (!allScenarioReadModelsMerged.some((rm) => rm.readModelName === readModel.readModelName)) {
      allScenarioReadModelsMerged.push(readModel)
    } else {
      // ...if read model already exists in allScenarioReadModelsMerged merge additional data
      const matchedIndex = allScenarioReadModelsMerged.findIndex((rm) => rm.readModelName === readModel.readModelName)
      const existingReadModel = allScenarioReadModelsMerged[matchedIndex]
      // ...merge any new field types
      for (const field of readModel.fields) {
        const existingField = existingReadModel.fields.find((f) => f.fieldName === field.fieldName)
        if (existingField) {
          // merge any new field types
          const existingTypes = existingField.fieldTypes
          const newTypes = field.fieldTypes
          const mergedTypes = [...new Set([...existingTypes, ...newTypes])]
          existingField.fieldTypes = mergedTypes
        } else {
          existingReadModel.fields.push(field)
        }
      }
      // ...merge authorization
      const existingAuthorized = existingReadModel.authorized
      const newAuthorized = readModel.authorized
      const mergedAuthorized = [...new Set([...existingAuthorized, ...newAuthorized])]
      existingReadModel.authorized = mergedAuthorized
    }
  }
  // ...reduce duplicate fieldName in values within each read model
  const allScenarioReadModels: types.AssertionReadModel[] = []
  for (const readModel of allScenarioReadModelsMerged) {
    const fields = readModel.fields.reduce((acc, value) => {
      if (!acc.some((item) => item.fieldName === value.fieldName)) acc.push(value)
      return acc
    }, [])
    allScenarioReadModels.push({
      readModelName: readModel.readModelName,
      fields,
      authorized: readModel.authorized,
    })
  }

  // Return assertions data
  // ======================================================================================
  return {
    processName: process.name,
    trigger: triggerInfo,
    scenarios: scenarioInfo,
    roles,
    precedingActions,
    allInputs: allScenarioInputs,
    allEntities: allScenarioEntities,
    allReadModels: allScenarioReadModels,
  }
}
