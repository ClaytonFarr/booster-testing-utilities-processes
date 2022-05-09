import { Entity, Reduces } from '@boostercloud/framework-core'
import { FruitOrdered } from '../events/fruit-ordered'

@Entity
export class Fruit {
  public constructor(
    public id: string, //
    public fruit: string,
    public orderTakenBy: string
  ) {}

  @Reduces(FruitOrdered)
  public static reduceFruitOrdered(
    event: FruitOrdered //
    // current?: Fruit
  ): Fruit {
    return new Fruit(
      event.id, //
      event.fruit,
      event.orderTakenBy
    )
  }
}
