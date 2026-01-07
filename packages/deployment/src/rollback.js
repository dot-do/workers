/**
 * Deployment Rollback Support for Cloudflare Workers
 *
 * This module provides deployment history tracking and safe rollback mechanisms
 * for Cloudflare Workers in the .do platform.
 */
/**
 * DeploymentManager handles deployment history tracking and rollback operations
 */
export class DeploymentManager {
    historyByWorker = new Map();
    maxHistoryEntries;
    constructor(options) {
        this.maxHistoryEntries = options?.maxHistoryEntries ?? Infinity;
    }
    /**
     * Record a new deployment in the history
     */
    async recordDeployment(deployment) {
        const workerName = deployment.workerName;
        const history = this.historyByWorker.get(workerName) ?? [];
        // Insert in chronological order
        const insertIndex = history.findIndex(d => d.timestamp > deployment.timestamp);
        if (insertIndex === -1) {
            history.push(deployment);
        }
        else {
            history.splice(insertIndex, 0, deployment);
        }
        // Trim to max entries if needed (keep most recent)
        if (this.maxHistoryEntries !== Infinity && history.length > this.maxHistoryEntries) {
            const toRemove = history.length - this.maxHistoryEntries;
            history.splice(0, toRemove);
        }
        this.historyByWorker.set(workerName, history);
    }
    /**
     * Get deployment history for a worker
     */
    async getHistory(workerName) {
        const deployments = this.historyByWorker.get(workerName) ?? [];
        return {
            workerName,
            deployments: [...deployments],
        };
    }
    /**
     * Get the current active deployment for a worker
     */
    async getCurrentDeployment(workerName) {
        const history = this.historyByWorker.get(workerName) ?? [];
        return history.find(d => d.status === 'active');
    }
    /**
     * Rollback to the previous deployment
     */
    async rollback(workerName) {
        const history = this.historyByWorker.get(workerName);
        if (!history || history.length === 0) {
            return {
                success: false,
                error: `No deployments found for worker: ${workerName}`,
            };
        }
        const currentDeployment = history.find(d => d.status === 'active');
        if (!currentDeployment) {
            return {
                success: false,
                error: `No active deployment found for worker: ${workerName}`,
            };
        }
        // Find the previous deployment (most recent that isn't the current one)
        const previousDeployments = history.filter(d => d.id !== currentDeployment.id && d.status !== 'failed');
        if (previousDeployments.length === 0) {
            return {
                success: false,
                error: 'No previous deployment available for rollback',
            };
        }
        // Get the most recent previous deployment
        const targetDeployment = previousDeployments[previousDeployments.length - 1];
        if (!targetDeployment) {
            return {
                success: false,
                error: 'No valid previous deployment found for rollback',
            };
        }
        return this.executeRollback(workerName, currentDeployment, targetDeployment);
    }
    /**
     * Rollback to a specific deployment by ID
     */
    async rollbackTo(workerName, deploymentId) {
        const history = this.historyByWorker.get(workerName);
        if (!history || history.length === 0) {
            return {
                success: false,
                error: `No deployments found for worker: ${workerName}`,
            };
        }
        const currentDeployment = history.find(d => d.status === 'active');
        if (!currentDeployment) {
            return {
                success: false,
                error: `No active deployment found for worker: ${workerName}`,
            };
        }
        const targetDeployment = history.find(d => d.id === deploymentId);
        if (!targetDeployment) {
            return {
                success: false,
                error: `Target deployment not found: ${deploymentId}`,
            };
        }
        if (targetDeployment.status === 'failed') {
            return {
                success: false,
                error: `Cannot rollback to failed deployment: ${deploymentId}`,
            };
        }
        return this.executeRollback(workerName, currentDeployment, targetDeployment);
    }
    /**
     * Check if rollback is possible for a worker
     */
    async canRollback(workerName) {
        const history = this.historyByWorker.get(workerName);
        if (!history || history.length <= 1) {
            return false;
        }
        const currentDeployment = history.find(d => d.status === 'active');
        if (!currentDeployment) {
            return false;
        }
        // Check if there's at least one valid previous deployment
        const validPreviousDeployments = history.filter(d => d.id !== currentDeployment.id && d.status !== 'failed');
        return validPreviousDeployments.length > 0;
    }
    /**
     * Get deployment by version number
     */
    async getDeploymentByVersion(workerName, version) {
        const history = this.historyByWorker.get(workerName) ?? [];
        return history.find(d => d.version === version);
    }
    /**
     * Get deployment by ID
     */
    async getDeploymentById(workerName, deploymentId) {
        const history = this.historyByWorker.get(workerName) ?? [];
        return history.find(d => d.id === deploymentId);
    }
    /**
     * List all versions for a worker
     */
    async listVersions(workerName) {
        const history = this.historyByWorker.get(workerName) ?? [];
        return history.map(d => d.version);
    }
    /**
     * Execute the rollback operation
     */
    async executeRollback(workerName, currentDeployment, targetDeployment) {
        const history = this.historyByWorker.get(workerName);
        // Create a new rollback deployment record
        const rollbackDeploymentId = `rollback-${Date.now()}`;
        const rollbackDeployment = {
            id: rollbackDeploymentId,
            version: targetDeployment.version,
            timestamp: Date.now(),
            workerName,
            scriptHash: targetDeployment.scriptHash,
            status: 'active',
            rolledBackFrom: currentDeployment.id,
        };
        // Update the current deployment status to 'rolled-back'
        const currentIndex = history.findIndex(d => d.id === currentDeployment.id);
        const currentHistoryItem = history[currentIndex];
        if (currentIndex !== -1 && currentHistoryItem) {
            history[currentIndex] = {
                ...currentHistoryItem,
                status: 'rolled-back',
            };
        }
        // Update the target deployment status to 'active'
        const targetIndex = history.findIndex(d => d.id === targetDeployment.id);
        const targetHistoryItem = history[targetIndex];
        if (targetIndex !== -1 && targetHistoryItem) {
            history[targetIndex] = {
                ...targetHistoryItem,
                status: 'active',
            };
        }
        // Add the rollback deployment record
        history.push(rollbackDeployment);
        this.historyByWorker.set(workerName, history);
        return {
            success: true,
            previousDeployment: currentDeployment,
            newDeployment: targetDeployment,
            rollbackDeploymentId,
        };
    }
}
