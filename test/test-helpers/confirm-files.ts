import type { Assertions, AssertionValue } from './types'
import * as util from './helpers-utils'
import fs from 'fs'

// ======================================================================================

export const confirmFiles = async (
  assertions: Assertions,
  filePaths: Record<string, string>
): Promise<string | boolean> => {
  const processName = assertions.processName
  const path = filePaths
  let invalid = false
  let errorMessage = ''

  // Confirm assertions data present
  // -----------------------------------------------------------------------------------------------
  const expectedAssertionGroups = ['roles', 'allInputs', 'allEntities']
  if (
    Object.keys(assertions).length === 0 ||
    !expectedAssertionGroups.every((key) => Object.keys(assertions).includes(key))
  )
    return `\n\n'${processName}' File Issue\n=====================================================================\nAssertions data missing or incomplete`

  // 🔑🔑🔑 ROLES 🔑🔑🔑
  // ======================================================================================
  const writeRoles = assertions.roles.triggerWrite
  const allRoles = assertions.roles.all

  // 🔑 Confirm ROLES FILE exists, if needed
  if (allRoles.length > 0 && allRoles.length[0] !== 'all') {
    const rolesFilePath = path.rolesPath
    const rolesFileExists = fs.existsSync(rolesFilePath)
    if (!rolesFileExists) {
      invalid = true
      errorMessage += `\n🔑 Roles file missing: '${rolesFilePath}'`
    }

    if (rolesFileExists) {
      // 🔑 confirm roles.ts contains necessary ROLE DEFINITIONS
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
  // LATER: convert  similar work between trigger and preceding actions into reusable functions

  // ✨ Confirm TRIGGER FILE exists
  const triggerFileDirectory =
    assertions.trigger.type === 'ActorCommand' ? path.commandsDirectoryPath : path.scheduledCommandsDirectoryPath
  const triggerFileName = util.toKebabCase(assertions.trigger.commandName)
  const triggerFileExists = fs.existsSync(`${triggerFileDirectory}/${triggerFileName}.ts`)
  if (!triggerFileExists) {
    invalid = true
    errorMessage += `\n✨ Trigger file missing: '${triggerFileDirectory}/${triggerFileName}.ts'`
  }
  let triggerFile: string
  if (triggerFileExists) triggerFile = fs.readFileSync(`${triggerFileDirectory}/${triggerFileName}.ts`, 'utf8')

  // ✨ Confirm trigger has correct AUTHORIZATION
  if (triggerFile && assertions.trigger.type === 'ActorCommand') {
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
      for (const scenario of assertions.scenarios) {
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
          errorMessage += `\n✨ Trigger is missing input(s): ${missingInput.name} (${missingInput.type.join(', ')})`
        }
      }
      // alert if any inputs are mismatched
      if (incorrectTypeInputs && incorrectTypeInputs.length > 0) {
        invalid = true
        for (const incorrectTypeInput of incorrectTypeInputs) {
          errorMessage += `\n✨ Trigger missing type${incorrectTypeInput.type.length > 1 ? 's' : ''} for ${
            incorrectTypeInput.name
          } (${incorrectTypeInput.type.join(', ')})`
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
      (event) => !event.toLowerCase().startsWith('new date') && !event.toLowerCase().startsWith('new error')
    )
    if (!triggerRegisteredEvents || triggerRegisteredEvents.length === 0) {
      invalid = true
      errorMessage += `\n✨ Trigger '${util.toPascalCase(assertions.trigger.commandName)}' does not register any events`
    }
    if (triggerRegisteredEvents) {
      triggerRegisteredEvents = triggerRegisteredEvents.map((event) => event.replace(/new/g, '').trim())
    }
  }

  // ⏪⏪⏪ PRECEDING ACTIONS ⏪⏪⏪
  // ======================================================================================
  for (const actionSet of assertions.precedingActions) {
    for (const action of actionSet.actions) {
      //
      // ⏪ Confirm preceding action command file exists
      const paCommandFileName = util.toKebabCase(action.commandName)
      const paCommandFileExists = fs.existsSync(`${path.commandsDirectoryPath}/${paCommandFileName}.ts`)
      if (!paCommandFileExists) {
        invalid = true
        errorMessage += `\n⏪ Preceding action command file missing: '${path.commandsDirectoryPath}/${paCommandFileName}.ts'`
      }
      let paCommandFile: string
      if (paCommandFileExists)
        paCommandFile = fs.readFileSync(`${path.commandsDirectoryPath}/${paCommandFileName}.ts`, 'utf8')

      // ⏪ Confirm preceding action command has correct AUTHORIZATION
      if (paCommandFile) {
        // evaluate command file for asserted roles
        let paCommandAuthorizationString = paCommandFile.match(/authorize: (.*)/g)[0].replace(/authorize: /g, '')
        paCommandAuthorizationString = paCommandAuthorizationString.slice(0, -1) // remove trailing comma
        const paCommandHasAuthorization =
          paCommandAuthorizationString.startsWith("'all'") || paCommandAuthorizationString.startsWith('[')
            ? true
            : false
        let paCommandHasCorrectAuthorization: boolean
        if (paCommandHasAuthorization) {
          if (writeRoles.length === 0)
            paCommandHasCorrectAuthorization = paCommandAuthorizationString.startsWith("'all'")
          if (writeRoles.length > 0) {
            let paCommandFileRoles = paCommandAuthorizationString.replace(/\[|\]|'/g, '').split(',')
            paCommandFileRoles = paCommandFileRoles.map((role: string) => role.trim())
            paCommandHasCorrectAuthorization = writeRoles.every((role: string) => paCommandFileRoles.includes(role))
          }
        }
        const expectedWriteRoles = writeRoles.length === 0 ? "'all'" : writeRoles.join(', ')
        // alert if command missing any authorization definition
        if (!paCommandHasAuthorization) {
          invalid = true
          errorMessage += `\n⏪ Command '${util.toPascalCase(
            action.commandName
          )}' does not have authorization defined (expecting ${expectedWriteRoles})`
        }
        // alert if command missing correct authorization definition
        if (paCommandHasAuthorization && !paCommandHasCorrectAuthorization) {
          invalid = true
          errorMessage += `\n⏪ Command '${util.toPascalCase(
            action.commandName
          )}' does not have correct authorization (expecting ${expectedWriteRoles})`
        }
      }

      // ⏪ Confirm that PA command INPUTS and INPUT TYPES match preceding action assertions
      const paInputs = action.inputs
      const commandInputs = []
      if (paCommandFile) {
        // gather command inputs
        const commandInputsArray = [...paCommandFile.matchAll(/readonly ([a-zA-Z?]+):\s*(.+)/g)]
        commandInputsArray.forEach((input) => {
          let inputTypes = input[2].replace(/,|\/\/.*/g, '').split(' | ')
          inputTypes = inputTypes.map((type) => type.trim())
          commandInputs.push({
            name: input[1].replace(/\?/g, ''),
            type: inputTypes,
            required: input[1].includes('?') ? false : true,
          })
        })
        // alert if PA command has no inputs defined
        if (!commandInputs || commandInputs.length === 0) {
          const expectedInputNames = paInputs.map((input) => input.name).join(', ')
          invalid = true
          errorMessage += `\n⏪ Command '${util.toPascalCase(
            action.commandName
          )}' does not have any inputs defined (expecting ${expectedInputNames})`
        }

        if (commandInputs && commandInputs.length > 0) {
          // determine which preceding action asserted inputs are missing from PA command inputs
          const missingInputs = []
          for (const paInput of paInputs) {
            const commandInput = commandInputs.find((input) => input.name === paInput.name)
            if (!commandInput) {
              missingInputs.push({
                name: paInput.name,
                types: paInput.types,
              })
            }
          }
          // determine if PA command inputs have different (or incomplete) types from scenario inputs
          const incorrectTypeInputs = []
          for (const commandInput of commandInputs) {
            const matchingPaInputs = paInputs.filter((input) => input.name === commandInput.name)
            for (const paInput of matchingPaInputs) {
              for (const inputType of paInput.types) {
                if (!commandInput.type.includes(inputType)) {
                  incorrectTypeInputs.forEach((input) => {
                    if (input.name === paInput.name) input.type.push(inputType)
                  })
                  if (!incorrectTypeInputs.some((input) => input.name === paInput.name))
                    incorrectTypeInputs.push({
                      name: paInput.name,
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
              errorMessage += `\n⏪ Command '${util.toPascalCase(action.commandName)}' is missing input(s): ${
                missingInput.name
              } (${missingInput.type.join(', ')})`
            }
          }
          // alert if any inputs are mismatched
          if (incorrectTypeInputs && incorrectTypeInputs.length > 0) {
            invalid = true
            for (const incorrectTypeInput of incorrectTypeInputs) {
              errorMessage += `\n⏪ Command '${util.toPascalCase(action.commandName)}' missing type${
                incorrectTypeInput.type.length > 1 ? 's' : ''
              } for ${incorrectTypeInput.name} (${incorrectTypeInput.type.join(', ')})`
            }
          }
        }
      }

      // ⏪ Confirm preceding action command REGISTERS at least one event
      let commandRegisteredEvents: string[] = []
      if (paCommandFile) {
        commandRegisteredEvents = paCommandFile.match(/(?<!\/\/.*)new (\w+)/gm) // a little brittle, but works for now
        commandRegisteredEvents = commandRegisteredEvents?.filter(
          (event) => !event.toLowerCase().startsWith('new date') && !event.toLowerCase().startsWith('new error')
        )
        if (!commandRegisteredEvents || commandRegisteredEvents.length === 0) {
          invalid = true
          errorMessage += `\n⏪ Command '${util.toPascalCase(action.commandName)}' does not register any events`
        }
        if (commandRegisteredEvents) {
          commandRegisteredEvents = commandRegisteredEvents.map((event) => event.replace(/new/g, '').trim())
        }
      }

      // ⏪ Confirm if EVENT FILES registered by trigger exist
      if (commandRegisteredEvents) {
        commandRegisteredEvents.forEach((eventName) => {
          const eventFileName = util.toKebabCase(eventName)
          if (!fs.existsSync(`${path.eventsDirectoryPath}/${eventFileName}.ts`)) {
            invalid = true
            errorMessage += `\n🚀 Preceding action event file missing: '${path.eventsDirectoryPath}/${eventFileName}.ts'`
          }
        })
      }
    }
  }

  // 👽👽👽 ENTITIES 👽👽👽
  // ======================================================================================
  // LATER: convert similar work between entities and read models into reusable functions

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
      const entityConstructorFieldNames = entityConstructorLines[0].match(/(?<=public |readonly )(\w*)/g)
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
    const allAssertedEntityFields: AssertionValue[] = entity.fields.map((item) => {
      return { fieldName: item.fieldName, fieldTypes: item.fieldTypes }
    })
    // remove asserted fieldTypes that cannot be confirmed from files (asserted object/array presumed to = custom type)
    const relevantAssertedEntityFields = allAssertedEntityFields.filter(
      (type) => !type.fieldTypes.includes('object') && !type.fieldTypes.includes('array')
    )
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
        const entityFieldTypesUntrimmed = field[2]
          .replace(/(?:=.*)|,|\/\/.*/g, '')
          .split(' | ')
          .sort()
        const entityFieldTypes = entityFieldTypesUntrimmed.map((type) => type.trim())
        const matchingAssertedField = relevantAssertedEntityFields.find((item) => item.fieldName === entityFieldName)
        if (matchingAssertedField) {
          const assertedFieldTypes = matchingAssertedField.fieldTypes
          const missingFieldTypes = assertedFieldTypes.filter((type) => !entityFieldTypes.includes(type))
          if (missingFieldTypes && missingFieldTypes.length > 0) {
            invalid = true
            errorMessage += `\n👽 Entity '${
              entity.entityName
            }' field '${entityFieldName}' missing types: ${missingFieldTypes.join(', ')}`
          }
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
      const readModelConstructorFieldNames = readModelConstructorLines[0].match(/(?<=public |readonly )(\w*)/g)
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
    const allAssertedReadModelFields = readModel.fields.map((item) => {
      return { fieldName: item.fieldName, fieldTypes: item.fieldTypes }
    })
    // remove asserted fieldTypes that cannot be confirmed from files (asserted object/array presumed to = custom type)
    const relevantAssertedReadModelFields = allAssertedReadModelFields.filter(
      (type) => !type.fieldTypes.includes('object') && !type.fieldTypes.includes('array')
    )
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
        const readModelFieldTypeUntrimmed = field[2]
          .replace(/(?:=.*)|,|\/\/.*/g, '')
          .split(' | ')
          .sort()
        const readModelFieldTypes = readModelFieldTypeUntrimmed.map((type) => type.trim())
        const matchingAssertedField = relevantAssertedReadModelFields.find(
          (item) => item.fieldName === readModelFieldName
        )
        if (matchingAssertedField) {
          const assertedFieldTypes = matchingAssertedField.fieldTypes
          const missingFieldTypes = assertedFieldTypes.filter((type) => !readModelFieldTypes.includes(type))
          if (missingFieldTypes && missingFieldTypes.length > 0) {
            invalid = true
            errorMessage += `\n🔭 Read Model '${
              readModel.readModelName
            }' field '${readModelFieldName}' missing types: ${missingFieldTypes.join(', ')}`
          }
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
            // LATER: possibly refactor to check farther up event handler chain to trigger than 1 file
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
    const errorMessageHeading = `\n\n'${processName}' File Issues\n=====================================================================`
    // prepend heading to error messages
    errorMessage = `${errorMessageHeading}\n${errorMessage}`
  }

  // if any above INVALID, fail with errors
  if (invalid) return errorMessage

  // if all VALID
  return true
}
