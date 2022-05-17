import type { ActorCommand, ScheduledCommand, Scenario } from './process-types'

// Gathered Assertions Types

export interface AssertionInput {
  name: string
  types: string[]
  required: boolean
}
export interface AssertionValue {
  name: string
  types: string[]
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
export interface GatheredRoles {
  triggerWrite: string[] // trigger command write roles
  paWrite: string[] // preceding action write roles
  read: string[]
  all: string[]
}
export interface Assertions {
  processName: string
  trigger: ActorCommand | ScheduledCommand
  scenarios: Scenario[]
  roles: GatheredRoles
  precedingActions?: AssertionPrecedingActionSet[]
  allScenarioInputs: AssertionInput[]
  allEntities: AssertionEntity[]
  allReadModels?: AssertionReadModel[]
}
