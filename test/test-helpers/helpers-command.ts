import type { DocumentNode } from 'graphql'
import type { CommandInput } from './types'
import { applicationUnderTest } from './helpers-infrastructure'
import { faker } from '@faker-js/faker'
import gql from 'graphql-tag'

// Command Roles
// =====================================================================================================================

export const wasAuthorizedRequestAllowed = async (
  role: string,
  commandMutation: DocumentNode,
  requiredVariables: string
): Promise<boolean> => {
  const roleEmail = faker.internet.email()
  const roleToken = applicationUnderTest.token.forUser(roleEmail, role)
  const roleGraphQLclient = applicationUnderTest.graphql.client(roleToken)
  // command variables
  const commandVariables = requiredVariables
  // submit command
  const mutationResult = await roleGraphQLclient.mutate({
    variables: commandVariables,
    mutation: commandMutation,
  })
  // evaluate command response
  return !!mutationResult?.data
}

// Command Inputs
// =====================================================================================================================

export const createAllVariables = (acceptedInputs: CommandInput[]): string => {
  const variables = acceptedInputs
    .map(({ name, type, validExample }) => {
      if (validExample && typeof validExample === 'string') return `"${name}": "${validExample}"`
      if (validExample && typeof validExample !== 'string') return `"${name}": ${validExample}`
      if (type === 'String') return `"${name}": "${faker.random.word()}"`
      if (type === 'Int') return `"${name}": ${faker.datatype.number()}`
      if (type === 'Boolean') return `"${name}": ${faker.datatype.boolean()}`
      if (type === 'ID') return `"${name}": "${faker.datatype.uuid()}"`
    })
    .filter(Boolean)
    .join(', ')
    .replace(/^(.*)$/, '{ $1 }')
  return JSON.parse(variables)
}

export const createEmptyVariables = (acceptedInputs: CommandInput[]): string => {
  const variables = acceptedInputs
    .map(({ name }) => `"${name}": ""`)
    .filter(Boolean)
    .join(', ')
    .replace(/^(.*)$/, '{ $1 }')
  return JSON.parse(variables)
}

// Command Mutation
// =====================================================================================================================

export const createCommandMutation = (commandName: string, acceptedInputs: CommandInput[]): DocumentNode => {
  const inputsVariables = createMutationInputsVariables(acceptedInputs)
  const inputs = createMutationInputs(acceptedInputs)
  const content = createMutationContent(commandName, inputsVariables, inputs)
  return gql.gql(content)
}

const createMutationInputsVariables = (acceptedInputs: CommandInput[]): string => {
  const inputsVariables = acceptedInputs
    .map(({ name, type, required }) => {
      if (required) return `$${name}: ${type}!`
      return `$${name}: ${type}`
    })
    .join(', ')
  return inputsVariables
}

const createMutationInputs = (acceptedInputs: CommandInput[]): string => {
  const inputs: string[] | string = acceptedInputs
    .map(({ name }) => {
      return `${name}: $${name}`
    })
    .join(', ')
  return inputs
}

const createMutationContent = (commandName: string, inputsVariables: string, inputs: string): string => {
  const mutationContent = `
      mutation ${commandName}(${inputsVariables}) {
        ${commandName}(input: { ${inputs} })
      }`
  return mutationContent
}
