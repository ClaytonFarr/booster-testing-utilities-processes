import { Event } from '@boostercloud/framework-core'

@Event
export class CandyOrdered {
  public constructor(
    readonly id: string, //
    readonly when: string,
    readonly rat: string
  ) {}

  public entityID(): string {
    return this.id
  }
}
