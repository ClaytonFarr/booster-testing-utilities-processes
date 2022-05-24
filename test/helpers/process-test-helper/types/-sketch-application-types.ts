import type { Process } from './process-types'

// ! riffing on some possible ideas of what levels of
// ! organization / thinking sit above or as siblings to "Process" type
// ! - also review earlier sketches/ideas in `eda-types` and `eda-enum`

export interface Application {
  processes: Process[]
  views: View[]
}

export interface View {
  name: string
  components: Component[]
}

export interface Component {
  name: string
  commands: Command[]
  queries: Query[]
  childComponents: Component[]
}

export interface Command {
  name: string
}

export interface Query {
  name: string
}
