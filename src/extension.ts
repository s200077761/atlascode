"use strict";

import { BitbucketContext } from './bitbucket/context';
import { registerCommands, Commands } from './commands';
import { registerResources } from './resources';
import { configuration, Configuration, IConfig } from './config/configuration';
import { Logger } from './logger';
import { GitExtension } from './typings/git';
import { Container } from './container';
import { AuthProvider } from './atlclients/authInfo';
import { setCommandContext, CommandContext, GlobalStateVersionKey } from './constants';
import { extensions, ExtensionContext, commands } from 'vscode';
import * as semver from 'semver';
import { activate as activateCodebucket } from './codebucket/command/registerCommands';
import { installedEvent, upgradedEvent } from './analytics';
require('node-fetch');

export async function activate(context: ExtensionContext) {
    const start = process.hrtime();
    const atlascode = extensions.getExtension('atlassianlabs.atlascode')!;
    const atlascodeVersion = atlascode.packageJSON.version;
    const previousVersion = context.globalState.get<string>(GlobalStateVersionKey);

    registerResources(context);
    Configuration.configure(context);
    Logger.configure(context);

    const cfg = configuration.get<IConfig>();

    Container.initialize(context, cfg, atlascodeVersion);

    setCommandContext(CommandContext.IsJiraAuthenticated, await Container.authManager.isAuthenticated(AuthProvider.JiraCloud));
    setCommandContext(CommandContext.IsBBAuthenticated, await Container.authManager.isAuthenticated(AuthProvider.JiraCloud));

    registerCommands(context);
    activateCodebucket(context);

    const gitExtension = extensions.getExtension<GitExtension>('vscode.git');
    if (gitExtension) {
        const gitApi = gitExtension.exports.getAPI(1);
        const bbContext = new BitbucketContext(gitApi);
        context.subscriptions.push(bbContext);
    } else {
        Logger.error(new Error('vscode.git extension not found'));
    }

    runInstallationRoutines(atlascodeVersion,previousVersion);
    context.globalState.update(GlobalStateVersionKey, atlascodeVersion);

    const duration = process.hrtime(start);
    Logger.debug(`Atlascode(v${atlascodeVersion}) activated in ${duration[0] * 1000 + Math.floor(duration[1] / 1000000)} ms`);
}

async function runInstallationRoutines(version: string, previousVersion: string | undefined) {
    if (previousVersion === undefined) {
        Logger.debug('first time install');
        installedEvent(version).then(e => { Container.analyticsClient.sendTrackEvent(e); });

        if (Container.config.showWelcomeOnInstall) {
            await commands.executeCommand(Commands.ShowWelcomePage);
        }

        return;
    }

    if (semver.gt(version,previousVersion)) {
        Logger.debug(`Atlascode upgraded from v${previousVersion} to v${version}`);

        upgradedEvent(version,previousVersion).then(e => { Container.analyticsClient.sendTrackEvent(e); });

        if(Container.config.showWelcomeOnInstall) {
            await commands.executeCommand(Commands.ShowWelcomePage);
        }
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}
