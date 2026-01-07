/**
 * cli.do - Build beautiful CLIs for .do services
 *
 * Provides a unified CLI foundation with Commander for commands
 * and Ink for rich terminal UI components.
 *
 * @see https://cli.do
 *
 * @example
 * ```typescript
 * import { cli, command, render } from 'cli.do'
 *
 * // Quick command
 * cli('my-tool')
 *   .command('deploy')
 *   .description('Deploy your service')
 *   .action(async () => {
 *     render(<DeployProgress />)
 *   })
 *   .parse()
 *
 * // Or use the tagged template
 * const mycli = await cli.do`
 *   A tool for managing deployments
 *   with commands for deploy, rollback, and status
 * `
 * ```
 */

// Re-export Commander
export { Command, Option, Argument } from 'commander'
export type { Command as CommandType } from 'commander'

// Re-export Ink components
export { render, Box, Text, useInput, useApp, useStdin, useFocus, useFocusManager } from 'ink'
export { default as Spinner } from 'ink-spinner'
export { default as TextInput } from 'ink-text-input'
export { default as SelectInput } from 'ink-select-input'
export type { Instance as RenderInstance } from 'ink'

// Re-export React for Ink components
export { useState, useEffect, useCallback, useMemo } from 'react'
export type { FC, ReactNode } from 'react'

import { Command } from 'commander'
import { render } from 'ink'
import type { ReactNode } from 'react'
import { tagged, type TaggedTemplate, type DoOptions } from 'rpc.do'

// Types
export interface CLIConfig {
  name: string
  version?: string
  description?: string
  commands?: CommandConfig[]
}

export interface CommandConfig {
  name: string
  description?: string
  arguments?: ArgumentConfig[]
  options?: OptionConfig[]
  action?: (...args: unknown[]) => void | Promise<void>
  subcommands?: CommandConfig[]
}

export interface ArgumentConfig {
  name: string
  description?: string
  required?: boolean
  default?: unknown
}

export interface OptionConfig {
  flags: string
  description?: string
  default?: unknown
  choices?: string[]
}

/**
 * Create a CLI program
 */
export function cli(name: string, version?: string): Command {
  const program = new Command(name)
  if (version) program.version(version)
  return program
}

/**
 * Quick command helper
 */
export function command(name: string): Command {
  return new Command(name)
}

/**
 * Create a CLI from configuration
 */
export function createCLI(config: CLIConfig): Command {
  const program = new Command(config.name)

  if (config.version) program.version(config.version)
  if (config.description) program.description(config.description)

  if (config.commands) {
    for (const cmd of config.commands) {
      addCommand(program, cmd)
    }
  }

  return program
}

function addCommand(program: Command, config: CommandConfig): void {
  const cmd = program.command(config.name)

  if (config.description) cmd.description(config.description)

  if (config.arguments) {
    for (const arg of config.arguments) {
      const argStr = arg.required ? `<${arg.name}>` : `[${arg.name}]`
      cmd.argument(argStr, arg.description, arg.default)
    }
  }

  if (config.options) {
    for (const opt of config.options) {
      if (opt.choices) {
        cmd.option(opt.flags, opt.description, opt.default).choices(opt.choices)
      } else {
        cmd.option(opt.flags, opt.description, opt.default)
      }
    }
  }

  if (config.action) {
    cmd.action(config.action)
  }

  if (config.subcommands) {
    for (const sub of config.subcommands) {
      addCommand(cmd, sub)
    }
  }
}

// CLI Client interface
export interface CLIClient {
  /**
   * Create a CLI from natural language description
   */
  do: TaggedTemplate<Promise<Command>>

  /**
   * Create a CLI program
   */
  create(name: string, version?: string): Command

  /**
   * Create a CLI from config
   */
  fromConfig(config: CLIConfig): Command

  /**
   * Render an Ink component
   */
  render(element: ReactNode): ReturnType<typeof render>

  /**
   * Run a command
   */
  run(program: Command, args?: string[]): Promise<void>
}

/**
 * Create a configured CLI client
 */
export function CLI(): CLIClient {
  return {
    do: tagged(async (description: string, options?: DoOptions) => {
      // In a real implementation, this would use AI to generate the CLI
      const program = new Command(options?.name || 'cli')
      if (options?.version) program.version(options.version)
      program.description(description.trim())
      return program
    }),

    create: cli,

    fromConfig: createCLI,

    render: (element: ReactNode) => render(element),

    run: async (program: Command, args?: string[]) => {
      await program.parseAsync(args || process.argv)
    },
  }
}

/**
 * Default CLI client
 */
export const cliClient: CLIClient = CLI()

export default cliClient
