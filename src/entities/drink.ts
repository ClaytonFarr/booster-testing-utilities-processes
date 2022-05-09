import { Entity, Reduces } from '@boostercloud/framework-core'
import { DrinkOrdered } from '../events/drink-ordered'

@Entity
export class Drink {
  public constructor(
    public id: string, //
    public drink: string,
    public orderTakenBy: string
  ) {}

  @Reduces(DrinkOrdered)
  public static reduceDrinkOrdered(
    event: DrinkOrdered //
    // current?: Drink
  ): Drink {
    return new Drink(
      event.id, //
      event.drink,
      event.orderTakenBy
    )
  }
}
