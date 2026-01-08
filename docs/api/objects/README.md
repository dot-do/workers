[**@dotdo/workers API Documentation v0.0.1**](../README.md)

***

[@dotdo/workers API Documentation](../modules.md) / objects

# objects

## Interfaces

- [HumanTask](interfaces/HumanTask.md)
- [HumanResponse](interfaces/HumanResponse.md)
- [TaskOption](interfaces/TaskOption.md)
- [EscalationLevel](interfaces/EscalationLevel.md)
- [SLAConfig](interfaces/SLAConfig.md)
- [TaskSource](interfaces/TaskSource.md)
- [CreateTaskInput](interfaces/CreateTaskInput.md)
- [ListTasksOptions](interfaces/ListTasksOptions.md)
- [HumanFeedback](interfaces/HumanFeedback.md)
- [QueueStats](interfaces/QueueStats.md)
- [HumanEnv](interfaces/HumanEnv.md)
- [NotificationMessage](interfaces/NotificationMessage.md)
- [OrganizationSettings](interfaces/OrganizationSettings.md)
- [SSOConfig](interfaces/SSOConfig.md)
- [AuditChanges](interfaces/AuditChanges.md)
- [MenuItem](interfaces/MenuItem.md)

## Type Aliases

- [TaskStatus](type-aliases/TaskStatus.md)
- [TaskPriority](type-aliases/TaskPriority.md)
- [TaskType](type-aliases/TaskType.md)
- [DecisionType](type-aliases/DecisionType.md)

## Variables

- [users](variables/users.md)
- [preferences](variables/preferences.md)
- [sessions](variables/sessions.md)
- [config](variables/config.md)
- [featureFlags](variables/featureFlags.md)
- [analyticsEvents](variables/analyticsEvents.md)
- [analyticsMetrics](variables/analyticsMetrics.md)
- [tenants](variables/tenants.md)
- [tenantMemberships](variables/tenantMemberships.md)
- [businesses](variables/businesses.md)
- [teamMembers](variables/teamMembers.md)
- [subscriptions](variables/subscriptions.md)
- [settings](variables/settings.md)
- [organizations](variables/organizations.md)
- [members](variables/members.md)
- [roles](variables/roles.md)
- [ssoConnections](variables/ssoConnections.md)
- [auditLogs](variables/auditLogs.md)
- [apiKeys](variables/apiKeys.md)
- [sites](variables/sites.md)
- [pages](variables/pages.md)
- [posts](variables/posts.md)
- [media](variables/media.md)
- [seoSettings](variables/seoSettings.md)
- [pageViews](variables/pageViews.md)
- [analyticsAggregates](variables/analyticsAggregates.md)
- [formSubmissions](variables/formSubmissions.md)
- [menus](variables/menus.md)
- [startups](variables/startups.md)
- [founders](variables/founders.md)
- [fundingRounds](variables/fundingRounds.md)
- [investors](variables/investors.md)
- [documents](variables/documents.md)
- [milestones](variables/milestones.md)
- [investorUpdates](variables/investorUpdates.md)
- [activityLog](variables/activityLog.md)
- [DO](variables/DO.md)

## References

### DOState

Re-exports [DOState](agent/interfaces/DOState.md)

***

### DurableObjectId

Re-exports [DurableObjectId](agent/interfaces/DurableObjectId.md)

***

### DOStorage

Re-exports [DOStorage](agent/interfaces/DOStorage.md)

***

### DOEnv

Re-exports [DOEnv](agent/interfaces/DOEnv.md)

***

### Memory

Re-exports [Memory](agent/interfaces/Memory.md)

***

### ConversationMessage

Re-exports [ConversationMessage](agent/interfaces/ConversationMessage.md)

***

### Conversation

Re-exports [Conversation](agent/interfaces/Conversation.md)

***

### ActionResult

Re-exports [ActionResult](agent/interfaces/ActionResult.md)

***

### ActionParameter

Re-exports [ActionParameter](agent/interfaces/ActionParameter.md)

***

### ActionHandler

Re-exports [ActionHandler](agent/type-aliases/ActionHandler.md)

***

### ActionDefinition

Re-exports [ActionDefinition](agent/interfaces/ActionDefinition.md)

***

### ActionExecution

Re-exports [ActionExecution](agent/interfaces/ActionExecution.md)

***

### Goal

Re-exports [Goal](agent/interfaces/Goal.md)

***

### Learning

Re-exports [Learning](agent/interfaces/Learning.md)

***

### AgentPersonality

Re-exports [AgentPersonality](agent/interfaces/AgentPersonality.md)

***

### AgentConfig

Re-exports [AgentConfig](agent/interfaces/AgentConfig.md)

***

### AgentDOState

Re-exports [AgentDOState](agent/interfaces/AgentDOState.md)

***

### MemoryQueryOptions

Re-exports [MemoryQueryOptions](agent/interfaces/MemoryQueryOptions.md)

***

### ConversationQueryOptions

Re-exports [ConversationQueryOptions](agent/interfaces/ConversationQueryOptions.md)

***

### WorkflowStep

Re-exports [WorkflowStep](agent/interfaces/WorkflowStep.md)

***

### AgentDO

Renames and re-exports [Agent](agent/classes/Agent.md)

***

### AppEnv

Re-exports [AppEnv](app/interfaces/AppEnv.md)

***

### BusinessEnv

Re-exports [BusinessEnv](business/interfaces/BusinessEnv.md)

***

### functions

Re-exports [functions](function/variables/functions.md)

***

### functionVersions

Re-exports [functionVersions](function/variables/functionVersions.md)

***

### executions

Re-exports [executions](function/variables/executions.md)

***

### logs

Re-exports [logs](function/variables/logs.md)

***

### rateLimits

Re-exports [rateLimits](function/variables/rateLimits.md)

***

### metrics

Re-exports [metrics](function/variables/metrics.md)

***

### warmInstances

Re-exports [warmInstances](function/variables/warmInstances.md)

***

### schema

Re-exports [schema](function/variables/schema.md)

***

### FunctionRecord

Re-exports [FunctionRecord](function/type-aliases/FunctionRecord.md)

***

### FunctionInsert

Re-exports [FunctionInsert](function/type-aliases/FunctionInsert.md)

***

### ExecutionRecord

Re-exports [ExecutionRecord](function/type-aliases/ExecutionRecord.md)

***

### LogRecord

Re-exports [LogRecord](function/type-aliases/LogRecord.md)

***

### MetricsRecord

Re-exports [MetricsRecord](function/type-aliases/MetricsRecord.md)

***

### RateLimitConfig

Re-exports [RateLimitConfig](function/interfaces/RateLimitConfig.md)

***

### ExecutionResult

Re-exports [ExecutionResult](function/interfaces/ExecutionResult.md)

***

### FunctionMetrics

Re-exports [FunctionMetrics](function/interfaces/FunctionMetrics.md)

***

### Agent

Re-exports [Agent](agent/classes/Agent.md)

***

### Workflow

Re-exports [Workflow](workflow/classes/Workflow.md)

***

### Function

Re-exports [Function](function/classes/Function.md)

***

### Human

Re-exports [Human](human/classes/Human.md)

***

### Startup

Re-exports [Startup](startup/classes/Startup.md)

***

### Business

Re-exports [Business](business/classes/Business.md)

***

### Org

Re-exports [Org](org/classes/Org.md)

***

### App

Re-exports [App](app/classes/App.md)

***

### Site

Re-exports [Site](site/classes/Site.md)

***

### OrgEnv

Re-exports [OrgEnv](org/interfaces/OrgEnv.md)

***

### CreateOrgInput

Re-exports [CreateOrgInput](org/interfaces/CreateOrgInput.md)

***

### InviteMemberInput

Re-exports [InviteMemberInput](org/interfaces/InviteMemberInput.md)

***

### CreateRoleInput

Re-exports [CreateRoleInput](org/interfaces/CreateRoleInput.md)

***

### UpdateSettingsInput

Re-exports [UpdateSettingsInput](org/interfaces/UpdateSettingsInput.md)

***

### SSOConnectionInput

Re-exports [SSOConnectionInput](org/interfaces/SSOConnectionInput.md)

***

### AuditLogInput

Re-exports [AuditLogInput](org/interfaces/AuditLogInput.md)

***

### OrgDO

Renames and re-exports [Org](org/classes/Org.md)

***

### SiteEnv

Re-exports [SiteEnv](site/interfaces/SiteEnv.md)

***

### StartupEnv

Re-exports [StartupEnv](startup/interfaces/StartupEnv.md)

***

### WorkflowStatus

Re-exports [WorkflowStatus](workflow/type-aliases/WorkflowStatus.md)

***

### StepStatus

Re-exports [StepStatus](workflow/type-aliases/StepStatus.md)

***

### WorkflowDefinition

Re-exports [WorkflowDefinition](workflow/interfaces/WorkflowDefinition.md)

***

### WorkflowTrigger

Re-exports [WorkflowTrigger](workflow/interfaces/WorkflowTrigger.md)

***

### WorkflowSchedule

Re-exports [WorkflowSchedule](workflow/interfaces/WorkflowSchedule.md)

***

### StepResult

Re-exports [StepResult](workflow/interfaces/StepResult.md)

***

### WorkflowExecution

Re-exports [WorkflowExecution](workflow/interfaces/WorkflowExecution.md)

***

### ResumePoint

Re-exports [ResumePoint](workflow/interfaces/ResumePoint.md)

***

### HistoryEntry

Re-exports [HistoryEntry](workflow/interfaces/HistoryEntry.md)

***

### WorkflowConfig

Re-exports [WorkflowConfig](workflow/interfaces/WorkflowConfig.md)
