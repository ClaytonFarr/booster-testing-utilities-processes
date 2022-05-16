/* eslint-disable prettier/prettier */

export const assertionIssues = {
  assertionIssuesHeader: 'Assertions Errors',

  processNameBlank: 'Process name is blank',

  triggerNameBlank: 'Trigger: command name is blank',
  triggerAuthBlank: 'Trigger: authorization is blank',

  scenariosNotDefined: 'Scenario: no scenarios are defined',
  scenariosNameBlank: 'Scenario: one or more scenario names are blank',
  scenariosNameDuplicate: 'Scenario: one or more scenarios have duplicate names',

  scenarioInputsEmpty: 'Scenario as no inputs',
  scenarioInputKeyBlank: "Input '{{fieldName}}' has a blank value",

  scenarioPaCommandNameBlank: 'A preceding action has a blank command name',
  scenarioPaInputsEmpty: "The preceding action for '{{commandName}}' has no inputs",
  scenarioPaAuthBlank: "The preceding action for '{{commandName}}' has no authorized roles",

  scenarioSuEmpty: 'Scenario has no expected state update(s)',
  scenarioSuEntityNameBlank: 'State update has a blank entity name',
  scenarioSuEntityMissingValueBlocks: "State update for '{{entityName}}' needs `values` or `notValues`",
  scenarioSuEntityValuesEmpty: "State update for '{{entityName}}' `values` expectations is empty",
  scenarioSuEntityNotValuesEmpty: "State update for '{{entityName}}' `notValues` expectations is empty",
  scenarioSuEntityValuesFieldBlank: "State update for `values` field '{{fieldName}}' has a blank value",
  scenarioSuEntityNotValuesFieldBlank: "State update for `notValues` field '{{fieldName}}' has a blank value",

  scenarioVuRmNameBlank: 'Visible update has a blank read model name',
  scenarioVuRmMissingValueBlocks: "Visible update for '{{readModelName}}' needs `values` or `notValues`",
  scenarioVuRmValuesEmpty: "Visible update for '{{readModelName}}' `values` expectations is empty",
  scenarioVuRmNotValuesEmpty: "Visible update for '{{readModelName}}' `notValues` expectations is empty",
  scenarioVuRmValuesFieldBlank: "Visible update for `values` field '{{fieldName}}' has a blank value",
  scenarioVuRmNotValuesFieldBlank: "Visible update for `notValues` field '{{fieldName}}' has a blank value",
  scenarioVuRmNAuthEmpty: "Visible update for '{{readModelName}}' has no authorization defined",
  scenarioVuRmNAuthRolesOutsideArray: "Visible update for '{{readModelName}}' roles should be inside an array (if not 'all')",
}

export const fileIssues = {
  fileIssuesHeader: 'File Errors',
  assertionsDataMissing: 'Assertions data missing or incomplete',

  rolesFileMissing: "🔑 Roles file missing: '{{filePath}}'",
  rolesMissing: '🔑 Roles.ts file does not have roles: {{missingRoles}}',

  triggerFileMissing: "✨ Trigger file missing: '{{filePath}}'",
  triggerAuthMissing: '✨ Trigger does not have authorization defined (expecting {{expectedWriteRoles}})',
  triggerAuthIncorrect: '✨ Trigger does not have correct authorization (expecting {{expectedWriteRoles}})',
  triggerInputsMissing: '✨ Trigger does not have any inputs defined (expecting {{expectedInputNames}})',
  triggerInputMissing: '✨ Trigger is missing input: {{inputName}} ({inputTypes})',
  triggerInputMissingTypes: "✨ Trigger is missing types for '{{inputName}}' ({inputTypes})",
  triggerInputRequireIncorrect: "✨ Trigger input '{{inputName}}' should be {{expectedRequire}} (is {{triggerFileRequire}})",
  triggerCommandNoEvents: "✨ Trigger '{{commandName}}' does not register any events",

  paCommandFileMissing: "⏪ Preceding action command file missing: '{{filePath}}'",
  paCommandAuthMissing: "⏪ Command '{{commandName}}' does not have authorization defined (expecting {{expectedWriteRoles}})",
  paCommandAuthIncorrect: "⏪ Command '{{commandName}}' does not have correct authorization (expecting {{expectedWriteRoles}})",
  paCommandInputsMissing: "⏪ Command '{{commandName}}' does not have any inputs defined (expecting {{expectedInputNames}}",
  paCommandInputMissing: "⏪ Command '{{commandName}}' is missing input: {{inputName}} ({{inputTypes}})",
  paCommandInputMissingTypes: "⏪ Command '{{commandName}}' missing types for '{{inputName}}' ({inputTypes})",
  paCommandNoEvents: "⏪ Command '{{commandName}}' does not register any events",
  paCommandEventFileMissing: "🚀 Preceding action event file missing: '{{filePath}}'",

  entityFileMissing: "👽 Entity file missing: '{{filePath}}'",
  entityFieldMissing: "👽 Entity '{{entityName}}' does not have field: {{missingFieldName}} ({{fieldTypes}})",
  entityFieldMissingTypes: "👽 Entity '{{entityName}}' field '{{fieldName}}' missing types: {{fieldTypes}}",
  entityNoEventsReduced: "👽 Entity '{{entityName}}' does not reduce any events",

  readModelFileMissing: "🔭 Read Model file missing: '{{filePath}}'",
  readModelFieldMissing: "🔭 Read Model '{{readModelName}}' does not have field: {{missingFieldName}} ({{fieldTypes}})",
  readModelFieldMissingTypes: "🔭 Read Model '{{readModelName}}' field '{{fieldName}}' missing types: {{fieldTypes}}",
  readModelNoEntitiesProjected: "🔭 Read Model '{{readModelName}}' does not project any entities",
  readModelNoMatchingEntityProjected: "🔭 Read Model '{{readModelName}}' does not project at least one of these entities: {{expectedEntities}}",
  readModelAuthMissing: "🔭 Read Model '{{readModelName}}' does not have authorization defined (expecting {{expectedReadRoles}})",
  readModelAuthIncorrect: "🔭 Read Model '{{readModelName}}' does not have correct authorization (expecting {{expectedReadRoles}})",

  eventFileMissing: "🚀 Event file missing: '{{filePath}}'",
  eventPathTriggerToEntityMissing: "🚀 Cannot find event path from trigger to entity '{{entityName}}'",
  eventPathTriggerToHandlerToEntityMissing: "🚀 Cannot find event path from trigger to entity '{{entityName}}' (inspected event handlers 1 event deep)",
}

export const confirmationIssues = {
  confirmationIssuesHeader: 'Confirmation Errors',
  assertionsDataMissing: 'Assertions data missing or incomplete',

  paRequestUnsuccessful: "⏪ Preceding action command '{{commandName}}' returned error\nRequest: {{commandRequest}}\nResponse: {{commandResponse}}",

  triggerAllowsEmptyInputs: "✨ Trigger '{{commandName}}' does not throw error when input values are empty",
  triggerBlockingAuthorizedRole: "🔑 Role '{{roleName}}' was not authorized to call trigger '{{commandName}}' as expected",
  triggerMalformedRequestAllowed: "✨ Trigger '{{commandName}}' was expected to be rejected but was not",
  triggerRequestUnsuccessful: "✨ Trigger '{{commandName}}' returned error\nRequest: {{commandRequest}}\nResponse: {{commandResponse}}",

  stateUpdateErrorHeading: "👽 Entity '{{entityName}}' was not updated as expected\n",
  stateUpdateNotFoundWithinTimeLimit: "👽 No state update found for '{{entityName}}' within {{numberOfSec}} seconds\nSearched for key: '{{primaryKey}}'",
  stateUpdateNotFound: "👽 No matching state update found for entity '{{entityName}}'\nSearched for key: '{{primaryKey}}'",
  stateUpdateFieldValueIncorrect: "   ↪ Field '{{fieldName}}' value is '{{value}}' (expected '{{expectedValue}}')",
  stateUpdateFieldValueMissing: "   ↪ Field '{{fieldName}}' is missing (with any '{{fieldType}}' value)",
  stateUpdateFieldValueObjectMissing: "   ↪ Field '{{fieldName}}' is missing",
  stateUpdateFieldValueObjectIncorrect: "Field '{{fieldName}}' value is:\n{{value}}\nExpected:\n{{expectedValue}}",
  stateUpdateFieldValueNotArray: "   ↪ Field '{{fieldName}}' expects an array and the matching updated field type is '{{fieldType}}'",
  stateUpdateNotFieldValuePresent: "   ↪ Field '{{fieldName}}' with '{{stateValue}}' value found (should not be present)",
  stateUpdateNotFieldPresent: "   ↪ Field '{{fieldName}}' is present (should not be present with any value)",

  visibleUpdateErrorHeading: "🔭 Read model '{{readModelName}}' was not updated as expected\n",
  visibleUpdateItemNotFound: 'Could not find item\n{{expectedValues}}\nUsed query filter:\n{{queryFilterString}}',
  visibleUpdateNotItemFound: 'Found item that should NOT exist or be visible\n{{notValues}}\nUsed query filter:\n{{queryFilterString}}',
}

export const addMessage = (issueString: string, dynamicValues?: string[]): string | string[] => {
  //
  let issue = issueString

  // check for dynamic value placeholders
  const placeholderReplacementKeys = issue.match(/\{\{[^}]+\}\}/g)
  if (!placeholderReplacementKeys) return issue

  // replace issue message with dynamic values (in order they appear in the array)
  const placeholderReplacements = placeholderReplacementKeys.map((key: string): string => {
    const keyIndex = placeholderReplacementKeys.indexOf(key)
    const keyValue = dynamicValues?.[keyIndex]
    return keyValue
  })
  if (placeholderReplacements.length > 0) {
    issue = issue.replace(/\{\{[^}]+\}\}/g, () => {
      return placeholderReplacements.shift()
    })
  }

  // if single line, return as string
  const issueHasLines = issue.includes('\n')
  if (!issueHasLines) return issue

  // if multiple lines, return as array
  const issueLines = issue.split('\n')
  return issueLines

}
