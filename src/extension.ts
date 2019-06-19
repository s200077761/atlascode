"use strict";

import { BitbucketContext } from './bitbucket/bbContext';
import { registerCommands, Commands } from './commands';
import { registerResources } from './resources';
import { configuration, Configuration, IConfig } from './config/configuration';
import { Logger } from './logger';
import { GitExtension } from './typings/git';
import { Container } from './container';
import { ProductJira, ProductBitbucket } from './atlclients/authInfo';
import { setCommandContext, CommandContext, GlobalStateVersionKey } from './constants';
import { languages, extensions, ExtensionContext, commands } from 'vscode';
import * as semver from 'semver';
import { activate as activateCodebucket } from './codebucket/command/registerCommands';
import { installedEvent, upgradedEvent } from './analytics';
import { window, Memento } from "vscode";
import { provideCodeLenses } from "./jira/todoObserver";
import { PipelinesYamlCompletionProvider } from './pipelines/yaml/pipelinesYamlCompletionProvider';
import { addPipelinesSchemaToYamlConfig, activateYamlExtension, BB_PIPELINES_FILENAME } from './pipelines/yaml/pipelinesYamlHelper';

const AnalyticDelay = 5000;

export async function activate(context: ExtensionContext) {
    const start = process.hrtime();
    const atlascode = extensions.getExtension('atlassian.atlascode')!;
    const atlascodeVersion = atlascode.packageJSON.version;
    const previousVersion = context.globalState.get<string>(GlobalStateVersionKey);

    console.log("registering resources");
    registerResources(context);

    console.log("configuring configuration");
    Configuration.configure(context);
    console.log("configuring Logger");
    Logger.configure(context);

    try {
        Logger.debug('initializing container');
        Container.initialize(context, configuration.get<IConfig>(), atlascodeVersion);

        Logger.debug('registering commands');
        registerCommands(context);
        activateCodebucket(context);

        Logger.debug('migrating old config');
        await migrateConfig();
        Logger.debug('old config migrated');

        Logger.debug('setting auth command context');
        setCommandContext(CommandContext.IsJiraAuthenticated, await Container.authManager.isProductAuthenticated(ProductJira));
        setCommandContext(CommandContext.IsBBAuthenticated, await Container.authManager.isProductAuthenticated(ProductBitbucket));

        const gitExtension = extensions.getExtension<GitExtension>('vscode.git');
        if (gitExtension) {
            const gitApi = gitExtension.exports.getAPI(1);
            const bbContext = new BitbucketContext(gitApi);
            Logger.debug('initializing bitbucket');
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

async function migrateConfig(): Promise<void> {
    const cfg = configuration.get<IConfig>();
    await Container.authManager.convertLegacyAuthInfo(cfg.jira.workingSite);
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
