/**
 * stat operation - get file/directory metadata (follows symlinks)
 *
 * Unlike lstat, stat follows symbolic links and returns information
 * about the target file/directory rather than the symlink itself.
 */

import { Stats } from '../core/types'

/**
 * Get file status (follows symbolic links)
 *
 * @param path - Path to file, directory, or symlink
 * @returns Stats object with file metadata
 * @throws ENOENT if path does not exist
 * @throws ENOENT if symlink target does not exist (broken symlink)
 */
export async function stat(path: string): Promise<Stats> {
  // TODO: Implement stat operation
  throw new Error('stat not implemented')
}
