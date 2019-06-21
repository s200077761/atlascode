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
    Disposable
} from 'vscode';
import { extensionId, JiraWorkingSiteConfigurationKey, JiraWorkingProjectConfigurationKey, JiraDefaultSiteConfigurationKey } from '../constants';
import { Container } from '../container';
import { Project } from 'src/jira/jiraModel';
import { DetailedSiteInfo, AccessibleResourceV1 } from 'src/atlclients/authInfo';
import { WorkingProject } from './model';

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

    async setWorkingSite(site?: AccessibleResourceV1) {
        await this.updateForWorkspaceFolder(JiraWorkingSiteConfigurationKey, site);
        await this.updateForWorkspaceFolder(JiraWorkingProjectConfigurationKey, undefined);
    }

    async setDefaultSite(site?: DetailedSiteInfo) {
        await this.updateForWorkspaceFolder(JiraDefaultSiteConfigurationKey, site);
        await this.updateForWorkspaceFolder(JiraWorkingProjectConfigurationKey, undefined);
    }

    async setWorkingProject(project?: Project | WorkingProject) {
        // It's possible that the working site is being read from the global settings while we're writing to WorkspaceFolder settings. 
        // Re-write it to be sure that the site and project are written to the same ConfigurationTarget.
        const inspect = configuration.inspect(JiraWorkingSiteConfigurationKey);
        if (inspect && !inspect.workspaceFolderValue) {
            this.updateForWorkspaceFolder(JiraWorkingSiteConfigurationKey, inspect.globalValue);
        }
        await this.updateForWorkspaceFolder(JiraWorkingProjectConfigurationKey, project ? {
            id: project.id,
            name: project.name,
            key: project.key
        } : undefined);
    }

    // Will attempt to update the value for both the WorkspaceFolder and Global. If that fails (no folder is open) it will only set the value globaly.
    private async updateForWorkspaceFolder(section: string, value: any) {
        const f = workspace.workspaceFolders;
        if (f && f.length > 0) {
            const config = workspace.getConfiguration(extensionId, f[0].uri);
            return Promise.all([
                config.update(section, value, ConfigurationTarget.WorkspaceFolder),
                config.update(section, value, ConfigurationTarget.Global)
            ]);
        } else {
            return this.updateEffective(section, value);
        }
    }

    async updateEffective(section: string, value: any, resource: Uri | null = null) {
        const inspect = await this.inspect(section, resource)!;
        if (inspect.workspaceFolderValue !== undefined) {
            if (value === inspect.workspaceFolderValue) { return; }

            return await this.update(section, value, ConfigurationTarget.WorkspaceFolder, resource);
        }

        if (inspect.workspaceValue !== undefined) {
            if (value === inspect.workspaceValue) { return; }

            return await this.update(section, value, ConfigurationTarget.Workspace);
        }

        if (inspect.globalValue === value || (inspect.globalValue === undefined && value === inspect.defaultValue)) {
            return;
        }

        return await this.update(
            section,
            value === inspect.defaultValue ? undefined : value,
            ConfigurationTarget.Global
        );
    }
}

export const configuration = new Configuration();
