import * as vscode from 'vscode';
import { authenticateBitbucket } from './commands/authenticate';
import { authenticateJira } from './commands/authenticate';

enum Commands {
    AuthenticateBitbucket = 'atlascode.bb.authenticate',
    AuthenticateJira = 'atlascode.jira.authenticate'
}

export function registerCommands(vscodeContext: vscode.ExtensionContext) {
    vscodeContext.subscriptions.push(
        vscode.commands.registerCommand(Commands.AuthenticateBitbucket, authenticateBitbucket),
        vscode.commands.registerCommand(Commands.AuthenticateJira, authenticateJira)
    );
}