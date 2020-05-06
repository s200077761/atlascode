import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { env, Uri } from 'vscode';
import { IntegrationsLinkParams } from '../../atlclients/authInfo';
import { HTTPClient } from '../../bitbucket/httpClient';
import { Container } from '../../container';
import { submitFeedback } from '../../feedback/feedbackSubmitter';
import { submitJSDPMF } from '../../feedback/pmfJSDSubmitter';
import { AnalyticsApi } from '../../lib/analyticsApi';
import { CancellationManager } from '../../lib/cancellation';
import { CommonAction, CommonActionType } from '../../lib/ipc/fromUI/common';
import { KnownLinkID, numForPMFLevel } from '../../lib/ipc/models/common';
import { CommonActionMessageHandler } from '../../lib/webview/controller/common/commonActionMessageHandler';

const knownLinkIdMap: Map<string, string> = new Map([
    [KnownLinkID.AtlascodeRepo, 'https://bitbucket.org/atlassianlabs/atlascode'],
    [KnownLinkID.AtlascodeIssues, 'https://bitbucket.org/atlassianlabs/atlascode/issues'],
    [KnownLinkID.AtlascodeDocs, 'https://confluence.atlassian.com/display/BITBUCKET/Atlassian+for+VS+Code'],
    [KnownLinkID.Integrations, 'https://integrations.atlassian.com'],
]);

export class VSCCommonMessageHandler implements CommonActionMessageHandler {
    private _analytics: AnalyticsApi;
    private _cancelMan: CancellationManager;

    constructor(analytics: AnalyticsApi, cancelMan: CancellationManager) {
        this._analytics = analytics;
        this._cancelMan = cancelMan;
    }
    public async onMessageReceived(msg: CommonAction): Promise<void> {
        switch (msg.type) {
            case CommonActionType.SubmitPMF: {
                submitJSDPMF(msg.pmfData);
                Container.pmfStats.touchSurveyed();
                this._analytics.firePmfSubmitted(numForPMFLevel(msg.pmfData.level));
                break;
            }
            case CommonActionType.DismissPMFLater: {
                Container.pmfStats.snoozeSurvey();
                this._analytics.firePmfSnoozed();
                break;
            }
            case CommonActionType.DismissPMFNever: {
                Container.pmfStats.touchSurveyed();
                this._analytics.firePmfClosed();
                break;
            }
            case CommonActionType.OpenPMFSurvey: {
                Container.pmfStats.touchSurveyed();
                this._analytics.fireViewScreenEvent('atlascodePmf');
                break;
            }
            case CommonActionType.ExternalLink: {
                let foundUrl = msg.url;

                if (!foundUrl) {
                    foundUrl = knownLinkIdMap.get(msg.linkId);
                }

                if (foundUrl) {
                    //Integrations link carries query params to help track where the click came from
                    if (msg.linkId === KnownLinkID.Integrations) {
                        const aaid = Container.siteManager.getFirstAAID();
                        const queryParams: IntegrationsLinkParams = aaid
                            ? {
                                  aaid: aaid,
                                  aid: Container.machineId,
                                  s: 'atlascode.onboarding',
                              }
                            : {
                                  aid: Container.machineId,
                                  s: 'atlascode.onboarding',
                              };
                        foundUrl = `${foundUrl}${HTTPClient.queryObjectToString(queryParams)}`;
                    }

                    env.openExternal(Uri.parse(foundUrl));

                    /* TODO: In most cases no params are sent, but for the Integrations link (Onboarding PR) we are asked to include them
                    After that PR is merged I'll pull devel and data will be sent. */
                    //We're only interested in tracking external URIs that are 'known'
                    if (knownLinkIdMap.has(msg.linkId)) {
                        this._analytics.fireExternalLinkEvent(msg.source, msg.linkId);
                    }
                }
                break;
            }
            case CommonActionType.SubmitFeedback: {
                submitFeedback(msg.feedback);
                break;
            }
            case CommonActionType.Refresh: {
                // should be handled by caller
                break;
            }
            case CommonActionType.Cancel: {
                this._cancelMan.get(msg.abortKey)?.cancel(msg.reason);
                this._cancelMan.delete(msg.abortKey);
                break;
            }
            default: {
                defaultActionGuard(msg);
            }
        }
    }
}
