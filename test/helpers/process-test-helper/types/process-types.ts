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
  schedule: string // validation currently constrained to valid cron expressions (https://crontab.guru/); does not yet support keywords from https://docs.booster.cloud/chapters/03_booster-architecture?id=scheduling-a-command
}
export interface TriggerEvent {
  // events that trigger event handlers
  type: 'Event'
  eventName: string
  handlerName: string
}
export interface StateUpdate {
  entityName: string
  itemId: string | number | UUID
  values?: Record<string, string | number | boolean | UUID | Record<string, unknown> | unknown[]>
  notValues?: Record<string, string | number | boolean | UUID | Record<string, unknown> | unknown[]> // values that should NOT be present in state update
}
export interface VisibleUpdate {
  readModelName: string
  itemId: string | number | UUID
  idKey?: string // field name to query for id value on readmodel; will use field 'id' if not provided
  values?: Record<string, string | number | boolean | UUID | Record<string, unknown> | unknown[]>
  notValues?: Record<string, string | number | boolean | UUID | Record<string, unknown> | unknown[]> // values that should NOT be visible
  authorized: 'all' | string[]
}
export interface PrecedingAction {
  commandName: string
  inputs: Record<string, string | number | boolean | UUID> // inputs are only present on Actor Commands
  authorized: 'all' | string[]
}
export interface Scenario {
  name: string
  precedingActions?: PrecedingAction[] // optional commands to call before scenario inputs to achieve correct state
  inputs?: Record<string, string | number | boolean | UUID> // inputs are only present on Actor Commands
  eventValues?: Record<string, string | number | boolean | UUID | Record<string, unknown> | unknown[]> // event values are only present on Trigger Events
  shouldBeRejected?: boolean // e.g. if scenario is invalid, confirm it should be rejected/receive error from application
  expectedStateUpdates: StateUpdate[]
  expectedVisibleUpdates?: VisibleUpdate[] // optional, a scenario may not have any visible updates
}
export interface Process {
  name: string
  confirmFiles?: boolean // if set to false, will skip steps to inspect files contents match scenario expectations
  trigger: ActorCommand | ScheduledCommand | TriggerEvent
  scenarios: Scenario[]
}
