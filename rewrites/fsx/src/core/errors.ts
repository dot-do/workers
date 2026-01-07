/**
 * Filesystem errors (POSIX-compatible)
 */

/**
 * Base filesystem error
 */
export class FSError extends Error {
  code: string
  errno: number
  syscall?: string
  path?: string
  dest?: string

  constructor(code: string, errno: number, message: string, syscall?: string, path?: string, dest?: string) {
    const fullMessage = `${code}: ${message}${syscall ? `, ${syscall}` : ''}${path ? ` '${path}'` : ''}${dest ? ` -> '${dest}'` : ''}`
    super(fullMessage)
    this.name = 'FSError'
    this.code = code
    this.errno = errno
    this.syscall = syscall
    this.path = path
    this.dest = dest
  }
}

/**
 * ENOENT - No such file or directory
 */
export class ENOENT extends FSError {
  constructor(syscall?: string, path?: string) {
    super('ENOENT', -2, 'no such file or directory', syscall, path)
    this.name = 'ENOENT'
  }
}

/**
 * EEXIST - File exists
 */
export class EEXIST extends FSError {
  constructor(syscall?: string, path?: string) {
    super('EEXIST', -17, 'file already exists', syscall, path)
    this.name = 'EEXIST'
  }
}

/**
 * EISDIR - Is a directory
 */
export class EISDIR extends FSError {
  constructor(syscall?: string, path?: string) {
    super('EISDIR', -21, 'illegal operation on a directory', syscall, path)
    this.name = 'EISDIR'
  }
}

/**
 * ENOTDIR - Not a directory
 */
export class ENOTDIR extends FSError {
  constructor(syscall?: string, path?: string) {
    super('ENOTDIR', -20, 'not a directory', syscall, path)
    this.name = 'ENOTDIR'
  }
}

/**
 * EACCES - Permission denied
 */
export class EACCES extends FSError {
  constructor(syscall?: string, path?: string) {
    super('EACCES', -13, 'permission denied', syscall, path)
    this.name = 'EACCES'
  }
}

/**
 * ENOTEMPTY - Directory not empty
 */
export class ENOTEMPTY extends FSError {
  constructor(syscall?: string, path?: string) {
    super('ENOTEMPTY', -39, 'directory not empty', syscall, path)
    this.name = 'ENOTEMPTY'
  }
}

/**
 * EINVAL - Invalid argument
 */
export class EINVAL extends FSError {
  constructor(syscall?: string, path?: string) {
    super('EINVAL', -22, 'invalid argument', syscall, path)
    this.name = 'EINVAL'
  }
}

/**
 * ELOOP - Too many symbolic links
 */
export class ELOOP extends FSError {
  constructor(syscall?: string, path?: string) {
    super('ELOOP', -40, 'too many levels of symbolic links', syscall, path)
    this.name = 'ELOOP'
  }
}

/**
 * ENAMETOOLONG - File name too long
 */
export class ENAMETOOLONG extends FSError {
  constructor(syscall?: string, path?: string) {
    super('ENAMETOOLONG', -36, 'file name too long', syscall, path)
    this.name = 'ENAMETOOLONG'
  }
}

/**
 * ENOSPC - No space left on device
 */
export class ENOSPC extends FSError {
  constructor(syscall?: string, path?: string) {
    super('ENOSPC', -28, 'no space left on device', syscall, path)
    this.name = 'ENOSPC'
  }
}

/**
 * EROFS - Read-only file system
 */
export class EROFS extends FSError {
  constructor(syscall?: string, path?: string) {
    super('EROFS', -30, 'read-only file system', syscall, path)
    this.name = 'EROFS'
  }
}

/**
 * EBUSY - Resource busy
 */
export class EBUSY extends FSError {
  constructor(syscall?: string, path?: string) {
    super('EBUSY', -16, 'resource busy or locked', syscall, path)
    this.name = 'EBUSY'
  }
}

/**
 * EMFILE - Too many open files
 */
export class EMFILE extends FSError {
  constructor(syscall?: string, path?: string) {
    super('EMFILE', -24, 'too many open files', syscall, path)
    this.name = 'EMFILE'
  }
}

/**
 * EXDEV - Cross-device link
 */
export class EXDEV extends FSError {
  constructor(syscall?: string, path?: string, dest?: string) {
    super('EXDEV', -18, 'cross-device link not permitted', syscall, path, dest)
    this.name = 'EXDEV'
  }
}
