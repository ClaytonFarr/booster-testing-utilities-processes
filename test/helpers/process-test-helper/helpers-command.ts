import type { DocumentNode } from 'graphql'
import * as type from './types'
import type { UUID } from '@boostercloud/framework-types'
import * as util from './helpers-utils'
import { faker } from '@faker-js/faker'
import gql from 'graphql-tag'

// Command Helpers
// ====================================================================================

// Command Inputs
// -----------------------------------------------------------------------------------

export const createAllVariables = (acceptedInputs: type.CommandInput[]): string => {
  const variables = acceptedInputs
    .map(({ name, type, validExample }) => {
      if (validExample !== undefined && typeof validExample === 'string') return `"${name}": "${validExample}"`
      if (validExample !== undefined && typeof validExample !== 'string') return `"${name}": ${validExample}`
      if (type === 'String') return `"${name}": "${faker.random.word()}"`
      if (type === 'Float') return `"${name}": ${faker.datatype.number()}`
      if (type === 'Boolean') return `"${name}": ${faker.datatype.boolean()}`
      if (type === 'ID') return `"${name}": "${faker.datatype.uuid()}"`
    })
    .filter(Boolean)
    .join(', ')
    .replace(/^(.*)$/, '{ $1 }')
  return JSON.parse(variables)
}

export const createEmptyVariables = (acceptedInputs: type.CommandInput[]): string => {
  const variables = acceptedInputs
    .map(({ name }) => `"${name}": ""`)
    .filter(Boolean)
    .join(', ')
    .replace(/^(.*)$/, '{ $1 }')
  return JSON.parse(variables)
}

export const convertScenarioInputsToCommandInputs = (
  scenarioInputs: Record<string, string | number | boolean | UUID>,
  inputAssertions: type.AssertionInput[]
): type.CommandInput[] => {
  const commandInputs: type.CommandInput[] = []
  for (const [key, value] of Object.entries(scenarioInputs)) {
    const required = inputAssertions.find((assertion) => assertion.name === key)?.required ?? false
    commandInputs.push({
      name: util.toCamelCase(key),
      type: util.inferGraphQLValueType(value),
      validExample: value,
      required,
    })
  }
  return commandInputs
}

// Command Mutation
// -----------------------------------------------------------------------------------

export const createMutationInputsVariables = (acceptedInputs: type.CommandInput[]): string => {
  const inputsVariables = acceptedInputs
    .map(({ name, type, required }) => {
      if (required) return `$${name}: ${type}!`
      return `$${name}: ${type}`
    })
    .join(', ')
  return inputsVariables
}

export const createMutationInputs = (acceptedInputs: type.CommandInput[]): string => {
  const inputs: string[] | string = acceptedInputs
    .map(({ name }) => {
      return `${name}: $${name}`
    })
    .join(', ')
  return inputs
}

export const createMutationContent = (commandName: string, inputsVariables: string, inputs: string): string => {
  const commandNameFormatted = util.toPascalCase(commandName)
  const mutationContent = `
      mutation ${commandNameFormatted}(${inputsVariables}) {
        ${commandNameFormatted}(input: { ${inputs} })
      }`
  return mutationContent
}

export const createCommandMutation = (commandName: string, acceptedInputs: type.CommandInput[]): DocumentNode => {
  const commandNameFormatted = util.toPascalCase(commandName)
  const inputsVariables = createMutationInputsVariables(acceptedInputs)
  const inputs = createMutationInputs(acceptedInputs)
  const content = createMutationContent(commandNameFormatted, inputsVariables, inputs)
  return gql.gql(content)
}
