export interface Event {
  id: string
  type: string
}

export type $Function = {
  (...args: any[]): Promise<any>
  (strings: TemplateStringsArray, ...exprs: any[]): Promise<any>
}

export type $Functions = {
  [key: string]: $Function
} & $Function

export type $Event<T extends any = any> = {
  type: string
  data: T
}

export type $EventHandler<T extends any = any> = (event: $Event<T>, $: $Context) => Promise<any>

export type $Events = {
  on: (event: string, handler: $EventHandler) => void
  every: (interval: string, handler: $EventHandler) => void
  send: (event: Event) => Promise<any>
}

export type $AI = {
  generateText: $Function
  generateObject: $Function
} & {
  [key: string]: $Function
} & $Function

export type $API = {
  [key: string]: $Function
} & $Function


export type $DB = {
  get: (id: string) => Promise<any>
  set: (id: string, data: any) => Promise<any>
  list: (query: string) => Promise<any>
  query: (query: string) => Promise<any>
  search: (query: string) => Promise<any>
  create: (data: any) => Promise<any>
  update: (id: string, data: any) => Promise<any>
  delete: (id: string) => Promise<any>
} & {
  [key: string]: $Function
} & $Function

export type $Context = {
  $: $Context
  ai: $AI
  api: $API
  db: $DB
  入: $Functions,
  巛: $Functions,
  彡: $DB,
  人: $Functions,
  回: 'nouns',
  亘: 'verbs',
  目: 'things',
  田: 'triggers',
  卌: 'searches',
  口: 'actions',
} & $Functions

export interface $Data {
  id: string
  type: string
}

export const $: $Context = new Proxy({}, {
  get: (target, prop) => {
    // return (...args: any[]) => {
    //   return target[prop as keyof $Context](...args)
    // }
  }
}) as $Context

$.send()