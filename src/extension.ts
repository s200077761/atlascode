"use strict";

import * as vscode from 'vscode';
import { BitbucketContext } from './bitbucket/context';
import { registerCommands } from './commands';
import { registerResources } from './resources';
import { configuration, Configuration, IConfig } from './config/configuration';
import { Logger } from './logger';
import { GitExtension } from './typings/git';
import { Container } from './container';
import { AuthProvider } from './atlclients/authInfo';
import { setCommandContext, CommandContext } from './constants';
import { activate as activateCodebucket } from './codebucket/command/registerCommands';
require('node-fetch');

export async function activate(context: vscode.ExtensionContext) {
    registerResources(context);
    Configuration.configure(context);
    Logger.configure(context);

    const cfg = configuration.get<IConfig>();

    Container.initialize(context, cfg);

    setCommandContext(CommandContext.IsJiraAuthenticated, await Container.authManager.isAuthenticated(AuthProvider.JiraCloud));
    setCommandContext(CommandContext.IsBBAuthenticated, await Container.authManager.isAuthenticated(AuthProvider.JiraCloud));

    registerCommands(context);
    activateCodebucket(context);

    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git');
    if (gitExtension) {
        const gitApi = gitExtension.exports.getAPI(1);
        const bbContext = new BitbucketContext(gitApi);
        context.subscriptions.push(bbContext);
    } else {
        Logger.error(new Error('vscode.git extension not found'));
    }

    Logger.debug('AtlasCode extension has been activated');
}

// this method is called when your extension is deactivated
export function deactivate() {
}
