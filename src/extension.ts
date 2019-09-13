"use strict";

import { BitbucketContext } from './bitbucket/bbContext';
import { registerCommands, Commands } from './commands';
import { registerResources } from './resources';
import { configuration, Configuration, IConfig } from './config/configuration';
import { Logger } from './logger';
import { GitExtension } from './typings/git';
import { Container } from './container';
import { ProductJira, ProductBitbucket } from './atlclients/authInfo';
import { setCommandContext, CommandContext, GlobalStateVersionKey, AuthInfoVersionKey } from './constants';
import { languages, extensions, ExtensionContext, commands } from 'vscode';
import * as semver from 'semver';
import { activate as activateCodebucket } from './codebucket/command/registerCommands';
import { installedEvent, upgradedEvent } from './analytics';
import { window, Memento } from "vscode";
import { provideCodeLenses } from "./jira/todoObserver";
import { PipelinesYamlCompletionProvider } from './pipelines/yaml/pipelinesYamlCompletionProvider';
import { addPipelinesSchemaToYamlConfig, activateYamlExtension, BB_PIPELINES_FILENAME } from './pipelines/yaml/pipelinesYamlHelper';
import { V1toV2Migrator } from './migrations/v1tov2';

const AnalyticDelay = 5000;

export async function activate(context: ExtensionContext) {
    const start = process.hrtime();
    const atlascode = extensions.getExtension('atlassian.atlascode')!;
    const atlascodeVersion = atlascode.packageJSON.version;
    const previousVersion = context.globalState.get<string>(GlobalStateVersionKey);

    registerResources(context);

    Configuration.configure(context);
    Logger.configure(context);

    try {
        Container.initialize(context, configuration.get<IConfig>(), atlascodeVersion);

        registerCommands(context);
        activateCodebucket(context);

        await migrateConfig(context.globalState);

        setCommandContext(CommandContext.IsJiraAuthenticated, await Container.siteManager.productHasAtLeastOneSite(ProductJira));
        setCommandContext(CommandContext.IsBBAuthenticated, await Container.siteManager.productHasAtLeastOneSite(ProductBitbucket));

        const gitExtension = extensions.getExtension<GitExtension>('vscode.git');
        if (gitExtension) {
            const gitApi = gitExtension.exports.getAPI(1);
            const bbContext = new BitbucketContext(gitApi);
            Container.initializeBitbucket(bbContext);
        } else {
            Logger.error(new Error('vscode.git extension not found'));
        }

    } catch (e) {
        Logger.error(e, 'Error initializing atlascode!');
    }

    showWelcomePage(atlascodeVersion, previousVersion);
    const delay = Math.floor(Math.random() * Math.floor(AnalyticDelay));
    setTimeout(() => {
        sendAnalytics(atlascodeVersion, context.globalState);
    }, delay);

    const duration = process.hrtime(start);
    context.subscriptions.push(languages.registerCodeLensProvider({ scheme: 'file' }, { provideCodeLenses }));
    context.subscriptions.push(languages.registerCompletionItemProvider({ scheme: 'file', language: 'yaml', pattern: `**/*${BB_PIPELINES_FILENAME}` }, new PipelinesYamlCompletionProvider()));

    await addPipelinesSchemaToYamlConfig();
    await activateYamlExtension();

    Logger.info(`Atlassian for VSCode (v${atlascodeVersion}) activated in ${duration[0] * 1000 + Math.floor(duration[1] / 1000000)} ms`);
}

async function migrateConfig(globalState: Memento): Promise<void> {
    const authModelVersion = globalState.get<number>(AuthInfoVersionKey);

    if (!authModelVersion || authModelVersion < 2) {
        const cfg = configuration.get<IConfig>();
        const migrator = new V1toV2Migrator(Container.siteManager,
            Container.credentialManager,
            !Container.isDebugging,
            Container.config.jira.workingProject,
            cfg.jira.workingSite);
        await migrator.convertLegacyAuthInfo();
        await globalState.update(AuthInfoVersionKey, 2);
    }

    await configuration.migrateLocalVersion1WorkingSite(!Container.isDebugging);
}

async function showWelcomePage(version: string, previousVersion: string | undefined) {
    if ((previousVersion === undefined || semver.gt(version, previousVersion)) &&
        Container.config.showWelcomeOnInstall &&
        window.state.focused) {
        await commands.executeCommand(Commands.ShowWelcomePage);
    }
}

async function sendAnalytics(version: string, globalState: Memento) {
    const previousVersion = globalState.get<string>(GlobalStateVersionKey);
    globalState.update(GlobalStateVersionKey, version);

    if (previousVersion === undefined) {
        installedEvent(version).then(e => { Container.analyticsClient.sendTrackEvent(e); });
        return;
    }

    if (semver.gt(version, previousVersion)) {
        Logger.info(`Atlassian for VSCode upgraded from v${previousVersion} to v${version}`);
        upgradedEvent(version, previousVersion).then(e => { Container.analyticsClient.sendTrackEvent(e); });
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}
