import * as types from './types'
import * as util from './utils'

export const gatherProcessAssertions = (process: types.Process): types.Assertions => {
  // ======================================================================================

  // ⏩ Pass-thru TRIGGER information
  // ======================================================================================
  let triggerInfo: types.ActorCommand | types.ScheduledCommand
  if (process.trigger.type === 'ActorCommand') {
    triggerInfo = {
      type: 'ActorCommand',
      commandName: process.trigger.commandName,
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
      expectedStateUpdates: scenario.expectedStateUpdates,
      expectedVisibleUpdates: scenario.expectedVisibleUpdates,
    })
  }

  // 🔑 Gather ROLES
  // ======================================================================================
  // ...gather write roles if an actor command (trigger will have either 'all' OR one or more roles)
  let writeRoles: string[] = []
  if (process.trigger.type === 'ActorCommand') {
    let triggerAuthIncludesAll: boolean
    if (typeof process.trigger.authorized === 'string')
      triggerAuthIncludesAll = process.trigger.authorized.toLowerCase() === 'all'
    if (typeof process.trigger.authorized !== 'string')
      triggerAuthIncludesAll = process.trigger.authorized.join('|').toLowerCase().includes('all')
    if (triggerAuthIncludesAll) writeRoles = ['all']
    if (typeof process.trigger.authorized === 'string' && !triggerAuthIncludesAll)
      writeRoles.push(util.toPascalCase(process.trigger.authorized))
    if (typeof process.trigger.authorized !== 'string' && !triggerAuthIncludesAll)
      writeRoles = process.trigger.authorized.map((role) => util.toPascalCase(role))
  }
  // ...gather read roles across scenarios (can be 'all' AND/OR one or more roles across multiple read models)
  let readRoles: string[] = []
  for (const scenario of process.scenarios) {
    if (scenario.expectedVisibleUpdates) {
      for (const expectedVisibleUpdate of scenario.expectedVisibleUpdates) {
        if (
          typeof expectedVisibleUpdate.authorized === 'string' ||
          expectedVisibleUpdate.authorized[0].toLowerCase() === 'all'
        )
          readRoles = ['all']
        if (typeof expectedVisibleUpdate.authorized !== 'string') {
          for (const role of expectedVisibleUpdate.authorized) {
            if (!readRoles.includes(role)) readRoles.push(util.toPascalCase(role))
          }
        }
      }
    }
  }
  const allRoles: string[] = [...new Set([...writeRoles, ...readRoles])]
  const roles = {
    write: writeRoles.sort(),
    read: readRoles.sort(),
    all: allRoles.sort(),
  }

  // 🎯 Gather INPUTS
  // ======================================================================================
  const allScenarioInputsData = []
  for (const scenario of process.scenarios) {
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
      })
    }
  }

  // 🪐 Gather ENTITIES data across all scenarios
  // ======================================================================================
  const allScenarioEntitiesData = []
  for (const scenario of process.scenarios) {
    for (const stateUpdate of scenario.expectedStateUpdates) {
      // ...gather entity values
      const values: types.AssertionValue[] = []
      for (const [key, value] of Object.entries(stateUpdate.values)) {
        values.push({
          fieldName: util.toCamelCase(key),
          fieldTypes: [util.inferValueType(value as string)],
        })
      }
      // ...enter entity and values
      if (!allScenarioEntitiesData.some((item) => item.entityName === stateUpdate.entityName)) {
        allScenarioEntitiesData.push({
          entityName: util.toPascalCase(stateUpdate.entityName),
          values,
        })
      }
    }
  }
  // ...merge data for each entity across scenarios
  const allScenarioEntitiesMerged = []
  for (const entity of allScenarioEntitiesData) {
    // ...if entity not yet in scenarioEntitiesMerged add it
    if (!allScenarioEntitiesMerged.some((scenario) => scenario.entityName === entity.entityName)) {
      allScenarioEntitiesMerged.push(entity)
      // ...if entity already exists in allScenarioEntitiesMerged merge additional data
    } else {
      const matchedIndex = allScenarioEntitiesMerged.findIndex((entity) => entity.entityName === entity.entityName)
      //  ...merge values
      allScenarioEntitiesMerged[matchedIndex].values = allScenarioEntitiesMerged[matchedIndex].values.concat(
        entity.values
      )
      // ...combine identical fieldNames and merge their field types
      const entityFieldNames = allScenarioEntitiesMerged[matchedIndex].values.map((entity) => entity.fieldName)
      const entityFieldNamesUnique = [...new Set(entityFieldNames)]
      for (const entityFieldName of entityFieldNamesUnique) {
        let fieldTypes = allScenarioEntitiesMerged[matchedIndex].values
          .filter((entity) => entity.fieldName === entityFieldName)
          .map((entity) => entity.fieldTypes)
          .flat()
          .sort()
        fieldTypes = [...new Set(fieldTypes)].sort()
        allScenarioEntitiesMerged[matchedIndex].values = allScenarioEntitiesMerged[matchedIndex].values.map(
          (entity) => {
            if (entity.fieldName === entityFieldName) entity.fieldTypes = fieldTypes
            return entity
          }
        )
      }
    }
  }
  // ...reduce duplicate fieldName in values within each entity
  const allScenarioEntities: types.AssertionEntity[] = []
  for (const entity of allScenarioEntitiesMerged) {
    const values = entity.values.reduce((acc, value) => {
      if (!acc.some((item) => item.fieldName === value.fieldName)) acc.push(value)
      return acc
    }, [])
    allScenarioEntities.push({
      entityName: entity.entityName,
      values,
    })
  }

  // 🔭 Gather READ MODELS data across all scenarios
  // ======================================================================================
  const allScenarioReadModelsData = []
  for (const scenario of process.scenarios) {
    for (const visibleUpdate of scenario.expectedVisibleUpdates) {
      // ...gather read model values
      const values: types.AssertionValue[] = []
      for (const [key, value] of Object.entries(visibleUpdate.values)) {
        values.push({
          fieldName: util.toCamelCase(key),
          fieldTypes: [util.inferValueType(value as string)],
        })
      }
      // ...gather read model authorization
      const readModelAuthorization = Array.isArray(visibleUpdate.authorized)
        ? visibleUpdate.authorized.map((item) => util.toPascalCase(item))
        : visibleUpdate.authorized
      // ...enter read model data
      if (!allScenarioReadModelsData.some((model) => model.readModelName === visibleUpdate.readModelName)) {
        allScenarioReadModelsData.push({
          readModelName: util.toPascalCase(visibleUpdate.readModelName),
          values,
          authorized: typeof readModelAuthorization === 'string' ? [readModelAuthorization] : readModelAuthorization,
        })
      }
    }
  }
  // ...merge data for each read model across scenarios
  const allScenarioReadModelsMerged = []
  for (const readModel of allScenarioReadModelsData) {
    // ...if read model not yet in scenarioEntitiesMerged add it
    if (!allScenarioReadModelsMerged.some((scenario) => scenario.readModelName === readModel.readModelName)) {
      allScenarioReadModelsMerged.push(readModel)
      // ...if read model already exists in allScenarioReadModelsMerged merge additional data
    } else {
      const matchedIndex = allScenarioReadModelsMerged.findIndex(
        (readModel) => readModel.readModelName === readModel.readModelName
      )
      //  ...merge values
      allScenarioReadModelsMerged[matchedIndex].values = allScenarioReadModelsMerged[matchedIndex].values.concat(
        readModel.values
      )
      //  ...merge authorization
      let mergedRoles = [...allScenarioReadModelsMerged[matchedIndex].authorized, ...readModel.authorized]
      mergedRoles = [...new Set(mergedRoles)]
      allScenarioReadModelsMerged[matchedIndex].authorized = mergedRoles
      // ...combine identical fieldNames and merge their field types
      const readModelFieldNames = allScenarioReadModelsMerged[matchedIndex].values.map(
        (readModel) => readModel.fieldName
      )
      const readModelFieldNamesUnique = [...new Set(readModelFieldNames)]
      for (const readModelFieldName of readModelFieldNamesUnique) {
        let fieldTypes = allScenarioReadModelsMerged[matchedIndex].values
          .filter((readModel) => readModel.fieldName === readModelFieldName)
          .map((readModel) => readModel.fieldTypes)
          .flat()
          .sort()
        fieldTypes = [...new Set(fieldTypes)].sort()
        allScenarioReadModelsMerged[matchedIndex].values = allScenarioReadModelsMerged[matchedIndex].values.map(
          (readModel) => {
            if (readModel.fieldName === readModelFieldName) readModel.fieldTypes = fieldTypes
            return readModel
          }
        )
      }
    }
  }
  // ...reduce duplicate fieldName in values within each read model
  const allScenarioReadModels: types.AssertionReadModel[] = []
  for (const readModel of allScenarioReadModelsMerged) {
    const values = readModel.values.reduce((acc, value) => {
      if (!acc.some((item) => item.fieldName === value.fieldName)) acc.push(value)
      return acc
    }, [])
    allScenarioReadModels.push({
      readModelName: readModel.readModelName,
      values,
      authorized: readModel.authorized,
    })
  }

  // Return assertions data
  // ======================================================================================
  return {
    trigger: triggerInfo,
    scenarios: scenarioInfo,
    roles,
    allInputs: allScenarioInputs,
    allEntities: allScenarioEntities,
    allReadModels: allScenarioReadModels,
  }
}
