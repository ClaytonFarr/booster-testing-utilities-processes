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

export const toSentenceCase = (str: string): string =>
  str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_-]+/g, ' ')
    .toLowerCase()
    .replace(/(?:^\w|[A-Z]|\b\w|_\w)/g, (leftTrim, index) =>
      index === 0 ? leftTrim.toUpperCase() : leftTrim.toUpperCase()
    )
