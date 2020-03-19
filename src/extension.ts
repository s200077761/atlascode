'use strict';

import * as semver from 'semver';
import { commands, env, ExtensionContext, extensions, languages, Memento, window } from 'vscode';
import { installedEvent, launchedEvent, upgradedEvent } from './analytics';
import { ProductBitbucket, ProductJira } from './atlclients/authInfo';
import { BitbucketContext } from './bitbucket/bbContext';
import { activate as activateCodebucket } from './codebucket/command/registerCommands';
import { Commands, registerCommands } from './commands';
import { configuration, Configuration, IConfig } from './config/configuration';
import { AuthInfoVersionKey, CommandContext, GlobalStateVersionKey, setCommandContext } from './constants';
import { Container } from './container';
import { provideCodeLenses } from './jira/todoObserver';
import { Logger } from './logger';
import { migrateAllWorkspaceCustomJQLS, V1toV2Migrator } from './migrations/v1tov2';
import { V2JiraServerUserIdFixer } from './migrations/v2JiraServerUserIdFixer';
import { V2toV3Migrator } from './migrations/v2tov3';
import { PipelinesYamlCompletionProvider } from './pipelines/yaml/pipelinesYamlCompletionProvider';
import {
    activateYamlExtension,
    addPipelinesSchemaToYamlConfig,
    BB_PIPELINES_FILENAME
} from './pipelines/yaml/pipelinesYamlHelper';
import { registerResources } from './resources';
import { GitExtension } from './typings/git';

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

        setCommandContext(
            CommandContext.IsJiraAuthenticated,
            Container.siteManager.productHasAtLeastOneSite(ProductJira)
        );
        setCommandContext(
            CommandContext.IsBBAuthenticated,
            Container.siteManager.productHasAtLeastOneSite(ProductBitbucket)
        );
    } catch (e) {
        Logger.error(e, 'Error initializing atlascode!');
    }

    if (previousVersion === undefined && window.state.focused) {
        commands.executeCommand(Commands.ShowOnboardingPage); //This is shown to users who have never opened our extension before
    } else {
        showWelcomePage(atlascodeVersion, previousVersion);
    }
    const delay = Math.floor(Math.random() * Math.floor(AnalyticDelay));
    setTimeout(() => {
        sendAnalytics(atlascodeVersion, context.globalState);
    }, delay);

    const duration = process.hrtime(start);
    context.subscriptions.push(languages.registerCodeLensProvider({ scheme: 'file' }, { provideCodeLenses }));

    // Following are async functions called without await so that they are run
    // in the background and do not slow down the time taken for the extension
    // icon to appear in the activity bar
    activateBitbucketFeatures();
    activateYamlFeatures(context);

    Logger.info(
        `Atlassian for VS Code (v${atlascodeVersion}) activated in ${duration[0] * 1000 +
            Math.floor(duration[1] / 1000000)} ms`
    );
}

async function activateBitbucketFeatures() {
    const gitExtension = extensions.getExtension<GitExtension>('vscode.git');
    if (!gitExtension) {
        Logger.error(new Error('vscode.git extension not found'));
        window.showInformationMessage(
            'Activating Bitbucket features failed. Install vscode.git extension to enable Bitbucket features.'
        );
        return;
    }

    try {
        const gitApi = gitExtension.exports.getAPI(1);
        const bbContext = new BitbucketContext(gitApi);
        Container.initializeBitbucket(bbContext);
    } catch (e) {
        Logger.error(e, 'Activating Bitbucket features failed');
        window.showInformationMessage('Activating Bitbucket features failed');
    }
}

async function activateYamlFeatures(context: ExtensionContext) {
    context.subscriptions.push(
        languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'yaml', pattern: `**/*${BB_PIPELINES_FILENAME}` },
            new PipelinesYamlCompletionProvider()
        )
    );
    await addPipelinesSchemaToYamlConfig();
    await activateYamlExtension();
}

async function migrateConfig(globalState: Memento): Promise<void> {
    const authModelVersion = globalState.get<number>(AuthInfoVersionKey);

    if (!authModelVersion || authModelVersion < 2) {
        const cfg = configuration.get<IConfig>();
        const migrator = new V1toV2Migrator(
            Container.siteManager,
            Container.credentialManager,
            !Container.isDebugging,
            Container.config.jira.workingProject,
            cfg.jira.workingSite
        );
        await migrator.convertLegacyAuthInfo();
        await globalState.update(AuthInfoVersionKey, 2);
        await configuration.migrateLocalVersion1WorkingSite(!Container.isDebugging);
    } else {
        // we've already migrated to 2.x but we might need to migrate workspace JQL
        migrateAllWorkspaceCustomJQLS(!Container.isDebugging);
        await configuration.migrateLocalVersion1WorkingSite(!Container.isDebugging);
    }

    if (authModelVersion === 2) {
        const v2JiraServerUserIdFixer = new V2JiraServerUserIdFixer(Container.credentialManager, Container.siteManager);
        await v2JiraServerUserIdFixer.fix();

        // Migrate from V2 to V3
        const migrator = new V2toV3Migrator(Container.siteManager, Container.credentialManager, !Container.isDebugging);
        await migrator.convertLegacyAuthInfo();
        await globalState.update(AuthInfoVersionKey, 3);
    }
}

async function showWelcomePage(version: string, previousVersion: string | undefined) {
    if (
        (previousVersion === undefined || semver.gt(version, previousVersion)) &&
        Container.config.showWelcomeOnInstall &&
        window.state.focused
    ) {
        window
            .showInformationMessage(`Jira and Bitbucket (Official) has been updated to v${version}`, 'Release notes')
            .then(userChoice => {
                if (userChoice === 'Release notes') {
                    commands.executeCommand(Commands.ShowWelcomePage);
                }
            });
    }
}

async function sendAnalytics(version: string, globalState: Memento) {
    const previousVersion = globalState.get<string>(GlobalStateVersionKey);
    globalState.update(GlobalStateVersionKey, version);

    if (previousVersion === undefined) {
        installedEvent(version).then(e => {
            Container.analyticsClient.sendTrackEvent(e);
        });
        return;
    }

    if (semver.gt(version, previousVersion)) {
        Logger.info(`Atlassian for VS Code upgraded from v${previousVersion} to v${version}`);
        upgradedEvent(version, previousVersion).then(e => {
            Container.analyticsClient.sendTrackEvent(e);
        });
    }

    launchedEvent(env.remoteName ? env.remoteName : 'local').then(e => {
        Container.analyticsClient.sendTrackEvent(e);
    });
}

// this method is called when your extension is deactivated
export function deactivate() {}
