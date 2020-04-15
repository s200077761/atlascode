import { commands, env } from 'vscode';
import {
    authenticateButtonEvent,
    doneButtonEvent,
    featureChangeEvent,
    logoutButtonEvent,
    moreSettingsButtonEvent,
} from '../analytics';
import { DetailedSiteInfo, isBasicAuthInfo, Product, ProductBitbucket, ProductJira } from '../atlclients/authInfo';
import { Commands } from '../commands';
import { authenticateCloud, authenticateServer, clearAuth } from '../commands/authenticate';
import { configuration } from '../config/configuration';
import { Container } from '../container';
import { isLoginAuthAction, isLogoutAuthAction } from '../ipc/configActions';
import { Action } from '../ipc/messaging';
import { Logger } from '../logger';
import { SitesAvailableUpdateEvent } from '../siteManager';
import { ONBOARDING_URL } from '../uriHandler';
import { AbstractReactWebview } from './abstractWebview';

interface ChangeEnabledAction extends Action {
    changes: {
        [key: string]: any;
    };
}
export class OnboardingWebview extends AbstractReactWebview {
    constructor(extensionPath: string) {
        super(extensionPath);

        Container.context.subscriptions.push(
            Container.siteManager.onDidSitesAvailableChange(this.onSitesAvailableChange, this)
        );
    }

    public get title(): string {
        return 'Getting Started';
    }

    public get id(): string {
        return 'atlascodeOnboardingScreen';
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        return undefined;
    }

    public get productOrUndefined(): Product | undefined {
        return undefined;
    }

    public async invalidate() {
        const jiraSitesAvailable = Container.siteManager.getSitesAvailable(ProductJira);
        const bitbucketSitesAvailable = Container.siteManager.getSitesAvailable(ProductBitbucket);
        const [cloudJira, serverJira] = this.separateCloudFromServer(jiraSitesAvailable);
        const [cloudBitbucket, serverBitbucket] = this.separateCloudFromServer(bitbucketSitesAvailable);
        const isRemote = env.remoteName !== undefined;
        this.postMessage({
            type: 'update',
            isRemote: isRemote,
            jiraCloudSites: cloudJira,
            jiraServerSites: serverJira,
            bitbucketCloudSites: cloudBitbucket,
            bitbucketServerSites: serverBitbucket,
            enableJiraConfig: Container.config.jira.enabled,
            enableBitbucketConfig: Container.config.bitbucket.enabled,
        });
    }

    private onSitesAvailableChange(e: SitesAvailableUpdateEvent) {
        const jiraSitesAvailable = Container.siteManager.getSitesAvailable(ProductJira);
        const bitbucketSitesAvailable = Container.siteManager.getSitesAvailable(ProductBitbucket);
        const [cloudJira, serverJira] = this.separateCloudFromServer(jiraSitesAvailable);
        const [cloudBitbucket, serverBitbucket] = this.separateCloudFromServer(bitbucketSitesAvailable);
        this.postMessage({
            type: 'sitesAvailableUpdate',
            jiraCloudSites: cloudJira,
            jiraServerSites: serverJira,
            bitbucketCloudSites: cloudBitbucket,
            bitbucketServerSites: serverBitbucket,
        });
    }

    private separateCloudFromServer(siteList: DetailedSiteInfo[]): [DetailedSiteInfo[], DetailedSiteInfo[]] {
        return siteList.reduce(
            (cloudAndServerSites: [DetailedSiteInfo[], DetailedSiteInfo[]], currentSite) => {
                currentSite.isCloud
                    ? cloudAndServerSites[0].push(currentSite)
                    : cloudAndServerSites[1].push(currentSite);
                return cloudAndServerSites;
            },
            [[], []]
        );
    }

    private isChangeEnabledAction(a: Action): a is ChangeEnabledAction {
        return a && (<ChangeEnabledAction>a).changes !== undefined;
    }

    protected async onMessageReceived(msg: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(msg);
        if (!handled) {
            switch (msg.action) {
                case 'openSettings': {
                    moreSettingsButtonEvent(this.id).then((e) => {
                        Container.analyticsClient.sendUIEvent(e);
                    });
                    commands.executeCommand(Commands.ShowConfigPage);
                    break;
                }
                case 'closePage': {
                    doneButtonEvent(this.id).then((e) => {
                        Container.analyticsClient.sendUIEvent(e);
                    });
                    this.hide();
                    break;
                }
                case 'changeEnabled': {
                    if (this.isChangeEnabledAction(msg)) {
                        for (const key in msg.changes) {
                            const value = msg.changes[key];
                            await configuration.updateEffective(key, value, null, true);
                            this.invalidate();
                            featureChangeEvent(key, value).then((e) => {
                                Container.analyticsClient
                                    .sendTrackEvent(e)
                                    .catch((r) => Logger.debug('error sending analytics'));
                            });
                        }
                    }
                }
                case 'login': {
                    handled = true;
                    if (isLoginAuthAction(msg)) {
                        let isCloud = true;
                        if (isBasicAuthInfo(msg.authInfo)) {
                            isCloud = false;
                            try {
                                await authenticateServer(msg.siteInfo, msg.authInfo);
                            } catch (e) {
                                let err = new Error(`Authentication error: ${e}`);
                                Logger.error(err);
                                this.postMessage({
                                    type: 'error',
                                    reason: this.formatErrorReason(e, 'Authentication error'),
                                });
                            }
                        } else {
                            authenticateCloud(msg.siteInfo, ONBOARDING_URL);
                        }
                        authenticateButtonEvent(this.id, msg.siteInfo, isCloud).then((e) => {
                            Container.analyticsClient.sendUIEvent(e);
                        });
                    }
                    break;
                }
                case 'logout': {
                    handled = true;
                    if (isLogoutAuthAction(msg)) {
                        clearAuth(msg.detailedSiteInfo);
                        logoutButtonEvent(this.id).then((e) => {
                            Container.analyticsClient.sendUIEvent(e);
                        });
                    }
                    break;
                }
            }
        }
        return handled;
    }
}
