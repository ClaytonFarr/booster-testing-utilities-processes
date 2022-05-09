import { Process, testProcess } from '../test-helpers'
import { UUID } from '@boostercloud/framework-types'
const testId = UUID.generate().toString()

const orderSnack: Process = {
  name: 'Order Snack',
  trigger: {
    type: 'ActorCommand',
    commandName: 'Order Snack',
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
        tid: testId,
      },
      expectedStateUpdates: [
        {
          entityName: 'fruit',
          values: { fruit: 'Candy', orderTakenBy: 'string' },
        },
        {
          entityName: 'tattle',
          values: { id: testId, when: 'string', rat: 'string' },
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
          values: { id: testId, when: 'string' },
          authorized: ['Mom'],
        },
      ],
    },
  ],
}

testProcess(orderSnack)
