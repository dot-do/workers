// # Open Questions
// - How do we pass context/user/tenant/subscription information into the function?
// - How do we handle authentication/authorization?
// - How do we enforce/limit free/paid tiers (like say 3 free subdomains, etc)?

export const searchSubdomains = (subdomain: string) => {
  // TODO: figure out API/Syntax/implementation to search for lack of subdomain existence
  // const results = db.domains.find`https://builder.domains/${subdomain}.*`
}

export const claimSubdomain = (subdomain: string) => {
  // TODO: figure out API/Syntax/implementation to search for lack of subdomain existence
  // const results = db.domains.find`https://builder.domains/${subdomain}.*`
}

export const releaseSubdomain = (subdomain: string) => {
  // TODO: figure out API/Syntax/implementation to search for lack of subdomain existence
  // const results = db.domains.find`https://builder.domains/${subdomain}.*`
}

export const listSubdomains = (context: any) => {
  // TODO: figure out how to pass current user/tenant context in the function?
  // const results = db.domains.find({ user: context.user.id })
}

export const getSubdomainConfig = (subdomain: string) => {
  // TODO: figure out API/Syntax/implementation to search for lack of subdomain existence
  // const results = db.domains.find`https://builder.domains/${subdomain}.*`
}

export const setSubdomainConfig = (subdomain: string, config: any) => {
  // TODO: figure out API/Syntax/implementation to search for lack of subdomain existence
  // const results = db.domains.find`https://builder.domains/${subdomain}.*`
}