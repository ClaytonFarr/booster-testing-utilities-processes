import type { UUID } from '@boostercloud/framework-types'

export interface CommandInput {
  name: string
  type: string
  required?: boolean
  validExample?: string | number | boolean | UUID
}
