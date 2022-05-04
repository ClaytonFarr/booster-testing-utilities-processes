import type { UUID } from '@boostercloud/framework-types'

export interface ActorCommand {
  type: 'ActorCommand'
  commandName: string
  authorized: string[] | string
}
export interface ScheduledCommand {
  type: 'ScheduledCommand'
  commandName: string
  schedule: string
}
export interface StateUpdate {
  entityName: string
  values: Record<string, string | number | boolean | Record<string, unknown> | unknown[] | UUID>
}
export interface VisibleUpdate {
  readModelName: string
  values: Record<string, string | number | boolean | Record<string, unknown> | unknown[] | UUID>
  authorized: string[] | string
}
export interface Scenario {
  name: string
  inputs: Record<string, string | number | boolean | Record<string, unknown> | unknown[] | UUID>
  expectedStateUpdates: StateUpdate[]
  expectedVisibleUpdates?: VisibleUpdate[]
}
export interface Process {
  name: string
  confirmFiles?: boolean
  trigger: ActorCommand | ScheduledCommand
  scenarios: Scenario[]
}
export interface AssertionInput {
  name: string
  type: string[]
}
export interface Assertions {
  roles: {
    write: string[]
    read: string[]
    all: string[]
  }
  inputs: AssertionInput[]
  entities: StateUpdate[]
  readModels?: VisibleUpdate[]
}
