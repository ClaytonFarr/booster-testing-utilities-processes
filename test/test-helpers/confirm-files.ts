import type { Process, Assertions, AssertionValue } from './types'
import * as util from './utils'
import fs from 'fs'

// ======================================================================================

export const confirmProcessFiles = async (
  process: Process,
  assertions: Assertions,
  filePaths?: Record<string, string>
): Promise<string | boolean> => {
  const path = {
    commandsDirectoryPath: filePaths?.commandsDirectoryPath ?? 'src/commands',
    scheduledCommandsDirectoryPath: filePaths?.scheduledCommandsDirectoryPath ?? 'src/scheduled-commands',
    eventHandlersDirectoryPath: filePaths?.eventHandlersDirectoryPath ?? 'src/event-handlers',
    eventsDirectoryPath: filePaths?.eventsDirectoryPath ?? 'src/events',
    entitiesDirectoryPath: filePaths?.entitiesDirectoryPath ?? 'src/entities',
    readModelsDirectoryPath: filePaths?.readModelsDirectoryPath ?? 'src/read-models',
    rolesPath: filePaths?.rolesPath ?? 'src/roles.ts',
  }
  let invalid = false
  let errorMessage = ''

  // Confirm assertions data present
  // -----------------------------------------------------------------------------------------------
  const expectedAssertionGroups = ['roles', 'allInputs', 'allEntities']
  if (
    Object.keys(assertions).length === 0 ||
    !expectedAssertionGroups.every((key) => Object.keys(assertions).includes(key))
  )
    return `\n\n'${process.name}' File Issue\n=====================================================================\nAssertions data missing or incomplete`

  // 🔑🔑🔑 ROLES 🔑🔑🔑
  // ======================================================================================
  const writeRoles = assertions.roles.write
  const allRoles = assertions.roles.all

  // 🔑 Confirm ROLES FILE exists, if needed
  if (allRoles.length > 0 && allRoles.length[0] !== 'all') {
    const rolesFilePath = path.rolesPath
    const rolesFileExists = fs.existsSync(rolesFilePath)
    if (!rolesFileExists) {
      invalid = true
      errorMessage += `\n🔑 Roles file missing: '${rolesFilePath}'`
    }

    // 🔑 confirm roles.ts contains necessary ROLE DEFINITIONS
    if (rolesFileExists) {
      if (allRoles.length > 0 && !allRoles.includes('all')) {
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

  // ✨✨✨ TRIGGER ✨✨✨
  // ======================================================================================

  // ✨ Confirm TRIGGER FILE exists
  const triggerFileDirectory =
    process.trigger.type === 'ActorCommand' ? path.commandsDirectoryPath : path.scheduledCommandsDirectoryPath
  const triggerFileName = util.toKebabCase(process.trigger.commandName)
  const triggerFileExists = fs.existsSync(`${triggerFileDirectory}/${triggerFileName}.ts`)
  if (!triggerFileExists) {
    invalid = true
    errorMessage += `\n✨ Trigger file missing: '${triggerFileDirectory}/${triggerFileName}.ts'`
  }
  let triggerFile: string
  if (triggerFileExists) triggerFile = fs.readFileSync(`${triggerFileDirectory}/${triggerFileName}.ts`, 'utf8')

  // ✨ Confirm trigger has correct AUTHORIZATION
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
        let triggerFileRoles = triggerAuthorizationString.replace(/\[|\]|'/g, '').split(',')
        triggerFileRoles = triggerFileRoles.map((role: string) => role.trim())
        triggerHasCorrectAuthorization = writeRoles.every((role: string) => triggerFileRoles.includes(role))
      }
    }
    const expectedWriteRoles = writeRoles.length === 0 ? "'all'" : writeRoles.join(', ')
    // alert if trigger missing any authorization definition
    if (!triggerHasAuthorization) {
      invalid = true
      errorMessage += `\n✨ Trigger does not have authorization defined (expecting ${expectedWriteRoles})`
    }
    // alert if trigger missing correct authorization definition
    if (triggerHasAuthorization && !triggerHasCorrectAuthorization) {
      invalid = true
      errorMessage += `\n✨ Trigger does not have correct authorization (expecting ${expectedWriteRoles})`
    }
  }

  // ✨ Confirm that trigger INPUTS and INPUT TYPES match scenarios
  const scenarioInputs = assertions.allInputs
  const triggerInputs = []
  if (triggerFile) {
    // gather trigger inputs
    const triggerInputsArray = [...triggerFile.matchAll(/readonly ([a-zA-Z?]+):\s*(.+)/g)]
    triggerInputsArray.forEach((input) => {
      let inputTypes = input[2].replace(/,|\/\/.*/g, '').split(' | ')
      inputTypes = inputTypes.map((type) => type.trim())
      triggerInputs.push({
        name: input[1].replace(/\?/g, ''),
        type: inputTypes,
        required: input[1].includes('?') ? false : true,
      })
    })
    // alert if trigger has no inputs defined
    if (!triggerInputs || triggerInputs.length === 0) {
      let expectedInputNames = []
      for (const scenario of process.scenarios) {
        if (scenario.inputs)
          for (const [key] of Object.entries(scenario.inputs)) expectedInputNames.push(util.toCamelCase(key))
      }
      expectedInputNames = [...new Set(expectedInputNames)].sort()
      invalid = true
      errorMessage += `\n✨ Trigger does not have any inputs defined (expecting ${expectedInputNames.join(', ')})`
    }

    if (triggerInputs && triggerInputs.length > 0) {
      // determine which scenario inputs are missing from trigger inputs
      const missingInputs = []
      for (const scenarioInput of scenarioInputs) {
        const allScenarioMissingInputs = []
        if (!triggerInputs.some((triggerInput) => triggerInput.name === scenarioInput.name)) {
          allScenarioMissingInputs.push({
            name: scenarioInput.name,
            types: scenarioInput.types,
          })
        } // ...remove duplicates
        for (const scenarioInput of allScenarioMissingInputs) {
          if (!missingInputs.some((missingInput) => missingInput.name === scenarioInput.name))
            missingInputs.push(scenarioInput)
        }
      }
      // determine if trigger inputs have different (or incomplete) types from scenario inputs
      const incorrectTypeInputs = []
      for (const triggerInput of triggerInputs) {
        const matchingScenarioInputs = scenarioInputs.filter((input) => input.name === triggerInput.name)
        for (const scenarioInput of matchingScenarioInputs) {
          for (const inputType of scenarioInput.types) {
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
      // determine if trigger inputs have different required status from scenario inputs
      const incorrectRequiredInputs = []
      for (const triggerInput of triggerInputs) {
        const matchingScenarioInputs = scenarioInputs.filter((input) => input.name === triggerInput.name)
        for (const scenarioInput of matchingScenarioInputs) {
          if (scenarioInput.required !== triggerInput.required) {
            incorrectRequiredInputs.push({
              name: scenarioInput.name,
              expectedRequire: scenarioInput.required,
              triggerRequire: triggerInput.required,
            })
          }
        }
      }
      // alert if any inputs are missing
      if (missingInputs && missingInputs.length > 0) {
        invalid = true
        for (const missingInput of missingInputs) {
          errorMessage += `\n✨ Trigger is missing input: ${missingInput.name} (${missingInput.type.join('|')})`
        }
      }
      // alert if any inputs are mismatched
      if (incorrectTypeInputs && incorrectTypeInputs.length > 0) {
        invalid = true
        for (const incorrectTypeInput of incorrectTypeInputs) {
          errorMessage += `\n✨ Trigger missing type${incorrectTypeInput.type.length > 1 ? 's' : ''} for ${
            incorrectTypeInput.name
          } (missing ${incorrectTypeInput.type.join('|')})`
        }
      }
      // alert if any inputs required status is mismatched
      if (incorrectRequiredInputs && incorrectRequiredInputs.length > 0) {
        for (const incorrectRequiredInput of incorrectRequiredInputs) {
          if (incorrectRequiredInput.name !== 'tid') {
            invalid = true
            errorMessage += `\n✨ Trigger input '${incorrectRequiredInput.name}' should be ${
              incorrectRequiredInput.expectedRequire ? 'required' : 'optional'
            } (is ${incorrectRequiredInput.triggerRequire ? 'required' : 'optional'})`
          }
        }
      }
      // LATER: possibly alert when trigger has inputs present that are not included in any scenario
    }
  }

  // ✨ Confirm triggers REGISTERS at least one event
  let triggerRegisteredEvents: string[] = []
  if (triggerFile) {
    triggerRegisteredEvents = triggerFile.match(/(?<!\/\/.*)new (\w+)/gm) // a little brittle, but works for now
    triggerRegisteredEvents = triggerRegisteredEvents?.filter(
      (event) => !event.toLowerCase().includes('date') && !event.toLowerCase().includes('error')
    )
    if (!triggerRegisteredEvents || triggerRegisteredEvents.length === 0) {
      invalid = true
      errorMessage += '\n✨ Trigger does not register any events'
    }
    if (triggerRegisteredEvents) {
      triggerRegisteredEvents = triggerRegisteredEvents.map((event) => event.replace(/new/g, '').trim())
    }
  }

  // 👽👽👽 ENTITIES 👽👽👽
  // ======================================================================================
  const scenarioEntities = assertions.allEntities

  // 👽 Confirm ENTITY FILES exist for all scenario[i].expectedStateUpdates[i].entityName values
  const missingEntities = []
  for (const entity of scenarioEntities) {
    const entityFileName = util.toKebabCase(entity.entityName)
    if (!fs.existsSync(`${path.entitiesDirectoryPath}/${entityFileName}.ts`)) missingEntities.push(entityFileName)
  }
  if (missingEntities.length > 0) {
    invalid = true
    const MissingEntitiesUnique = [...new Set(missingEntities)]
    for (const missingEntity of MissingEntitiesUnique) {
      errorMessage += `\n👽 Entity file missing: '${path.entitiesDirectoryPath}/${missingEntity}.ts'`
    }
  }

  // 👽 Confirm each ENTITY file contains constructor FIELDS for all scenario[i].expectedStateUpdates[i].values fieldName values
  for (const entity of scenarioEntities) {
    const entityFileName = util.toKebabCase(entity.entityName)
    const entityFilePath = `${path.entitiesDirectoryPath}/${entityFileName}.ts`
    const entityFileExists = fs.existsSync(entityFilePath)
    if (entityFileExists) {
      const entityFile = fs.readFileSync(entityFilePath, 'utf8')
      const entityConstructorLines = entityFile.match(/(?<=public constructor\().*\n*(?=\) {})/gs)
      const entityConstructorFieldNames = entityConstructorLines[0].match(/(?<=public |readonly )(.*)(?=:)/g)
      const entityFields = entity.fields.map((field) => field)
      const entityFieldNames = entity.fields.map((field) => field.fieldName) as string[]
      const missingFields = entityFieldNames.filter((fieldName) => !entityConstructorFieldNames.includes(fieldName))
      if (missingFields && missingFields.length > 0) {
        invalid = true
        missingFields.forEach((missingField) => {
          errorMessage += `\n👽 Entity '${util.toPascalCase(
            entity.entityName
          )}' does not have field: ${util.toCamelCase(missingField)} (${
            entityFields.find((field) => field.fieldName === missingField).fieldTypes
          })`
        })
      }
    }
  }

  // 👽 Confirm each ENTITY constructor FIELD TYPE matches the type inferred from scenario[i].expectedStateUpdates[i].values[i].value
  for (const entity of scenarioEntities) {
    // infer field types from assertions
    const assertedEntityFields: AssertionValue[] = entity.fields.map((item) => {
      return { fieldName: item.fieldName, fieldTypes: item.fieldTypes }
    })
    // compare entity field types to types inferred from assertions
    const entityFileName = util.toKebabCase(entity.entityName)
    const entityFilePath = `${path.entitiesDirectoryPath}/${entityFileName}.ts`
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
          (item) => item.fieldName === entityFieldName && !item.fieldTypes.includes(entityFieldTypesString)
        )
        if (mismatchedFieldTypes) {
          invalid = true
          errorMessage += `\n👽 Entity '${entity.entityName}' field '${entityFieldName}' missing types (expecting ${
            assertedEntityFields.find((item) => item.fieldName === entityFieldName).fieldTypes
          })`
        }
      })
    }
  }

  // 🔭🔭🔭 READ MODELS 🔭🔭🔭
  // ======================================================================================
  const scenarioReadModels = assertions.allReadModels

  // 🔭 Confirm READ MODEL FILES exist for all scenario[i].expectedVisibleUpdates[i].readModelName values
  const missingReadModels = []
  for (const readModel of scenarioReadModels) {
    const readModelFileName = util.toKebabCase(readModel.readModelName)
    if (!fs.existsSync(`${path.readModelsDirectoryPath}/${readModelFileName}.ts`))
      missingReadModels.push(readModelFileName)
  }
  if (missingReadModels.length > 0) {
    invalid = true
    const MissingReadModelsUnique = [...new Set(missingReadModels)]
    for (const missingReadModel of MissingReadModelsUnique) {
      errorMessage += `\n🔭 Read Model file missing: '${path.readModelsDirectoryPath}/${missingReadModel}.ts'`
    }
  }

  // 🔭 Confirm each READ MODEL contains constructor FIELDS for all scenario[i].expectedVisibleUpdates[i].values[i].fieldName values
  for (const readModel of scenarioReadModels) {
    const readModelFileName = util.toKebabCase(readModel.readModelName)
    const readModelFilePath = `${path.readModelsDirectoryPath}/${readModelFileName}.ts`
    const readModelFileExists = fs.existsSync(readModelFilePath)
    if (readModelFileExists) {
      const readModelFile = fs.readFileSync(readModelFilePath, 'utf8')
      const readModelConstructorLines = readModelFile.match(/(?<=public constructor\().*\n*(?=\) {})/gs)
      const readModelConstructorFieldNames = readModelConstructorLines[0].match(/(?<=public |readonly )(.*)(?=:)/g)
      const readModelFields = readModel.fields.map((value) => value)
      const readModelFieldNames = readModel.fields.map((value) => value.fieldName) as string[]
      const missingFields = readModelFieldNames.filter(
        (fieldName) => !readModelConstructorFieldNames?.includes(fieldName)
      )
      if (missingFields && missingFields.length > 0) {
        invalid = true
        missingFields.forEach((missingField) => {
          errorMessage += `\n🔭 Read Model '${util.toPascalCase(
            readModel.readModelName
          )}' does not have field: ${util.toCamelCase(missingField)} (${
            readModelFields.find((field) => field.fieldName === missingField).fieldTypes
          })`
        })
      }
    }
  }

  // 🔭 Confirm each READ MODEL constructor FIELD TYPE matches the type inferred from scenario[i].expectedVisibleUpdates[i].values[i].value
  for (const readModel of scenarioReadModels) {
    // infer field types from assertions
    const assertedReadModelFields = readModel.fields.map((item) => {
      return { fieldName: item.fieldName, fieldTypes: item.fieldTypes }
    })
    // compare read model constructor field types to types inferred from assertions
    const readModelFileName = util.toKebabCase(readModel.readModelName)
    const readModelFilePath = `${path.readModelsDirectoryPath}/${readModelFileName}.ts`
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
          (item) => item.fieldName === readModelFieldName && !item.fieldTypes.includes(readModelFieldTypesString)
        )
        if (mismatchedFieldTypes) {
          invalid = true
          errorMessage += `\n🔭 Read Model '${
            readModel.readModelName
          }' field '${readModelFieldName}' missing types (expecting ${
            assertedReadModelFields.find((item) => item.fieldName === readModelFieldName).fieldTypes
          })`
        }
      })
    }
  }

  // 🔭 Confirm each READ MODEL PROJECTS at least one of scenario[i].expectedStateUpdates[i].entityName
  const scenarioEntityNames = scenarioEntities.map((entity) => entity.entityName)
  for (const readModel of scenarioReadModels) {
    const readModelFileName = util.toKebabCase(readModel.readModelName)
    const readModelFilePath = `${path.readModelsDirectoryPath}/${readModelFileName}.ts`
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
    const readModelFilePath = `${path.readModelsDirectoryPath}/${readModelFileName}.ts`
    const readModelFileExists = fs.existsSync(readModelFilePath)
    if (readModelFileExists) {
      const assertedReadModelRoles = scenarioReadModels.find(
        (item) => item.readModelName === readModel.readModelName
      )?.authorized
      const readModelFile = fs.readFileSync(`${path.readModelsDirectoryPath}/${readModelFileName}.ts`, 'utf8')
      let readModelAuthorizationString = readModelFile.match(/authorize: (.*)/g)[0].replace(/authorize: /g, '')
      readModelAuthorizationString = readModelAuthorizationString.slice(0, -1) // remove trailing comma
      const readModelHasAuthorization =
        readModelAuthorizationString.startsWith("'all'") || readModelAuthorizationString.startsWith('[') ? true : false
      let readModelHasCorrectAuthorization: boolean
      if (readModelHasAuthorization) {
        if (readModelAuthorizationString.startsWith("'all'"))
          readModelHasCorrectAuthorization = assertedReadModelRoles.includes('all')
        if (!readModelAuthorizationString.startsWith("'all'") && assertedReadModelRoles !== 'all') {
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
      if (!fs.existsSync(`${path.eventsDirectoryPath}/${eventFileName}.ts`)) {
        invalid = true
        errorMessage += `\n🚀 Event file missing: '${path.eventsDirectoryPath}/${eventFileName}.ts'`
      }
    })
  }

  // 🚀 Confirm each entity's REDUCED EVENTS include at least one of trigger's REGISTERED EVENTS
  for (const entity of scenarioEntities) {
    const entityReducedEvents = []
    const entityFileName = util.toKebabCase(entity.entityName)
    const entityFilePath = `${path.entitiesDirectoryPath}/${entityFileName}.ts`
    const entityFileExists = fs.existsSync(entityFilePath)
    if (entityFileExists) {
      const entityFile = fs.readFileSync(entityFilePath, 'utf8')
      const eventsReduced = entityFile.match(/@Reduces\((\w+)/gs)
      if (!eventsReduced) {
        invalid = true
        errorMessage += `\n👽 Entity '${util.toPascalCase(entity.entityName)}' does not reduce any events`
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
            if (triggerRegisteredEvents?.includes(eventName)) matchingEventFound = true
          })
          // if there are no directly overlapping events, investigate if any event handlers register an entity reduced event
          const eventHandlersMatchingEntity = []
          // ...gather information from event handlers (fileName, eventName, registeredEvents)
          const eventHandlers = []
          if (fs.existsSync(path.eventHandlersDirectoryPath)) {
            const eventHandlerFiles = fs.readdirSync(path.eventHandlersDirectoryPath)
            eventHandlerFiles.forEach((eventHandlerFileName) => {
              const thisEventHandlerInfo = { fileName: eventHandlerFileName, initiatingEvent: '', registeredEvents: [] }
              const eventHandlerFilePath = `${path.eventHandlersDirectoryPath}/${eventHandlerFileName}`
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
          }
          // ...check which (if any) event handlers register an event reduced by the entity
          entityReducedEvents.forEach((eventName) => {
            for (const eventHandler of eventHandlers) {
              if (eventHandler.initiatingEvent === eventName) eventHandlersMatchingEntity.push(eventHandler)
            }
          })
          // if no event handlers register an event reduced by the entity, exit this check with error
          if (triggerFile && !matchingEventFound && eventHandlersMatchingEntity.length === 0) {
            invalid = true
            errorMessage += `\n🚀 Cannot find event path from trigger to entity '${entity.entityName}'`
          }
          // if there is a matching event handler, check if its initiating event matches an event registered by trigger file
          if (triggerFile && !matchingEventFound && eventHandlersMatchingEntity.length > 0) {
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
