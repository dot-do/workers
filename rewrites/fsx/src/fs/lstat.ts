/**
 * lstat - get file/directory metadata without following symlinks
 *
 * Unlike stat(), lstat() returns information about the symlink itself,
 * not the file it points to.
 */

import { Stats } from '../core/types'

/**
 * Get file/directory statistics without following symbolic links.
 *
 * @param path - Path to the file, directory, or symlink
 * @returns Stats object with file metadata
 * @throws ENOENT if path does not exist
 */
export async function lstat(path: string): Promise<Stats> {
  // TODO: Implement lstat
  throw new Error('Not implemented')
}
