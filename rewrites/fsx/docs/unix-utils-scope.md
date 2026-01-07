# Unix Utilities Scope for fsx.do

This document outlines the recommended Unix-like utilities that should be implemented in fsx.do, a virtual filesystem for Cloudflare Workers.

## Current State

### Existing Core Operations
- `readFile`, `writeFile`, `appendFile`
- `mkdir`, `rmdir`, `rm`
- `readdir` (with `recursive` and `withFileTypes` options)
- `stat`, `lstat`, `access`
- `rename`, `unlink`, `copyFile`
- `symlink`, `link`, `readlink`, `realpath`
- `chmod`, `chown`, `utimes`, `truncate`
- Streams: `createReadStream`, `createWriteStream`

### Existing Path Utilities (`src/core/path.ts`)
- `normalize`, `resolve`, `join`
- `basename`, `dirname`, `isAbsolute`

### Existing Pattern Support (`src/sparse/patterns.ts`)
- Basic glob pattern parsing
- Negation support (`!pattern`)
- Directory-only patterns (`pattern/`)
- Segment splitting

### Existing MCP Tools (`src/mcp/index.ts`)
- `fs_search` - basic glob pattern matching (simplified)
- `fs_tree` - directory tree visualization

---

## Priority 1: High (Essential for gitx)

### 1.1 `glob` - Pattern Matching
**Description**: Find files matching glob patterns like `**/*.ts`, `src/**/*.test.ts`

**Use Cases for gitx**:
- `.gitignore` pattern matching
- Sparse checkout patterns
- Finding files for status/diff operations
- Exclude patterns for pack generation

**Complexity**: Medium
- Requires recursive directory traversal
- Must support `**` (globstar), `*`, `?`, `[abc]`, `{a,b}`
- Should leverage existing `parsePattern` in `sparse/patterns.ts`

**Dependencies**: `readdir` (recursive)

**Implementation Notes**:
```typescript
interface GlobOptions {
  cwd?: string           // Base directory (default: /)
  dot?: boolean          // Include dotfiles (default: false)
  ignore?: string[]      // Patterns to exclude
  onlyFiles?: boolean    // Only return files (default: true)
  onlyDirectories?: boolean
  deep?: number          // Max depth
  absolute?: boolean     // Return absolute paths
  followSymlinks?: boolean
}

// Example usage
const files = await fsx.glob('**/*.ts', { ignore: ['node_modules/**'] })
```

### 1.2 `grep` - Content Search
**Description**: Search file contents for patterns (regex or literal)

**Use Cases for gitx**:
- Finding text in repository files
- Searching commit messages
- Content-based file discovery

**Complexity**: Medium-High
- Line-by-line streaming for large files
- Regex support
- Context lines (-A, -B, -C)

**Dependencies**: `readFile`, `glob` (for recursive search)

**Implementation Notes**:
```typescript
interface GrepOptions {
  pattern: string | RegExp
  path: string           // File or directory
  recursive?: boolean
  ignoreCase?: boolean
  lineNumbers?: boolean
  before?: number        // Context lines before
  after?: number         // Context lines after
  maxCount?: number      // Stop after N matches
  filesOnly?: boolean    // Only return filenames
  invert?: boolean       // Return non-matching lines
}

interface GrepMatch {
  file: string
  line: number
  content: string
  match: string
}

const matches = await fsx.grep({ pattern: /TODO/, path: '/src', recursive: true })
```

### 1.3 `find` - Advanced File Discovery
**Description**: Find files based on multiple criteria (name, type, size, time, etc.)

**Use Cases for gitx**:
- Finding large files for LFS
- Finding files modified since last commit
- Finding untracked files
- Cleanup operations

**Complexity**: Medium
- Combines `readdir` with filtering
- Multiple filter types

**Dependencies**: `readdir`, `stat`

**Implementation Notes**:
```typescript
interface FindOptions {
  path: string
  name?: string | RegExp      // Filename pattern
  type?: 'f' | 'd' | 'l'      // File, directory, symlink
  maxdepth?: number
  mindepth?: number
  size?: string               // e.g., '+1M', '-100K', '50K'
  mtime?: string              // e.g., '-7d', '+30d' (modified time)
  ctime?: string              // Created time
  atime?: string              // Accessed time
  empty?: boolean             // Empty files/dirs
  executable?: boolean
  newer?: string              // Newer than file
  prune?: string[]            // Directories to skip
}

const largeFiles = await fsx.find({ path: '/', type: 'f', size: '+10M' })
const recentFiles = await fsx.find({ path: '/src', mtime: '-7d' })
```

---

## Priority 2: Medium (Valuable for Development)

### 2.1 `diff` - File Comparison
**Description**: Compare two files and show differences

**Use Cases for gitx**:
- Working tree diff (already partially implemented in gitx)
- Merge conflict visualization
- Content comparison for rename detection

**Complexity**: High
- Myers diff algorithm
- Unified/context output formats
- Binary file detection

**Dependencies**: `readFile`

**Implementation Notes**:
```typescript
interface DiffOptions {
  unified?: number       // Context lines (default: 3)
  ignoreWhitespace?: boolean
  ignoreCase?: boolean
  binary?: boolean       // Handle binary files
}

interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: Array<{
    type: '+' | '-' | ' '
    content: string
  }>
}

const diff = await fsx.diff('/file1.txt', '/file2.txt', { unified: 3 })
```

**Note**: gitx already has `tree-diff.ts` for tree comparison. This would be file-level diff.

### 2.2 `wc` - Word/Line Count
**Description**: Count lines, words, characters in files

**Use Cases for gitx**:
- File statistics
- Size estimation
- Diff statistics

**Complexity**: Low
- Stream-based for large files

**Dependencies**: `readFile` or `createReadStream`

**Implementation Notes**:
```typescript
interface WcResult {
  lines: number
  words: number
  chars: number
  bytes: number
  path: string
}

const stats = await fsx.wc('/path/to/file')
const multi = await fsx.wc(['/file1', '/file2']) // Multiple files
```

### 2.3 `head` / `tail` - File Preview
**Description**: Read first/last N lines of a file

**Use Cases for gitx**:
- Previewing large files
- Log file inspection
- Quick file sampling

**Complexity**: Low
- `head`: simple read with limit
- `tail`: needs backward read or full read

**Dependencies**: `readFile` or streams

**Implementation Notes**:
```typescript
// Head - first N lines
const firstLines = await fsx.head('/file.txt', { lines: 10 })

// Tail - last N lines
const lastLines = await fsx.tail('/file.txt', { lines: 10 })

// Byte-based variants
const firstBytes = await fsx.head('/file.txt', { bytes: 1024 })
```

### 2.4 `touch` - Update Timestamps / Create Empty File
**Description**: Update file timestamps or create empty file

**Use Cases for gitx**:
- Creating placeholder files
- Updating modification times
- Lock file management

**Complexity**: Low
- Wrapper around `utimes` + `writeFile`

**Dependencies**: `utimes`, `writeFile`, `access`

**Implementation Notes**:
```typescript
interface TouchOptions {
  atime?: Date           // Access time
  mtime?: Date           // Modification time
  noCreate?: boolean     // Don't create if missing
  reference?: string     // Use another file's times
}

await fsx.touch('/file.txt')
await fsx.touch('/file.txt', { mtime: new Date('2024-01-01') })
```

---

## Priority 3: Lower (Nice to Have)

### 3.1 `which` - Find Executable
**Description**: Locate a command/script in the filesystem

**Use Cases for gitx**:
- Finding git hooks
- Locating helper scripts

**Complexity**: Low
- Search PATH-equivalent locations

**Dependencies**: `access`, `stat`

**Implementation Notes**:
```typescript
// Simplified for fsx context - find executable scripts
const hookPath = await fsx.which('pre-commit', {
  searchPaths: ['/.git/hooks', '/hooks']
})
```

### 3.2 `file` - Type Detection
**Description**: Detect file type (text, binary, image, etc.)

**Use Cases for gitx**:
- Binary file detection for diff
- MIME type for web serving
- LFS candidate detection

**Complexity**: Medium
- Magic byte detection
- Text encoding detection

**Dependencies**: `readFile` (partial)

**Implementation Notes**:
```typescript
interface FileTypeResult {
  type: 'text' | 'binary' | 'image' | 'compressed' | 'unknown'
  mimeType?: string
  encoding?: string      // For text: utf-8, ascii, etc.
  extension?: string     // Suggested extension
}

const info = await fsx.fileType('/path/to/file')
// { type: 'text', mimeType: 'text/plain', encoding: 'utf-8' }
```

### 3.3 `du` - Disk Usage
**Description**: Calculate directory/file sizes

**Use Cases for gitx**:
- Repository size analysis
- Finding large directories
- Storage quota management

**Complexity**: Medium
- Recursive traversal with size accumulation

**Dependencies**: `readdir`, `stat`

**Implementation Notes**:
```typescript
interface DuOptions {
  maxDepth?: number
  human?: boolean        // Human-readable sizes
  summarize?: boolean    // Only total
  exclude?: string[]     // Patterns to exclude
}

interface DuResult {
  path: string
  size: number           // Bytes
  humanSize?: string     // e.g., "1.5M"
}

const usage = await fsx.du('/path', { maxDepth: 2 })
```

### 3.4 `tar` / Archive Operations
**Description**: Create and extract tar archives

**Use Cases for gitx**:
- Pack file operations (already custom in gitx)
- Backup/restore
- Export operations

**Complexity**: High
- Complex format handling
- Streaming for large archives

**Dependencies**: `readFile`, `writeFile`, compression

**Implementation Notes**:
```typescript
// Create archive
await fsx.tar.create('/archive.tar.gz', ['/dir1', '/file1'], {
  gzip: true,
  excludes: ['*.log']
})

// Extract archive
await fsx.tar.extract('/archive.tar.gz', '/dest', {
  strip: 1  // Remove leading path component
})

// List contents
const files = await fsx.tar.list('/archive.tar.gz')
```

**Note**: gitx has custom pack file handling. This would be for general tar archives.

---

## Priority 4: Future Consideration

### 4.1 `xargs` - Command Execution on Results
**Description**: Execute operations on glob/find results

**Complexity**: Low-Medium (depends on callback design)

```typescript
// Process files in batches
await fsx.glob('**/*.log').pipe(
  fsx.xargs(async (files) => {
    for (const f of files) await fsx.unlink(f)
  }, { parallel: 10 })
)
```

### 4.2 `tee` - Duplicate Stream
**Description**: Write to multiple destinations

**Complexity**: Low

```typescript
const stream = await fsx.createReadStream('/input')
await fsx.tee(stream, ['/output1', '/output2'])
```

### 4.3 `watch` (Enhanced)
**Description**: Watch filesystem for changes

**Note**: Already partially implemented but could be enhanced.

**Complexity**: Medium-High (Durable Object hibernation considerations)

---

## Implementation Order Recommendation

### Phase 1: Core Search & Discovery
1. `glob` - Foundation for many other operations
2. `find` - Advanced filtering on top of glob
3. `grep` - Content search

### Phase 2: File Analysis
4. `wc` - Simple utility, quick win
5. `head`/`tail` - Simple utility, quick win
6. `diff` - Complex but valuable

### Phase 3: Convenience Utilities
7. `touch` - Simple utility
8. `file` (type detection) - Useful for diff/LFS
9. `du` - Size analysis

### Phase 4: Advanced
10. Archive operations (if needed)
11. Enhanced watch

---

## API Design Principles

1. **Async-first**: All operations return Promises
2. **Options objects**: Use options objects rather than positional args for flexibility
3. **Streaming support**: Large file operations should support streaming
4. **MCP Integration**: Each utility should have a corresponding MCP tool
5. **Composability**: Utilities should work well together (e.g., `find | grep`)
6. **Error handling**: Consistent error types extending `FSError`

---

## Dependencies Graph

```
glob ────────────────┬──> find
  │                  │
  │                  └──> grep (recursive mode)
  │
  └──> du

readFile ───────────┬──> wc
                    ├──> head/tail
                    ├──> diff
                    ├──> grep
                    └──> file (type detection)

stat ───────────────┬──> find
                    ├──> du
                    └──> which

utimes + writeFile ──> touch
```

---

## Notes for gitx Integration

gitx currently uses:
- `readFile`, `writeFile`, `readdir` extensively
- `stat`, `lstat` for file metadata
- `mkdir` for directory creation
- `access` for existence checks

Key gitx operations that would benefit from these utilities:

| gitx Operation | Helpful Utilities |
|---------------|-------------------|
| `git status` | `glob` (for pattern matching), `find` (for untracked files) |
| `git diff` | `diff`, `grep` (for content search) |
| `git add` | `glob` (for pathspecs) |
| `git grep` | `grep` (directly maps) |
| `git ls-files` | `find`, `glob` |
| `.gitignore` | `glob` (already using patterns.ts) |
| Pack operations | `find` (for object discovery), `wc` (for size estimation) |
| LFS | `file` (type detection), `find` (size-based) |

---

## Summary

| Utility | Priority | Complexity | gitx Value |
|---------|----------|------------|------------|
| `glob` | High | Medium | Critical |
| `grep` | High | Medium-High | Critical |
| `find` | High | Medium | High |
| `diff` | Medium | High | High |
| `wc` | Medium | Low | Medium |
| `head`/`tail` | Medium | Low | Medium |
| `touch` | Medium | Low | Low |
| `which` | Low | Low | Low |
| `file` | Low | Medium | Medium |
| `du` | Low | Medium | Medium |
| `tar` | Low | High | Low |
