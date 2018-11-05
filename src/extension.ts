'use strict';

import * as vscode from 'vscode';
import { BitbucketContext } from './bitbucket/context';
import { registerCommands, registerJiraCommands } from './commands';
import { registerResources } from './resources';
import { Configuration } from './config/configuration';
import { Logger } from './logger';
import { GitExtension } from './typings/git';
import { Atl } from './atlclients/clientManager';
import { JiraOutlineProvider } from './views/jira/jiraOutlineProvider';
import { refreshExplorer } from './commands/jira/refreshExplorer';
import { JiraContext } from './jira/context';

export function activate(context: vscode.ExtensionContext) {

    Configuration.configure(context);
    Logger.configure(context);
    registerResources(context);
    Atl.configure(context);

    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
    if (gitExtension) {
        const gitApi = gitExtension.exports.getAPI(1);
        const bbContext = new BitbucketContext(gitApi.repositories[0]);
        registerCommands(context, bbContext);
    } else {
        Logger.error(new Error('vscode.git extension not found'));
    }

    const assignedTree = new JiraOutlineProvider();
    const openTree = new JiraOutlineProvider();
    refreshExplorer(assignedTree, openTree);
    vscode.window.registerTreeDataProvider('assignedIssues', assignedTree);
    vscode.window.registerTreeDataProvider('openIssues', openTree);
    const jiraContext = new JiraContext(assignedTree, openTree);
    registerJiraCommands(context, jiraContext);

    Logger.debug('AtlasCode extension has been activated');
}

// this method is called when your extension is deactivated
export function deactivate() {
}
