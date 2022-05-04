import type { Process } from './process-types'
import { localFilePaths, uuidRegex } from './process-constants'
import * as util from './process-utils'
import fs from 'fs'

// ======================================================================================

export const confirmProcessFiles = async (process: Process, filePaths = localFilePaths): Promise<string | boolean> => {
  let invalid = false
  let errorMessage = ''

  // 🔑🔑🔑 ROLES 🔑🔑🔑
  // ======================================================================================

  // 🔑 Gather roles
  // ...gather write roles if an actor command (trigger will have either 'all' OR one or more roles)
  let writeRoles: string[]
  if (process.trigger.type === 'ActorCommand') {
    if (typeof process.trigger.authorized === 'string' || process.trigger.authorized[0] === 'all') writeRoles = []
    if (typeof process.trigger.authorized !== 'string')
      writeRoles = process.trigger.authorized.map((role) => util.toPascalCase(role))
  }
  // ...gather read roles across scenarios (can be 'all' AND/OR one or more roles across multiple read models)
  const readRoles: string[] = []
  for (const scenario of process.scenarios) {
    if (scenario.expectedVisibleUpdates) {
      for (const expectedVisibleUpdate of scenario.expectedVisibleUpdates) {
        if (typeof expectedVisibleUpdate.authorized === 'string' || expectedVisibleUpdate.authorized[0] === 'all') break
        if (typeof expectedVisibleUpdate.authorized !== 'string') {
          for (const role of expectedVisibleUpdate.authorized) {
            if (!readRoles.includes(role)) readRoles.push(util.toPascalCase(role))
          }
        }
      }
    }
  }
  const allRoles = [...new Set([...writeRoles, ...readRoles])]

  // 🔑 Confirm ROLES FILE exists, if needed
  if (allRoles.length > 0 && allRoles.length[0] !== 'all') {
    const rolesFilePath = filePaths.rolesPath
    const rolesFileExists = fs.existsSync(rolesFilePath)
    if (!rolesFileExists) {
      invalid = true
      errorMessage += `\n🔑 Roles file missing: '${rolesFilePath}'`
    }

    // 🔑 confirm roles.ts contains necessary ROLE DEFINITIONS
    if (rolesFileExists) {
      if (allRoles.length > 0 && allRoles.length[0] !== 'all') {
        const rolesFile = fs.readFileSync(rolesFilePath, 'utf8')
        const rolesFileLines = rolesFile.split('\n')
        const missingRoles = allRoles.filter(
          (role) => !rolesFileLines.includes(`export class ${util.toPascalCase(role)} {}`)
        )
        if (Array.isArray(missingRoles) && missingRoles.length > 0) {
          const missingRolesPascalCase = missingRoles.map((role) => util.toPascalCase(role))
          const missingRolesUnique = [...new Set(missingRolesPascalCase)]
          invalid = true
          errorMessage += `\n🔑 Roles.ts file does not have roles: ${missingRolesUnique.join(', ')}`
        }
      }
    }
  }

  // 🎯🎯🎯 TRIGGER 🎯🎯🎯
  // ======================================================================================

  // 🎯 Confirm TRIGGER FILE exists
  const triggerFileDirectory =
    process.trigger.type === 'ActorCommand' ? filePaths.commandsDirectoryPath : filePaths.scheduledCommandsDirectoryPath
  const triggerFileName = util.toKebabCase(process.trigger.commandName)
  const triggerFileExists = fs.existsSync(`${triggerFileDirectory}/${triggerFileName}.ts`)
  if (!triggerFileExists) {
    invalid = true
    errorMessage += `\n🎯 Trigger file missing: '${triggerFileDirectory}/${triggerFileName}.ts'`
  }
  let triggerFile: string
  if (triggerFileExists) triggerFile = fs.readFileSync(`${triggerFileDirectory}/${triggerFileName}.ts`, 'utf8')

  // 🎯 Confirm trigger has correct AUTHORIZATION
  if (triggerFile && process.trigger.type === 'ActorCommand') {
    // evaluate trigger file for asserted roles
    let triggerAuthorizationString = triggerFile.match(/authorize: (.*)/g)[0].replace(/authorize: /g, '')
    triggerAuthorizationString = triggerAuthorizationString.slice(0, -1) // remove trailing comma
    const triggerHasAuthorization =
      triggerAuthorizationString.startsWith("'all'") || triggerAuthorizationString.startsWith('[') ? true : false
    let triggerHasCorrectAuthorization: boolean
    if (triggerHasAuthorization) {
      if (writeRoles.length === 0) triggerHasCorrectAuthorization = triggerAuthorizationString.startsWith("'all'")
      if (writeRoles.length > 0) {
        let triggerFileRoles = triggerAuthorizationString.replace(/\[|\]|/g, '').split(',')
        triggerFileRoles = triggerFileRoles.map((role: string) => role.trim())
        triggerHasCorrectAuthorization = writeRoles.every((role: string) => triggerFileRoles.includes(role))
      }
    }
    const expectedWriteRoles = writeRoles.length === 0 ? "'all'" : writeRoles.join(', ')
    // alert if trigger missing any authorization definition
    if (!triggerHasAuthorization) {
      invalid = true
      errorMessage += `\n🎯 Trigger does not have authorization defined (expecting ${expectedWriteRoles})`
    }
    // alert if trigger missing correct authorization definition
    if (triggerHasAuthorization && !triggerHasCorrectAuthorization) {
      invalid = true
      errorMessage += `\n🎯 Trigger does not have correct authorization (expecting ${expectedWriteRoles})`
    }
  }

  // 🎯 Confirm that trigger INPUTS and INPUT TYPES match scenarios
  const triggerInputs = []
  if (triggerFile) {
    // gather trigger inputs
    const triggerInputsArray = [...triggerFile.matchAll(/readonly ([a-zA-Z]+)\?*:\s*(.+)/g)]
    triggerInputsArray.forEach((input) => {
      let inputTypes = input[2].replace(/,|\/\/.*/g, '').split(' | ')
      inputTypes = inputTypes.map((type) => type.trim())
      triggerInputs.push({
        name: input[1],
        type: inputTypes,
      })
    })
    // alert if trigger has no inputs defined
    if (!triggerInputs || triggerInputs.length === 0) {
      let expectedInputNames = []
      for (const scenario of process.scenarios) {
        if (scenario.inputs) for (const input of scenario.inputs) expectedInputNames.push(util.toCamelCase(input.name))
      }
      expectedInputNames = [...new Set(expectedInputNames)].sort()
      invalid = true
      errorMessage += `\n🎯 Trigger does not have any inputs defined (expecting ${expectedInputNames})`
    }

    if (triggerInputs && triggerInputs.length > 0) {
      // gather scenario inputs
      const scenarioInputs = process.scenarios.map((scenario) => {
        if (scenario.inputs) {
          const scenarioInputs = scenario.inputs.map((input) => {
            const typeIsUUID =
              typeof input.value === 'string' && (input.value.match(uuidRegex) || input.value === 'UUID')
            return {
              name: util.toCamelCase(input.name),
              type: input.type || typeIsUUID ? 'UUID' : typeof input.value, // if type not explicitly set, infer from input value
            }
          })
          return scenarioInputs
        }
      })
      const scenarioInputsFlat = [].concat(...scenarioInputs)
      const scenarioInputsReducedObject = scenarioInputsFlat.reduce((acc, curr) => {
        if (acc[curr.name]) {
          acc[curr.name].type.push(curr.type)
        } else {
          acc[curr.name] = {
            name: curr.name,
            type: [curr.type],
          }
        }
        return acc
      }, {})
      const scenarioInputsReducedArray = Object.keys(scenarioInputsReducedObject).map(
        (key) => scenarioInputsReducedObject[key]
      )
      // determine which scenario inputs are missing from trigger inputs
      const missingInputs = []
      for (const scenarioInput of scenarioInputsReducedArray) {
        const allScenarioMissingInputs = []
        if (!triggerInputs.some((triggerInput) => triggerInput.name === scenarioInput.name)) {
          allScenarioMissingInputs.push({
            name: scenarioInput.name,
            type: scenarioInput.type,
          })
        } // ...remove duplicates
        for (const scenarioInput of allScenarioMissingInputs) {
          if (!missingInputs.some((missingInput) => missingInput.name === scenarioInput.name))
            missingInputs.push(scenarioInput)
        }
      }
      // determine which trigger inputs have different (or incomplete) types from scenario inputs
      const incorrectTypeInputs = []
      for (const triggerInput of triggerInputs) {
        const matchingScenarioInputs = scenarioInputsReducedArray.filter((input) => input.name === triggerInput.name)
        for (const scenarioInput of matchingScenarioInputs) {
          for (const inputType of scenarioInput.type) {
            if (!triggerInput.type.includes(inputType)) {
              incorrectTypeInputs.forEach((input) => {
                if (input.name === scenarioInput.name) input.type.push(inputType)
              })
              if (!incorrectTypeInputs.some((input) => input.name === scenarioInput.name))
                incorrectTypeInputs.push({
                  name: scenarioInput.name,
                  type: [inputType],
                })
            }
          }
        }
      }
      // alert if any inputs are missing
      if (missingInputs && missingInputs.length > 0) {
        invalid = true
        for (const missingInput of missingInputs) {
          errorMessage += `\n🎯 Trigger is missing input: ${missingInput.name} (${missingInput.type.join('|')})`
        }
      }
      // alert if any inputs are mismatched
      if (incorrectTypeInputs && incorrectTypeInputs.length > 0) {
        invalid = true
        for (const incorrectTypeInput of incorrectTypeInputs) {
          errorMessage += `\n🎯 Trigger missing type${incorrectTypeInput.type.length > 1 ? 's' : ''} for ${
            incorrectTypeInput.name
          } (missing ${incorrectTypeInput.type.join('|')})`
        }
      }
      // Later: possibly alert when trigger has inputs present that are not included in any scenario
    }
  }

  // 🎯 Confirm triggers REGISTERS at least one event
  let triggerRegisteredEvents: string[]
  if (triggerFile) {
    triggerRegisteredEvents = triggerFile.match(/new (\w+)/gm) // a little brittle, but works for now
    triggerRegisteredEvents = triggerRegisteredEvents.filter(
      (event) => !event.toLowerCase().includes('date') && !event.toLowerCase().includes('error')
    )
    if (!triggerRegisteredEvents || triggerRegisteredEvents.length === 0) {
      invalid = true
      errorMessage += '\n🎯 Trigger does not register any events'
    }
    if (triggerRegisteredEvents) {
      triggerRegisteredEvents = triggerRegisteredEvents.map((event) => event.replace(/new/g, '').trim())
    }
  }

  // 🪐🪐🪐 ENTITIES 🪐🪐🪐
  // ======================================================================================

  // 🪐 Gather entities data across all scenarios
  const scenarioEntitiesData = []
  for (const scenario of process.scenarios) {
    for (const stateUpdate of scenario.expectedStateUpdates) {
      // ...gather entity values
      const values: { fieldName: string; fieldType: string }[] = []
      for (const value of stateUpdate.values) {
        const typeIsUUID = typeof value.value === 'string' && (value.value.match(uuidRegex) || value.value === 'UUID')
        values.push({
          fieldName: util.toCamelCase(value.fieldName),
          fieldType: typeIsUUID ? 'UUID' : typeof value.value,
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
          .map((entity) => entity.fieldType)
          .sort()
        fieldTypes = [...new Set(fieldTypes)].sort().join('|')
        scenarioEntitiesMerged[matchedIndex].values = scenarioEntitiesMerged[matchedIndex].values.map((entity) => {
          if (entity.fieldName === entityFieldName) entity.fieldType = fieldTypes
          return entity
        })
      }
    }
  }
  // ...reduce duplicate fieldName in values within each entity
  const scenarioEntities = []
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

  // 🪐 Confirm ENTITY FILES exist for all scenario[i].expectedStateUpdates[i].entityName values
  const missingEntities = []
  for (const entity of scenarioEntities) {
    const entityFileName = util.toKebabCase(entity.entityName)
    if (!fs.existsSync(`${filePaths.entitiesDirectoryPath}/${entityFileName}.ts`)) missingEntities.push(entityFileName)
  }
  if (missingEntities.length > 0) {
    invalid = true
    const MissingEntitiesUnique = [...new Set(missingEntities)]
    for (const missingEntity of MissingEntitiesUnique) {
      errorMessage += `\n🪐 Entity file missing: '${filePaths.entitiesDirectoryPath}/${missingEntity}.ts'`
    }
  }

  // 🪐 Confirm each ENTITY file contains constructor FIELDS for all scenario[i].expectedStateUpdates[i].values[i].fieldName values
  for (const entity of scenarioEntities) {
    const entityFileName = util.toKebabCase(entity.entityName)
    const entityFilePath = `${filePaths.entitiesDirectoryPath}/${entityFileName}.ts`
    const entityFileExists = fs.existsSync(entityFilePath)
    if (entityFileExists) {
      const entityFile = fs.readFileSync(entityFilePath, 'utf8')
      const entityConstructorLines = entityFile.match(/(?<=public constructor\().*\n*(?=\) {})/gs)
      const entityConstructorFieldNames = entityConstructorLines[0].match(/(?<=public |readonly )(.*)(?=:)/g)
      const entityFields = entity.values.map((value) => value)
      const entityFieldNames = entity.values.map((value) => value.fieldName) as string[]
      const missingFields = entityFieldNames.filter((fieldName) => !entityConstructorFieldNames.includes(fieldName))
      if (missingFields && missingFields.length > 0) {
        invalid = true
        missingFields.forEach((missingField) => {
          errorMessage += `\n🪐 Entity '${util.toPascalCase(
            entity.entityName
          )}' does not have field: ${util.toCamelCase(missingField)} (${
            entityFields.find((field) => field.fieldName === missingField).type
          })`
        })
      }
    }
  }

  // 🪐 Confirm each ENTITY constructor FIELD TYPE matches the type inferred from scenario[i].expectedStateUpdates[i].values[i].value
  for (const entity of scenarioEntities) {
    // infer field types from assertions
    const assertedEntityFields = entity.values.map((item) => {
      return { fieldName: item.fieldName, type: item.fieldType }
    })
    // compare entity field types to types inferred from assertions
    const entityFileName = util.toKebabCase(entity.entityName)
    const entityFilePath = `${filePaths.entitiesDirectoryPath}/${entityFileName}.ts`
    const entityFileExists = fs.existsSync(entityFilePath)
    if (entityFileExists) {
      const entityFile = fs.readFileSync(entityFilePath, 'utf8')
      const entityFileConstructorLines = entityFile.match(/(?<=public constructor\().*\n*(?=\) {})/gs)
      const entityFileConstructorFields = [
        ...entityFileConstructorLines[0].matchAll(/(?<=public |readonly )([a-zA-Z]+)\?*:\s*(.+)/g),
      ]
      entityFileConstructorFields.forEach((field) => {
        const entityFieldName = field[1].trim()
        const entityFieldTypes = field[2]
          .replace(/,|\/\/.*/g, '')
          .split(' | ')
          .sort()
        const entityFieldTypesString = entityFieldTypes.map((type) => type.trim()).join('|')
        const mismatchedFieldTypes = assertedEntityFields.find(
          (item) => item.fieldName === entityFieldName && item.type !== entityFieldTypesString
        )
        if (mismatchedFieldTypes) {
          invalid = true
          errorMessage += `\n🪐 Entity '${entity.entityName}' field '${entityFieldName}' missing types (expecting ${
            assertedEntityFields.find((item) => item.fieldName === entityFieldName).type
          })`
        }
      })
    }
  }

  // 🔭🔭🔭 READ MODELS 🔭🔭🔭
  // ======================================================================================

  // 🔭 gather read models data across all scenarios
  const scenarioReadModelsData = []
  for (const scenario of process.scenarios) {
    for (const visibleUpdate of scenario.expectedVisibleUpdates) {
      // ...gather read model values
      const values: { fieldName: string; fieldType: string }[] = []
      for (const value of visibleUpdate.values) {
        const typeIsUUID = typeof value.value === 'string' && (value.value.match(uuidRegex) || value.value === 'UUID')
        values.push({
          fieldName: util.toCamelCase(value.fieldName),
          fieldType: typeIsUUID ? 'UUID' : typeof value.value,
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
          .map((readModel) => readModel.fieldType)
          .sort()
        fieldTypes = [...new Set(fieldTypes)].sort().join('|')
        scenarioReadModelsMerged[matchedIndex].values = scenarioReadModelsMerged[matchedIndex].values.map(
          (readModel) => {
            if (readModel.fieldName === readModelFieldName) readModel.fieldType = fieldTypes
            return readModel
          }
        )
      }
    }
  }
  // ...reduce duplicate fieldName in values within each read model
  const scenarioReadModels = []
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

  // 🔭 Confirm READ MODEL FILES exist for all scenario[i].expectedVisibleUpdates[i].readModelName values
  const missingReadModels = []
  for (const readModel of scenarioReadModels) {
    const readModelFileName = util.toKebabCase(readModel.readModelName)
    if (!fs.existsSync(`${filePaths.readModelsDirectoryPath}/${readModelFileName}.ts`))
      missingReadModels.push(readModelFileName)
  }
  if (missingReadModels.length > 0) {
    invalid = true
    const MissingReadModelsUnique = [...new Set(missingReadModels)]
    for (const missingReadModel of MissingReadModelsUnique) {
      errorMessage += `\n🔭 Read Model file missing: '${filePaths.readModelsDirectoryPath}/${missingReadModel}.ts'`
    }
  }

  // 🔭 Confirm each READ MODEL contains constructor FIELDS for all scenario[i].expectedVisibleUpdates[i].values[i].fieldName values
  for (const readModel of scenarioReadModels) {
    const readModelFileName = util.toKebabCase(readModel.readModelName)
    const readModelFilePath = `${filePaths.readModelsDirectoryPath}/${readModelFileName}.ts`
    const readModelFileExists = fs.existsSync(readModelFilePath)
    if (readModelFileExists) {
      const readModelFile = fs.readFileSync(readModelFilePath, 'utf8')
      const readModelConstructorLines = readModelFile.match(/(?<=public constructor\().*\n*(?=\) {})/gs)
      const readModelConstructorFieldNames = readModelConstructorLines[0].match(/(?<=public |readonly )(.*)(?=:)/g)
      const readModelFields = readModel.values.map((value) => value)
      const readModelFieldNames = readModel.values.map((value) => value.fieldName) as string[]
      const missingFields = readModelFieldNames.filter(
        (fieldName) => !readModelConstructorFieldNames?.includes(fieldName)
      )
      if (missingFields && missingFields.length > 0) {
        invalid = true
        missingFields.forEach((missingField) => {
          errorMessage += `\n🔭 Read Model '${util.toPascalCase(
            readModel.readModelName
          )}' does not have field: ${util.toCamelCase(missingField)} (${
            readModelFields.find((field) => field.fieldName === missingField).value
          })`
        })
      }
    }
  }

  // 🔭 Confirm each READ MODEL constructor FIELD TYPE matches the type inferred from scenario[i].expectedVisibleUpdates[i].values[i].value
  for (const readModel of scenarioReadModels) {
    // infer field types from assertions
    const assertedReadModelFields = readModel.values.map((item) => {
      return { fieldName: item.fieldName, type: item.fieldType }
    })
    // compare read model constructor field types to types inferred from assertions
    const readModelFileName = util.toKebabCase(readModel.readModelName)
    const readModelFilePath = `${filePaths.readModelsDirectoryPath}/${readModelFileName}.ts`
    const readModelFileExists = fs.existsSync(readModelFilePath)
    if (readModelFileExists) {
      const readModelFile = fs.readFileSync(readModelFilePath, 'utf8')
      const readModelConstructorLines = readModelFile.match(/(?<=public constructor\().*\n*(?=\) {})/gs)
      const readModelConstructorFields = [
        ...readModelConstructorLines[0].matchAll(/(?<=public |readonly )([a-zA-Z]+)\?*:\s*(.+)/g),
      ]
      readModelConstructorFields.forEach((field) => {
        const readModelFieldName = field[1].trim()
        const readModelFieldType = field[2]
          .replace(/,|\/\/.*/g, '')
          .split(' | ')
          .sort()
        const readModelFieldTypesString = readModelFieldType.map((type) => type.trim()).join('|')
        const mismatchedFieldTypes = assertedReadModelFields.find(
          (item) => item.fieldName === readModelFieldName && item.type !== readModelFieldTypesString
        )
        if (mismatchedFieldTypes) {
          invalid = true
          errorMessage += `\n🔭 Read Model '${
            readModel.readModelName
          }' field '${readModelFieldName}' missing types (expecting ${
            assertedReadModelFields.find((item) => item.fieldName === readModelFieldName).type
          })`
        }
      })
    }
  }

  // 🔭 Confirm each READ MODEL PROJECTS at least one of scenario[i].expectedStateUpdates[i].entityName
  const scenarioEntityNames = scenarioEntities.map((entity) => entity.entityName)
  for (const readModel of scenarioReadModels) {
    const readModelFileName = util.toKebabCase(readModel.readModelName)
    const readModelFilePath = `${filePaths.readModelsDirectoryPath}/${readModelFileName}.ts`
    const readModelFileExists = fs.existsSync(readModelFilePath)
    if (readModelFileExists) {
      const readModelFile = fs.readFileSync(readModelFilePath, 'utf8')
      const readModelProjectedEntityNames = readModelFile.match(/(?<=@Projects\()(.*)(?=,)/gm)
      if (!readModelProjectedEntityNames) {
        invalid = true
        errorMessage += `\n🔭 Read Model '${util.toPascalCase(readModel.readModelName)}' does not project any entities`
      }
      if (readModelProjectedEntityNames) {
        readModelProjectedEntityNames.forEach((projectedEntityName) => {
          if (!scenarioEntityNames.includes(projectedEntityName)) {
            invalid = true
            errorMessage += `\n🔭 Read Model '${util.toPascalCase(
              readModel.readModelName
            )}' does not project at least one of these entities: ${scenarioEntities.join(', ')}`
          }
        })
      }
    }
  }

  // 🔭 Confirm each read model has correct AUTHORIZATION
  for (const readModel of scenarioReadModels) {
    const readModelFileName = util.toKebabCase(readModel.readModelName)
    const readModelFilePath = `${filePaths.readModelsDirectoryPath}/${readModelFileName}.ts`
    const readModelFileExists = fs.existsSync(readModelFilePath)
    if (readModelFileExists) {
      const assertedReadModelRoles = scenarioReadModels.find(
        (item) => item.readModelName === readModel.readModelName
      )?.authorized
      const readModelFile = fs.readFileSync(`${filePaths.readModelsDirectoryPath}/${readModelFileName}.ts`, 'utf8')
      let readModelAuthorizationString = readModelFile.match(/authorize: (.*)/g)[0].replace(/authorize: /g, '')
      readModelAuthorizationString = readModelAuthorizationString.slice(0, -1) // remove trailing comma
      const readModelHasAuthorization =
        readModelAuthorizationString.startsWith("'all'") || readModelAuthorizationString.startsWith('[') ? true : false
      let readModelHasCorrectAuthorization: boolean
      if (readModelHasAuthorization) {
        if (readModelAuthorizationString.startsWith("'all'"))
          readModelHasCorrectAuthorization = assertedReadModelRoles.includes('all')
        if (!readModelAuthorizationString.startsWith("'all'") && assertedReadModelRoles?.length > 0) {
          let readModelFileRoles = readModelAuthorizationString.replace(/\[|\]|/g, '').split(',')
          readModelFileRoles = readModelFileRoles.map((role: string) => role.trim())
          readModelHasCorrectAuthorization = assertedReadModelRoles.every((role: string) =>
            readModelFileRoles.includes(role)
          )
        }
      }
      const expectedReadRoles = !Array.isArray(assertedReadModelRoles) ? "'all'" : assertedReadModelRoles.join(', ')
      // alert if read model missing any authorization definition
      if (!readModelHasAuthorization) {
        invalid = true
        errorMessage += `\n🔭 Read Model '${util.toPascalCase(
          readModel.readModelName
        )}' does not have authorization defined (expecting ${expectedReadRoles})`
      }
      // alert if read model missing correct authorization definition
      if (readModelHasAuthorization && !readModelHasCorrectAuthorization) {
        invalid = true
        errorMessage += `\n🔭 Read Model '${util.toPascalCase(
          readModel.readModelName
        )}' does not have correct authorization (expecting ${expectedReadRoles})`
      }
    }
  }

  // 🚀🚀🚀 EVENTS 🚀🚀🚀
  // ======================================================================================

  // 🚀 Confirm if EVENT FILES registered by trigger exist
  if (triggerRegisteredEvents) {
    triggerRegisteredEvents.forEach((eventName) => {
      const eventFileName = util.toKebabCase(eventName)
      if (!fs.existsSync(`${filePaths.eventsDirectoryPath}/${eventFileName}.ts`)) {
        invalid = true
        errorMessage += `\n🚀 Event file missing: '${filePaths.eventsDirectoryPath}/${eventFileName}.ts'`
      }
    })
  }

  // 🚀 Confirm each entity's REDUCED EVENTS include at least one of trigger's REGISTERED EVENTS
  for (const entity of scenarioEntities) {
    const entityReducedEvents = []
    const entityFileName = util.toKebabCase(entity.entityName)
    const entityFilePath = `${filePaths.entitiesDirectoryPath}/${entityFileName}.ts`
    const entityFileExists = fs.existsSync(entityFilePath)
    if (entityFileExists) {
      const entityFile = fs.readFileSync(entityFilePath, 'utf8')
      const eventsReduced = entityFile.match(/@Reduces\((\w+)/gs)
      if (!eventsReduced) {
        invalid = true
        errorMessage += `\n🪐 Entity '${util.toPascalCase(entity.entityName)}' does not reduce any events`
      }
      if (eventsReduced) {
        eventsReduced.forEach((eventReduced) => {
          const eventName = eventReduced.replace(/@Reduces\(|\)/g, '')
          if (!entityReducedEvents.includes(eventName)) entityReducedEvents.push(eventName)
        })
        // check if entity reduces any of trigger's registered events
        let matchingEventFound = false
        if (entityReducedEvents.length > 0) {
          entityReducedEvents.forEach((eventName) => {
            if (triggerRegisteredEvents.includes(eventName)) matchingEventFound = true
          })
          // if there are no directly overlapping events, investigate if any event handlers register an entity reduced event
          const eventHandlersMatchingEntity = []
          // ...gather information from event handlers (fileName, eventName, registeredEvents)
          const eventHandlers = []
          const eventHandlerFiles = fs.readdirSync(filePaths.eventHandlersDirectoryPath)
          eventHandlerFiles.forEach((eventHandlerFileName) => {
            const thisEventHandlerInfo = { fileName: eventHandlerFileName, initiatingEvent: '', registeredEvents: [] }
            const eventHandlerFilePath = `${filePaths.eventHandlersDirectoryPath}/${eventHandlerFileName}`
            const eventHandlerFile = fs.readFileSync(eventHandlerFilePath, 'utf8')
            const eventHandlerInitiatingEvent = eventHandlerFile
              .match(/@EventHandler\((\w+)/g)[0]
              .replace(/@EventHandler\(|/g, '')
            thisEventHandlerInfo.initiatingEvent = eventHandlerInitiatingEvent
            let eventHandlerRegisteredEvents = eventHandlerFile.match(/new (\w+)/gm)
            eventHandlerRegisteredEvents = eventHandlerRegisteredEvents.filter(
              (event) => !event.toLowerCase().includes('date') && !event.toLowerCase().includes('error')
            )
            if (eventHandlerRegisteredEvents) {
              eventHandlerRegisteredEvents.forEach((registeredEventName) => {
                if (!thisEventHandlerInfo.registeredEvents.includes(registeredEventName))
                  thisEventHandlerInfo.registeredEvents.push(registeredEventName)
              })
            }
          })
          // ...check which (if any) event handlers register an event reduced by the entity
          entityReducedEvents.forEach((eventName) => {
            for (const eventHandler of eventHandlers) {
              if (eventHandler.initiatingEvent === eventName) eventHandlersMatchingEntity.push(eventHandler)
            }
          })
          // if no event handlers register an event reduced by the entity, exit this check with error
          if (!matchingEventFound && eventHandlersMatchingEntity.length === 0) {
            invalid = true
            errorMessage += `\n🚀 Cannot find event path from trigger to entity '${entity.entityName}'`
          }
          // if there is a matching event handler, check if its initiating event matches an event registered by trigger file
          if (!matchingEventFound && eventHandlersMatchingEntity.length > 0) {
            eventHandlersMatchingEntity.forEach((eventHandler) => {
              eventHandler.registeredEvents.forEach((registeredEventName: string) => {
                if (triggerRegisteredEvents.includes(registeredEventName)) return
              })
            })
            // if no match found between entity : 1 event handler : trigger, exit this check with error
            // TODO: possibly refactor to check farther up event handler chain to trigger than 1 file
            invalid = true
            errorMessage += `\n🚀 Cannot find event path from trigger to entity '${entity.entityName}' (inspected event handlers 1 event deep)`
          }
        }
      }
    }
  }

  if (invalid && errorMessage.length > 0) {
    // alphabetize error messages
    errorMessage = errorMessage.split('\n').sort().join('\n')
    const errorMessageHeading = `\n\n'${process.name}' File Issues\n=====================================================================`
    // prepend heading to error messages
    errorMessage = `${errorMessageHeading}\n${errorMessage}`
  }

  // if any above INVALID, fail with errors
  if (invalid) return errorMessage

  // if all VALID
  return true
}
