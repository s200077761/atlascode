import { Disposable, env, Uri, UriHandler, window } from 'vscode';
import { bitbucketSiteForRemote, clientForHostname } from './bitbucket/bbUtils';
import { Container } from './container';
import { AnalyticsApi } from './lib/analyticsApi';
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
 */
export class AtlascodeUriHandler implements Disposable, UriHandler {
    private disposables: Disposable;

    constructor(private analyticsApi: AnalyticsApi) {
        this.disposables = window.registerUriHandler(this);
    }

    async handleUri(uri: Uri) {
        if (uri.path.endsWith('openSettings')) {
            Container.configWebview.createOrShow();
        } else if (uri.path.endsWith('openOnboarding')) {
            Container.onboardingWebview.createOrShow();
        } else if (uri.path.endsWith('openPullRequest')) {
            await this.handlePullRequestUri(uri);
        }
    }

    private async handlePullRequestUri(uri: Uri) {
        try {
            const query = new URLSearchParams(uri.query);
            const prUrl = decodeURIComponent(query.get('q') || '');
            if (!prUrl) {
                throw new Error(`Cannot parse pull request URL from: ${query}`);
            }
            const client = await clientForHostname('bitbucket.org')!;
            const site = bitbucketSiteForRemote({
                name: '',
                fetchUrl: prUrl.slice(0, prUrl.indexOf('/pull-requests')),
                isReadOnly: true
            })!;
            const prUrlPath = Uri.parse(prUrl).path;
            const prId = prUrlPath.slice(prUrlPath.lastIndexOf('/') + 1);
            const pr = await client.pullrequests.getById(site, parseInt(prId));
            Container.pullRequestViewManager.createOrShow(pr);
            this.analyticsApi.fireExternalUriEvent(decodeURIComponent(query.get('source') || 'unknown'), 'pullRequest');
        } catch (e) {
            Logger.debug('error opening pull request:', e);
            window.showErrorMessage('Error opening pull request (check log for details)');
        }
    }

    dispose(): void {
        this.disposables.dispose();
    }
}
