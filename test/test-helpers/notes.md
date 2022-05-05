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
an event can only be reduced by one Entity
currently an event must be reduced by an Entity
prefer the fewer number of handlers
event handlers exist to do unique work or create events not possible/appropriate in original command
