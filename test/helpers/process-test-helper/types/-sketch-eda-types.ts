// Want to be able to -

// * sketch out processes using known and new/tentative values
// * see how processes' events traverse subsystems/services
// * know if an event is not consumed by another chain (i.e. end of process)
// * know if an trigger for a handler has no producer (orphaned)

import * as option from './-sketch-eda-enum'

// INTERFACES
// ===========================================================================

// ✅ = created matching model in GraphCMS.com account

export interface Product {
  // ✅
  name: string
  summary?: string
  outcomes: Outcome[]
}

// Value
// ---------------------------------------------------------------------------

export interface Outcome {
  // ✅
  summary: string
  capabilities: Capability[]
}

export interface Capability {
  // ✅
  // akin to Product Talk 'Opportunity'
  summary: string
  features: Feature[]
  constraints?: Constraint[]
}

export interface Feature {
  // ✅
  // akin to Product Talk 'Solution'?
  summary: string
  requiredAbilities: Ability[]
}

export interface Constraint {
  // ✅
  summary: string
  requiredAbilities: Ability[]
}

// Means
// ---------------------------------------------------------------------------

export interface Ability {
  // ✅
  // or is this level akin to Product Talk 'Solution'?
  summary: string
  utilizedBy: UserActivity | ScheduledActivity
  dependentAbilities?: Ability[]
}

export interface UserActivity {
  // ✅
  summary: string
  businessProcess: BusinessProcess
  actor: Actor
  steps: ActivityStep[]
}

export interface ScheduledActivity {
  // ✅
  summary: string
  schedule: option.Schedule
  businessProcess: BusinessProcess
  recipient: Actor
  inputs: Input[]
}

export interface ActivityStep {
  // ✅
  interface: Interface
  stepNumber?: number
}

export interface Interface {
  // ✅
  name: string
  views?: View[]
  inputs?: Input[]
}

export interface Input {
  // ✅
  name: string
  command: Command
}

export interface View {
  // ✅
  name: string
  query: Query
}

// Domain Separation
// ---------------------------------------------------------------------------

export interface Actor {
  // ✅
  name: string
  type: option.ActorType
}

export interface BusinessProcess {
  // ✅
  name: string
}

export interface Service {
  // ✅
  name: string
  activity: UserActivity | ScheduledActivity
}

export interface Subsystem {
  // ✅
  name: string
  services: Service[] // filtered by matching business process + actor
}

// Execution
// ---------------------------------------------------------------------------

export interface Command {
  // ✅
  summary: string
  operation: option.CrudType.CREATE | option.CrudType.UPDATE | option.CrudType.DELETE
  thing: Entity
}

export interface Job {
  // ✅
  summary: string
  schedule: option.Schedule
  operation: option.CrudType.CREATE | option.CrudType.UPDATE | option.CrudType.DELETE
  thing: Entity
}

export interface Query {
  // ✅
  name: string
  things: ReadModel[]
}

export interface Handler {
  // ✅
  name: string
  trigger: Command | Job | Event
  registeredEvents: Event[]
}
export interface CommandHandler extends Handler {
  trigger: Command
}
export interface JobHandler extends Handler {
  trigger: Job
}
export interface EventHandler extends Handler {
  trigger: Event
}

export interface Event {
  // ✅
  name: string
}

export interface Entity {
  // ✅
  name: string
  eventsReduced: Event[]
}

export interface ReadModel {
  // ✅
  name: string
  entityProjected: Entity
}
