/**
 * workflow.do/tiny - Minimal Workflow Orchestration
 *
 * Lightweight workflow engine without dotdo dependencies.
 * Use when you need the smallest possible bundle.
 */

export {
  Workflow,
  type WorkflowStatus,
  type StepStatus,
  type WorkflowStep,
  type WorkflowDefinition,
  type WorkflowTrigger,
  type WorkflowSchedule,
  type StepResult,
  type WorkflowExecution,
  type ResumePoint,
  type HistoryEntry,
  type WorkflowConfig,
} from './index'
