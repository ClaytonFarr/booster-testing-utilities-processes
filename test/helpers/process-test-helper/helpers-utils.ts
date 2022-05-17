import type { UUID } from '@boostercloud/framework-types'

// Miscellaneous Helpers
// ====================================================================================

// Constants
// -----------------------------------------------------------------------------------

export const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Strings
// -----------------------------------------------------------------------------------

export const toKebabCase = (str: string): string =>
  str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()

export const toCamelCase = (str: string): string => {
  // if cameCase already pass it back
  if (/^[a-z][a-zA-Z0-9]*$/.test(str)) return str
  // if PascalCase simply change case of first character
  if (/^[A-Z][a-zA-Z0-9]*$/.test(str)) return str.charAt(0).toLowerCase() + str.slice(1)
  // else, grind it out
  return str
    .toLowerCase()
    .replace(/(?:^\w|[A-Z]|\b\w|_\w)/g, (leftTrim, index) =>
      index === 0 ? leftTrim.toLowerCase() : leftTrim.toUpperCase()
    )
    .replace(/[\s_-]+/g, '')
}

export const toPascalCase = (str: string): string => {
  // if PascalCase already pass it back
  if (/^[A-Z][a-zA-Z0-9]*$/.test(str)) return str
  // if camelCase simply change case of first character
  if (/^[a-z][a-zA-Z0-9]*$/.test(str)) return str.charAt(0).toUpperCase() + str.slice(1)
  // else, grind it out
  return str
    .toLowerCase()
    .replace(/(?:^\w|[A-Z]|\b\w|_\w)/g, (leftTrim, index) =>
      index === 0 ? leftTrim.toUpperCase() : leftTrim.toUpperCase()
    )
    .replace(/[\s_-]+/g, '')
}

export const toTitleCase = (str: string): string =>
  str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_-]+/g, ' ')
    .toLowerCase()
    .replace(/(?:^\w|[A-Z]|\b\w|_\w)/g, (leftTrim, index) =>
      index === 0 ? leftTrim.toUpperCase() : leftTrim.toUpperCase()
    )

// Arrays
// -----------------------------------------------------------------------------------

export const stringArrayHasDuplicates = (array: string[]): boolean => new Set(array).size !== array.length

// JSON
// -----------------------------------------------------------------------------------
export const isStringJson = (testString: string): boolean => {
  try {
    JSON.parse(testString)
  } catch (e) {
    return false
  }
  return true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const looseJSONparse = (JSONstring: string): any => Function('"use strict";return (' + JSONstring + ')')()

export const convertObjectToJsonString = (obj: Record<string, unknown>, wrapInBrackets = true): string => {
  let json = wrapInBrackets ? '{ ' : ''
  for (const key in obj) {
    // eslint-disable-next-line no-prototype-builtins
    if (obj.hasOwnProperty(key)) {
      const value = obj[key]
      const valueType = inferValueType(value)
      let formattedValue = value
      if (valueType === 'string') formattedValue = `"${value}"`
      if (valueType === 'object') formattedValue = convertObjectToJsonString(value as Record<string, unknown>)
      if (valueType === 'array') formattedValue = `[${value}]`
      json += `${key}: ${formattedValue}, `
    }
  }
  json += wrapInBrackets ? '}' : ''
  return json
}

// Infer value types
// -----------------------------------------------------------------------------------

export const inferValueType = (
  val: string | number | boolean | Record<string, unknown> | unknown[] | UUID | unknown
): string => {
  let type: string
  switch (val) {
    case 'string':
      type = 'string'
      break
    case 'number':
      type = 'number'
      break
    case 'true':
    case 'false':
    case 'boolean':
      type = 'boolean'
      break
    case 'UUID':
      type = 'UUID'
      break
    case 'object':
      type = 'object'
      break
    case 'array':
      type = 'array'
      break
    case 'unknown':
      type = 'unknown'
      break
    default:
      type = Array.isArray(val) ? 'array' : typeof val
  }
  return type
}

export const inferGraphQLValueType = (val: string | number | boolean | UUID): string => {
  let type: string
  // if value is a string check for type keyword and convert to GraphQL equivalent
  if (typeof val === 'string')
    switch (val) {
      case 'string':
        type = 'String'
        break
      case 'number':
        type = 'Float'
        break
      case 'true':
      case 'false':
      case 'boolean':
        type = 'Boolean'
        break
      case 'UUID':
        type = 'ID'
        break
      default:
        type = 'String'
    }
  // if value is not a string, convert value type to GraphQL equivalent
  if (typeof val !== 'string') {
    const valType = typeof val
    switch (valType) {
      case 'bigint':
      case 'number':
        type = 'Float'
        break
      case 'boolean':
        type = 'Boolean'
        break
      default:
        type = undefined
    }
  }
  return type
}

export const valueIsTypeKeyword = (val: unknown): boolean => {
  let check: boolean
  if (typeof val !== 'string') check = false
  switch (val) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'UUID':
    case 'object':
    case 'array':
    case 'unknown':
      check = true
      break
    default:
      check = false
  }
  return check
}

export const convertKeyValueToNameAndType = (key: string, value: unknown): { name: string; types: string[] } => {
  return {
    name: toCamelCase(key),
    types: [inferValueType(value as string)],
  }
}

// Delay
// -----------------------------------------------------------------------------------

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function waitForIt<TResult>(
  tryFunction: () => Promise<TResult>,
  checkResult: (result: TResult) => boolean,
  tryEveryMs = 1000,
  timeoutMs = 60000
): Promise<TResult> {
  const start = Date.now()
  return doWaitFor()
  async function doWaitFor(): Promise<TResult> {
    const res = await tryFunction()
    const expectedResult = checkResult(res)
    if (expectedResult) return res
    const elapsed = Date.now() - start
    if (elapsed > timeoutMs) throw new Error('[waitForIt] Timeout reached waiting for a successful execution')
    const nextExecutionDelay = (timeoutMs - elapsed) % tryEveryMs
    await delay(nextExecutionDelay)
    return doWaitFor()
  }
}
