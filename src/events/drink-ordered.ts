import { Event } from '@boostercloud/framework-core'

@Event
export class DrinkOrdered {
  public constructor(
    readonly id: string, //
    readonly drink: string,
    readonly orderTakenBy: string
  ) {}

  public entityID(): string {
    return this.id
  }
}
