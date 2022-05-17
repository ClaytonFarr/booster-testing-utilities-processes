/* eslint-disable prettier/prettier */
import type { Process } from '../types'
import { describe, it, expect } from 'vitest'
import * as vp from '../validate-process'

// Tests Input
// =============================================================================

const typeValidOnly: Process = {
  name: '',
  trigger: {
    type: 'ActorCommand',
    commandName: '',
    authorized: [],
  },
  scenarios: [],
}
const scenarioValuesEmpty: Process = {
  name: 'Process Name',
  trigger: {
    type: 'ActorCommand',
    commandName: 'Trigger Command Name',
    authorized: 'all',
  },
  scenarios: [
    {
      name: '',
      inputs: {},
      precedingActions: [],
      expectedStateUpdates: [],
    },
  ],
}
const duplicateScenarioNames: Process = {
  name: 'Process Name',
  trigger: {
    type: 'ActorCommand',
    commandName: 'Trigger Command Name',
    authorized: 'all',
  },
  scenarios: [
    {
      name: 'Scenario Name One',
      inputs: {},
      expectedStateUpdates: [],
    },
    {
      name: 'Scenario Name One',
      inputs: {},
      expectedStateUpdates: [],
    },
  ],
}
const scenarioPaValuesEmpty: Process = {
  name: '',
  trigger: {
    type: 'ActorCommand',
    commandName: '',
    authorized: [],
  },
  scenarios: [
    {
      name: '',
      inputs: {},
      precedingActions: [
        {
          commandName: '',
          inputs: {},
          authorized: [],
        }
      ],
      expectedStateUpdates: [],
      expectedVisibleUpdates: [],
    }
  ],
}
const stateUpdateBothValuesBlocksMissing: Process = {
  name: '',
  trigger: {
    type: 'ActorCommand',
    commandName: '',
    authorized: [],
  },
  scenarios: [
    {
      name: '',
      inputs: {},
      expectedStateUpdates: [
        {
          entityName: '',
        }
      ],
    }
  ],
}
const visibleUpdateBothValuesBlocksMissing: Process = {
  name: '',
  trigger: {
    type: 'ActorCommand',
    commandName: '',
    authorized: [],
  },
  scenarios: [
    {
      name: '',
      inputs: {},
      expectedStateUpdates: [],
      expectedVisibleUpdates: [
        {
          readModelName: '',
          authorized: [],
        }
      ],
    }
  ],
}
const stateUpdateValuesEmpty: Process = {
  name: '',
  trigger: {
    type: 'ActorCommand',
    commandName: '',
    authorized: [],
  },
  scenarios: [
    {
      name: '',
      inputs: {},
      expectedStateUpdates: [
        {
          entityName: '',
          values: {},
          notValues: {},
        }
      ],
    }
  ],
}
const visibleUpdateValuesEmpty: Process = {
  name: '',
  trigger: {
    type: 'ActorCommand',
    commandName: '',
    authorized: [],
  },
  scenarios: [
    {
      name: '',
      inputs: {},
      expectedStateUpdates: [],
      expectedVisibleUpdates: [
        {
          readModelName: '',
          values: {},
          notValues: {},
          authorized: [],
        }
      ],
    }
  ],
}
const stateUpdateValuesFieldsBlank: Process = {
  name: '',
  trigger: {
    type: 'ActorCommand',
    commandName: '',
    authorized: [],
  },
  scenarios: [
    {
      name: '',
      inputs: {},
      expectedStateUpdates: [
        {
          entityName: '',
          values: {
            thing: '',
          },
          notValues: {
            thing: [],
          },
        }
      ],
    }
  ],
}
const visibleUpdateValuesFieldsBlank: Process = {
  name: '',
  trigger: {
    type: 'ActorCommand',
    commandName: '',
    authorized: [],
  },
  scenarios: [
    {
      name: '',
      inputs: {},
      expectedStateUpdates: [],
      expectedVisibleUpdates: [
        {
          readModelName: '',
          values: {
            thing: '',            
          },
          notValues: {
            thing: [],
          },
          authorized: [],
        }
      ],
    }
  ],
}

// Tests
// =============================================================================

describe('Validate Process', async () => {
  //
  describe('Checks for empty values', async () => {
    //
    it('- if process name is blank', async () => expect(vp.processNameBlank(typeValidOnly)).toBe(true))
    it('- if trigger command name is blank', async () => expect(vp.triggerCommandNameBlank(typeValidOnly)).toBe(true))
    it('- if trigger authorization is empty', async () => expect(vp.triggerAuthEmpty(typeValidOnly)).toBe(true))
    it('- if scenarios is empty', async () => expect(vp.scenariosEmpty(typeValidOnly)).toBe(true))
  })

  describe('Checks scenario names', async () => {
    //
    it('- if scenario name is blank', async () => expect(vp.scenarioNameBlank(scenarioValuesEmpty)).toBe(true))
    it('- if scenarios have duplicate names', async () => expect(vp.scenariosHaveDuplicateNames(duplicateScenarioNames)).toBe(true))
  })

  describe('Checks scenario preceding actions', async () => {
    //
    const precedingAction = scenarioPaValuesEmpty.scenarios[0].precedingActions[0]
    it('- if preceding action command name blank', async () => expect(vp.scenarioPaCommandNameBlank(precedingAction)).toBe(true))
    it('- if preceding action inputs are empty', async () => expect(vp.scenarioPaInputsEmpty(precedingAction)).toBe(true))
    it('- if preceding action authorization is empty', async () => expect(vp.scenarioPaAuthEmpty(precedingAction)).toBe(true))
  })

  describe('Checks scenario inputs', async () => {
    //
    const scenario = scenarioValuesEmpty.scenarios[0]
    it('- if scenario inputs are empty', async () => expect(vp.scenarioInputsEmpty(scenario)).toBe(true))
    for (const [value] of Object.entries(scenario.inputs))
      it('- if scenario input fields have blank values', async () => expect(vp.scenarioInputValueBlank(value)).toBe(true))
  })

  describe('Checks scenario expected state updates', async () => {
    //
    const scenario = scenarioValuesEmpty.scenarios[0]
    const stateUpdateBlocksMissing = stateUpdateBothValuesBlocksMissing.scenarios[0].expectedStateUpdates[0]
    const stateUpdateValsEmpty = stateUpdateValuesEmpty.scenarios[0].expectedStateUpdates[0]
    const stateUpdateValsFieldsBlank = stateUpdateValuesFieldsBlank.scenarios[0].expectedStateUpdates[0]
    it('- if state updates is empty', async () => expect(vp.scenarioStateUpdatesEmpty(scenario)).toBe(true))
    it('- if state update entity name is blank', async () => expect(vp.scenarioStateUpdateEntityNameBlank(stateUpdateValsEmpty)).toBe(true))
    it('- if state update has values or notValues blocks', async () => expect(vp.scenarioStateUpdateValuesBlocksMissing(stateUpdateBlocksMissing)).toBe(true))
    it('- if state update has values is empty, when present', async () => expect(vp.scenarioStateUpdateValuesEmpty(stateUpdateValsEmpty)).toBe(true))
    it('- if state update has notValues is empty, when present', async () => expect(vp.scenarioStateUpdateNotValuesEmpty(stateUpdateValsEmpty)).toBe(true))
    if (stateUpdateValsFieldsBlank.values && stateUpdateValsFieldsBlank.values.length > 0)
      for (const [value] of Object.entries(stateUpdateValsFieldsBlank.values))
        it('- if state update has value field is blank', async () => expect(vp.scenarioStateUpdateValueBlank(value)).toBe(true))
    if (stateUpdateValsFieldsBlank.notValues && stateUpdateValsFieldsBlank.notValues.length > 0)
      for (const [value] of Object.entries(stateUpdateValsFieldsBlank.values))
        it('- if state update has notValue field is blank', async () => expect(vp.scenarioStateUpdateNotValueBlank(value)).toBe(true))
  })

  describe('Checks scenario expected visible updates', async () => {
    //
    const scenario = scenarioValuesEmpty.scenarios[0]
    const visibleUpdateBlocksMissing = visibleUpdateBothValuesBlocksMissing.scenarios[0].expectedVisibleUpdates[0]
    const visibleUpdateValsEmpty = visibleUpdateValuesEmpty.scenarios[0].expectedVisibleUpdates[0]
    const visibleUpdateValsFieldsBlank = visibleUpdateValuesFieldsBlank.scenarios[0].expectedVisibleUpdates[0]
    it('- if visible updates is empty, when present', async () => expect(vp.scenarioVisibleUpdatesEmpty(scenario)).toBe(true))
    it('- if visible update read model name is blank', async () => expect(vp.scenarioVisibleUpdateReadModelNameBlank(visibleUpdateValsEmpty)).toBe(true))
    it('- if visible update has values or notValues blocks', async () => expect(vp.scenarioVisibleUpdateValuesBlocksMissing(visibleUpdateBlocksMissing)).toBe(true))
    it('- if visible update has values is empty, when present', async () => expect(vp.scenarioVisibleUpdateValuesEmpty(visibleUpdateValsEmpty)).toBe(true))
    it('- if visible update has notValues is empty, when present', async () => expect(vp.scenarioVisibleUpdateNotValuesEmpty(visibleUpdateValsEmpty)).toBe(true))
    if (visibleUpdateValsFieldsBlank.values && visibleUpdateValsFieldsBlank.values.length > 0)
      for (const [value] of Object.entries(visibleUpdateValsFieldsBlank.values))
        it('- if visible update has value field is blank', async () => expect(vp.scenarioVisibleUpdateValueBlank(value)).toBe(true))
    if (visibleUpdateValsFieldsBlank.notValues && visibleUpdateValsFieldsBlank.notValues.length > 0)
      for (const [value] of Object.entries(visibleUpdateValsFieldsBlank.values))
        it('- if visible update has notValue field is blank', async () => expect(vp.scenarioVisibleUpdateNotValueBlank(value)).toBe(true))
  })
})
