import type { UUID } from '@boostercloud/framework-types'

interface ActorCommand {
  type: 'ActorCommand'
  commandName: string
  authorized: string[] | string
}
interface ScheduledCommand {
  type: 'ScheduledCommand'
  commandName: string
  schedule: string
}
interface StateUpdate {
  entityName: string
  values: Record<string, string | number | boolean | Record<string, unknown> | unknown[] | UUID>
}
interface VisibleUpdate {
  readModelName: string
  values: Record<string, string | number | boolean | Record<string, unknown> | unknown[] | UUID>
  authorized: string[] | string
}
interface Scenario {
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
