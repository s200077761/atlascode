'use strict';
import { ConfigurationChangeEvent, ExtensionContext, OutputChannel, window } from 'vscode';
import { configuration, OutputLevel } from './config/configuration';
import { extensionOutputChannelName } from './constants';

//const ConsolePrefix = `[${extensionOutputChannelName}]`;

//const isDebuggingRegex = /^--(debug|inspect)\b(-brk\b|(?!-))=?/;

export class Logger {
    static level: OutputLevel = OutputLevel.Info;
    static output: OutputChannel | undefined;

    static configure(context: ExtensionContext) {
        context.subscriptions.push(configuration.onDidChange(this.onConfigurationChanged, this));
        this.onConfigurationChanged(configuration.initializingChangeEvent);
    }

    private static onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        const section = 'outputLevel';

        if (initializing || configuration.changed(e, section)) {
            this.level = configuration.get<OutputLevel>(section);
            // if (this.level === OutputLevel.Silent) {
            //     if (this.output !== undefined) {
            //         this.output.dispose();
            //         this.output = undefined;
            //     }
            // }
            // else {
                this.output = this.output || window.createOutputChannel(extensionOutputChannelName);
           // }

           this.output.appendLine("new level " + this.level)
        }

        if (this.output !== undefined) {
            this.output.appendLine("got change event")
        }
    }

    static log(message?: any, ...params: any[]): void {
        if (this.output !== undefined) {
            this.output.appendLine(
                ([message, ...params]).join(' ')
            );
        }
    }
}
