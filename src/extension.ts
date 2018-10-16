'use strict';

import * as vscode from 'vscode';
import { BitbucketContext } from './bitbucket/context';
import { registerCommands } from './commands';
import { Configuration } from './config/configuration';
import { Logger } from './logger';
import { GitExtension } from './typings/git';
import { BaseNode } from './views/nodes/baseNode';
import { PullRequestNodeDataProvider } from './views/pullRequestNodeDataProvider';

export function activate(context: vscode.ExtensionContext) {

    Configuration.configure(context);
    Logger.configure(context);

    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
    if (gitExtension) {
        const gitApi = gitExtension.exports.getAPI(1);
        const bbContext = new BitbucketContext(gitApi.repositories[0]);
        registerCommands(context, bbContext);

        let prNodeDataProvider = new PullRequestNodeDataProvider(bbContext);
        context.subscriptions.push(vscode.window.registerTreeDataProvider<BaseNode>('atlascode.views.bb.pullrequestsTreeView', prNodeDataProvider));

        context.subscriptions.push(vscode.commands.registerCommand('atlascode.bb.refreshPullRequests', prNodeDataProvider.refresh, prNodeDataProvider));
    } else {
        Logger.error(new Error('vscode.git extension not found'));
    }

    Logger.debug('AtlasCode extension has been activated');

}

// this method is called when your extension is deactivated
export function deactivate() {
}
