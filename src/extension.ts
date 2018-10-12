'use strict';

import * as vscode from 'vscode';
import { Logger } from './logger';
import { Configuration } from './config/configuration';
import { GitExtension } from './typings/git';
import { BitbucketContext } from './bitbucket/context';
import { registerCommands } from './commands';

export function activate(context: vscode.ExtensionContext) {

    Configuration.configure(context);
    Logger.configure(context);
    Logger.debug('AtlasCode extension has been activated');

    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git').exports;
    const gitApi = gitExtension.getAPI(1);

    const bbContext = new BitbucketContext(gitApi.repositories[0]);
    registerCommands(context, bbContext);
}

// this method is called when your extension is deactivated
export function deactivate() {
}