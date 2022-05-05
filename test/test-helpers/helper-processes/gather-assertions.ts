import type {
  Process,
  AssertionInput,
  AssertionValue,
  AssertionEntity,
  AssertionReadModel,
  Assertions,
} from './process-types'
import * as util from './process-utils'

export const gatherProcessAssertions = (process: Process): Assertions => {
  // ======================================================================================

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
  const scenarioInputsData = []
  for (const scenario of process.scenarios) {
    for (const [key, value] of Object.entries(scenario.inputs)) {
      scenarioInputsData.push({
        name: util.toCamelCase(key),
        types: util.inferValueType(value as string),
        testValue: util.testableValue(value),
      })
    }
  }
  // merge all inputs from scenarios into one array
  const scenarioInputs: AssertionInput[] = []
  for (const scenarioInput of scenarioInputsData) {
    const existingInput = scenarioInputs.find((input) => input.name === scenarioInput.name)
    if (existingInput) {
      const existingType = existingInput.types.includes(scenarioInput.types)
      if (!existingType) existingInput.types.push(scenarioInput.types)
    } else {
      scenarioInputs.push({
        name: scenarioInput.name,
        types: [scenarioInput.types],
        testValue: scenarioInput.testValue,
      })
    }
  }

  // 🪐 Gather ENTITIES data across all scenarios
  // ======================================================================================
  const scenarioEntitiesData = []
  for (const scenario of process.scenarios) {
    for (const stateUpdate of scenario.expectedStateUpdates) {
      // ...gather entity values
      const values: AssertionValue[] = []
      for (const [key, value] of Object.entries(stateUpdate.values)) {
        values.push({
          fieldName: util.toCamelCase(key),
          fieldTypes: util.inferValueType(value as string),
          testValue: util.testableValue(value),
        })
      }
      // ...enter entity and values
      if (!scenarioEntitiesData.some((item) => item.entityName === stateUpdate.entityName)) {
        scenarioEntitiesData.push({
          entityName: util.toPascalCase(stateUpdate.entityName),
          values,
        })
      }
    }
  }
  // ...merge data for each entity across scenarios
  const scenarioEntitiesMerged = []
  for (const entity of scenarioEntitiesData) {
    // ...if entity not yet in scenarioEntitiesMerged add it
    if (!scenarioEntitiesMerged.some((scenario) => scenario.entityName === entity.entityName)) {
      scenarioEntitiesMerged.push(entity)
      // ...if entity already exists in scenarioEntitiesMerged merge additional data
    } else {
      const matchedIndex = scenarioEntitiesMerged.findIndex((entity) => entity.entityName === entity.entityName)
      //  ...merge values
      scenarioEntitiesMerged[matchedIndex].values = scenarioEntitiesMerged[matchedIndex].values.concat(entity.values)
      // ...combine identical fieldNames and merge their field types
      const entityFieldNames = scenarioEntitiesMerged[matchedIndex].values.map((entity) => entity.fieldName)
      const entityFieldNamesUnique = [...new Set(entityFieldNames)]
      for (const entityFieldName of entityFieldNamesUnique) {
        let fieldTypes = scenarioEntitiesMerged[matchedIndex].values
          .filter((entity) => entity.fieldName === entityFieldName)
          .map((entity) => entity.fieldTypes)
          .sort()
        fieldTypes = [...new Set(fieldTypes)].sort().join('|')
        scenarioEntitiesMerged[matchedIndex].values = scenarioEntitiesMerged[matchedIndex].values.map((entity) => {
          if (entity.fieldName === entityFieldName) entity.fieldTypes = fieldTypes
          return entity
        })
      }
    }
  }
  // ...reduce duplicate fieldName in values within each entity
  const scenarioEntities: AssertionEntity[] = []
  for (const entity of scenarioEntitiesMerged) {
    const values = entity.values.reduce((acc, value) => {
      if (!acc.some((item) => item.fieldName === value.fieldName)) acc.push(value)
      return acc
    }, [])
    scenarioEntities.push({
      entityName: entity.entityName,
      values,
    })
  }

  // 🔭 Gather READ MODELS data across all scenarios
  // ======================================================================================
  const scenarioReadModelsData = []
  for (const scenario of process.scenarios) {
    for (const visibleUpdate of scenario.expectedVisibleUpdates) {
      // ...gather read model values
      const values: AssertionValue[] = []
      for (const [key, value] of Object.entries(visibleUpdate.values)) {
        values.push({
          fieldName: util.toCamelCase(key),
          fieldTypes: util.inferValueType(value as string),
          testValue: util.testableValue(value),
        })
      }
      // ...gather read model authorization
      const readModelAuthorization = Array.isArray(visibleUpdate.authorized)
        ? visibleUpdate.authorized.map((item) => util.toPascalCase(item))
        : visibleUpdate.authorized
      // ...enter read model data
      if (!scenarioReadModelsData.some((model) => model.readModelName === visibleUpdate.readModelName)) {
        scenarioReadModelsData.push({
          readModelName: util.toPascalCase(visibleUpdate.readModelName),
          values,
          authorized: typeof readModelAuthorization === 'string' ? [readModelAuthorization] : readModelAuthorization,
        })
      }
    }
  }
  // ...merge data for each read model across scenarios
  const scenarioReadModelsMerged = []
  for (const readModel of scenarioReadModelsData) {
    // ...if read model not yet in scenarioEntitiesMerged add it
    if (!scenarioReadModelsMerged.some((scenario) => scenario.readModelName === readModel.readModelName)) {
      scenarioReadModelsMerged.push(readModel)
      // ...if read model already exists in scenarioReadModelsMerged merge additional data
    } else {
      const matchedIndex = scenarioReadModelsMerged.findIndex(
        (readModel) => readModel.readModelName === readModel.readModelName
      )
      //  ...merge values
      scenarioReadModelsMerged[matchedIndex].values = scenarioReadModelsMerged[matchedIndex].values.concat(
        readModel.values
      )
      //  ...merge authorization
      let mergedRoles = [...scenarioReadModelsMerged[matchedIndex].authorized, ...readModel.authorized]
      mergedRoles = [...new Set(mergedRoles)]
      scenarioReadModelsMerged[matchedIndex].authorized = mergedRoles
      // ...combine identical fieldNames and merge their field types
      const readModelFieldNames = scenarioReadModelsMerged[matchedIndex].values.map((readModel) => readModel.fieldName)
      const readModelFieldNamesUnique = [...new Set(readModelFieldNames)]
      for (const readModelFieldName of readModelFieldNamesUnique) {
        let fieldTypes = scenarioReadModelsMerged[matchedIndex].values
          .filter((readModel) => readModel.fieldName === readModelFieldName)
          .map((readModel) => readModel.fieldTypes)
          .sort()
        fieldTypes = [...new Set(fieldTypes)].sort().join('|')
        scenarioReadModelsMerged[matchedIndex].values = scenarioReadModelsMerged[matchedIndex].values.map(
          (readModel) => {
            if (readModel.fieldName === readModelFieldName) readModel.fieldTypes = fieldTypes
            return readModel
          }
        )
      }
    }
  }
  // ...reduce duplicate fieldName in values within each read model
  const scenarioReadModels: AssertionReadModel[] = []
  for (const readModel of scenarioReadModelsMerged) {
    const values = readModel.values.reduce((acc, value) => {
      if (!acc.some((item) => item.fieldName === value.fieldName)) acc.push(value)
      return acc
    }, [])
    scenarioReadModels.push({
      readModelName: readModel.readModelName,
      values,
      authorized: readModel.authorized,
    })
  }

  // Return assertions data
  // ======================================================================================
  return {
    roles,
    inputs: scenarioInputs,
    entities: scenarioEntities,
    readModels: scenarioReadModels,
  }
}
