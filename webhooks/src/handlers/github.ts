import type { Env, GitHubPushEvent, GitHubPullRequestEvent, GitHubIssueEvent, GitHubReleaseEvent } from '../types'

/**
 * Handle GitHub webhook events
 *
 * Supported events:
 * - push
 * - pull_request
 * - issues
 * - release
 */
export async function handleGitHubWebhook(eventType: string, payload: any, env: Env): Promise<any> {
  console.log(`[GITHUB] Processing event: ${eventType}`)

  switch (eventType) {
    case 'push':
      return handlePushEvent(payload as GitHubPushEvent, env)

    case 'pull_request':
      return handlePullRequestEvent(payload as GitHubPullRequestEvent, env)

    case 'issues':
      return handleIssueEvent(payload as GitHubIssueEvent, env)

    case 'release':
      return handleReleaseEvent(payload as GitHubReleaseEvent, env)

    default:
      console.log(`[GITHUB] Unhandled event type: ${eventType}`)
      return { acknowledged: true, event_type: eventType }
  }
}

/**
 * Handle push event (code pushed to repository)
 */
async function handlePushEvent(event: GitHubPushEvent, env: Env): Promise<any> {
  console.log(`[GITHUB] Push to ${event.repository.full_name}: ${event.ref}`)

  // Extract branch name
  const branch = event.ref.replace('refs/heads/', '')

  // Store push event in database
  await env.DB.query({
    sql: `INSERT INTO github_events (repository_id, repository_name, event_type, branch, commit_sha, pusher_name, pusher_email, created_at)
          VALUES (?, ?, 'push', ?, ?, ?, ?, NOW())`,
    params: [event.repository.id, event.repository.full_name, branch, event.after, event.pusher.name, event.pusher.email],
  })

  // Queue build/deployment if main branch
  if (branch === 'main' || branch === 'master') {
    await env.QUEUE.enqueue({
      type: 'github.deploy',
      payload: {
        repository: event.repository.full_name,
        branch,
        commit: event.after,
        commits: event.commits,
      },
    })
  }

  return { processed: true, repository: event.repository.full_name, branch, commits: event.commits.length }
}

/**
 * Handle pull request event
 */
async function handlePullRequestEvent(event: GitHubPullRequestEvent, env: Env): Promise<any> {
  console.log(`[GITHUB] Pull request ${event.action}: ${event.repository.full_name}#${event.number}`)

  // Store PR event in database
  await env.DB.query({
    sql: `INSERT INTO github_events (repository_id, repository_name, event_type, pr_number, pr_title, pr_state, pr_merged, author, created_at)
          VALUES (?, ?, 'pull_request', ?, ?, ?, ?, ?, NOW())`,
    params: [
      event.repository.id,
      event.repository.full_name,
      event.number,
      event.pull_request.title,
      event.pull_request.state,
      event.pull_request.merged,
      event.pull_request.user.login,
    ],
  })

  // Queue actions based on PR state
  if (event.action === 'opened') {
    // Run CI/CD checks
    await env.QUEUE.enqueue({
      type: 'github.pr_checks',
      payload: {
        repository: event.repository.full_name,
        prNumber: event.number,
        headSha: event.pull_request.head.sha,
      },
    })
  } else if (event.action === 'closed' && event.pull_request.merged) {
    // Deploy merged PR
    await env.QUEUE.enqueue({
      type: 'github.pr_merged',
      payload: {
        repository: event.repository.full_name,
        prNumber: event.number,
        baseBranch: event.pull_request.base.ref,
        headSha: event.pull_request.head.sha,
      },
    })
  }

  return { processed: true, repository: event.repository.full_name, pr: event.number, action: event.action }
}

/**
 * Handle issue event
 */
async function handleIssueEvent(event: GitHubIssueEvent, env: Env): Promise<any> {
  console.log(`[GITHUB] Issue ${event.action}: ${event.repository.full_name}#${event.issue.number}`)

  // Store issue event in database
  await env.DB.query({
    sql: `INSERT INTO github_events (repository_id, repository_name, event_type, issue_number, issue_title, issue_state, author, created_at)
          VALUES (?, ?, 'issue', ?, ?, ?, ?, NOW())`,
    params: [event.repository.id, event.repository.full_name, event.issue.number, event.issue.title, event.issue.state, event.issue.user.login],
  })

  // Queue notification for new issues
  if (event.action === 'opened') {
    await env.QUEUE.enqueue({
      type: 'github.issue_created',
      payload: {
        repository: event.repository.full_name,
        issueNumber: event.issue.number,
        title: event.issue.title,
        author: event.issue.user.login,
        labels: event.issue.labels.map((l) => l.name),
      },
    })
  }

  return { processed: true, repository: event.repository.full_name, issue: event.issue.number, action: event.action }
}

/**
 * Handle release event
 */
async function handleReleaseEvent(event: GitHubReleaseEvent, env: Env): Promise<any> {
  console.log(`[GITHUB] Release ${event.action}: ${event.repository.full_name} ${event.release.tag_name}`)

  // Store release event in database
  await env.DB.query({
    sql: `INSERT INTO github_events (repository_id, repository_name, event_type, release_tag, release_name, release_draft, release_prerelease, created_at)
          VALUES (?, ?, 'release', ?, ?, ?, ?, NOW())`,
    params: [event.repository.id, event.repository.full_name, event.release.tag_name, event.release.name, event.release.draft, event.release.prerelease],
  })

  // Queue deployment for published releases
  if (event.action === 'published' && !event.release.prerelease) {
    await env.QUEUE.enqueue({
      type: 'github.release_published',
      payload: {
        repository: event.repository.full_name,
        tag: event.release.tag_name,
        name: event.release.name,
      },
    })
  }

  return { processed: true, repository: event.repository.full_name, tag: event.release.tag_name, action: event.action }
}
