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
    readonly tid?: string | UUID // input used by test utilities
  ) {}

  public static async handle(command: OrderCocktail, register: Register): Promise<void> {
    // check inputs
    if (!command.drink || command.drink === '') throw new Error('What drink does today call for?')

    const orderId = command.tid || UUID.generate()
    const orderTakenBy = ['Erik', 'Abi'][Math.floor(Math.random() * 2)]

    // do work
    // @work01: capitalize the 'drink' value
    const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

    // register events
    if (command.drink) {
      register.events(
        new DrinkOrdered(
          // @requiredInputs: { drink: string }
          // @aReducingEntity: 'Drink'
          orderId,
          capitalize(command.drink),
          orderTakenBy
        )
      )
    }
  }
}

// @work01-inputs: { drink: 'gimlet' }
// @work01-entity: 'Drink'
// @work01-shouldHave: ['Gimlet']
