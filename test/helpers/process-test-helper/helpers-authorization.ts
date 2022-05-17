import type { DocumentNode } from 'graphql'
import { applicationUnderTest } from './helpers-infrastructure'
import { faker } from '@faker-js/faker'
import * as util from './helpers-utils'

// Authorization and Roles Helpers
// ====================================================================================

// Authorization
// -----------------------------------------------------------------------------------

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

// Roles
// -----------------------------------------------------------------------------------

export const authIncludesAll = (auth: string | string[]): boolean => {
  let check: boolean
  if (typeof auth === 'string') check = auth.toLowerCase() === 'all'
  if (typeof auth !== 'string') check = auth.join('|').toLowerCase().includes('all')
  return check
}

export const gatherRoles = (auth: string | string[]): string[] => {
  let roles: string[]
  if (authIncludesAll(auth)) roles = ['all']
  if (typeof auth === 'string' && !authIncludesAll(auth)) roles.push(util.toPascalCase(auth))
  if (typeof auth !== 'string' && !authIncludesAll(auth)) roles = auth.map((role) => util.toPascalCase(role))
  return roles
}
