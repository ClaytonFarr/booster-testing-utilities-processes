import { ReadModel, Projects } from '@boostercloud/framework-core'
import { ProjectionResult } from '@boostercloud/framework-types'
import { Drink } from '../entities/drink'

@ReadModel({
  authorize: 'all',
})
export class DrinkReadModel {
  public constructor(
    public id: string, //
    public drink: string,
    public orderTakenBy: string
  ) {}

  @Projects(Drink, 'id')
  public static projectDrink(
    entity: Drink //
    // current?: DrinkReadModel
  ): ProjectionResult<DrinkReadModel> {
    return new DrinkReadModel(
      entity.id, //
      entity.drink,
      entity.orderTakenBy
    )
  }
}
