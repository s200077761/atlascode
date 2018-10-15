import * as vscode from 'vscode';
import { fetchPullRequestsCommand } from './commands/bitbucket/fetchPullRequests';
import { authenticateBitbucket } from './commands/authenticate';
import { authenticateJira } from './commands/authenticate';
import { BitbucketContext } from './bitbucket/context';

enum Commands {
    BitbucketFetchPullRequests = 'atlascode.bb.fetchPullRequests',
    AuthenticateBitbucket = 'atlascode.bb.authenticate',
    AuthenticateJira = 'atlascode.jira.authenticate'
}

export function registerCommands(vscodeContext: vscode.ExtensionContext, bbContext: BitbucketContext) {
    vscodeContext.subscriptions.push(
	    vscode.commands.registerCommand(Commands.BitbucketFetchPullRequests, fetchPullRequestsCommand, bbContext),
        vscode.commands.registerCommand(Commands.AuthenticateBitbucket, authenticateBitbucket),
        vscode.commands.registerCommand(Commands.AuthenticateJira, authenticateJira)
    );
}
