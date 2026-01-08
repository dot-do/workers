[**@dotdo/workers API Documentation v0.0.1**](../../../README.md)

***

[@dotdo/workers API Documentation](../../../modules.md) / [objects/site](../README.md) / Site

# Class: Site

Defined in: [objects/site/index.ts:48](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L48)

Site Durable Object

Manages a website with:
- Site profile and settings
- Page and post management
- Media library
- SEO configuration
- Analytics and visitor tracking
- Form submissions
- Multi-site management

## Extends

- [`DO`](../../variables/DO.md)

## Constructors

### Constructor

> **new Site**(): `Site`

#### Returns

`Site`

#### Inherited from

`DO.constructor`

## Properties

### db

> **db**: `DrizzleD1Database`\<`__module`\> & `object`

Defined in: [objects/site/index.ts:49](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L49)

***

### env

> **env**: [`SiteEnv`](../interfaces/SiteEnv.md)

Defined in: [objects/site/index.ts:50](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L50)

## Methods

### create()

> **create**(`data`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/site/index.ts:59](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L59)

Create a new site

#### Parameters

##### data

`Omit`\<`NewSite`, `"id"` \| `"createdAt"` \| `"updatedAt"`\>

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

***

### get()

> **get**(`id`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

Defined in: [objects/site/index.ts:81](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L81)

Get site by ID

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

***

### getBySlug()

> **getBySlug**(`slug`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

Defined in: [objects/site/index.ts:92](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L92)

Get site by slug

#### Parameters

##### slug

`string`

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

***

### getByDomain()

> **getByDomain**(`domain`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

Defined in: [objects/site/index.ts:103](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L103)

Get site by custom domain

#### Parameters

##### domain

`string`

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

***

### update()

> **update**(`id`, `data`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/site/index.ts:114](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L114)

Update site details

#### Parameters

##### id

`string`

##### data

`Partial`\<`NewSite`\>

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

***

### publish()

> **publish**(`id`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/site/index.ts:128](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L128)

Publish a site

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

***

### unpublish()

> **unpublish**(`id`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/site/index.ts:142](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L142)

Unpublish a site (set to draft)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

***

### archive()

> **archive**(`id`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/site/index.ts:156](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L156)

Archive a site (soft delete)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

***

### restore()

> **restore**(`id`): `Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/site/index.ts:170](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L170)

Restore an archived site

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

***

### list()

> **list**(`includeArchived`): `Promise`\<`object`[]\>

Defined in: [objects/site/index.ts:184](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L184)

List all sites

#### Parameters

##### includeArchived

`boolean` = `false`

#### Returns

`Promise`\<`object`[]\>

***

### createPage()

> **createPage**(`data`): `Promise`\<\{ `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `id`: `string`; `isHomepage`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `parentId`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `sortOrder`: `number` \| `null`; `template`: `string` \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/site/index.ts:202](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L202)

Create a new page

#### Parameters

##### data

`Omit`\<`NewPage`, `"id"` \| `"createdAt"` \| `"updatedAt"`\>

#### Returns

`Promise`\<\{ `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `id`: `string`; `isHomepage`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `parentId`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `sortOrder`: `number` \| `null`; `template`: `string` \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; \}\>

***

### getPage()

> **getPage**(`id`): `Promise`\<\{ `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `id`: `string`; `isHomepage`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `parentId`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `sortOrder`: `number` \| `null`; `template`: `string` \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

Defined in: [objects/site/index.ts:216](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L216)

Get page by ID

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `id`: `string`; `isHomepage`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `parentId`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `sortOrder`: `number` \| `null`; `template`: `string` \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

***

### getPageBySlug()

> **getPageBySlug**(`siteId`, `slug`): `Promise`\<\{ `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `id`: `string`; `isHomepage`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `parentId`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `sortOrder`: `number` \| `null`; `template`: `string` \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

Defined in: [objects/site/index.ts:227](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L227)

Get page by slug within a site

#### Parameters

##### siteId

`string`

##### slug

`string`

#### Returns

`Promise`\<\{ `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `id`: `string`; `isHomepage`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `parentId`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `sortOrder`: `number` \| `null`; `template`: `string` \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

***

### getHomepage()

> **getHomepage**(`siteId`): `Promise`\<\{ `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `id`: `string`; `isHomepage`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `parentId`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `sortOrder`: `number` \| `null`; `template`: `string` \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

Defined in: [objects/site/index.ts:238](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L238)

Get homepage for a site

#### Parameters

##### siteId

`string`

#### Returns

`Promise`\<\{ `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `id`: `string`; `isHomepage`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `parentId`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `sortOrder`: `number` \| `null`; `template`: `string` \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

***

### updatePage()

> **updatePage**(`id`, `data`): `Promise`\<\{ `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `id`: `string`; `isHomepage`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `parentId`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `sortOrder`: `number` \| `null`; `template`: `string` \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/site/index.ts:249](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L249)

Update a page

#### Parameters

##### id

`string`

##### data

`Partial`\<`NewPage`\>

#### Returns

`Promise`\<\{ `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `id`: `string`; `isHomepage`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `parentId`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `sortOrder`: `number` \| `null`; `template`: `string` \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; \}\>

***

### publishPage()

> **publishPage**(`id`): `Promise`\<\{ `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `id`: `string`; `isHomepage`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `parentId`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `sortOrder`: `number` \| `null`; `template`: `string` \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/site/index.ts:263](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L263)

Publish a page

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `id`: `string`; `isHomepage`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `parentId`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `sortOrder`: `number` \| `null`; `template`: `string` \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; \}\>

***

### deletePage()

> **deletePage**(`id`): `Promise`\<`void`\>

Defined in: [objects/site/index.ts:277](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L277)

Delete a page

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### listPages()

> **listPages**(`siteId`, `publishedOnly`): `Promise`\<`object`[]\>

Defined in: [objects/site/index.ts:285](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L285)

List pages for a site

#### Parameters

##### siteId

`string`

##### publishedOnly

`boolean` = `false`

#### Returns

`Promise`\<`object`[]\>

***

### createPost()

> **createPost**(`data`): `Promise`\<\{ `author`: `string` \| `null`; `authorId`: `string` \| `null`; `category`: `string` \| `null`; `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `excerpt`: `string` \| `null`; `featuredImage`: `string` \| `null`; `id`: `string`; `isFeatured`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `readTime`: `number` \| `null`; `scheduledAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `status`: `string` \| `null`; `tags`: `string`[] \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; `views`: `number` \| `null`; \}\>

Defined in: [objects/site/index.ts:307](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L307)

Create a new blog post

#### Parameters

##### data

`Omit`\<`NewPost`, `"id"` \| `"createdAt"` \| `"updatedAt"`\>

#### Returns

`Promise`\<\{ `author`: `string` \| `null`; `authorId`: `string` \| `null`; `category`: `string` \| `null`; `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `excerpt`: `string` \| `null`; `featuredImage`: `string` \| `null`; `id`: `string`; `isFeatured`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `readTime`: `number` \| `null`; `scheduledAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `status`: `string` \| `null`; `tags`: `string`[] \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; `views`: `number` \| `null`; \}\>

***

### getPost()

> **getPost**(`id`): `Promise`\<\{ `author`: `string` \| `null`; `authorId`: `string` \| `null`; `category`: `string` \| `null`; `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `excerpt`: `string` \| `null`; `featuredImage`: `string` \| `null`; `id`: `string`; `isFeatured`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `readTime`: `number` \| `null`; `scheduledAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `status`: `string` \| `null`; `tags`: `string`[] \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; `views`: `number` \| `null`; \} \| `undefined`\>

Defined in: [objects/site/index.ts:329](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L329)

Get post by ID

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `author`: `string` \| `null`; `authorId`: `string` \| `null`; `category`: `string` \| `null`; `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `excerpt`: `string` \| `null`; `featuredImage`: `string` \| `null`; `id`: `string`; `isFeatured`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `readTime`: `number` \| `null`; `scheduledAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `status`: `string` \| `null`; `tags`: `string`[] \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; `views`: `number` \| `null`; \} \| `undefined`\>

***

### getPostBySlug()

> **getPostBySlug**(`siteId`, `slug`): `Promise`\<\{ `author`: `string` \| `null`; `authorId`: `string` \| `null`; `category`: `string` \| `null`; `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `excerpt`: `string` \| `null`; `featuredImage`: `string` \| `null`; `id`: `string`; `isFeatured`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `readTime`: `number` \| `null`; `scheduledAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `status`: `string` \| `null`; `tags`: `string`[] \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; `views`: `number` \| `null`; \} \| `undefined`\>

Defined in: [objects/site/index.ts:340](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L340)

Get post by slug within a site

#### Parameters

##### siteId

`string`

##### slug

`string`

#### Returns

`Promise`\<\{ `author`: `string` \| `null`; `authorId`: `string` \| `null`; `category`: `string` \| `null`; `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `excerpt`: `string` \| `null`; `featuredImage`: `string` \| `null`; `id`: `string`; `isFeatured`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `readTime`: `number` \| `null`; `scheduledAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `status`: `string` \| `null`; `tags`: `string`[] \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; `views`: `number` \| `null`; \} \| `undefined`\>

***

### updatePost()

> **updatePost**(`id`, `data`): `Promise`\<\{ `author`: `string` \| `null`; `authorId`: `string` \| `null`; `category`: `string` \| `null`; `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `excerpt`: `string` \| `null`; `featuredImage`: `string` \| `null`; `id`: `string`; `isFeatured`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `readTime`: `number` \| `null`; `scheduledAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `status`: `string` \| `null`; `tags`: `string`[] \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; `views`: `number` \| `null`; \}\>

Defined in: [objects/site/index.ts:351](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L351)

Update a post

#### Parameters

##### id

`string`

##### data

`Partial`\<`NewPost`\>

#### Returns

`Promise`\<\{ `author`: `string` \| `null`; `authorId`: `string` \| `null`; `category`: `string` \| `null`; `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `excerpt`: `string` \| `null`; `featuredImage`: `string` \| `null`; `id`: `string`; `isFeatured`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `readTime`: `number` \| `null`; `scheduledAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `status`: `string` \| `null`; `tags`: `string`[] \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; `views`: `number` \| `null`; \}\>

***

### publishPost()

> **publishPost**(`id`): `Promise`\<\{ `author`: `string` \| `null`; `authorId`: `string` \| `null`; `category`: `string` \| `null`; `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `excerpt`: `string` \| `null`; `featuredImage`: `string` \| `null`; `id`: `string`; `isFeatured`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `readTime`: `number` \| `null`; `scheduledAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `status`: `string` \| `null`; `tags`: `string`[] \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; `views`: `number` \| `null`; \}\>

Defined in: [objects/site/index.ts:372](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L372)

Publish a post

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `author`: `string` \| `null`; `authorId`: `string` \| `null`; `category`: `string` \| `null`; `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `excerpt`: `string` \| `null`; `featuredImage`: `string` \| `null`; `id`: `string`; `isFeatured`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `readTime`: `number` \| `null`; `scheduledAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `status`: `string` \| `null`; `tags`: `string`[] \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; `views`: `number` \| `null`; \}\>

***

### schedulePost()

> **schedulePost**(`id`, `scheduledAt`): `Promise`\<\{ `author`: `string` \| `null`; `authorId`: `string` \| `null`; `category`: `string` \| `null`; `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `excerpt`: `string` \| `null`; `featuredImage`: `string` \| `null`; `id`: `string`; `isFeatured`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `readTime`: `number` \| `null`; `scheduledAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `status`: `string` \| `null`; `tags`: `string`[] \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; `views`: `number` \| `null`; \}\>

Defined in: [objects/site/index.ts:386](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L386)

Schedule a post for future publication

#### Parameters

##### id

`string`

##### scheduledAt

`Date`

#### Returns

`Promise`\<\{ `author`: `string` \| `null`; `authorId`: `string` \| `null`; `category`: `string` \| `null`; `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `excerpt`: `string` \| `null`; `featuredImage`: `string` \| `null`; `id`: `string`; `isFeatured`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `readTime`: `number` \| `null`; `scheduledAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `status`: `string` \| `null`; `tags`: `string`[] \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; `views`: `number` \| `null`; \}\>

***

### incrementPostViews()

> **incrementPostViews**(`id`): `Promise`\<\{ `author`: `string` \| `null`; `authorId`: `string` \| `null`; `category`: `string` \| `null`; `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `excerpt`: `string` \| `null`; `featuredImage`: `string` \| `null`; `id`: `string`; `isFeatured`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `readTime`: `number` \| `null`; `scheduledAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `status`: `string` \| `null`; `tags`: `string`[] \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; `views`: `number` \| `null`; \}\>

Defined in: [objects/site/index.ts:400](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L400)

Increment post view count

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `author`: `string` \| `null`; `authorId`: `string` \| `null`; `category`: `string` \| `null`; `content`: `string` \| `null`; `contentType`: `string` \| `null`; `createdAt`: `Date` \| `null`; `excerpt`: `string` \| `null`; `featuredImage`: `string` \| `null`; `id`: `string`; `isFeatured`: `boolean` \| `null`; `isPublished`: `boolean` \| `null`; `metaDescription`: `string` \| `null`; `metaTitle`: `string` \| `null`; `ogImage`: `string` \| `null`; `publishedAt`: `Date` \| `null`; `readTime`: `number` \| `null`; `scheduledAt`: `Date` \| `null`; `siteId`: `string`; `slug`: `string`; `status`: `string` \| `null`; `tags`: `string`[] \| `null`; `title`: `string`; `updatedAt`: `Date` \| `null`; `views`: `number` \| `null`; \}\>

***

### deletePost()

> **deletePost**(`id`): `Promise`\<`void`\>

Defined in: [objects/site/index.ts:412](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L412)

Delete a post

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### listPosts()

> **listPosts**(`siteId`, `options`): `Promise`\<`object`[]\>

Defined in: [objects/site/index.ts:420](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L420)

List posts for a site

#### Parameters

##### siteId

`string`

##### options

###### publishedOnly?

`boolean`

###### category?

`string`

###### limit?

`number`

###### offset?

`number`

#### Returns

`Promise`\<`object`[]\>

***

### getFeaturedPosts()

> **getFeaturedPosts**(`siteId`, `limit`): `Promise`\<`object`[]\>

Defined in: [objects/site/index.ts:446](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L446)

Get featured posts

#### Parameters

##### siteId

`string`

##### limit

`number` = `5`

#### Returns

`Promise`\<`object`[]\>

***

### addMedia()

> **addMedia**(`data`): `Promise`\<\{ `altText`: `string` \| `null`; `caption`: `string` \| `null`; `createdAt`: `Date` \| `null`; `filename`: `string`; `folder`: `string` \| `null`; `height`: `number` \| `null`; `id`: `string`; `mimeType`: `string`; `originalName`: `string` \| `null`; `siteId`: `string`; `size`: `number`; `thumbnailUrl`: `string` \| `null`; `uploadedBy`: `string` \| `null`; `url`: `string`; `width`: `number` \| `null`; \}\>

Defined in: [objects/site/index.ts:468](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L468)

Add media to library

#### Parameters

##### data

`Omit`\<`NewMedia`, `"id"` \| `"createdAt"`\>

#### Returns

`Promise`\<\{ `altText`: `string` \| `null`; `caption`: `string` \| `null`; `createdAt`: `Date` \| `null`; `filename`: `string`; `folder`: `string` \| `null`; `height`: `number` \| `null`; `id`: `string`; `mimeType`: `string`; `originalName`: `string` \| `null`; `siteId`: `string`; `size`: `number`; `thumbnailUrl`: `string` \| `null`; `uploadedBy`: `string` \| `null`; `url`: `string`; `width`: `number` \| `null`; \}\>

***

### getMedia()

> **getMedia**(`id`): `Promise`\<\{ `altText`: `string` \| `null`; `caption`: `string` \| `null`; `createdAt`: `Date` \| `null`; `filename`: `string`; `folder`: `string` \| `null`; `height`: `number` \| `null`; `id`: `string`; `mimeType`: `string`; `originalName`: `string` \| `null`; `siteId`: `string`; `size`: `number`; `thumbnailUrl`: `string` \| `null`; `uploadedBy`: `string` \| `null`; `url`: `string`; `width`: `number` \| `null`; \} \| `undefined`\>

Defined in: [objects/site/index.ts:482](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L482)

Get media by ID

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `altText`: `string` \| `null`; `caption`: `string` \| `null`; `createdAt`: `Date` \| `null`; `filename`: `string`; `folder`: `string` \| `null`; `height`: `number` \| `null`; `id`: `string`; `mimeType`: `string`; `originalName`: `string` \| `null`; `siteId`: `string`; `size`: `number`; `thumbnailUrl`: `string` \| `null`; `uploadedBy`: `string` \| `null`; `url`: `string`; `width`: `number` \| `null`; \} \| `undefined`\>

***

### updateMedia()

> **updateMedia**(`id`, `data`): `Promise`\<\{ `altText`: `string` \| `null`; `caption`: `string` \| `null`; `createdAt`: `Date` \| `null`; `filename`: `string`; `folder`: `string` \| `null`; `height`: `number` \| `null`; `id`: `string`; `mimeType`: `string`; `originalName`: `string` \| `null`; `siteId`: `string`; `size`: `number`; `thumbnailUrl`: `string` \| `null`; `uploadedBy`: `string` \| `null`; `url`: `string`; `width`: `number` \| `null`; \}\>

Defined in: [objects/site/index.ts:493](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L493)

Update media metadata

#### Parameters

##### id

`string`

##### data

`Partial`\<`NewMedia`\>

#### Returns

`Promise`\<\{ `altText`: `string` \| `null`; `caption`: `string` \| `null`; `createdAt`: `Date` \| `null`; `filename`: `string`; `folder`: `string` \| `null`; `height`: `number` \| `null`; `id`: `string`; `mimeType`: `string`; `originalName`: `string` \| `null`; `siteId`: `string`; `size`: `number`; `thumbnailUrl`: `string` \| `null`; `uploadedBy`: `string` \| `null`; `url`: `string`; `width`: `number` \| `null`; \}\>

***

### deleteMedia()

> **deleteMedia**(`id`): `Promise`\<`void`\>

Defined in: [objects/site/index.ts:507](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L507)

Delete media

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`void`\>

***

### listMedia()

> **listMedia**(`siteId`, `folder?`, `limit?`, `offset?`): `Promise`\<`object`[]\>

Defined in: [objects/site/index.ts:515](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L515)

List media for a site

#### Parameters

##### siteId

`string`

##### folder?

`string`

##### limit?

`number` = `50`

##### offset?

`number` = `0`

#### Returns

`Promise`\<`object`[]\>

***

### getSeoSettings()

> **getSeoSettings**(`siteId`): `Promise`\<\{ `bingSiteVerification`: `string` \| `null`; `canonicalUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `defaultDescription`: `string` \| `null`; `defaultOgImage`: `string` \| `null`; `defaultTitle`: `string` \| `null`; `googleSiteVerification`: `string` \| `null`; `id`: `string`; `robotsTxt`: `string` \| `null`; `siteId`: `string`; `sitemapEnabled`: `boolean` \| `null`; `structuredData`: `unknown`; `titleTemplate`: `string` \| `null`; `twitterCardType`: `string` \| `null`; `twitterHandle`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

Defined in: [objects/site/index.ts:537](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L537)

Get SEO settings for a site

#### Parameters

##### siteId

`string`

#### Returns

`Promise`\<\{ `bingSiteVerification`: `string` \| `null`; `canonicalUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `defaultDescription`: `string` \| `null`; `defaultOgImage`: `string` \| `null`; `defaultTitle`: `string` \| `null`; `googleSiteVerification`: `string` \| `null`; `id`: `string`; `robotsTxt`: `string` \| `null`; `siteId`: `string`; `sitemapEnabled`: `boolean` \| `null`; `structuredData`: `unknown`; `titleTemplate`: `string` \| `null`; `twitterCardType`: `string` \| `null`; `twitterHandle`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

***

### updateSeoSettings()

> **updateSeoSettings**(`siteId`, `data`): `Promise`\<\{ `bingSiteVerification`: `string` \| `null`; `canonicalUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `defaultDescription`: `string` \| `null`; `defaultOgImage`: `string` \| `null`; `defaultTitle`: `string` \| `null`; `googleSiteVerification`: `string` \| `null`; `id`: `string`; `robotsTxt`: `string` \| `null`; `siteId`: `string`; `sitemapEnabled`: `boolean` \| `null`; `structuredData`: `unknown`; `titleTemplate`: `string` \| `null`; `twitterCardType`: `string` \| `null`; `twitterHandle`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/site/index.ts:548](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L548)

Update SEO settings

#### Parameters

##### siteId

`string`

##### data

`Partial`\<`Omit`\<`SeoSettings`, `"id"` \| `"siteId"` \| `"createdAt"` \| `"updatedAt"`\>\>

#### Returns

`Promise`\<\{ `bingSiteVerification`: `string` \| `null`; `canonicalUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `defaultDescription`: `string` \| `null`; `defaultOgImage`: `string` \| `null`; `defaultTitle`: `string` \| `null`; `googleSiteVerification`: `string` \| `null`; `id`: `string`; `robotsTxt`: `string` \| `null`; `siteId`: `string`; `sitemapEnabled`: `boolean` \| `null`; `structuredData`: `unknown`; `titleTemplate`: `string` \| `null`; `twitterCardType`: `string` \| `null`; `twitterHandle`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \}\>

***

### generateSitemap()

> **generateSitemap**(`siteId`): `Promise`\<`object`[]\>

Defined in: [objects/site/index.ts:565](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L565)

Generate sitemap data for a site

#### Parameters

##### siteId

`string`

#### Returns

`Promise`\<`object`[]\>

***

### trackPageView()

> **trackPageView**(`data`): `Promise`\<`void`\>

Defined in: [objects/site/index.ts:603](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L603)

Track a page view

#### Parameters

##### data

`Omit`\<`PageView`, `"id"` \| `"createdAt"`\>

#### Returns

`Promise`\<`void`\>

***

### getAnalytics()

> **getAnalytics**(`siteId`, `startDate?`, `endDate?`): `Promise`\<\{ `pageViews`: `number`; `uniqueVisitors`: `number`; `topPages`: `object`[]; `topReferrers`: `object`[]; \}\>

Defined in: [objects/site/index.ts:611](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L611)

Get analytics summary for a site

#### Parameters

##### siteId

`string`

##### startDate?

`Date`

##### endDate?

`Date`

#### Returns

`Promise`\<\{ `pageViews`: `number`; `uniqueVisitors`: `number`; `topPages`: `object`[]; `topReferrers`: `object`[]; \}\>

***

### getRealtimeVisitors()

> **getRealtimeVisitors**(`siteId`): `Promise`\<`number`\>

Defined in: [objects/site/index.ts:672](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L672)

Get real-time visitor count (last 5 minutes)

#### Parameters

##### siteId

`string`

#### Returns

`Promise`\<`number`\>

***

### submitForm()

> **submitForm**(`data`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `data`: `unknown`; `email`: `string` \| `null`; `formId`: `string`; `formName`: `string` \| `null`; `id`: `string`; `ipAddress`: `string` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `pageId`: `string` \| `null`; `referrer`: `string` \| `null`; `repliedAt`: `Date` \| `null`; `siteId`: `string`; `status`: `string` \| `null`; `userAgent`: `string` \| `null`; \}\>

Defined in: [objects/site/index.ts:693](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L693)

Submit a form

#### Parameters

##### data

`Omit`\<`FormSubmission`, `"id"` \| `"createdAt"`\>

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `data`: `unknown`; `email`: `string` \| `null`; `formId`: `string`; `formName`: `string` \| `null`; `id`: `string`; `ipAddress`: `string` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `pageId`: `string` \| `null`; `referrer`: `string` \| `null`; `repliedAt`: `Date` \| `null`; `siteId`: `string`; `status`: `string` \| `null`; `userAgent`: `string` \| `null`; \}\>

***

### getFormSubmission()

> **getFormSubmission**(`id`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `data`: `unknown`; `email`: `string` \| `null`; `formId`: `string`; `formName`: `string` \| `null`; `id`: `string`; `ipAddress`: `string` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `pageId`: `string` \| `null`; `referrer`: `string` \| `null`; `repliedAt`: `Date` \| `null`; `siteId`: `string`; `status`: `string` \| `null`; `userAgent`: `string` \| `null`; \} \| `undefined`\>

Defined in: [objects/site/index.ts:709](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L709)

Get form submission by ID

#### Parameters

##### id

`string`

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `data`: `unknown`; `email`: `string` \| `null`; `formId`: `string`; `formName`: `string` \| `null`; `id`: `string`; `ipAddress`: `string` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `pageId`: `string` \| `null`; `referrer`: `string` \| `null`; `repliedAt`: `Date` \| `null`; `siteId`: `string`; `status`: `string` \| `null`; `userAgent`: `string` \| `null`; \} \| `undefined`\>

***

### updateFormSubmission()

> **updateFormSubmission**(`id`, `data`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `data`: `unknown`; `email`: `string` \| `null`; `formId`: `string`; `formName`: `string` \| `null`; `id`: `string`; `ipAddress`: `string` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `pageId`: `string` \| `null`; `referrer`: `string` \| `null`; `repliedAt`: `Date` \| `null`; `siteId`: `string`; `status`: `string` \| `null`; `userAgent`: `string` \| `null`; \}\>

Defined in: [objects/site/index.ts:720](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L720)

Update form submission status

#### Parameters

##### id

`string`

##### data

###### status?

`string`

###### repliedAt?

`Date`

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `data`: `unknown`; `email`: `string` \| `null`; `formId`: `string`; `formName`: `string` \| `null`; `id`: `string`; `ipAddress`: `string` \| `null`; `metadata`: `unknown`; `name`: `string` \| `null`; `pageId`: `string` \| `null`; `referrer`: `string` \| `null`; `repliedAt`: `Date` \| `null`; `siteId`: `string`; `status`: `string` \| `null`; `userAgent`: `string` \| `null`; \}\>

***

### listFormSubmissions()

> **listFormSubmissions**(`siteId`, `options`): `Promise`\<`object`[]\>

Defined in: [objects/site/index.ts:737](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L737)

List form submissions for a site

#### Parameters

##### siteId

`string`

##### options

###### formId?

`string`

###### status?

`string`

###### limit?

`number`

###### offset?

`number`

#### Returns

`Promise`\<`object`[]\>

***

### getFormSubmissionStats()

> **getFormSubmissionStats**(`siteId`): `Promise`\<`object`[]\>

Defined in: [objects/site/index.ts:763](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L763)

Get form submission count by status

#### Parameters

##### siteId

`string`

#### Returns

`Promise`\<`object`[]\>

***

### setMenu()

> **setMenu**(`siteId`, `slug`, `data`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `id`: `string`; `items`: [`MenuItem`](../../interfaces/MenuItem.md)[] \| `null`; `location`: `string` \| `null`; `name`: `string`; `siteId`: `string`; `slug`: `string`; `updatedAt`: `Date` \| `null`; \}\>

Defined in: [objects/site/index.ts:781](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L781)

Create or update a menu

#### Parameters

##### siteId

`string`

##### slug

`string`

##### data

###### name

`string`

###### location?

`string`

###### items

[`MenuItem`](../../interfaces/MenuItem.md)[]

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `id`: `string`; `items`: [`MenuItem`](../../interfaces/MenuItem.md)[] \| `null`; `location`: `string` \| `null`; `name`: `string`; `siteId`: `string`; `slug`: `string`; `updatedAt`: `Date` \| `null`; \}\>

***

### getMenu()

> **getMenu**(`siteId`, `slug`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `id`: `string`; `items`: [`MenuItem`](../../interfaces/MenuItem.md)[] \| `null`; `location`: `string` \| `null`; `name`: `string`; `siteId`: `string`; `slug`: `string`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

Defined in: [objects/site/index.ts:814](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L814)

Get menu by slug

#### Parameters

##### siteId

`string`

##### slug

`string`

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `id`: `string`; `items`: [`MenuItem`](../../interfaces/MenuItem.md)[] \| `null`; `location`: `string` \| `null`; `name`: `string`; `siteId`: `string`; `slug`: `string`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

***

### getMenuByLocation()

> **getMenuByLocation**(`siteId`, `location`): `Promise`\<\{ `createdAt`: `Date` \| `null`; `id`: `string`; `items`: [`MenuItem`](../../interfaces/MenuItem.md)[] \| `null`; `location`: `string` \| `null`; `name`: `string`; `siteId`: `string`; `slug`: `string`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

Defined in: [objects/site/index.ts:825](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L825)

Get menu by location

#### Parameters

##### siteId

`string`

##### location

`string`

#### Returns

`Promise`\<\{ `createdAt`: `Date` \| `null`; `id`: `string`; `items`: [`MenuItem`](../../interfaces/MenuItem.md)[] \| `null`; `location`: `string` \| `null`; `name`: `string`; `siteId`: `string`; `slug`: `string`; `updatedAt`: `Date` \| `null`; \} \| `undefined`\>

***

### listMenus()

> **listMenus**(`siteId`): `Promise`\<`object`[]\>

Defined in: [objects/site/index.ts:836](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L836)

List all menus for a site

#### Parameters

##### siteId

`string`

#### Returns

`Promise`\<`object`[]\>

***

### deleteMenu()

> **deleteMenu**(`siteId`, `slug`): `Promise`\<`void`\>

Defined in: [objects/site/index.ts:846](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L846)

Delete a menu

#### Parameters

##### siteId

`string`

##### slug

`string`

#### Returns

`Promise`\<`void`\>

***

### log()

> **log**(`action`, `resource`, `resourceId?`, `metadata?`, `actor?`): `Promise`\<`void`\>

Defined in: [objects/site/index.ts:860](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L860)

Log an activity

#### Parameters

##### action

`string`

##### resource

`string`

##### resourceId?

`string`

##### metadata?

`Record`\<`string`, `unknown`\>

##### actor?

###### id

`string`

###### type

`"user"` \| `"system"` \| `"ai"`

#### Returns

`Promise`\<`void`\>

***

### getActivityLog()

> **getActivityLog**(`siteId`, `limit`, `offset`): `Promise`\<`object`[]\>

Defined in: [objects/site/index.ts:883](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L883)

Get activity log for a site

#### Parameters

##### siteId

`string`

##### limit

`number` = `50`

##### offset

`number` = `0`

#### Returns

`Promise`\<`object`[]\>

***

### getDashboard()

> **getDashboard**(`siteId`): `Promise`\<\{ `site`: \{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`; `content`: \{ `pages`: \{ `total`: `number`; `published`: `number`; \}; `posts`: \{ `total`: `number`; `recent`: `object`[]; \}; \}; `seo`: \{ `bingSiteVerification`: `string` \| `null`; `canonicalUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `defaultDescription`: `string` \| `null`; `defaultOgImage`: `string` \| `null`; `defaultTitle`: `string` \| `null`; `googleSiteVerification`: `string` \| `null`; `id`: `string`; `robotsTxt`: `string` \| `null`; `siteId`: `string`; `sitemapEnabled`: `boolean` \| `null`; `structuredData`: `unknown`; `titleTemplate`: `string` \| `null`; `twitterCardType`: `string` \| `null`; `twitterHandle`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`; `analytics`: \{ `pageViews`: `number`; `uniqueVisitors`: `number`; `topPages`: `object`[]; `topReferrers`: `object`[]; `realtimeVisitors`: `number`; \}; `forms`: \{ `stats`: `object`[]; `newCount`: `number`; \}; `recentActivity`: `object`[]; \}\>

Defined in: [objects/site/index.ts:904](https://github.com/dot-do/workers/blob/c252c2d9415957e5ce9f5f849672bf290b40136f/objects/site/index.ts#L904)

Get a full site dashboard snapshot

#### Parameters

##### siteId

`string`

#### Returns

`Promise`\<\{ `site`: \{ `archivedAt`: `Date` \| `null`; `createdAt`: `Date` \| `null`; `description`: `string` \| `null`; `domain`: `string` \| `null`; `faviconUrl`: `string` \| `null`; `id`: `string`; `logoUrl`: `string` \| `null`; `name`: `string`; `publishedAt`: `Date` \| `null`; `slug`: `string`; `status`: `string` \| `null`; `tagline`: `string` \| `null`; `theme`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`; `content`: \{ `pages`: \{ `total`: `number`; `published`: `number`; \}; `posts`: \{ `total`: `number`; `recent`: `object`[]; \}; \}; `seo`: \{ `bingSiteVerification`: `string` \| `null`; `canonicalUrl`: `string` \| `null`; `createdAt`: `Date` \| `null`; `defaultDescription`: `string` \| `null`; `defaultOgImage`: `string` \| `null`; `defaultTitle`: `string` \| `null`; `googleSiteVerification`: `string` \| `null`; `id`: `string`; `robotsTxt`: `string` \| `null`; `siteId`: `string`; `sitemapEnabled`: `boolean` \| `null`; `structuredData`: `unknown`; `titleTemplate`: `string` \| `null`; `twitterCardType`: `string` \| `null`; `twitterHandle`: `string` \| `null`; `updatedAt`: `Date` \| `null`; \} \| `undefined`; `analytics`: \{ `pageViews`: `number`; `uniqueVisitors`: `number`; `topPages`: `object`[]; `topReferrers`: `object`[]; `realtimeVisitors`: `number`; \}; `forms`: \{ `stats`: `object`[]; `newCount`: `number`; \}; `recentActivity`: `object`[]; \}\>
