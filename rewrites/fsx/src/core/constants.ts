/**
 * Filesystem constants (POSIX-compatible)
 */

export const constants = {
  // File access modes
  F_OK: 0, // File exists
  R_OK: 4, // Read permission
  W_OK: 2, // Write permission
  X_OK: 1, // Execute permission

  // File open flags
  O_RDONLY: 0, // Open for reading only
  O_WRONLY: 1, // Open for writing only
  O_RDWR: 2, // Open for reading and writing
  O_CREAT: 64, // Create if doesn't exist
  O_EXCL: 128, // Fail if exists (with O_CREAT)
  O_TRUNC: 512, // Truncate to zero length
  O_APPEND: 1024, // Append mode
  O_SYNC: 4096, // Synchronous writes
  O_DIRECTORY: 65536, // Must be a directory
  O_NOFOLLOW: 131072, // Don't follow symlinks

  // File types (mode bits)
  S_IFMT: 0o170000, // File type mask
  S_IFREG: 0o100000, // Regular file
  S_IFDIR: 0o040000, // Directory
  S_IFLNK: 0o120000, // Symbolic link
  S_IFBLK: 0o060000, // Block device
  S_IFCHR: 0o020000, // Character device
  S_IFIFO: 0o010000, // FIFO (named pipe)
  S_IFSOCK: 0o140000, // Socket

  // File permission bits
  S_IRWXU: 0o700, // Owner: rwx
  S_IRUSR: 0o400, // Owner: read
  S_IWUSR: 0o200, // Owner: write
  S_IXUSR: 0o100, // Owner: execute
  S_IRWXG: 0o070, // Group: rwx
  S_IRGRP: 0o040, // Group: read
  S_IWGRP: 0o020, // Group: write
  S_IXGRP: 0o010, // Group: execute
  S_IRWXO: 0o007, // Others: rwx
  S_IROTH: 0o004, // Others: read
  S_IWOTH: 0o002, // Others: write
  S_IXOTH: 0o001, // Others: execute

  // Special bits
  S_ISUID: 0o4000, // Set user ID on execution
  S_ISGID: 0o2000, // Set group ID on execution
  S_ISVTX: 0o1000, // Sticky bit

  // Copy flags
  COPYFILE_EXCL: 1, // Fail if destination exists
  COPYFILE_FICLONE: 2, // Use copy-on-write if supported
  COPYFILE_FICLONE_FORCE: 4, // Require copy-on-write

  // Seek modes
  SEEK_SET: 0, // Absolute position
  SEEK_CUR: 1, // Relative to current position
  SEEK_END: 2, // Relative to end of file
} as const

export type Constants = typeof constants
