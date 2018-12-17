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
import { extensions, ExtensionContext, commands, window, Uri } from 'vscode';
import * as semver from 'semver';
import { activate as activateCodebucket } from './codebucket/command/registerCommands';
import { installedEvent, upgradedEvent } from './analytics';
import fetch, {Response} from 'node-fetch';

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
    setCommandContext(CommandContext.IsBBAuthenticated, await Container.authManager.isAuthenticated(AuthProvider.BitbucketCloud));

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
    checkForNewVersion(version);

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

async function checkForNewVersion(current:string) {
    fetch('https://brainicorn:nMqq3A9E4QXQ28aXBgpu@api.bitbucket.org/2.0/repositories/atlassianlabs/atlascode/refs/tags', {
        method: 'get',
        headers: { 
            'Content-Type': 'application/json',
        },
    }).then((resp:Response) => {
        if(resp && resp.body) {
            const tags: string[] = [];

            resp.json()
            .then(jsonResp => {
                jsonResp.values!.forEach((val:any) => {
                    if(semver.prerelease(val.name) === null) {
                        tags.push(val.name);
                    }
                });

                let sorted = semver.rsort(tags);
                let latest:string | semver.SemVer = '0';

                if(sorted.length > 0) {
                    latest = sorted[0];
                    Logger.debug('tags',sorted);
                }

                if(semver.gt(latest,current)) {
                    window.showInformationMessage(`A new version of Atlascode is available: ${latest}`, 'Download Now')
                    .then(usersChoice => {
                        if(usersChoice === 'Download Now') {
                            commands.executeCommand('vscode.open', Uri.parse(`https://bitbucket.org/atlassianlabs/atlascode/downloads/atlascode-${latest}.vsix`));
                        }
                    });
                }
            });
        }
    });
}
// this method is called when your extension is deactivated
export function deactivate() {
}
