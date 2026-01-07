/**
 * Operation types for the Transaction class
 */
export type WriteOperation = {
  type: 'write'
  path: string
  data: Uint8Array
}

export type DeleteOperation = {
  type: 'delete'
  path: string
}

export type RenameOperation = {
  type: 'rename'
  oldPath: string
  newPath: string
}

export type MkdirOperation = {
  type: 'mkdir'
  path: string
}

export type Operation = WriteOperation | DeleteOperation | RenameOperation | MkdirOperation

export type TransactionStatus = 'pending' | 'committed' | 'rolled_back'

/**
 * Transaction class for building a sequence of file system operations.
 *
 * Supports chainable API for queuing operations that can later be
 * executed atomically against a file system.
 */
export class Transaction {
  public operations: Array<Operation> = []
  public status: TransactionStatus = 'pending'

  /**
   * Ensures the transaction is in a valid state to add operations.
   * Throws if the transaction has already been committed or rolled back.
   */
  private assertPending(): void {
    if (this.status !== 'pending') {
      throw new Error(`Cannot add operations to transaction with status '${this.status}'`)
    }
  }

  /**
   * Queue a write file operation.
   * @param path - The path to write to
   * @param data - The data to write
   * @returns this for chaining
   */
  writeFile(path: string, data: Uint8Array): this {
    this.assertPending()
    this.operations.push({
      type: 'write',
      path,
      data
    })
    return this
  }

  /**
   * Queue a delete file operation.
   * @param path - The path to delete
   * @returns this for chaining
   */
  deleteFile(path: string): this {
    this.assertPending()
    this.operations.push({
      type: 'delete',
      path
    })
    return this
  }

  /**
   * Queue a rename operation.
   * @param oldPath - The current path
   * @param newPath - The new path
   * @returns this for chaining
   */
  rename(oldPath: string, newPath: string): this {
    this.assertPending()
    this.operations.push({
      type: 'rename',
      oldPath,
      newPath
    })
    return this
  }

  /**
   * Queue a mkdir operation.
   * @param path - The directory path to create
   * @returns this for chaining
   */
  mkdir(path: string): this {
    this.assertPending()
    this.operations.push({
      type: 'mkdir',
      path
    })
    return this
  }
}
