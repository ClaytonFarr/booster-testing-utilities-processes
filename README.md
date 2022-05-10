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
