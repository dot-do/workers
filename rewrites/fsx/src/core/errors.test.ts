import { describe, it, expect } from 'vitest'
import {
  FSError,
  ENOENT,
  EEXIST,
  EISDIR,
  ENOTDIR,
  EACCES,
  EPERM,
  ENOTEMPTY,
  EBADF,
  EINVAL,
  ELOOP,
  ENAMETOOLONG,
  ENOSPC,
  EROFS,
  EBUSY,
  EMFILE,
  ENFILE,
  EXDEV,
} from './errors'

describe('FSError', () => {
  it('should create error with correct properties', () => {
    const error = new FSError('ETEST', -999, 'test error', 'test', '/test/path')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error.name).toBe('FSError')
    expect(error.code).toBe('ETEST')
    expect(error.errno).toBe(-999)
    expect(error.syscall).toBe('test')
    expect(error.path).toBe('/test/path')
  })

  it('should format error message correctly with all properties', () => {
    const error = new FSError('ETEST', -999, 'test error', 'test', '/test/path')
    expect(error.message).toBe("ETEST: test error, test '/test/path'")
  })

  it('should format error message correctly without optional properties', () => {
    const error = new FSError('ETEST', -999, 'test error')
    expect(error.message).toBe('ETEST: test error')
  })

  it('should format error message correctly with syscall but no path', () => {
    const error = new FSError('ETEST', -999, 'test error', 'test')
    expect(error.message).toBe('ETEST: test error, test')
  })

  it('should format error message correctly with dest for cross-device errors', () => {
    const error = new FSError('EXDEV', -18, 'cross-device link not permitted', 'rename', '/src', '/dest')
    expect(error.message).toBe("EXDEV: cross-device link not permitted, rename '/src' -> '/dest'")
    expect(error.dest).toBe('/dest')
  })
})

describe('ENOENT', () => {
  it('should have correct error code and errno', () => {
    const error = new ENOENT()
    expect(error.code).toBe('ENOENT')
    expect(error.errno).toBe(-2)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new ENOENT()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(ENOENT)
  })

  it('should have correct name', () => {
    const error = new ENOENT()
    expect(error.name).toBe('ENOENT')
  })

  it('should format message correctly with syscall and path', () => {
    const error = new ENOENT('open', '/test/file.txt')
    expect(error.message).toBe("ENOENT: no such file or directory, open '/test/file.txt'")
    expect(error.syscall).toBe('open')
    expect(error.path).toBe('/test/file.txt')
  })

  it('should format message correctly without syscall and path', () => {
    const error = new ENOENT()
    expect(error.message).toBe('ENOENT: no such file or directory')
    expect(error.syscall).toBeUndefined()
    expect(error.path).toBeUndefined()
  })
})

describe('EEXIST', () => {
  it('should have correct error code and errno', () => {
    const error = new EEXIST()
    expect(error.code).toBe('EEXIST')
    expect(error.errno).toBe(-17)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new EEXIST()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(EEXIST)
  })

  it('should have correct name', () => {
    const error = new EEXIST()
    expect(error.name).toBe('EEXIST')
  })

  it('should format message correctly with syscall and path', () => {
    const error = new EEXIST('mkdir', '/test/existing')
    expect(error.message).toBe("EEXIST: file already exists, mkdir '/test/existing'")
    expect(error.syscall).toBe('mkdir')
    expect(error.path).toBe('/test/existing')
  })
})

describe('EISDIR', () => {
  it('should have correct error code and errno', () => {
    const error = new EISDIR()
    expect(error.code).toBe('EISDIR')
    expect(error.errno).toBe(-21)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new EISDIR()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(EISDIR)
  })

  it('should have correct name', () => {
    const error = new EISDIR()
    expect(error.name).toBe('EISDIR')
  })

  it('should format message correctly with syscall and path', () => {
    const error = new EISDIR('read', '/test/dir')
    expect(error.message).toBe("EISDIR: illegal operation on a directory, read '/test/dir'")
    expect(error.syscall).toBe('read')
    expect(error.path).toBe('/test/dir')
  })
})

describe('ENOTDIR', () => {
  it('should have correct error code and errno', () => {
    const error = new ENOTDIR()
    expect(error.code).toBe('ENOTDIR')
    expect(error.errno).toBe(-20)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new ENOTDIR()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(ENOTDIR)
  })

  it('should have correct name', () => {
    const error = new ENOTDIR()
    expect(error.name).toBe('ENOTDIR')
  })

  it('should format message correctly with syscall and path', () => {
    const error = new ENOTDIR('scandir', '/test/file.txt')
    expect(error.message).toBe("ENOTDIR: not a directory, scandir '/test/file.txt'")
    expect(error.syscall).toBe('scandir')
    expect(error.path).toBe('/test/file.txt')
  })
})

describe('EACCES', () => {
  it('should have correct error code and errno', () => {
    const error = new EACCES()
    expect(error.code).toBe('EACCES')
    expect(error.errno).toBe(-13)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new EACCES()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(EACCES)
  })

  it('should have correct name', () => {
    const error = new EACCES()
    expect(error.name).toBe('EACCES')
  })

  it('should format message correctly with syscall and path', () => {
    const error = new EACCES('open', '/test/protected.txt')
    expect(error.message).toBe("EACCES: permission denied, open '/test/protected.txt'")
    expect(error.syscall).toBe('open')
    expect(error.path).toBe('/test/protected.txt')
  })
})

describe('EPERM', () => {
  it('should have correct error code and errno', () => {
    const error = new EPERM()
    expect(error.code).toBe('EPERM')
    expect(error.errno).toBe(-1)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new EPERM()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(EPERM)
  })

  it('should have correct name', () => {
    const error = new EPERM()
    expect(error.name).toBe('EPERM')
  })

  it('should format message correctly with syscall and path', () => {
    const error = new EPERM('chmod', '/test/file.txt')
    expect(error.message).toBe("EPERM: operation not permitted, chmod '/test/file.txt'")
    expect(error.syscall).toBe('chmod')
    expect(error.path).toBe('/test/file.txt')
  })
})

describe('ENOTEMPTY', () => {
  it('should have correct error code and errno', () => {
    const error = new ENOTEMPTY()
    expect(error.code).toBe('ENOTEMPTY')
    expect(error.errno).toBe(-39)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new ENOTEMPTY()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(ENOTEMPTY)
  })

  it('should have correct name', () => {
    const error = new ENOTEMPTY()
    expect(error.name).toBe('ENOTEMPTY')
  })

  it('should format message correctly with syscall and path', () => {
    const error = new ENOTEMPTY('rmdir', '/test/nonempty')
    expect(error.message).toBe("ENOTEMPTY: directory not empty, rmdir '/test/nonempty'")
    expect(error.syscall).toBe('rmdir')
    expect(error.path).toBe('/test/nonempty')
  })
})

describe('EBADF', () => {
  it('should have correct error code and errno', () => {
    const error = new EBADF()
    expect(error.code).toBe('EBADF')
    expect(error.errno).toBe(-9)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new EBADF()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(EBADF)
  })

  it('should have correct name', () => {
    const error = new EBADF()
    expect(error.name).toBe('EBADF')
  })

  it('should format message correctly with syscall and path', () => {
    const error = new EBADF('read')
    expect(error.message).toBe('EBADF: bad file descriptor, read')
    expect(error.syscall).toBe('read')
  })
})

describe('EINVAL', () => {
  it('should have correct error code and errno', () => {
    const error = new EINVAL()
    expect(error.code).toBe('EINVAL')
    expect(error.errno).toBe(-22)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new EINVAL()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(EINVAL)
  })

  it('should have correct name', () => {
    const error = new EINVAL()
    expect(error.name).toBe('EINVAL')
  })

  it('should format message correctly with syscall and path', () => {
    const error = new EINVAL('read', '/test/file.txt')
    expect(error.message).toBe("EINVAL: invalid argument, read '/test/file.txt'")
    expect(error.syscall).toBe('read')
    expect(error.path).toBe('/test/file.txt')
  })
})

describe('EMFILE', () => {
  it('should have correct error code and errno', () => {
    const error = new EMFILE()
    expect(error.code).toBe('EMFILE')
    expect(error.errno).toBe(-24)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new EMFILE()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(EMFILE)
  })

  it('should have correct name', () => {
    const error = new EMFILE()
    expect(error.name).toBe('EMFILE')
  })

  it('should format message correctly with syscall', () => {
    const error = new EMFILE('open')
    expect(error.message).toBe('EMFILE: too many open files, open')
    expect(error.syscall).toBe('open')
  })
})

describe('ENFILE', () => {
  it('should have correct error code and errno', () => {
    const error = new ENFILE()
    expect(error.code).toBe('ENFILE')
    expect(error.errno).toBe(-23)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new ENFILE()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(ENFILE)
  })

  it('should have correct name', () => {
    const error = new ENFILE()
    expect(error.name).toBe('ENFILE')
  })

  it('should format message correctly with syscall', () => {
    const error = new ENFILE('open')
    expect(error.message).toBe('ENFILE: file table overflow, open')
    expect(error.syscall).toBe('open')
  })
})

describe('ENOSPC', () => {
  it('should have correct error code and errno', () => {
    const error = new ENOSPC()
    expect(error.code).toBe('ENOSPC')
    expect(error.errno).toBe(-28)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new ENOSPC()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(ENOSPC)
  })

  it('should have correct name', () => {
    const error = new ENOSPC()
    expect(error.name).toBe('ENOSPC')
  })

  it('should format message correctly with syscall and path', () => {
    const error = new ENOSPC('write', '/test/file.txt')
    expect(error.message).toBe("ENOSPC: no space left on device, write '/test/file.txt'")
    expect(error.syscall).toBe('write')
    expect(error.path).toBe('/test/file.txt')
  })
})

describe('EROFS', () => {
  it('should have correct error code and errno', () => {
    const error = new EROFS()
    expect(error.code).toBe('EROFS')
    expect(error.errno).toBe(-30)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new EROFS()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(EROFS)
  })

  it('should have correct name', () => {
    const error = new EROFS()
    expect(error.name).toBe('EROFS')
  })

  it('should format message correctly with syscall and path', () => {
    const error = new EROFS('write', '/test/file.txt')
    expect(error.message).toBe("EROFS: read-only file system, write '/test/file.txt'")
    expect(error.syscall).toBe('write')
    expect(error.path).toBe('/test/file.txt')
  })
})

describe('ELOOP', () => {
  it('should have correct error code and errno', () => {
    const error = new ELOOP()
    expect(error.code).toBe('ELOOP')
    expect(error.errno).toBe(-40)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new ELOOP()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(ELOOP)
  })

  it('should have correct name', () => {
    const error = new ELOOP()
    expect(error.name).toBe('ELOOP')
  })

  it('should format message correctly with syscall and path', () => {
    const error = new ELOOP('readlink', '/test/circular')
    expect(error.message).toBe("ELOOP: too many levels of symbolic links, readlink '/test/circular'")
    expect(error.syscall).toBe('readlink')
    expect(error.path).toBe('/test/circular')
  })
})

describe('ENAMETOOLONG', () => {
  it('should have correct error code and errno', () => {
    const error = new ENAMETOOLONG()
    expect(error.code).toBe('ENAMETOOLONG')
    expect(error.errno).toBe(-36)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new ENAMETOOLONG()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(ENAMETOOLONG)
  })

  it('should have correct name', () => {
    const error = new ENAMETOOLONG()
    expect(error.name).toBe('ENAMETOOLONG')
  })

  it('should format message correctly with syscall and path', () => {
    const error = new ENAMETOOLONG('open', '/test/' + 'x'.repeat(300))
    expect(error.message).toContain('ENAMETOOLONG: file name too long, open')
    expect(error.syscall).toBe('open')
  })
})

describe('EBUSY', () => {
  it('should have correct error code and errno', () => {
    const error = new EBUSY()
    expect(error.code).toBe('EBUSY')
    expect(error.errno).toBe(-16)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new EBUSY()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(EBUSY)
  })

  it('should have correct name', () => {
    const error = new EBUSY()
    expect(error.name).toBe('EBUSY')
  })

  it('should format message correctly with syscall and path', () => {
    const error = new EBUSY('unlink', '/test/locked.txt')
    expect(error.message).toBe("EBUSY: resource busy or locked, unlink '/test/locked.txt'")
    expect(error.syscall).toBe('unlink')
    expect(error.path).toBe('/test/locked.txt')
  })
})

describe('EXDEV', () => {
  it('should have correct error code and errno', () => {
    const error = new EXDEV()
    expect(error.code).toBe('EXDEV')
    expect(error.errno).toBe(-18)
  })

  it('should be instanceof Error and FSError', () => {
    const error = new EXDEV()
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(FSError)
    expect(error).toBeInstanceOf(EXDEV)
  })

  it('should have correct name', () => {
    const error = new EXDEV()
    expect(error.name).toBe('EXDEV')
  })

  it('should format message correctly with syscall, path, and dest', () => {
    const error = new EXDEV('rename', '/mnt/vol1/file.txt', '/mnt/vol2/file.txt')
    expect(error.message).toBe("EXDEV: cross-device link not permitted, rename '/mnt/vol1/file.txt' -> '/mnt/vol2/file.txt'")
    expect(error.syscall).toBe('rename')
    expect(error.path).toBe('/mnt/vol1/file.txt')
    expect(error.dest).toBe('/mnt/vol2/file.txt')
  })

  it('should format message correctly without dest', () => {
    const error = new EXDEV('link', '/test/file.txt')
    expect(error.message).toBe("EXDEV: cross-device link not permitted, link '/test/file.txt'")
    expect(error.syscall).toBe('link')
    expect(error.path).toBe('/test/file.txt')
    expect(error.dest).toBeUndefined()
  })
})
