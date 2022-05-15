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
  values?: Record<string, string | number | boolean | UUID | Record<string, unknown> | unknown[]>
  notValues?: Record<string, string | number | boolean | UUID | Record<string, unknown> | unknown[]> // values that should NOT be present in state update
}
export interface VisibleUpdate {
  readModelName: string
  values?: Record<string, string | number | boolean | UUID | Record<string, unknown> | unknown[]>
  notValues?: Record<string, string | number | boolean | UUID | Record<string, unknown> | unknown[]> // values that should NOT be visible
  authorized: string[] | string
}
export interface PrecedingAction {
  commandName: string
  inputs: Record<string, string | number | boolean | UUID> // inputs are only present on Actor Commands
  authorized: 'all' | string[]
}
export interface Scenario {
  name: string
  inputs: Record<string, string | number | boolean | UUID> // inputs are only present on Actor Commands
  precedingActions?: PrecedingAction[] // optional commands to call before scenario inputs to achieve correct state
  shouldBeRejected?: boolean // e.g. if scenario is invalid, confirm it should be rejected/receive error from application
  expectedStateUpdates: StateUpdate[]
  expectedVisibleUpdates?: VisibleUpdate[] // optional, a scenario may not have any visible updates
}
export interface Process {
  name: string
  confirmFiles?: boolean // if set to false, will skip steps to inspect files contents match scenario expectations
  trigger: ActorCommand | ScheduledCommand
  scenarios: Scenario[]
}
