// Process Scenario Types

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
  values: Record<string, unknown>
}
export interface VisibleUpdate {
  readModelName: string
  values: Record<string, unknown>
  authorized: string[] | string
}
export interface Scenario {
  name: string
  inputs: Record<string, unknown>
  expectedStateUpdates: StateUpdate[]
  expectedVisibleUpdates?: VisibleUpdate[]
}
export interface Process {
  name: string
  confirmFiles?: boolean
  trigger: ActorCommand | ScheduledCommand
  scenarios: Scenario[]
}

// Gathered Assertions Types

export interface AssertionInput {
  name: string
  type: string[]
}
export interface AssertionValue {
  fieldName: string
  fieldType: unknown
}
export interface AssertionEntity {
  entityName: string
  values: AssertionValue[]
}
export interface AssertionReadModel {
  readModelName: string
  values: AssertionValue[]
  authorized: 'all' | string[]
}
export interface Assertions {
  roles: {
    write: string[]
    read: string[]
    all: string[]
  }
  inputs: AssertionInput[]
  entities: AssertionEntity[]
  readModels?: AssertionReadModel[]
}
