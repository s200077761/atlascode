import {
    authenticateButtonEvent,
    authenticatedEvent,
    bbIssueCommentEvent,
    bbIssueCreatedEvent,
    bbIssuesPaginationEvent,
    bbIssueTransitionedEvent,
    bbIssueUrlCopiedEvent,
    bbIssueWorkStartedEvent,
    customJQLCreatedEvent,
    deepLinkEvent,
    doneButtonEvent,
    externalLinkEvent,
    featureChangeEvent,
    focusCreateIssueEvent,
    focusCreatePullRequestEvent,
    focusIssueEvent,
    focusPullRequestEvent,
    installedEvent,
    issueCommentEvent,
    issueCreatedEvent,
    issueTransitionedEvent,
    issueUpdatedEvent,
    issueUrlCopiedEvent,
    issueWorkStartedEvent,
    launchedEvent,
    loggedOutEvent,
    logoutButtonEvent,
    moreSettingsButtonEvent,
    openSettingsButtonEvent,
    pipelineStartEvent,
    pmfClosed,
    pmfSnoozed,
    pmfSubmitted,
    prApproveEvent,
    prCheckoutEvent,
    prCommentEvent,
    prCreatedEvent,
    prMergeEvent,
    prPaginationEvent,
    prUrlCopiedEvent,
    startIssueCreationEvent,
    upgradedEvent,
    viewScreenEvent,
} from './analytics';
import { AnalyticsClient } from './analytics-node-client/src';
import { DetailedSiteInfo, Product, SiteInfo } from './atlclients/authInfo';
import { AnalyticsApi } from './lib/analyticsApi';

export class VSCAnalyticsApi implements AnalyticsApi {
    private _analyticsClient: AnalyticsClient;

    constructor(analyticsClient: AnalyticsClient) {
        this._analyticsClient = analyticsClient;
    }

    public async fireInstalledEvent(version: string): Promise<void> {
        return installedEvent(version).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireUpgradedEvent(version: string, previousVersion: string): Promise<void> {
        return upgradedEvent(version, previousVersion).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireLaunchedEvent(location: string): Promise<void> {
        return launchedEvent(location).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireFeatureChangeEvent(featureId: string, enabled: boolean): Promise<void> {
        return featureChangeEvent(featureId, enabled).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireAuthenticatedEvent(site: DetailedSiteInfo): Promise<void> {
        return authenticatedEvent(site).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireLoggedOutEvent(site: DetailedSiteInfo): Promise<void> {
        return loggedOutEvent(site).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireIssueCreatedEvent(site: DetailedSiteInfo, issueKey: string): Promise<void> {
        return issueCreatedEvent(site, issueKey).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireIssueTransitionedEvent(site: DetailedSiteInfo, issueKey: string): Promise<void> {
        return issueTransitionedEvent(site, issueKey).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireIssueUrlCopiedEvent(tenantId: string): Promise<void> {
        return issueUrlCopiedEvent(tenantId).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireIssueCommentEvent(site: DetailedSiteInfo): Promise<void> {
        return issueCommentEvent(site).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireIssueWorkStartedEvent(site: DetailedSiteInfo): Promise<void> {
        return issueWorkStartedEvent(site).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireIssueUpdatedEvent(
        site: DetailedSiteInfo,
        issueKey: string,
        fieldName: string,
        fieldKey: string
    ): Promise<void> {
        return issueUpdatedEvent(site, issueKey, fieldName, fieldKey).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireStartIssueCreationEvent(source: string, product: Product): Promise<void> {
        return startIssueCreationEvent(source, product).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireBBIssueCreatedEvent(site: DetailedSiteInfo): Promise<void> {
        return bbIssueCreatedEvent(site).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireBBIssueTransitionedEvent(site: DetailedSiteInfo): Promise<void> {
        return bbIssueTransitionedEvent(site).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireBBIssueUrlCopiedEvent(): Promise<void> {
        return bbIssueUrlCopiedEvent().then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireBBIssueCommentEvent(site: DetailedSiteInfo): Promise<void> {
        return bbIssueCommentEvent(site).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireBBIssueWorkStartedEvent(site: DetailedSiteInfo): Promise<void> {
        return bbIssueWorkStartedEvent(site).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async firePrCreatedEvent(site: DetailedSiteInfo): Promise<void> {
        return prCreatedEvent(site).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async firePrCommentEvent(site: DetailedSiteInfo): Promise<void> {
        return prCommentEvent(site).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async firePrCheckoutEvent(site: DetailedSiteInfo): Promise<void> {
        return prCheckoutEvent(site).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async firePrApproveEvent(site: DetailedSiteInfo): Promise<void> {
        return prApproveEvent(site).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async firePrMergeEvent(site: DetailedSiteInfo): Promise<void> {
        return prMergeEvent(site).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async firePrUrlCopiedEvent(): Promise<void> {
        return prUrlCopiedEvent().then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireCustomJQLCreatedEvent(site: DetailedSiteInfo): Promise<void> {
        return customJQLCreatedEvent(site).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async firePipelineStartEvent(site: DetailedSiteInfo): Promise<void> {
        return pipelineStartEvent(site).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async firePmfSubmitted(level: string): Promise<void> {
        return pmfSubmitted(level).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async firePmfSnoozed(): Promise<void> {
        return pmfSnoozed().then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async firePmfClosed(): Promise<void> {
        return pmfClosed().then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireDeepLinkEvent(source: string, target: string): Promise<void> {
        return deepLinkEvent(source, target).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireExternalLinkEvent(source: string, linkId: string): Promise<void> {
        return externalLinkEvent(source, linkId).then((e) => {
            this._analyticsClient.sendTrackEvent(e);
        });
    }

    public async fireViewScreenEvent(screenName: string, site?: DetailedSiteInfo, product?: Product): Promise<void> {
        return viewScreenEvent(screenName, site, product).then((e) => {
            this._analyticsClient.sendScreenEvent(e);
        });
    }

    public async fireBBIssuesPaginationEvent(): Promise<void> {
        return bbIssuesPaginationEvent().then((e) => {
            this._analyticsClient.sendUIEvent(e);
        });
    }

    public async firePrPaginationEvent(): Promise<void> {
        return prPaginationEvent().then((e) => {
            this._analyticsClient.sendUIEvent(e);
        });
    }

    public async fireMoreSettingsButtonEvent(source: string): Promise<void> {
        return moreSettingsButtonEvent(source).then((e) => {
            this._analyticsClient.sendUIEvent(e);
        });
    }

    public async fireDoneButtonEvent(source: string): Promise<void> {
        return doneButtonEvent(source).then((e) => {
            this._analyticsClient.sendUIEvent(e);
        });
    }

    public async fireFocusCreateIssueEvent(source: string): Promise<void> {
        return focusCreateIssueEvent(source).then((e) => {
            this._analyticsClient.sendUIEvent(e);
        });
    }

    public async fireFocusIssueEvent(source: string): Promise<void> {
        return focusIssueEvent(source).then((e) => {
            this._analyticsClient.sendUIEvent(e);
        });
    }

    public async fireFocusCreatePullRequestEvent(source: string): Promise<void> {
        return focusCreatePullRequestEvent(source).then((e) => {
            this._analyticsClient.sendUIEvent(e);
        });
    }

    public async fireFocusPullRequestEvent(source: string): Promise<void> {
        return focusPullRequestEvent(source).then((e) => {
            this._analyticsClient.sendUIEvent(e);
        });
    }

    public async fireAuthenticateButtonEvent(source: string, site: SiteInfo, isCloud: boolean): Promise<void> {
        return authenticateButtonEvent(source, site, isCloud).then((e) => {
            this._analyticsClient.sendUIEvent(e);
        });
    }

    public async fireLogoutButtonEvent(source: string): Promise<void> {
        return logoutButtonEvent(source).then((e) => {
            this._analyticsClient.sendUIEvent(e);
        });
    }

    public async fireOpenSettingsButtonEvent(source: string): Promise<void> {
        return openSettingsButtonEvent(source).then((e) => {
            this._analyticsClient.sendUIEvent(e);
        });
    }
}
