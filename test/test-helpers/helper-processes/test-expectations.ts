import type { Process, Assertions } from './process-types'
import * as vit from 'vitest'

// ======================================================================================

export const testProcessExpectations = (
  process: Process,
  assertions: Assertions,
  it = vit.it,
  expect = vit.expect
): void => {
  process

  // confirm can call Command with role from trigger.authorized and all scenario[i].inputs[i]
  // - collect inputs from all scenario[i].inputs[i]
  // - check for explicit scenario[i].inputs[i].type
  // - as needed, infer input types from scenario[i].inputs[i].value
  //   - check if scenario.inputs[i].value string matches UUID format

  // confirm can call Command with role from trigger.authorized and required scenario[i].inputs[i]
  // - collect inputs from all scenario[i].inputs[i]
  // - check for explicit scenario[i].inputs[i].required
  // - as needed, infer required inputs from inputs that are common to all scenarios

  // confirm Command will throw errors if
  // - input values are empty (test if this comes for free from Booster infrastructure)
  // - input values are not of expected type (this may come for free from Booster infrastructure)

  // confirm Scheduled Command performs on expected schedule
  // - ?

  // confirm Command can receive same input data without creating incorrect state
  // - ?

  // confirm Event Handler can receive same event data without creating incorrect state
  // - ?

  // confirm expected state change occurred for all scenario[i].expectedStateUpdates[i]
  // - make command call with scenario[i].inputs[i]
  // - check each entity from scenario[i].expectedStateUpdates for expected values

  // confirm expected visible state true for all scenario[i].expectedVisibleUpdates[i]
  // - use same command call from above
  // - call/check each read model from scenario[i].expectedVisibleUpdates[i] for expected values

  it('should ...', async () => {
    expect(true).toBe(true)
  })
}
