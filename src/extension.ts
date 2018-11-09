'use strict';

import * as vscode from 'vscode';
import { BitbucketContext } from './bitbucket/context';
import { registerCommands } from './commands';
import { registerResources } from './resources';
import { configuration, Configuration, IConfig } from './config/configuration';
import { Logger } from './logger';
import { GitExtension } from './typings/git';
import { Atl } from './atlclients/clientManager';
import { JiraOutlineProvider } from './views/jira/jiraOutlineProvider';
import { refreshExplorer } from './commands/jira/refreshExplorer';
import { JiraContext } from './jira/context';
import { Container } from './container';

export function activate(context: vscode.ExtensionContext) {

    Configuration.configure(context);
    Logger.configure(context);

    const cfg = configuration.get<IConfig>();

    Container.initialize(context, cfg);
    registerResources(context);
    Atl.configure(context);

    const assignedTree = new JiraOutlineProvider();
    const openTree = new JiraOutlineProvider();
    refreshExplorer(assignedTree, openTree);
    vscode.window.registerTreeDataProvider('assignedIssues', assignedTree);
    vscode.window.registerTreeDataProvider('openIssues', openTree);
    const jiraContext: JiraContext = { assignedTree: assignedTree, openTree: openTree };

    registerCommands(context, jiraContext);

    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
    if (gitExtension) {
        const gitApi = gitExtension.exports.getAPI(1);
        const bbContext = new BitbucketContext(context, gitApi);
        context.subscriptions.push(bbContext);
    } else {
        Logger.error(new Error('vscode.git extension not found'));
    }

    Logger.debug('AtlasCode extension has been activated');
}

// this method is called when your extension is deactivated
export function deactivate() {
}
