import { commands, Disposable, env, QuickPickItem, Uri, UriHandler, window } from 'vscode';
import { ProductJira } from './atlclients/authInfo';
import { LoginManager } from './atlclients/loginManager';
import { bitbucketSiteForRemote, clientForHostname } from './bitbucket/bbUtils';
import { WorkspaceRepo } from './bitbucket/model';
import { Commands } from './commands';
import { startWorkOnIssue } from './commands/jira/startWorkOnIssue';
import { Container } from './container';
import { fetchMinimalIssue } from './jira/fetchIssue';
import { AnalyticsApi } from './lib/analyticsApi';
import { ConfigSection, ConfigSubSection } from './lib/ipc/models/config';
import { Logger } from './logger';
import { checkout } from './views/pullrequest/gitActions';

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
        } else if (uri.path.endsWith('startWorkOnJiraIssue')) {
            await this.handleStartWorkOnJiraIssue(uri);
        } else if (uri.path.endsWith('checkoutBranch')) {
            await this.handleCheckoutBranch(uri);
        }
    }

    private async handleCheckoutBranch(uri: Uri) {
        try {
            const query = new URLSearchParams(uri.query);
            const cloneUrl = decodeURIComponent(query.get('cloneUrl') || '');
            const sourceCloneUrl = decodeURIComponent(query.get('sourceCloneUrl') || ''); //For branches originating from a forked repo
            const ref = query.get('ref');
            const refType = query.get('refType');

            if (!ref || !cloneUrl || !refType) {
                throw new Error(`Query params are missing data: ${query}`);
            }

            let wsRepo = this.findRepoInCurrentWorkspace(cloneUrl);
            if (!wsRepo) {
                window
                    .showInformationMessage(
                        `To checkout ref ${ref}: this repository must be cloned in this workspace`,
                        'Clone Repo'
                    )
                    .then(async (userChoice) => {
                        if (userChoice === 'Clone Repo') {
                            await this.showCloneOptions(cloneUrl);
                        }
                    });

                //try to find the repo again after cloning
                wsRepo = this.findRepoInCurrentWorkspace(cloneUrl);
                if (!wsRepo) {
                    window
                        .showInformationMessage(
                            `Could not find repo in current workspace after attempting to clone. Are you authenticated with Bitbucket?`,
                            'Open auth settings'
                        )
                        .then((userChoice) => {
                            if (userChoice === 'Open auth settings') {
                                Container.settingsWebviewFactory.createOrShow({
                                    section: ConfigSection.Jira,
                                    subSection: ConfigSubSection.Auth,
                                });
                            }
                        });
                    return;
                }
            }

            if (!wsRepo.mainSiteRemote.site) {
                //I think this means it's not a Bitbucket repo
                throw new Error(
                    `Could not tie ${wsRepo.mainSiteRemote.remote.name} to a BitbucketSite object. Is this a Bitbucket repo?`
                );
            }

            //Checkout error-handling/messaging is already handled in checkout() function
            await checkout(wsRepo, ref, sourceCloneUrl);

            this.analyticsApi.fireDeepLinkEvent(decodeURIComponent(query.get('source') || 'unknown'), 'checkoutBranch');

            if (refType === 'branch') {
                window.showInformationMessage(`Branch ${ref} successfully checked out`);
            } else {
                window.showInformationMessage(`${ref} successfully checked out`);
            }
        } catch (e) {
            Logger.debug('error checkout out branch:', e);
            window.showErrorMessage('Error checkout out branch (check log for details)');
        }
    }

    private async handleStartWorkOnJiraIssue(uri: Uri) {
        try {
            const query = new URLSearchParams(uri.query);
            const siteBaseURL = query.get('site');
            const issueKey = query.get('issueKey');
            // const aaid = query.get('aaid'); aaid is not currently used for anything is included in the url and may be useful to have in the future

            if (!siteBaseURL || !issueKey) {
                throw new Error(`Cannot parse request URL from: ${query}`);
            }

            const jiraSitesAvailable = Container.siteManager.getSitesAvailable(ProductJira);
            let site = jiraSitesAvailable.find(
                (availableSite) => availableSite.isCloud && availableSite.baseLinkUrl.includes(siteBaseURL)
            );
            if (!site) {
                window
                    .showInformationMessage(
                        `Cannot start work on ${issueKey} because site '${siteBaseURL}' is not authenticated. Please authenticate and try again.`,
                        'Open auth settings'
                    )
                    .then((userChoice) => {
                        if (userChoice === 'Open auth settings') {
                            Container.settingsWebviewFactory.createOrShow({
                                section: ConfigSection.Jira,
                                subSection: ConfigSubSection.Auth,
                            });
                        }
                    });
                throw new Error(`Could not find auth details for ${siteBaseURL}`);
            } else {
                let foundIssue = await Container.jiraExplorer.findIssue(issueKey);
                if (!foundIssue && !(foundIssue = await fetchMinimalIssue(issueKey, site!))) {
                    throw new Error(`Could not fetch issue: ${issueKey}`);
                }

                startWorkOnIssue(foundIssue);
            }

            this.analyticsApi.fireDeepLinkEvent(
                decodeURIComponent(query.get('source') || 'unknown'),
                'startWorkOnJiraIssue'
            );
        } catch (e) {
            Logger.debug('error opening start work page:', e);
            window.showErrorMessage('Error opening start work page (check log for details)');
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

    private async showCloneOptions(repoUrl: string) {
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

        await window.showQuickPick(options).then((selection) => selection?.action());
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
