import * as Schema from 'schema-dts'
// import { ulid } from 'ulidx'

type Dollarize<T> = {
  [K in keyof T as K extends `@${infer R}` ? `$${R}` : K]: Dollarize<T[K]>
} & {
  $content?: Dollarize<Schema.Thing>
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
  $context: 'https://industries.directory.do', // could be extracted from the object
  // actionStatus: 'CompletedActionStatus', // should be default
  // startTime: ts.toISOString(), // should be default
  object: {
    // $id: 'https://industries.directory.do/Professional_Services', // could be generated from context and/or name and/or first # title
    $type: 'Thing',
    // name: 'Professional Services',
    $content: '# Professional Services',
  }
}

