import type { ActorCommand, ScheduledCommand, Scenario } from './process-types'

// Gathered Assertions Types

export interface AssertionInput {
  name: string
  types: string[]
  required: boolean
}
export interface AssertionValue {
  fieldName: string
  fieldTypes: string[]
}
export interface AssertionPrecedingAction {
  commandName: string
  inputs: AssertionInput[]
  authorized: 'all' | string[]
}
export interface AssertionPrecedingActionSet {
  scenarioName: string
  actions: AssertionPrecedingAction[]
}
export interface AssertionEntity {
  entityName: string
  fields: AssertionValue[]
}
export interface AssertionReadModel {
  readModelName: string
  fields: AssertionValue[]
  authorized: 'all' | string[]
}
export interface Assertions {
  trigger: ActorCommand | ScheduledCommand
  scenarios: Scenario[]
  roles: {
    triggerWrite: string[] // trigger command write roles
    paWrite: string[] // preceding action write roles
    read: string[]
    all: string[]
  }
  precedingActions?: AssertionPrecedingActionSet[]
  allInputs: AssertionInput[]
  allEntities: AssertionEntity[]
  allReadModels?: AssertionReadModel[]
}
