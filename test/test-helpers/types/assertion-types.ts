import type { ActorCommand, ScheduledCommand, Scenario } from './process-types'

// Gathered Assertions Types

export interface AssertionInput {
  name: string
  types: string[]
}
export interface AssertionValue {
  fieldName: string
  fieldTypes: string[]
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
  trigger: ActorCommand | ScheduledCommand
  scenarios: Scenario[]
  roles: {
    write: string[]
    read: string[]
    all: string[]
  }
  allInputs: AssertionInput[]
  allEntities: AssertionEntity[]
  allReadModels?: AssertionReadModel[]
}
