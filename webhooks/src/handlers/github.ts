import type { Env, GitHubPushEvent, GitHubPullRequestEvent, GitHubIssueEvent, GitHubReleaseEvent } from '../types'
import { Octokit } from '@octokit/rest'

/**
 * GitHub API client configuration
 */
interface GitHubConfig {
  token: string;
  appId?: string;
  privateKey?: string;
}

/**
 * Sync options for Database → GitHub operations
 */
interface SyncToGitHubOptions {
  /** Repository name (e.g., "dot-do/notes") */
  repository: string;
  /** File path within repository */
  path: string;
  /** File content */
  content: string;
  /** Commit message */
  message: string;
  /** Branch to commit to (default: main) */
  branch?: string;
  /** Create PR instead of direct commit */
  createPR?: boolean;
  /** PR title (if createPR is true) */
  prTitle?: string;
  /** PR body (if createPR is true) */
  prBody?: string;
}

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

/**
 * Create GitHub API client
 */
function createGitHubClient(config: GitHubConfig): Octokit {
  return new Octokit({
    auth: config.token,
  })
}

/**
 * Sync entity from Database → GitHub
 *
 * Supports two modes:
 * 1. Direct commit to branch (default)
 * 2. Create pull request for review
 *
 * @param options - Sync configuration
 * @param env - Worker environment
 * @returns Sync result with commit/PR details
 */
export async function syncToGitHub(options: SyncToGitHubOptions, env: Env): Promise<any> {
  const { repository, path, content, message, branch = 'main', createPR = false, prTitle, prBody } = options

  // Validate GitHub token
  if (!env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN not configured')
  }

  // Create GitHub client
  const octokit = createGitHubClient({ token: env.GITHUB_TOKEN })

  // Parse owner and repo from repository string
  const [owner, repo] = repository.split('/')
  if (!owner || !repo) {
    throw new Error(`Invalid repository format: ${repository}`)
  }

  console.log(`[GITHUB] Syncing to ${repository}:${branch}/${path}`)

  try {
    // Check if file exists and get current SHA for updates
    let currentSha: string | undefined
    let fileExists = false

    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      })

      if ('sha' in fileData) {
        currentSha = fileData.sha
        fileExists = true
        console.log(`[GITHUB] File exists with SHA: ${currentSha}`)

        // Check for conflicts (if file was modified since last sync)
        const conflict = await detectConflict(octokit, owner, repo, path, branch, currentSha, env)
        if (conflict) {
          console.warn(`[GITHUB] Conflict detected: ${conflict.reason}`)
          throw new Error(`Conflict detected: ${conflict.reason}`)
        }
      }
    } catch (error: any) {
      if (error.status === 404) {
        console.log('[GITHUB] File does not exist, will create new file')
        fileExists = false
      } else {
        throw error
      }
    }

    // Encode content to base64
    const contentBase64 = btoa(unescape(encodeURIComponent(content)))

    if (createPR) {
      // Create pull request workflow
      return await createPullRequest(
        octokit,
        owner,
        repo,
        {
          title: prTitle || message,
          body: prBody || `Automated sync from database\n\nFile: ${path}`,
          baseBranch: branch,
          path,
          content: contentBase64,
          message,
          currentSha,
        },
        env
      )
    } else {
      // Direct commit workflow
      const { data: commit } = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: contentBase64,
        branch,
        sha: currentSha, // Include SHA for updates, undefined for new files
      })

      console.log(`[GITHUB] ${fileExists ? 'Updated' : 'Created'} file: ${path} (${commit.commit.sha})`)

      // Update database with new sync status
      await env.DB.query({
        sql: `UPDATE things
              SET github_sha = ?,
                  sync_status = 'synced',
                  last_synced_at = ?,
                  sync_error = NULL
              WHERE github_url = ? AND github_path = ?`,
        params: [commit.commit.sha, Date.now(), `https://github.com/${repository}`, path],
      })

      return {
        success: true,
        type: 'commit',
        commit: {
          sha: commit.commit.sha,
          url: commit.commit.html_url,
        },
        file: {
          path,
          url: commit.content?.html_url,
        },
      }
    }
  } catch (error: any) {
    console.error(`[GITHUB] Sync failed:`, error)

    // Update database with error status
    await env.DB.query({
      sql: `UPDATE things
            SET sync_status = 'failed',
                sync_error = ?
            WHERE github_url = ? AND github_path = ?`,
      params: [error.message, `https://github.com/${repository}`, path],
    })

    throw error
  }
}

/**
 * Create pull request for entity sync
 */
async function createPullRequest(
  octokit: Octokit,
  owner: string,
  repo: string,
  options: {
    title: string
    body: string
    baseBranch: string
    path: string
    content: string
    message: string
    currentSha?: string
  },
  env: Env
): Promise<any> {
  const { title, body, baseBranch, path, content, message, currentSha } = options

  console.log(`[GITHUB] Creating PR for ${owner}/${repo}`)

  // Create a new branch for the PR
  const branchName = `sync/${Date.now()}-${path.replace(/\//g, '-').replace(/\.mdx?$/, '')}`

  // Get base branch ref
  const { data: baseRef } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${baseBranch}`,
  })

  // Create new branch from base
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branchName}`,
    sha: baseRef.object.sha,
  })

  console.log(`[GITHUB] Created branch: ${branchName}`)

  // Commit file to new branch
  const { data: commit } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content,
    branch: branchName,
    sha: currentSha,
  })

  console.log(`[GITHUB] Committed to branch: ${commit.commit.sha}`)

  // Create pull request
  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    title,
    body: `${body}\n\n🤖 Automated sync via database.do\n\nCommit: ${commit.commit.sha}`,
    head: branchName,
    base: baseBranch,
  })

  console.log(`[GITHUB] Created PR #${pr.number}: ${pr.html_url}`)

  // Update database with PR status
  await env.DB.query({
    sql: `UPDATE things
          SET sync_status = 'pending',
              sync_error = NULL
          WHERE github_url = ? AND github_path = ?`,
    params: [`https://github.com/${owner}/${repo}`, path],
  })

  return {
    success: true,
    type: 'pull_request',
    pr: {
      number: pr.number,
      url: pr.html_url,
      branch: branchName,
    },
    commit: {
      sha: commit.commit.sha,
    },
  }
}

/**
 * Detect conflicts between database and GitHub
 *
 * Checks if file was modified on GitHub since last sync
 */
async function detectConflict(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string,
  currentSha: string,
  env: Env
): Promise<{ conflict: boolean; reason?: string } | null> {
  // Get last known SHA from database
  const result = await env.DB.query({
    sql: `SELECT github_sha, last_synced_at
          FROM things
          WHERE github_url = ? AND github_path = ?`,
    params: [`https://github.com/${owner}/${repo}`, path],
  })

  if (!result.results || result.results.length === 0) {
    // No sync history, no conflict
    return null
  }

  const dbRecord = result.results[0] as any
  const lastKnownSha = dbRecord.github_sha

  if (!lastKnownSha) {
    // No previous sync, no conflict
    return null
  }

  if (currentSha !== lastKnownSha) {
    // File changed on GitHub since last sync - CONFLICT!
    return {
      conflict: true,
      reason: `File modified on GitHub (current: ${currentSha}, expected: ${lastKnownSha})`,
    }
  }

  return null
}
