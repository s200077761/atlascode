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
import { extensionId } from '../constants';
import { Logger } from '../logger';
import { Container } from '../container';

const isDebuggingRegex = /^--(debug|inspect)\b(-brk\b|(?!-))=?/;

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
        Logger.debug("config manager got config change",e);
        if (!e.affectsConfiguration(extensionId, null!)) { return; }

        Container.resetConfig();

        Logger.debug("config change is for atlascode!");
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
    async update(section: string, value: any, target: ConfigurationTarget, resource?: Uri | null) {
        return await workspace
            .getConfiguration(extensionId, target === ConfigurationTarget.Global ? undefined : resource!)
            .update(section, value, target);
    }

    async updateEffective(section: string, value: any, resource: Uri | null = null) {
        const inspect = await configuration.inspect(section, resource)!;
        if (inspect.workspaceFolderValue !== undefined) {
            if (value === inspect.workspaceFolderValue) { return; }

            return await configuration.update(section, value, ConfigurationTarget.WorkspaceFolder, resource);
        }

        if (inspect.workspaceValue !== undefined) {
            if (value === inspect.workspaceValue) { return; }

            return await configuration.update(section, value, ConfigurationTarget.Workspace);
        }

        if (inspect.globalValue === value || (inspect.globalValue === undefined && value === inspect.defaultValue)) {
            return;
        }

        return await configuration.update(
            section,
            value === inspect.defaultValue ? undefined : value,
            ConfigurationTarget.Global
        );
    }

    private _isDebugging: boolean | undefined;
    public get isDebugging() {
        if (this._isDebugging === undefined) {
            try {
                const args = process.execArgv;

                this._isDebugging = args ? args.some(arg => isDebuggingRegex.test(arg)) : false;
            }
            catch { }
        }

        return this._isDebugging;
    }
}

export const configuration = new Configuration();
