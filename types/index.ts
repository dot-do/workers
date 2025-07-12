import * as Schema from 'schema-dts'
// import { ulid } from 'ulidx'

type Dollarize<T> = {
  [K in keyof T as K extends `@${infer R}` ? `$${R}` : K]: Dollarize<T[K]>
}

type WithContext<T> = T & {
  $context: Dollarize<Schema.Thing>
}

export type Thing = Dollarize<Schema.Thing>
export type Event = Dollarize<Schema.Event>
export type Action = Dollarize<Schema.Action>

// const ts = new Date()

const upsert: WithContext<Action> = {
  // $id: ulid(ts.getTime()),
  $type: 'UpdateAction',
  $context: 'https://industries.directory.do', 
  // actionStatus: 'CompletedActionStatus', // should be default
  // startTime: ts.toISOString(), // should be default
  object: {
    $type: 'Thing',
    description: {
      $type: 'TextObject',
      encodingFormat: 'text/markdown',
      text: '# Hello World',
    }
  }
}