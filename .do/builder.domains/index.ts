// # Open Questions
// - Do we allow arbitray args in functions, or require a single object like React Props?
// - How can we enable unit tests & AI dev/test/PR/deploy?
// - How do we pass context/user/tenant/subscription information into the function?
// - How do we handle authentication/authorization?
// - How do we enforce/limit free/paid tiers (like say 3 free subdomains, etc)?
// - How do we expose functions via MCP?
// - How do we expose functions via REST?


type Context = {
  user: {
    id: string
    email: string
    name: string
  }
  tenant: {
    id: string
    name: string
  }
  subscription: {
    id: string
    plan: string
    status: string
  }
}

export const searchSubdomains = (props: { subdomain: string }, context: Context) => {
  // TODO: figure out API/Syntax/implementation to search for lack of subdomain existence
  // const results = db.domains.find`https://builder.domains/${subdomain}.*`
}

export const claimSubdomain = (props: { subdomain: string }, context: Context) => {
  // TODO: figure out API/Syntax/implementation to search for lack of subdomain existence
  // const results = db.domains.find`https://builder.domains/${subdomain}.*`
}

export const releaseSubdomain = (props: { subdomain: string }, context: Context) => {
  // TODO: figure out API/Syntax/implementation to search for lack of subdomain existence
  // const results = db.domains.find`https://builder.domains/${subdomain}.*`
}

export const listSubdomains = (props: { limit?: number }, context: Context) => {
  // TODO: figure out how to pass current user/tenant context in the function?
  // const results = db.domains.find({ user: context.user.id })
}

export const getSubdomainConfig = (props: { subdomain: string }, context: Context) => {
  // TODO: figure out API/Syntax/implementation to search for lack of subdomain existence
  // const results = db.domains.find`https://builder.domains/${subdomain}.*`
}

export const setSubdomainConfig = (props: { subdomain: string, config: any }, context: Context) => {
  // TODO: figure out API/Syntax/implementation to search for lack of subdomain existence
  // const results = db.domains.find`https://builder.domains/${subdomain}.*`
}