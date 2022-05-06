import type { UUID } from '@boostercloud/framework-types'
import type { NormalizedCacheObject } from 'apollo-cache-inmemory'
import type { ApolloClient } from 'apollo-client'
import type { DocumentNode } from 'graphql'
import * as util from './utils'
import gql from 'graphql-tag'

// Read Model Queries
// =====================================================================================================================

export const evaluateReadModelProjection = async (
  graphQLclient: ApolloClient<NormalizedCacheObject>,
  readModelName: string,
  fields: Record<string, string | number | boolean | UUID>,
  sortBy?: Record<string, unknown>,
  limitResultsTo?: number
): Promise<Record<string, unknown>[]> => {
  // ...grab necessary fields to check
  const readModel = util.toPascalCase(readModelName)
  const fieldNames = []
  const fieldItems = []
  for (const [key, value] of Object.entries(fields)) {
    fieldNames.push(key)
    fieldItems.push({ fieldName: key, value })
  }
  const fieldsToReturn = [...fieldNames].join(',')
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  // ...create filter string
  let filterString = '{ '
  fieldItems.forEach((field) => {
    // currently limited to filters from strings, numbers, and booleans
    // JSON or stringified JSON value checks will be ignored
    if (typeof field.value !== 'string') {
      filterString += `${field.fieldName}: { eq: ${field.value} }, `
    }
    if (typeof field.value === 'string' && !util.valueIsTypeKeyword(field.value) && !util.isStringJSON(field.value)) {
      filterString += `${field.fieldName}: { contains: "${field.value}" }, `
    }
    if (field.value.match(uuidRegex)) {
      filterString += `${field.fieldName}: { eq: "${field.value}" }, `
    }
    if (util.valueIsTypeKeyword(field.value)) {
      filterString += `${field.fieldName}: { isDefined: true }, `
    }
  })
  filterString += ' }'

  // ...build query
  const filterBy = util.looseJSONparse(filterString)
  const limitTo = limitResultsTo
  const queryVariables = createQueryVariables(filterBy, sortBy, limitTo)
  const connectionQuery = createReadModelQuery(readModel, fieldsToReturn)

  // ...make query
  const { data } = await graphQLclient.query({ query: connectionQuery, variables: queryVariables })
  const items = data[`List${readModel}s`].items

  return items
}

const createQueryVariables = (
  filterBy?: Record<string, unknown>,
  sortBy?: Record<string, unknown>,
  limitTo?: number
): Record<string, unknown> => {
  return {
    filterBy,
    sortBy,
    limitTo,
  }
}

const createReadModelQuery = (readModelName: string, fieldsToReturn?: string): DocumentNode => {
  const fields = fieldsToReturn ? fieldsToReturn : '__typename'
  return gql`
      query List${readModelName}s($filterBy: List${readModelName}Filter, $sortBy: ${readModelName}SortBy, $limitTo: Int) {
        List${readModelName}s(filter: $filterBy, sortBy: $sortBy, limit: $limitTo) {
          items {
            ${fields}
          }
        }
      }
    `
}
