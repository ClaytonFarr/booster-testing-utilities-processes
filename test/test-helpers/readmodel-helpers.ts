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
  fields: Record<string, string | number | boolean | UUID | Record<string, unknown> | unknown[]>,
  limitResultsTo?: number,
  sortBy?: Record<string, unknown>
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

  // ...create filter string
  let filterString = '{ '
  fieldItems.forEach((field) => {
    const valueTypeIsKeyword = util.valueIsTypeKeyword(field.value)
    const valueType = util.inferValueType(field.value)

    if (valueTypeIsKeyword) {
      filterString += `${field.fieldName}: { isDefined: true }, `
    }
    if (!valueTypeIsKeyword) {
      // currently limited to filters from strings, numbers, and booleans
      // JSON or stringified JSON value checks will be ignored
      if (valueType === 'string' && !util.isStringJSON(field.value)) {
        filterString += `${field.fieldName}: { contains: "${field.value}" }, `
      }
      if (valueType === 'number' || valueType === 'boolean') {
        filterString += `${field.fieldName}: { eq: ${field.value} }, `
      }
      if (valueType === 'UUID') {
        filterString += `${field.fieldName}: { eq: "${field.value}" }, `
      }
      if (valueType === 'object') {
        for (const [key, value] of Object.entries(field.value)) {
          const valueType = util.inferValueType(value)
          if (valueType === 'string') {
            filterString += `${field.fieldName}: { ${key}: { contains: "${value}" } }, `
          }
          if (valueType === 'number' || valueType === 'boolean') {
            filterString += `${field.fieldName}: { ${key}: { eq: ${value} } }, `
          }
          if (valueType === 'UUID') {
            filterString += `${field.fieldName}: { ${key}: { eq: "${value}" } }, `
          }
        }
      }
      if (valueType === 'array' && field.value.length > 0) {
        const arrayType = util.inferValueType(field.value[0])
        if (arrayType === 'string') {
          if (field.value.length === 1) filterString += `${field.fieldName}: { includes: "${field.value[0]}" }, `
          if (field.value.length > 1) {
            filterString += 'and: [ '
            for (const value of field.value) {
              filterString += `{ ${field.fieldName}: { includes: "${value}" } }, `
            }
            filterString += '], '
          }
        }
        if (arrayType === 'number' || arrayType === 'boolean') {
          if (field.value.length === 1) filterString += `${field.fieldName}: { includes: ${field.value[0]} }, `
          if (field.value.length > 1) {
            filterString += 'and: [ '
            for (const value of field.value) {
              filterString += `{ ${field.fieldName}: { includes: ${value} } }, `
            }
            filterString += '], '
          }
        }
        if (arrayType === 'object') {
          if (field.value.length === 1) {
            const valueAsJson = util.convertObjectToJsonString(field.value[0])
            filterString += `${field.fieldName}: { includes: ${valueAsJson} }, `
          }
          if (field.value.length > 1) {
            filterString += 'and: [ '
            for (const thisValue of field.value) {
              const valueAsJson = util.convertObjectToJsonString(thisValue)
              filterString += `{ ${field.fieldName}: { includes: ${valueAsJson} } }, `
            }
            filterString += '], '
          }
        }
      }
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
