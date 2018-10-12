import * as vscode from 'vscode';
import { BitbucketContext } from './bitbucket/context';
import { fetchPullRequestsCommand } from './commands/bitbucket/fetchPullRequests';

enum Commands {
    BitbucketFetchPullRequests = 'atlascode.bb.fetchPullRequests'
}

export function registerCommands(vscodeContext: vscode.ExtensionContext, bbContext: BitbucketContext) {
    vscodeContext.subscriptions.push(
        vscode.commands.registerCommand(Commands.BitbucketFetchPullRequests, fetchPullRequestsCommand, bbContext));
}