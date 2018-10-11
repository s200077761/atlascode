'use strict';

import * as vscode from 'vscode';
import { Logger } from './logger';
import { Configuration } from './config/configuration';

export function activate(context: vscode.ExtensionContext) {

    Configuration.configure(context);
    Logger.configure(context);
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    Logger.info('AtlasCode extension has been activated');

}

// this method is called when your extension is deactivated
export function deactivate() {
}