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
interface Input {
  name: string
  value: string | number | boolean | Record<string, unknown> | unknown[] | UUID
  type?: null | undefined | 'string' | 'number' | 'boolean' | 'UUID' | 'array' | 'object' // optional, if empty will be inferred from value'
  required?: boolean // optional, if empty will be inferred across scenarios
}
interface DataValue {
  fieldName: string
  value: string | number | boolean | Record<string, unknown> | unknown[] | UUID
}
interface StateUpdate {
  entityName: string
  values: DataValue[]
}
interface VisibleUpdate {
  readModelName: string
  values: DataValue[]
  authorized: string[] | string
}
interface Scenario {
  name: string
  inputs: Input[]
  expectedStateUpdates: StateUpdate[]
  expectedVisibleUpdates?: VisibleUpdate[]
}
export interface Process {
  name: string
  confirmFiles?: boolean
  trigger: ActorCommand | ScheduledCommand
  scenarios: Scenario[]
}
