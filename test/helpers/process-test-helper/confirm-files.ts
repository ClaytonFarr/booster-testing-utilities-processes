import type { Assertions, AssertionValue, LocalBoosterFilePaths } from './types'
import { addMessage as msg, fileIssues as is } from './issue-messages'
import * as util from './helpers-utils'
import * as log from './reporter'
import fs from 'fs'

const confirmFilesLogHeader = (): void => log.issueGroupHeader(is.fileIssuesHeader)

export const confirmFiles = (assertions: Assertions, filePaths: LocalBoosterFilePaths): boolean | string[] => {
  const path = filePaths
  let invalid = false
  const issues = []

  // Confirm assertions data present
  // -----------------------------------------------------------------------------------------------
  const expectedAssertionGroups = ['trigger', 'scenarios', 'roles', 'allScenarioInputs', 'allEntities']
  if (
    Object.keys(assertions).length === 0 ||
    !expectedAssertionGroups.every((key) => Object.keys(assertions).includes(key))
  ) {
    // if data missing skip rest of tests and return error here
    confirmFilesLogHeader()
    log.issueNote(is.assertionsDataMissing)
    return false
  }

  // 🔑🔑🔑 ROLES 🔑🔑🔑
  // ======================================================================================
  const writeRoles = assertions.roles.triggerWrite
  const allRoles = assertions.roles.all

  // 🔑 Confirm ROLES FILE exists, if needed
  if (allRoles.length > 0 && allRoles.length[0] !== 'all') {
    const rolesFilePath = path.rolesPath
    const rolesFileExists = fs.existsSync(rolesFilePath)
    if (!rolesFileExists) {
      issues.push(msg(is.rolesFileMissing, [rolesFilePath]))
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
          issues.push(msg(is.rolesMissing, [missingRolesUnique.join(', ')]))
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
  const triggerFilePath = `${triggerFileDirectory}/${triggerFileName}.ts`
  const triggerFileExists = fs.existsSync(triggerFilePath)
  if (!triggerFileExists) {
    issues.push(msg(is.triggerFileMissing, [triggerFilePath]))
  }
  let triggerFile: string
  if (triggerFileExists) triggerFile = fs.readFileSync(triggerFilePath, 'utf8')

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
      issues.push(msg(is.triggerAuthMissing, [expectedWriteRoles]))
    }
    // alert if trigger missing correct authorization definition
    if (triggerHasAuthorization && !triggerHasCorrectAuthorization) {
      issues.push(msg(is.triggerAuthIncorrect, [expectedWriteRoles]))
    }
  }

  // ✨ Confirm that trigger INPUTS and INPUT TYPES match scenarios
  const scenarioInputs = assertions.allScenarioInputs
  const triggerInputs = []
  if (triggerFile) {
    // gather trigger inputs
    const triggerInputsArray = [...triggerFile.matchAll(/readonly ([a-zA-Z?]+):\s*(.+)/g)]
    triggerInputsArray.forEach((input) => {
      let inputTypes = input[2].replace(/,|\/\/.*/g, '').split(' | ')
      inputTypes = inputTypes.map((type) => type.trim())
      triggerInputs.push({
        name: input[1].replace(/\?/g, ''),
        types: inputTypes,
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
      issues.push(msg(is.triggerInputsMissing, [expectedInputNames.join(', ')]))
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
            if (!triggerInput.types.includes(inputType)) {
              incorrectTypeInputs.forEach((input) => {
                if (input.name === scenarioInput.name) input.types.push(inputType)
              })
              if (!incorrectTypeInputs.some((input) => input.name === scenarioInput.name))
                incorrectTypeInputs.push({
                  name: scenarioInput.name,
                  types: [inputType],
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
        for (const missingInput of missingInputs) {
          issues.push(msg(is.triggerInputMissing, [missingInput.name, missingInput.types.join(', ')]))
        }
      }
      // alert if any inputs are mismatched
      if (incorrectTypeInputs && incorrectTypeInputs.length > 0) {
        for (const incorrectTypeInput of incorrectTypeInputs) {
          issues.push(msg(is.triggerInputMissingTypes, [incorrectTypeInput.name, incorrectTypeInput.types.join(', ')]))
        }
      }
      // alert if any inputs required status is mismatched
      if (incorrectRequiredInputs && incorrectRequiredInputs.length > 0) {
        for (const incorrectRequiredInput of incorrectRequiredInputs) {
          if (incorrectRequiredInput.name !== 'tid') {
            const expectedRequire = incorrectRequiredInput.expectedRequire ? 'required' : 'optional'
            const triggerFileRequire = incorrectRequiredInput.triggerRequire ? 'required' : 'optional'
            issues.push(msg(is.triggerInputRequireIncorrect, [expectedRequire, triggerFileRequire]))
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
      issues.push(msg(is.triggerCommandNoEvents, [util.toPascalCase(assertions.trigger.commandName)]))
    }
    if (triggerRegisteredEvents) {
      triggerRegisteredEvents = triggerRegisteredEvents.map((event) => event.replace(/new/g, '').trim())
    }
  }

  // ⏪⏪⏪ PRECEDING ACTIONS ⏪⏪⏪
  // ======================================================================================
  for (const actionSet of assertions.precedingActions) {
    for (const action of actionSet.actions) {
      const paCommandNameFormatted = util.toPascalCase(action.commandName)
      //
      // ⏪ Confirm preceding action command file exists
      const paCommandFileName = util.toKebabCase(action.commandName)
      const paCommandFilePath = `${path.commandsDirectoryPath}/${paCommandFileName}.ts`
      const paCommandFileExists = fs.existsSync(paCommandFilePath)
      if (!paCommandFileExists) {
        issues.push(msg(is.paCommandFileMissing, [paCommandFilePath]))
      }
      let paCommandFile: string
      if (paCommandFileExists) paCommandFile = fs.readFileSync(paCommandFilePath, 'utf8')

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
          issues.push(msg(is.paCommandAuthMissing, [paCommandNameFormatted, expectedWriteRoles]))
        }
        // alert if command missing correct authorization definition
        if (paCommandHasAuthorization && !paCommandHasCorrectAuthorization) {
          issues.push(msg(is.paCommandAuthIncorrect, [paCommandNameFormatted, expectedWriteRoles]))
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
            types: inputTypes,
            required: input[1].includes('?') ? false : true,
          })
        })
        // alert if PA command has no inputs defined
        if (!commandInputs || commandInputs.length === 0) {
          const expectedInputNames = paInputs.map((input) => input.name).join(', ')
          issues.push(msg(is.paCommandInputsMissing, [paCommandNameFormatted, expectedInputNames]))
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
                if (!commandInput.types.includes(inputType)) {
                  incorrectTypeInputs.forEach((input) => {
                    if (input.name === paInput.name) input.types.push(inputType)
                  })
                  if (!incorrectTypeInputs.some((input) => input.name === paInput.name))
                    incorrectTypeInputs.push({
                      name: paInput.name,
                      types: [inputType],
                    })
                }
              }
            }
          }
          // alert if any inputs are missing
          if (missingInputs && missingInputs.length > 0) {
            for (const missingInput of missingInputs) {
              issues.push(
                msg(is.paCommandInputMissing, [
                  paCommandNameFormatted, //
                  missingInput.name,
                  missingInput.types.join(', '),
                ])
              )
            }
          }
          // alert if any inputs are mismatched
          if (incorrectTypeInputs && incorrectTypeInputs.length > 0) {
            for (const incorrectTypeInput of incorrectTypeInputs) {
              issues.push(
                msg(is.paCommandInputMissingTypes, [
                  paCommandNameFormatted,
                  incorrectTypeInput.name,
                  incorrectTypeInput.types.join(', '),
                ])
              )
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
          issues.push(msg(is.paCommandNoEvents, [paCommandNameFormatted]))
        }
        if (commandRegisteredEvents) {
          commandRegisteredEvents = commandRegisteredEvents.map((event) => event.replace(/new/g, '').trim())
        }
      }

      // ⏪ Confirm if EVENT FILES registered by trigger exist
      if (commandRegisteredEvents) {
        commandRegisteredEvents.forEach((eventName) => {
          const eventFileName = util.toKebabCase(eventName)
          const eventFilePath = `${path.eventsDirectoryPath}/${eventFileName}.ts`
          if (!fs.existsSync(eventFilePath)) {
            issues.push(msg(is.paCommandEventFileMissing, [eventFilePath]))
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
    const MissingEntitiesUnique = [...new Set(missingEntities)]
    for (const missingEntity of MissingEntitiesUnique) {
      const missingEntityFilePath = `${path.entitiesDirectoryPath}/${missingEntity}.ts`
      issues.push(msg(is.entityFileMissing, [missingEntityFilePath]))
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
      const entityFieldNames = entity.fields.map((field) => field.name) as string[]
      const missingFields = entityFieldNames.filter((name) => !entityConstructorFieldNames.includes(name))
      if (missingFields && missingFields.length > 0) {
        missingFields.forEach((missingField) => {
          const entityName = util.toPascalCase(entity.entityName)
          const fieldName = util.toCamelCase(missingField)
          const fieldTypes = entityFields.find((field) => field.name === missingField).types.join(', ')
          issues.push(msg(is.entityFieldMissing, [entityName, fieldName, fieldTypes]))
        })
      }
    }
  }

  // 👽 Confirm each ENTITY constructor FIELD TYPE matches the type inferred from scenario[i].expectedStateUpdates[i].values[i].value
  for (const entity of scenarioEntities) {
    // infer field types from assertions
    const allAssertedEntityFields: AssertionValue[] = entity.fields.map((item) => {
      return { name: item.name, types: item.types }
    })
    // remove asserted fieldTypes that cannot be confirmed from files (asserted object/array presumed to = custom type)
    const relevantAssertedEntityFields = allAssertedEntityFields.filter(
      (type) => !type.types.includes('object') && !type.types.includes('array')
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
        const matchingAssertedField = relevantAssertedEntityFields.find((item) => item.name === entityFieldName)
        if (matchingAssertedField) {
          const assertedFieldTypes = matchingAssertedField.types
          const missingFieldTypes = assertedFieldTypes.filter((type) => !entityFieldTypes.includes(type))
          if (missingFieldTypes && missingFieldTypes.length > 0) {
            issues.push(
              msg(is.entityFieldMissingTypes, [
                util.toPascalCase(entity.entityName),
                entityFieldName,
                missingFieldTypes.join(', '),
              ])
            )
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
    const MissingReadModelsUnique = [...new Set(missingReadModels)]
    for (const missingReadModel of MissingReadModelsUnique) {
      const missingReadModelFilePath = `${path.readModelsDirectoryPath}/${missingReadModel}.ts`
      issues.push(msg(is.readModelFileMissing, [missingReadModelFilePath]))
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
      const readModelFieldNames = readModel.fields.map((value) => value.name) as string[]
      const missingFields = readModelFieldNames.filter((name) => !readModelConstructorFieldNames?.includes(name))
      if (missingFields && missingFields.length > 0) {
        missingFields.forEach((missingField) => {
          const readModelName = util.toPascalCase(readModel.readModelName)
          const fieldName = util.toCamelCase(missingField)
          const fieldTypes = readModelFields.find((field) => field.name === missingField).types.join(', ')
          issues.push(msg(is.readModelFieldMissing, [readModelName, fieldName, fieldTypes]))
        })
      }
    }
  }

  // 🔭 Confirm each READ MODEL constructor FIELD TYPE matches the type inferred from scenario[i].expectedVisibleUpdates[i].values[i].value
  for (const readModel of scenarioReadModels) {
    // infer field types from assertions
    const allAssertedReadModelFields = readModel.fields.map((item) => {
      return { name: item.name, types: item.types }
    })
    // remove asserted fieldTypes that cannot be confirmed from files (asserted object/array presumed to = custom type)
    const relevantAssertedReadModelFields = allAssertedReadModelFields.filter(
      (type) => !type.types.includes('object') && !type.types.includes('array')
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
        const matchingAssertedField = relevantAssertedReadModelFields.find((item) => item.name === readModelFieldName)
        if (matchingAssertedField) {
          const assertedFieldTypes = matchingAssertedField.types
          const missingFieldTypes = assertedFieldTypes.filter((type) => !readModelFieldTypes.includes(type))
          if (missingFieldTypes && missingFieldTypes.length > 0) {
            issues.push(
              msg(is.readModelFieldMissingTypes, [
                util.toPascalCase(readModel.readModelName),
                readModelFieldName,
                missingFieldTypes.join(', '),
              ])
            )
          }
        }
      })
    }
  }

  // 🔭 Confirm each READ MODEL PROJECTS at least one of scenario[i].expectedStateUpdates[i].entityName
  const scenarioEntityNames = scenarioEntities.map((entity) => entity.entityName)
  for (const readModel of scenarioReadModels) {
    const readModelNameFormatted = util.toPascalCase(readModel.readModelName)
    const readModelFileName = util.toKebabCase(readModel.readModelName)
    const readModelFilePath = `${path.readModelsDirectoryPath}/${readModelFileName}.ts`
    const readModelFileExists = fs.existsSync(readModelFilePath)
    if (readModelFileExists) {
      const readModelFile = fs.readFileSync(readModelFilePath, 'utf8')
      const readModelProjectedEntityNames = readModelFile.match(/(?<=@Projects\()(.*)(?=,)/gm)
      if (!readModelProjectedEntityNames) {
        issues.push(msg(is.readModelNoEntitiesProjected, [readModelNameFormatted]))
      }
      if (readModelProjectedEntityNames) {
        readModelProjectedEntityNames.forEach((projectedEntityName) => {
          if (!scenarioEntityNames.includes(projectedEntityName)) {
            issues.push(
              msg(is.readModelNoMatchingEntityProjected, [
                readModelNameFormatted, //
                scenarioEntities.join(', '),
              ])
            )
          }
        })
      }
    }
  }

  // 🔭 Confirm each read model has correct AUTHORIZATION
  for (const readModel of scenarioReadModels) {
    const readModelNameFormatted = util.toPascalCase(readModel.readModelName)
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
        issues.push(msg(is.readModelAuthMissing, [readModelNameFormatted, expectedReadRoles]))
      }

      // alert if read model missing correct authorization definition
      if (readModelHasAuthorization && !readModelHasCorrectAuthorization) {
        issues.push(msg(is.readModelAuthIncorrect, [readModelNameFormatted, expectedReadRoles]))
      }
    }
  }

  // 🚀🚀🚀 EVENTS 🚀🚀🚀
  // ======================================================================================

  // 🚀 Confirm if EVENT FILES registered by trigger exist
  if (triggerRegisteredEvents) {
    triggerRegisteredEvents.forEach((eventName) => {
      const eventFileName = util.toKebabCase(eventName)
      const eventFilePath = `${path.eventsDirectoryPath}/${eventFileName}.ts`
      if (!fs.existsSync(eventFilePath)) {
        issues.push(msg(is.eventFileMissing, [eventFilePath]))
      }
    })
  }

  // 🚀 Confirm each entity's REDUCED EVENTS include at least one of trigger's REGISTERED EVENTS
  for (const entity of scenarioEntities) {
    const entityReducedEvents = []
    const entityFileName = util.toKebabCase(entity.entityName)
    const entityNameFormatted = util.toPascalCase(entity.entityName)
    const entityFilePath = `${path.entitiesDirectoryPath}/${entityFileName}.ts`
    const entityFileExists = fs.existsSync(entityFilePath)
    if (entityFileExists) {
      const entityFile = fs.readFileSync(entityFilePath, 'utf8')
      const eventsReduced = entityFile.match(/@Reduces\((\w+)/gs)
      if (!eventsReduced) {
        issues.push(msg(is.entityNoEventsReduced, [entityNameFormatted]))
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
            issues.push(msg(is.eventPathTriggerToEntityMissing, [entityNameFormatted]))
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
            issues.push(msg(is.eventPathTriggerToHandlerToEntityMissing, [entityNameFormatted]))
          }
        }
      }
    }
  }

  if (issues.length > 0) {
    confirmFilesLogHeader()
    log.issueNotes(issues.sort())
    invalid = true
  }

  // if any above INVALID, fail with issues
  if (invalid) return issues

  // if all VALID
  return true
}
