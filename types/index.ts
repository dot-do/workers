import { Action } from 'schema-dts'


export type Event = {
  $id?: string
  $type?: string
  $context?: any
} & Omit<Action, 'type'>
