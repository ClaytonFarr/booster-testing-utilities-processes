// Process Scenario Types

import type { UUID } from '@boostercloud/framework-types'

export interface ActorCommand {
  type: 'ActorCommand'
  commandName: string
  authorized: 'all' | string[]
}
export interface ScheduledCommand {
  type: 'ScheduledCommand'
  commandName: string
  schedule: string
}
export interface StateUpdate {
  entityName: string
  values?: Record<string, string | number | boolean | UUID>
  notValues?: Record<string, string | number | boolean | UUID> // values that should not be present in state update
}
export interface VisibleUpdate {
  readModelName: string
  values?: Record<string, string | number | boolean | UUID>
  notValues?: Record<string, string | number | boolean | UUID> // values that should not be visible
  authorized: string[] | string
}
export interface Scenario {
  name: string
  inputs?: Record<string, string | number | boolean | UUID> // inputs are only present on Actor Commands
  expectedStateUpdates: StateUpdate[]
  expectedVisibleUpdates?: VisibleUpdate[] // a scenario may not have any visible updates
}
export interface Process {
  name: string
  confirmFiles?: boolean // if set to false, will skip steps to inspect files contents match scenario expectations
  trigger: ActorCommand | ScheduledCommand
  scenarios: Scenario[]
}
