import { Register, UUID } from '@boostercloud/framework-types'
import { Command } from '@boostercloud/framework-core'
import { DrinkOrdered } from '../events/drink-ordered'
import { Mom, Dad } from '../roles'

@Command({
  authorize: [Mom, Dad],
})
export class OrderCocktail {
  public constructor(
    readonly drink: string,
    readonly tid?: string // input used by test utilities
  ) {}

  public static async handle(command: OrderCocktail, register: Register): Promise<void> {
    // check inputs
    if (!command.drink || command.drink === '') throw new Error('What drink does today call for?')

    const orderId = command.tid || UUID.generate().toString()
    const orderTakenBy = ['Erik', 'Abi'][Math.floor(Math.random() * 2)]

    // do work
    const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

    // register events
    if (command.drink) {
      register.events(
        new DrinkOrdered(
          orderId, //
          capitalize(command.drink),
          orderTakenBy
        )
      )
    }
  }
}
