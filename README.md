# Booster Process Driven Development & Testing

NOTES

- testing will check if GraphQL can be connected to
  - need to start local server before running tests (even for input validation and file checks)
- new Booster projects must have following for GraphQL server to connectable
  - event
  - entity that reduces event
- when adding new files, for GraphQL server to run -
  - commands / read models must have some auth defined
  - roles files must have some content
- scenario state / visible update tests
  - testable values are currently limited to standard types (string, number, boolean, UUID);
    cannot use custom types as values (even if they resolve to standard type, like an enum)
    or objects (e.g. testing for values of fields within an object)
- currently cannot test if shouldNotValues fields do not exist
  - e.g. notValues: { stripeId: 'string' }
  - field must exist in schema; e.g. notValues: { active: true }


obsidian://open?vault=Notes&file=Booster%20Testing%20Notes

From trigger can infer:

- Command that should exist, and correct authorization
- Roles that should exist within roles.ts

From scenarios can infer:

- Command inputs that should exist
- Command inputs that should be required
- Command input types
- Entities that should exist
- Entity fields that should exist (with data types)
- Read Models that should exist, and correct authorization
- Read Model fields that should exist (with data types)
- Entities that should be projected within Read Model (via Command -> Read Model name convention?)
- Implicit work that should occur to reach expected state
- ? what about processes that don't affect internal state

Not directly known:

- specific work that should occur (may not matter as long as expected state is achieved)
- registered Events (could read from Command)
- possible intermediate Event Handlers (could compare reduced events in Entities to Commands/Handlers)

Event / Event-Handler factors:

- an event can only be reduced by one Entity
- currently an event must be reduced by an Entity
- prefer fewest number of handlers
- event handlers exist to do unique work or create events not possible/appropriate in original command
