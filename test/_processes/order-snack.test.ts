import { Process, testProcess } from '../test-helpers/helper-processes'
import { UUID } from '@boostercloud/framework-types'

// ORDER SNACK PROCESS
// ===================================================================================
// <anyone> should be able to SUBMIT
// - a fruit
// - an optional drink
// app should DO WORK to
// - capitalize fruit name
// - capitalize drink name
// - if 'candy' was requested for fruit - make <tattle> to Mom
// app should TRACK
// - <fruit>: name, when, who took order
// - <drink>: name, when, who took order
// - <tattle>: when, who tattled
// <anyone> should be able to VIEW
// - what fruits have been ordered, when, and who took order
// - what drinks have been ordered, when, and who took order
// <Mom> should be able to VIEW
// - when candy was requested

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
  confirmFiles: true,
  trigger: {
    type: 'ActorCommand',
    commandName: 'OrderSnack',
    authorized: 'all',
  },
  scenarios: [
    {
      name: 'Order a healthy snack',
      inputs: [
        { name: 'fruit', value: 'apple' },
        { name: 'drink', value: 'water' },
      ],
      expectedStateUpdates: [
        {
          entityName: 'fruit',
          values: [{ fieldName: 'fruit', value: 'Apple' }],
        },
        {
          entityName: 'drink',
          values: [{ fieldName: 'drink', value: 'Water' }],
        },
      ],
      expectedVisibleUpdates: [
        {
          readModelName: 'fruit read model',
          values: [{ fieldName: 'fruit', value: 'Apple' }],
          authorized: 'all',
        },
        {
          readModelName: 'drink read model',
          values: [{ fieldName: 'drink', value: 'Water' }],
          authorized: 'all',
        },
      ],
    },
    {
      name: 'Order candy',
      inputs: [
        { name: 'fruit', value: 'candy' },
        { name: 'tid', value: testUUID },
      ],
      expectedStateUpdates: [
        {
          entityName: 'fruit',
          values: [{ fieldName: 'fruit', value: 'Candy' }],
        },
        {
          entityName: 'tattle',
          values: [{ fieldName: 'id', value: testUUID }],
        },
      ],
      expectedVisibleUpdates: [
        {
          readModelName: 'fruit read model',
          values: [{ fieldName: 'fruit', value: 'Candy' }],
          authorized: 'all',
        },
        {
          readModelName: 'tattle read model',
          values: [{ fieldName: 'id', value: testUUID }],
          authorized: ['Mom'],
        },
      ],
    },
  ],
}

testProcess(orderSnack)
