import * as c from 'colorette'
import * as util from './helpers-utils'

const log = console.log
const table = console.table

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
  log(
    // c.blue('\n============================================================='),
    // c.blue('\n------------------------------------------------------------'),
    // c.blue('\n·····························································'),
    c.bold(c.black(c.bgBlueBright(`\nProcess - ${processName}\n`)))
  )
}

export const processFooter = (): void => {
  log(
    c.blue('\n=============================================================\n')
    // c.blue('\n------------------------------------------------------------')
    // c.blue('\n·····························································'),
  )
}

export const testStepSuccessMessage = (heading: string): void => {
  log(
    c.greenBright(icon.check), //
    c.white(` ${heading}`)
  )
}

export const issueGroupHeader = (heading: string): void => {
  log(
    c.bold(c.red(heading)) //
    // c.redBright('\n=============================================================\n')
    // c.redBright('\n-------------------------------------------------------------\n')
    // c.redBright('\n·····························································')
  )
}

export const issueGroupSubheader = (heading: string): void => {
  log(
    c.white(c.bold(`${heading}`)), //
    // c.white('\n=============================================================\n')
    // c.white('\n-------------------------------------------------------------\n')
    c.white('\n·····························································\n')
  )
}

export const issueNote = (note: string | string[]): void => {
  if (typeof note === 'string') {
    // if a single note
    if (util.isStringJSON(note)) {
      // ...check if note is JSON and present as table
      table(JSON.parse(note))
    } else {
      // ...otherwise present as string
      log(
        c.white(icon.dot), //
        c.white(note)
      )
    }
  } else {
    // if array of multiple notes or array of lines from a single note
    for (const n of note) {
      if (typeof n === 'string') {
        // if array of separate note strings
        if (n === note[0]) {
          // ...use first note as heading
          const noteHasIcon = !!n.match(Object.values(issueEmoji).join('|'))
          const noteHeader = noteHasIcon ? c.white(n + '\n') : c.white(icon.dot + ' ' + n + '\n')
          log(noteHeader)
        }
        // ...list remaining notes as children
        if (n > note[0]) {
          if (util.isStringJSON(n)) {
            // ...check if note is JSON and present as table
            table(JSON.parse(n))
          } else {
            // ...otherwise present as string
            log(
              c.white(` ${icon.return}`), //
              c.white(`${n}\n`)
            )
          }
        }
      }
      if (Array.isArray(n)) {
        // if array of lines from a single note
        for (const l of n) {
          if (util.isStringJSON(l)) {
            // ...check if line is JSON and present as table
            table(JSON.parse(l))
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
