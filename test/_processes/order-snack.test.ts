import { Process, testProcess } from '../test-helpers/helper-processes'
import { UUID } from '@boostercloud/framework-types'

// TESTS
// ===================================================================================

// AUTHORIZATION & REQUEST OPTIONS
// expect anyone to be able to submit request with only fruit
// expect anyone to be able to submit request with fruit and drink

// WORK DONE
// expect fruit name to be capitalized
// expect drink name to be capitalized
// expect if 'candy' was requested for fruit - a tattle to occur

// DATA SAVED
// expect fruit order to include name, when, who took order
// expect drink order to include name, when, who took order
// expect tattle to include when, who tattled

// DATA ACCESS / VISIBILITY
// expect anyone to be able to view what fruits have ordered and who took each order
// expect anyone to be able to view what drinks have ordered and who took each order
// expect mom to be able to view when candy was requested

const testUUID = UUID.generate()

const orderSnack: Process = {
  name: 'Order Snack',
  trigger: {
    type: 'ActorCommand',
    commandName: 'OrderSnack',
    authorized: 'all',
  },
  scenarios: [
    {
      name: 'Order healthy snack and drink',
      inputs: {
        fruit: 'apple',
        drink: 'water',
      },
      expectedStateUpdates: [
        {
          entityName: 'fruit',
          values: { fruit: 'Apple', orderTakenBy: 'string' },
        },
        {
          entityName: 'drink',
          values: { drink: 'Water', orderTakenBy: 'string' },
        },
      ],
      expectedVisibleUpdates: [
        {
          readModelName: 'fruit read model',
          values: { fruit: 'Apple', orderTakenBy: 'string' },
          authorized: 'all',
        },
        {
          readModelName: 'drink read model',
          values: { drink: 'Water', orderTakenBy: 'string' },
          authorized: 'all',
        },
      ],
    },
    {
      name: 'Order candy & tattle',
      inputs: {
        fruit: 'candy',
        tid: testUUID,
      },
      expectedStateUpdates: [
        {
          entityName: 'fruit',
          values: { fruit: 'Candy', orderTakenBy: 'string' },
        },
        {
          entityName: 'tattle',
          values: { id: testUUID, when: 'string', rat: 'string' },
        },
      ],
      expectedVisibleUpdates: [
        {
          readModelName: 'fruit read model',
          values: { fruit: 'Candy', orderTakenBy: 'string' },
          authorized: 'all',
        },
        {
          readModelName: 'tattle read model',
          values: { id: testUUID, when: 'string' },
          authorized: ['Mom'],
        },
      ],
    },
  ],
}

testProcess(orderSnack)
