'use strict';
export * from './model';

import {
    ConfigurationChangeEvent,
    ConfigurationTarget,
    Event,
    EventEmitter,
    ExtensionContext,
    Uri,
    workspace,
    Disposable,
    WorkspaceConfiguration
} from 'vscode';
import { extensionId, JiraLegacyWorkingSiteConfigurationKey, JiraV1WorkingProjectConfigurationKey, JiraCreateSiteAndProjectKey } from '../constants';
import { Container } from '../container';
import { SiteIdAndProjectKey } from './model';

/*
Configuration is a helper to manage configuration changes in various parts of the system.
It basically abstracts away the details of dealing with the workspace settings driectly.
*/
export class Configuration extends Disposable {
    static configure(context: ExtensionContext) {
        context.subscriptions.push(
            workspace.onDidChangeConfiguration(configuration.onConfigurationChanged, configuration)
        );
    }

    // ondidChange provides a way for consumers to register event listeners for config changes.
    private _onDidChange = new EventEmitter<ConfigurationChangeEvent>();
    get onDidChange(): Event<ConfigurationChangeEvent> {
        return this._onDidChange.event;
    }

    constructor() {
        super(() => this.dispose());
    }

    dispose() {
        this._onDidChange.dispose();
    }

    private onConfigurationChanged(e: ConfigurationChangeEvent) {
        // only fire if it's a config for our extension
        if (!e.affectsConfiguration(extensionId, null!)) { return; }

        Container.resetConfig();

        this._onDidChange.fire(e);
    }

    // initializingChangeEvent is an event instance that can be used to determine if the config
    // is being initialized for the first time rather than actually receiving a *real* change event.
    readonly initializingChangeEvent: ConfigurationChangeEvent = {
        affectsConfiguration: (section: string, resource?: Uri) => false
    };

    // get returns a strongly type config section/value
    get<T>(section?: string, resource?: Uri | null, defaultValue?: T) {
        return defaultValue === undefined
            ? workspace
                .getConfiguration(section === undefined ? undefined : extensionId, resource!)
                .get<T>(section === undefined ? extensionId : section)!
            : workspace
                .getConfiguration(section === undefined ? undefined : extensionId, resource!)
                .get<T>(section === undefined ? extensionId : section, defaultValue)!;
    }

    // changed can be called to see if the passed in section (minus the extensionId) was affect by the change
    changed(e: ConfigurationChangeEvent, section: string, resource?: Uri | null) {
        return e.affectsConfiguration(`${extensionId}.${section}`, resource!);
    }

    // initializing takes an event and returns if it is an initalizing event or not
    initializing(e: ConfigurationChangeEvent) {
        return e === this.initializingChangeEvent;
    }

    // inspect returns details of the given config section
    inspect(section?: string, resource?: Uri | null) {
        return workspace
            .getConfiguration(section === undefined ? undefined : extensionId, resource!)
            .inspect(section === undefined ? extensionId : section);
    }

    // update does what it sounds like
    private async update(section: string, value: any, target: ConfigurationTarget, resource?: Uri | null) {
        return await workspace
            .getConfiguration(extensionId, target === ConfigurationTarget.Global ? undefined : resource!)
            .update(section, value, target);
    }

    // Moving from V1 to V2 working site became default site.
    async clearVersion1WorkingSite() {
        await this.updateForWorkspace(JiraLegacyWorkingSiteConfigurationKey, undefined);
    }

    // Migrates the workspace level site settings. This needs to be done for every workspace /directory
    // the first time it's opened unlike global migrations that can happen on first run of the extension only.
    async migrateLocalVersion1WorkingSite(deletePrevious: boolean) {
        let inspect = configuration.inspect(JiraLegacyWorkingSiteConfigurationKey);
        if (inspect && inspect.workspaceValue) {
            const config = this.configForOpenWorkspace();
            if (config && deletePrevious) {
                await config.update(JiraLegacyWorkingSiteConfigurationKey, undefined);
            }
        }
        inspect = configuration.inspect(JiraV1WorkingProjectConfigurationKey);
        if (inspect && inspect.workspaceValue) {
            const config = this.configForOpenWorkspace();
            if (config && deletePrevious) {
                await config.update(JiraV1WorkingProjectConfigurationKey, undefined);
            }
        }
    }

    async setLastCreateSiteAndProject(siteAndProject?: SiteIdAndProjectKey) {
        await this.updateEffective(JiraCreateSiteAndProjectKey, siteAndProject);
    }

    async clearVersion1WorkingProject() {
        await this.updateForWorkspace(JiraV1WorkingProjectConfigurationKey, undefined);
    }

    private configForOpenWorkspace(): WorkspaceConfiguration | undefined {
        const f = workspace.workspaceFolders;
        if (f && f.length > 0) {
            return workspace.getConfiguration(extensionId, f[0].uri);
        }
        return undefined;
    }

    // Will attempt to update the value for both the Workspace and Global. If that fails (no folder is open) it will only set the value globaly.
    private async updateForWorkspace(section: string, value: any) {
        const config = this.configForOpenWorkspace();
        if (config) {
            await Promise.all([
                config.update(section, value, ConfigurationTarget.Workspace),
                config.update(section, value, ConfigurationTarget.Global)
            ]);
        } else {
            await this.updateEffective(section, value);
        }
    }

    async updateEffective(section: string, value: any, resource: Uri | null = null) {
        const inspect = this.inspect(section, resource)!;
        if (inspect.workspaceValue !== undefined) {
            if (value === inspect.workspaceValue) { return; }

            await this.update(section, value, ConfigurationTarget.Workspace, resource);
            return;
        }

        if (inspect.globalValue === value || (inspect.globalValue === undefined && value === inspect.defaultValue)) {
            return;
        }

        await this.update(
            section,
            value === inspect.defaultValue ? undefined : value,
            ConfigurationTarget.Global
        );
    }
}

export const configuration = new Configuration();
