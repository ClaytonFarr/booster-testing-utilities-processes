import { Register, UUID } from '@boostercloud/framework-types'
import { Command } from '@boostercloud/framework-core'
import { FruitOrdered } from '../events/fruit-ordered'
import { DrinkOrdered } from '../events/drink-ordered'
import { CandyOrdered } from '../events/candy-ordered'

@Command({
  authorize: 'all',
})
export class OrderSnack {
  public constructor(
    readonly fruit: string,
    readonly drink?: string,
    readonly tid?: UUID // input used by test utilities
  ) {}

  public static async handle(command: OrderSnack, register: Register): Promise<void> {
    // validate inputs
    if (!command.fruit || command.fruit === '') throw new Error('A fruit is required.')
    if (command.drink === '') throw new Error('If you want a drink, please tell us which type.')
    if (command.drink && command.drink !== 'water') throw new Error('How about some water instead?')

    const orderId = command.tid || UUID.generate()
    const orderTakenBy = ['Cindy', 'John', 'Sue', 'Mike', 'Erik', 'Abi'][Math.floor(Math.random() * 6)]

    // do work
    const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

    // register events
    register.events(
      new FruitOrdered(
        orderId, //
        capitalize(command.fruit),
        orderTakenBy
      )
    )
    if (command.drink) {
      register.events(
        new DrinkOrdered(
          orderId, //
          capitalize(command.drink),
          orderTakenBy
        )
      )
    }
    if (command.fruit.toLowerCase() === 'candy') {
      register.events(
        new CandyOrdered(
          orderId, //
          new Date().toISOString(),
          orderTakenBy
        )
      )
    }
  }
}
