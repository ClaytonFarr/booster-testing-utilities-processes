import * as c from 'colorette'
import * as util from './helpers-utils'

const logWidth = 60

const log = console.log
// const table = console.table

const icon = {
  right: '→',
  down: '↓',
  up: '↑',
  down_right: '↳',
  pointer: '❯',
  dot: '·',
  check: '√',
  cross: '×',
  long_dash: '⎯',
  right_tri: '▶',
  return: '↪',
}
const issueEmoji = {
  role: '🔑',
  precedingAction: '⏪',
  trigger: '✨',
  event: '🚀',
  entity: '👽',
  readModel: '🔭',
}

export const processHeader = (processName: string): void => {
  let processNameLabel = processName
  if (processName.length > logWidth - 4) processNameLabel = processName.substring(0, logWidth - 26) + '...'
  const space = ' '
  const headingWidth = processNameLabel.length + 10
  const sideMargin = (logWidth - headingWidth) / 2
  log(
    c.bold(
      c.black(
        c.bgCyanBright(`${space.repeat(sideMargin)}Process - ${processNameLabel}${space.repeat(sideMargin)}`) //
      )
    )
  )
}

export const processFooter = (): void => {
  const borderIcon = '='
  log(
    c.dim(
      c.cyan(`${borderIcon.repeat(logWidth - 1)}`) //
    )
  )
}

export const testStepSuccessMessage = (message: string): void => {
  log(
    c.bold(
      c.greenBright(`${icon.check} ${message}`) //
    )
  )
}

export const issueGroupHeader = (heading: string): void => {
  let headingLabel = heading
  if (heading.length > logWidth - 4) headingLabel = heading.substring(0, logWidth - 16) + '...'
  const borderIcon = '-'
  const headingWidth = headingLabel.length + 2
  const halfBorderWidth = (logWidth - headingWidth) / 2
  log(
    c.redBright(c.dim(`\n${borderIcon.repeat(halfBorderWidth)}`)), //
    c.bold(c.red(`${headingLabel}`)),
    c.redBright(c.dim(`${borderIcon.repeat(halfBorderWidth)}`))
  )
}

export const issueGroupSubheader = (heading: string): void => {
  let headingLabel = heading
  if (heading.length > logWidth - 4) headingLabel = heading.substring(0, logWidth - 16) + '...'
  const borderIcon = '·'
  const headingWidth = headingLabel.length + 2
  const halfBorderWidth = (logWidth - headingWidth) / 2
  log(
    c.white(c.dim(`\n${borderIcon.repeat(halfBorderWidth)}`)), //
    c.bold(c.white(`${headingLabel}`)),
    c.white(c.dim(`${borderIcon.repeat(halfBorderWidth)}`))
  )
}

export const issueNote = (note: string | string[]): void => {
  if (typeof note === 'string') {
    // if a single note
    if (util.isStringJson(note)) {
      // ...check if note is JSON and present as table
      // table(JSON.parse(note))
      log(JSON.stringify(JSON.parse(note), null, 2))
    } else {
      // ...otherwise present as string
      const noteHasIcon = !!note.match(Object.values(icon).join('|'))
      const noteHasEmoji = !!note.match(Object.values(issueEmoji).join('|'))
      const noteMsg = noteHasIcon || noteHasEmoji ? c.white(note) : c.white(icon.dot + ' ' + note)
      log(noteMsg)
    }
  } else {
    // if array of multiple notes or array of lines from a single note
    for (const n of note) {
      if (typeof n === 'string') {
        // if array of separate note strings
        if (n === note[0]) {
          // ...use first note as heading
          const noteHasIcon = !!n.match(Object.values(icon).join('|'))
          const noteHasEmoji = !!n.match(Object.values(issueEmoji).join('|'))
          const noteHeader = noteHasIcon || noteHasEmoji ? c.white(n) : c.white(icon.dot + ' ' + n)
          log(noteHeader)
        }
        // ...list remaining notes as children
        if (n !== note[0]) {
          if (util.isStringJson(n)) {
            // ...check if note is JSON and present as table
            // table(JSON.parse(n))
            log(JSON.stringify(JSON.parse(n), null, 2))
          } else {
            // ...otherwise present as string
            log(
              c.white(` ${icon.return}`), //
              c.white(`${n}`)
            )
          }
        }
      }
      if (Array.isArray(n)) {
        // if array of lines from a single note
        for (const l of n) {
          if (util.isStringJson(l)) {
            // ...check if line is JSON and present as table
            // table(JSON.parse(l))
            log(JSON.stringify(JSON.parse(l), null, 2))
          } else {
            // ...otherwise present as string
            log(
              c.white(`${icon.dot}`), //
              c.white(`${l}`)
            )
          }
        }
      }
    }
  }
}

export const issueNotes = (notes: string[]): void => {
  for (const note of notes) {
    issueNote(note)
  }
}
