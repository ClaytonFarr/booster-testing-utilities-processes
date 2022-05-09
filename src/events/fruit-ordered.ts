import { Event } from '@boostercloud/framework-core'

@Event
export class FruitOrdered {
  public constructor(
    readonly id: string, //
    readonly fruit: string,
    readonly orderTakenBy: string
  ) {}

  public entityID(): string {
    return this.id
  }
}
