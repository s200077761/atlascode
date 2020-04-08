import { defaultActionGuard } from '@atlassianlabs/guipi-core-controller';
import { isBasicAuthInfo } from '../../../../atlclients/authInfo';
import { AnalyticsApi } from '../../../analyticsApi';
import { CommonAction, CommonActionType } from '../../../ipc/fromUI/common';
import { OnboardingAction, OnboardingActionType } from '../../../ipc/fromUI/onboarding';
import { CommonMessage, CommonMessageType } from '../../../ipc/toUI/common';
import { SectionChangeMessage } from '../../../ipc/toUI/config';
import { OnboardingMessage, OnboardingMessageType } from '../../../ipc/toUI/onboarding';
import { Logger } from '../../../logger';
import { formatError } from '../../formatError';
import { CommonActionMessageHandler } from '../common/commonActionMessageHandler';
import { MessagePoster, WebviewController } from '../webviewController';
import { OnboardingActionApi } from './onboardingActionApi';

export const id: string = 'atlascodeOnboardingV2';
export const title: string = 'Getting Started';

export class OnboardingWebviewController implements WebviewController<SectionChangeMessage> {
    private _messagePoster: MessagePoster;
    private _api: OnboardingActionApi;
    private _logger: Logger;
    private _analytics: AnalyticsApi;
    private _settingsUrl: string;
    private _commonHandler: CommonActionMessageHandler;

    constructor(
        messagePoster: MessagePoster,
        api: OnboardingActionApi,
        commonHandler: CommonActionMessageHandler,
        logger: Logger,
        analytics: AnalyticsApi,
        settingsUrl: string
    ) {
        this._messagePoster = messagePoster;
        this._api = api;
        this._logger = logger;
        this._analytics = analytics;
        this._settingsUrl = settingsUrl;
        this._commonHandler = commonHandler;
    }

    private postMessage(message: OnboardingMessage | CommonMessage) {
        this._messagePoster(message);
    }

    public onSitesChanged(): void {
        const [jiraSites, bbSites] = this._api.getSitesAvailable();
        this.postMessage({
            type: OnboardingMessageType.SitesUpdate,
            jiraSites: jiraSites,
            bitbucketSites: bbSites
        });
    }

    private async invalidate() {
        const [jiraSites, bbSites] = this._api.getSitesAvailable();
        const target = this._api.getConfigTarget();
        const cfg = this._api.flattenedConfigForTarget(target);
        this.postMessage({
            type: OnboardingMessageType.Init,
            bitbucketSites: bbSites,
            jiraSites: jiraSites,
            isRemote: this._api.getIsRemote(),
            target: target,
            config: cfg
        });
    }

    public update(section: SectionChangeMessage) {
        //this.postMessage({ type: ConfigMessageType.SectionChange, ...section });
    }

    public async onMessageReceived(msg: OnboardingAction | CommonAction) {
        switch (msg.type) {
            case CommonActionType.Refresh: {
                try {
                    await this.invalidate();
                } catch (e) {
                    this._logger.error(new Error(`error refreshing config: ${e}`));
                    this.postMessage({
                        type: CommonMessageType.Error,
                        reason: formatError(e, 'Error refeshing config')
                    });
                }
                break;
            }
            case OnboardingActionType.Login: {
                var isCloud = true;
                if (isBasicAuthInfo(msg.authInfo)) {
                    isCloud = false;
                    try {
                        await this._api.authenticateServer(msg.siteInfo, msg.authInfo);
                    } catch (e) {
                        let err = new Error(`Authentication error: ${e}`);
                        this._logger.error(err);
                        this.postMessage({
                            type: CommonMessageType.Error,
                            reason: formatError(e, 'Authentication error')
                        });
                    }
                } else {
                    this._api.authenticateCloud(msg.siteInfo, this._settingsUrl);
                }
                this._analytics.fireAuthenticateButtonEvent(id, msg.siteInfo, isCloud);
                break;
            }
            case OnboardingActionType.SaveSettings: {
                try {
                    this._api.updateSettings(msg.target, msg.changes, msg.removes);
                } catch (e) {
                    let err = new Error(`error updating configuration: ${e}`);
                    this._logger.error(err);
                    this.postMessage({ type: CommonMessageType.Error, reason: formatError(e) });
                }
                break;
            }
            case OnboardingActionType.Logout: {
                this._api.clearAuth(msg.siteInfo);
                this._analytics.fireLogoutButtonEvent(id);
                break;
            }
            case CommonActionType.SubmitFeedback:
            case CommonActionType.ExternalLink:
            case CommonActionType.DismissPMFLater:
            case CommonActionType.DismissPMFNever:
            case CommonActionType.OpenPMFSurvey:
            case CommonActionType.SubmitPMF: {
                this._commonHandler.onMessageReceived(msg);
                break;
            }
            default: {
                defaultActionGuard(msg);
            }
        }
    }
}
