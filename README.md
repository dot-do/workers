# workers

## URI standards

- pathnames starting with `/_` are private/secure and require auth
- pathnames not starting with `/_` are public and accessibly anonymously
- public datasets & apis are available at .mw domains
  - ip.db.mw/1.1.1.1
  - asn.db.mw/7922
  - ua.db.mw/Googlebot_2.1
- queries use glob syntax `*`, `**`, and `**/*` etc
- etag / version / cache based on `?_v={sqid(ts,urlHash,contentHash)}`

## Decisions

- [ ] Order by uri, or ns + id + v
- [ ] Calculate ESM, AST, HTML on insert, or on demand?
  - Most things won't use all of the formats, and many are expensive, so will do on demand
- [ ] We still need to figure out how to manage variants and experiments 
