import React from 'react'
import { Box, Text } from 'ink'
import Spinner from 'ink-spinner'

interface AppProps {
  command: string
  args: string[]
  flags: Record<string, any>
}

const App: React.FC<AppProps> = ({ command, args, flags }) => {
  switch (command) {
    case 'inbox':
      return <InboxCommand flags={flags} />
    case 'task':
      return <TaskCommand taskId={args[0]} flags={flags} />
    case 'respond':
      return <RespondCommand taskId={args[0]} flags={flags} />
    case 'history':
      return <HistoryCommand flags={flags} />
    case 'watch':
      return <WatchCommand flags={flags} />
    case 'stats':
      return <StatsCommand flags={flags} />
    default:
      return (
        <Box flexDirection="column">
          <Text color="red">Unknown command: {command}</Text>
          <Text>Run `human --help` for usage information</Text>
        </Box>
      )
  }
}

// Placeholder components - to be implemented
const InboxCommand: React.FC<{ flags: any }> = ({ flags }) => {
  return (
    <Box flexDirection="column">
      <Text bold>Pending Tasks</Text>
      <Text>
        <Spinner type="dots" /> Loading tasks...
      </Text>
    </Box>
  )
}

const TaskCommand: React.FC<{ taskId: string; flags: any }> = ({ taskId, flags }) => {
  return (
    <Box flexDirection="column">
      <Text bold>Task: {taskId}</Text>
      <Text>
        <Spinner type="dots" /> Loading task details...
      </Text>
    </Box>
  )
}

const RespondCommand: React.FC<{ taskId: string; flags: any }> = ({ taskId, flags }) => {
  return (
    <Box flexDirection="column">
      <Text bold>Respond to Task: {taskId}</Text>
      <Text>Starting interactive form...</Text>
    </Box>
  )
}

const HistoryCommand: React.FC<{ flags: any }> = ({ flags }) => {
  return (
    <Box flexDirection="column">
      <Text bold>Task History</Text>
      <Text>
        <Spinner type="dots" /> Loading history...
      </Text>
    </Box>
  )
}

const WatchCommand: React.FC<{ flags: any }> = ({ flags }) => {
  return (
    <Box flexDirection="column">
      <Text bold>Watching for updates...</Text>
      <Text color="green">● Connected to WebSocket</Text>
    </Box>
  )
}

const StatsCommand: React.FC<{ flags: any }> = ({ flags }) => {
  return (
    <Box flexDirection="column">
      <Text bold>Task Statistics</Text>
      <Text>
        <Spinner type="dots" /> Loading stats...
      </Text>
    </Box>
  )
}

export default App
