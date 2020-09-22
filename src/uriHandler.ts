import { commands, Disposable, env, QuickPickItem, Uri, UriHandler, window } from 'vscode';
import { LoginManager } from './atlclients/loginManager';
import { bitbucketSiteForRemote, clientForHostname } from './bitbucket/bbUtils';
import { WorkspaceRepo } from './bitbucket/model';
import { Commands } from './commands';
import { Container } from './container';
import { AnalyticsApi } from './lib/analyticsApi';
import { ConfigSection, ConfigSubSection } from './lib/ipc/models/config';
import { Logger } from './logger';

const ExtensionId = 'atlassian.atlascode';
//const pullRequestUrl = `${env.uriScheme}://${ExtensionId}/openPullRequest`;

export const SETTINGS_URL = `${env.uriScheme}://${ExtensionId}/openSettings`;
export const ONBOARDING_URL = `${env.uriScheme}://${ExtensionId}/openOnboarding`;

/**
 * AtlascodeUriHandler handles URIs of the format <scheme>://atlassian.atlascode/<path and query params>
 * where scheme can be vscode or vscode-insiders depending on which version the user is running
 *
 * Following URI paths are supported:
 * - openSettings: opens the extension's settings page
 * - openOnboarding: opens the onboarding webview
 * - openPullRequest: opens pull request based on the following query params (only supports Bitbucket Cloud)
 *      -- q: pull request URL (use encodeURIComponent to encode the URL)
 *      -- source: source from which the URI e.g. browser
 *      e.g. vscode://atlassian.atlascode/openPullRequest?q=https%3A%2F%2Fbitbucket.org%2Fatlassianlabs%2Fatlascode%2Fpull-requests%2F804&source=browser
 * - cloneRepository: opens pull request based on the following query params (only supports Bitbucket Cloud)
 *      -- q: repository URL (use encodeURIComponent to encode the URL)
 *      -- source: source from which the URI e.g. browser
 *      e.g. vscode://atlassian.atlascode/cloneRepository?q=https%3A%2F%2Fbitbucket.org%2Fatlassianlabs%2Fatlascode&source=browser
 */
export class AtlascodeUriHandler implements Disposable, UriHandler {
    private disposables: Disposable;

    constructor(private loginManager: LoginManager, private analyticsApi: AnalyticsApi) {
        this.disposables = window.registerUriHandler(this);
    }

    async handleUri(uri: Uri) {
        if (uri.path.endsWith('openSettings')) {
            Container.settingsWebviewFactory.createOrShow();
        } else if (uri.path.endsWith('openOnboarding')) {
            Container.onboardingWebviewFactory.createOrShow();
        } else if (uri.path.endsWith('openPullRequest')) {
            await this.handlePullRequestUri(uri);
        } else if (uri.path.endsWith('cloneRepository')) {
            await this.handleCloneRepository(uri);
        } else if (uri.path.endsWith('finalizeAuthentication')) {
            await this.finalizeAuthentication(uri);
        }
    }

    private async handlePullRequestUri(uri: Uri) {
        try {
            const query = new URLSearchParams(uri.query);
            const prUrl = decodeURIComponent(query.get('q') || '');
            if (!prUrl) {
                throw new Error(`Cannot parse pull request URL from: ${query}`);
            }
            const repoUrl = prUrl.slice(0, prUrl.indexOf('/pull-requests'));
            const site = bitbucketSiteForRemote({
                name: '',
                fetchUrl: repoUrl,
                isReadOnly: true,
            })!;

            const prUrlPath = Uri.parse(prUrl).path;
            const prId = prUrlPath.slice(prUrlPath.lastIndexOf('/') + 1);

            try {
                const client = await clientForHostname('bitbucket.org');
                const pr = await client.pullrequests.getById(site, parseInt(prId));
                const wsRepo = this.findRepoInCurrentWorkspace(repoUrl);
                Container.pullRequestDetailsWebviewFactory.createOrShow(pr.data.url, { ...pr, workspaceRepo: wsRepo });
            } catch {
                this.showLoginMessage();
            }
            this.analyticsApi.fireDeepLinkEvent(decodeURIComponent(query.get('source') || 'unknown'), 'pullRequest');
        } catch (e) {
            Logger.debug('error opening pull request:', e);
            window.showErrorMessage('Error opening pull request (check log for details)');
        }
    }

    private showLoginMessage() {
        window
            .showInformationMessage(
                'Cannot open pull request. Authenticate with Bitbucket in the extension settings and try again.',
                'Open settings'
            )
            .then((userChoice) => {
                if (userChoice === 'Open settings') {
                    Container.settingsWebviewFactory.createOrShow({
                        section: ConfigSection.Bitbucket,
                        subSection: ConfigSubSection.Auth,
                    });
                }
            });
    }

    private async handleCloneRepository(uri: Uri) {
        try {
            const query = new URLSearchParams(uri.query);
            const repoUrl = decodeURIComponent(query.get('q') || '');
            if (!repoUrl) {
                throw new Error(`Cannot parse clone URL from: ${query}`);
            }

            const wsRepo = this.findRepoInCurrentWorkspace(repoUrl);
            if (wsRepo !== undefined) {
                window.showInformationMessage(
                    `Skipped cloning. Repository is open in this workspace already: ${wsRepo.rootUri}`
                );
            } else {
                this.showCloneOptions(repoUrl);
            }

            this.analyticsApi.fireDeepLinkEvent(
                decodeURIComponent(query.get('source') || 'unknown'),
                'cloneRepository'
            );
        } catch (e) {
            Logger.debug('error cloning repository:', e);
            window.showErrorMessage('Error cloning repository (check log for details)');
        }
    }

    private findRepoInCurrentWorkspace(repoUrl: string): WorkspaceRepo | undefined {
        return Container.bitbucketContext.getBitbucketCloudRepositories().find((wsRepo) => {
            const site = wsRepo.mainSiteRemote.site!;
            const fullName = `${site.ownerSlug}/${site.repoSlug}`;
            return repoUrl.includes(fullName);
        });
    }

    private showCloneOptions(repoUrl: string) {
        const options: (QuickPickItem & { action: () => void })[] = [
            {
                label: 'Clone a new copy',
                action: () => commands.executeCommand(Commands.CloneRepository, 'uriHandler', repoUrl),
            },
            {
                label: 'Add an existing folder to this workspace',
                action: () => commands.executeCommand(Commands.WorkbenchOpenRepository, 'uriHandler'),
            },
            {
                label: 'Open repository in an different workspace',
                action: () => commands.executeCommand(Commands.WorkbenchOpenWorkspace, 'uriHandler'),
            },
        ];

        window.showQuickPick(options).then((selection) => selection?.action());
    }

    private async finalizeAuthentication(uri: Uri) {
        const query = new URLSearchParams(uri.query);
        const code = query.get('code') ?? '';
        const state = query.get('xstate') ?? ''; // xstate is used to avoid overwriting the state param used by codespaces
        this.loginManager.exchangeCodeForTokens(state, code);
    }

    dispose(): void {
        this.disposables.dispose();
    }
}
