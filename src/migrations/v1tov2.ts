import { keychain } from "../util/keychain";
import { Logger } from "../logger";
import { DetailedSiteInfo, OAuthProvider, AuthInfoV1, OAuthInfo, ProductJira, ProductBitbucket, AccessibleResourceV1, Product, UserInfo } from "../atlclients/authInfo";
import debounce from 'lodash.debounce';
import { SiteManager } from "../siteManager";
import { CredentialManager } from "../atlclients/authStore";
import { OAuthRefesher } from "../atlclients/oauthRefresher";
import { configuration, JQLEntry, SiteJQLV1 } from "../config/configuration";
import axios from 'axios';
import { v4 } from "uuid";
import { JiraJQLListKey } from "../constants";
import { Container } from "../container";
import { ConfigurationTarget } from "vscode";

const keychainServiceNameV1 = "atlascode-authinfo";
const WorkingProjectToken = 'currentProject()';

export class V1toV2Migrator {
    private _debouncedKeychain = new Object();
    private _refresher = new OAuthRefesher();
    private _workingProject: any | undefined;
    private _defaultSiteId: string | undefined;

    constructor(private _siteManager: SiteManager,
        private _credentialManager: CredentialManager,
        private _deleteV1: boolean,
        workingProject?: any,
        workingSite?: AccessibleResourceV1) {
        this._workingProject = workingProject;
        this._defaultSiteId = workingSite ? workingSite.id : undefined;
    }

    public async convertLegacyAuthInfo() {
        for (const provider of Object.values(OAuthProvider)) {
            await this.migrateForOauthProvider(provider);
        }
    }

    private async getV1JsonAuthInfoFromKeychain(productKey: string): Promise<string | null> {
        let svcName = keychainServiceNameV1;

        if (!this._debouncedKeychain[productKey]) {
            this._debouncedKeychain[productKey] = debounce(async () => await keychain!.getPassword(svcName, productKey), 500, { leading: true });
        }
        return await this._debouncedKeychain[productKey]();
    }

    private async migrateForOauthProvider(provider: OAuthProvider) {
        Logger.debug('converting auth provider', provider);
        try {
            let infoEntry = await this.getV1JsonAuthInfoFromKeychain(provider) || undefined;
            Logger.debug(`legacy auth info for provider? ${infoEntry !== undefined}`);
            if (infoEntry) {
                let info: AuthInfoV1 = JSON.parse(infoEntry);
                const newAccess = await this._refresher.getNewAccessToken(provider, info.refresh);
                Logger.debug(`successfuly refreshed token? ${newAccess !== undefined}`);

                if (provider.startsWith('jira')) {
                    if (newAccess && info.accessibleResources) {
                        this.migrateJiraData(info, provider, newAccess);
                    }
                } else {
                    if (newAccess) {
                        this.migrateBitbucketData(info, provider, newAccess);
                    }
                }
            }

            if (this._deleteV1) {
                await this.removeV1AuthInfo(provider);
            }
        } catch (e) {
            Logger.error(e, 'error converting legacy auth info!');
        }
    }

    private async migrateJiraData(info: AuthInfoV1, provider: OAuthProvider, accessToken: string) {
        const newSites: DetailedSiteInfo[] = [];
        const newJQL: JQLEntry[] = [];

        for (const resource of info.accessibleResources!) {
            Logger.debug('processing resource', resource.name);
            let apiUri = provider === OAuthProvider.JiraCloudStaging ? "api.stg.atlassian.com" : "api.atlassian.com";
            Logger.debug('trying to get base url', provider);

            // TODO: [VSCODE-505] call serverInfo endpoint when it supports OAuth
            //const baseUrlString = await getJiraCloudBaseUrl(`https://${apiUri}/ex/jira/${resource.id}/rest/2`, newAccess);

            // const baseUrlString = provider === OAuthProvider.JiraCloudStaging ? `https://${resource.name}.jira-dev.com` : `https://${resource.name}.atlassian.net`;
            const baseUrlString = (resource as any).url;

            Logger.debug('got base url', baseUrlString);
            const baseUrl: URL = new URL(baseUrlString);
            const baseApiUrl = `https://${apiUri}/ex/jira/${resource.id}/rest`;

            const user: UserInfo | undefined = await this.getNewUserInfo(ProductJira, `${baseApiUrl}/api/2`, accessToken);

            if (!user) {
                return;
            }

            const newInfo: OAuthInfo = {
                access: accessToken,
                refresh: info.refresh,
                user: user,
            };

            let newSite: DetailedSiteInfo = {
                avatarUrl: resource.avatarUrl,
                baseApiUrl: baseApiUrl,
                baseLinkUrl: baseUrlString,
                hostname: baseUrl.hostname,
                id: resource.id,
                name: resource.name,
                product: ProductJira,
                isCloud: true,
                userId: info.user.id,
                credentialId: Buffer.from(resource.id + '::' + info.user.id).toString('base64'),
            };

            await this._credentialManager.saveAuthInfo(newSite, newInfo);

            Logger.debug('added site', newSite);
            const projectKey = this._workingProject ? this._workingProject.key : undefined;
            if (this._defaultSiteId === resource.id) {

                newJQL.push(...this.migrateCommonJQL(resource.id, projectKey));
            }

            newJQL.push(...this.migrateCustomJQL(resource.id));
            newSites.push(newSite);
        }
        this._siteManager.addSites(newSites);
        configuration.updateEffective(JiraJQLListKey, newJQL);
        if (this._deleteV1) {
            configuration.updateEffective('jira.customJql', undefined);
        }
    }

    private migrateCommonJQL(siteId: string, projectKey?: string): JQLEntry[] {
        const newJql: JQLEntry[] = [];
        const v1Assigned: string = configuration.get<string>('jira.explorer.assignedIssueJql');
        const v1Opened: string = configuration.get<string>('jira.explorer.openIssueJql');

        if (v1Assigned.trim() !== '') {
            const query = projectKey ? v1Assigned.replace(WorkingProjectToken, `"${projectKey}"`) : v1Assigned.replace(`project = ${WorkingProjectToken}`, '');
            const name = projectKey ? `My ${projectKey} Issues` : 'My Issues';
            newJql.push({
                id: v4(),
                enabled: configuration.get<boolean>('jira.explorer.showAssignedIssues'),
                monitor: true,
                name: name,
                query: query,
                siteId: siteId
            });
        }

        if (v1Opened.trim() !== '') {
            const query = projectKey ? v1Opened.replace(WorkingProjectToken, `"${projectKey}"`) : v1Opened.replace(`project = ${WorkingProjectToken}`, '');
            const name = projectKey ? `Open ${projectKey} Issues` : 'Open Issues';
            newJql.push({
                id: v4(),
                enabled: configuration.get<boolean>('jira.explorer.showOpenIssues'),
                monitor: true,
                name: name,
                query: query,
                siteId: siteId
            });
        }

        if (this._deleteV1) {
            configuration.clearVersion1WorkingSite();
            configuration.clearVersion1WorkingProject();
            configuration.updateEffective('jira.explorer.assignedIssueJql', undefined);
            configuration.updateEffective('jira.explorer.openIssueJql', undefined);
            configuration.updateEffective('jira.explorer.showAssignedIssues', undefined);
            configuration.updateEffective('jira.explorer.showOpenIssues', undefined);
        }

        return newJql;

    }

    private migrateCustomJQL(siteId: string): JQLEntry[] {
        const newJql: JQLEntry[] = [];
        const v1Custom: SiteJQLV1[] = configuration.get<SiteJQLV1[]>('jira.customJql').filter(entry => entry.siteId === siteId);
        const projectKey = this._workingProject ? Container.config.jira.workingProject.key : undefined;
        v1Custom.forEach(siteJql => {
            siteJql.jql.forEach(jqlEntry => {
                const query = projectKey ? jqlEntry.query.replace(WorkingProjectToken, `"${projectKey}"`) : jqlEntry.query.replace(`project = ${WorkingProjectToken}`, '');
                newJql.push({
                    id: jqlEntry.id,
                    enabled: jqlEntry.enabled,
                    monitor: true,
                    name: jqlEntry.name,
                    query: query,
                    siteId: siteId
                });
            });

        });

        return newJql;
    }

    private async migrateBitbucketData(info: AuthInfoV1, provider: OAuthProvider, accessToken: string) {
        const hostname = (provider === OAuthProvider.BitbucketCloud) ? 'bitbucket.org' : 'staging.bb-inf.net';
        const baseApiUrl = (provider === OAuthProvider.BitbucketCloud) ? 'https://api.bitbucket.org/2.0' : 'https://api-staging.bb-inf.net/2.0';
        const siteName = (provider === OAuthProvider.BitbucketCloud) ? 'Bitbucket Cloud' : 'Bitbucket Staging Cloud';
        const user: UserInfo | undefined = await this.getNewUserInfo(ProductBitbucket, baseApiUrl, accessToken);

        if (!user) {
            return;
        }

        const newInfo: OAuthInfo = {
            access: accessToken,
            refresh: info.refresh,
            user: user,
        };

        // TODO: [VSCODE-496] find a way to embed and link to a bitbucket icon
        const newSite = {
            avatarUrl: "",
            baseApiUrl: baseApiUrl,
            baseLinkUrl: `https://${hostname}`,
            hostname: hostname,
            id: provider,
            name: siteName,
            product: ProductBitbucket,
            isCloud: true,
            userId: info.user.id,
            credentialId: Buffer.from(provider + '::' + info.user.id).toString('base64'),
        };

        this._siteManager.addSites([newSite]);
        await this._credentialManager.saveAuthInfo(newSite, newInfo);
    }

    private async getNewUserInfo(product: Product, baseApiUrl: string, accessToken: string): Promise<UserInfo | undefined> {
        let user: UserInfo | undefined = undefined;
        try {
            const client = axios.create({
                timeout: 10000,
                headers: {
                    'X-Atlassian-Token': 'no-check',
                    'x-atlassian-force-account-id': 'true',
                    "Accept-Encoding": "gzip, deflate"
                }
            });

            const userUrl = (product.key === ProductBitbucket.key) ? `${baseApiUrl}/user` : `${baseApiUrl}/myself`;
            const emailUrl = (product.key === ProductBitbucket.key) ? `${baseApiUrl}/user/emails` : '';

            const userRes = await client(userUrl, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`
                }
            });


            if (product.key === ProductJira.key) {
                user = {
                    id: userRes.data.accountId,
                    displayName: userRes.data.displayName,
                    avatarUrl: userRes.data.avatarUrls["48x48"],
                    email: userRes.data.emailAddress,
                };
            } else {
                const emailRes = await client(emailUrl, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`
                    }
                });

                let email = 'do-not-reply@atlassian.com';
                if (Array.isArray(emailRes.data.values) && emailRes.data.values.length > 0) {
                    const primary = emailRes.data.values.filter((val: any) => val.is_primary);
                    if (primary.length > 0) {
                        email = primary[0].email;
                    }
                }

                user = {
                    id: userRes.data.account_id,
                    displayName: userRes.data.display_name,
                    avatarUrl: userRes.data.links.avatar.href,
                    email: email,
                };
            }

        } catch (e) {
            //ignore
        }

        return user;
    }

    private async removeV1AuthInfo(provider: string) {
        if (keychain) {
            await keychain.deletePassword(keychainServiceNameV1, provider);
        }
    }
}

export function migrateAllWorkspaceCustomJQLS(deleteV1: boolean): void {
    const newJql: JQLEntry[] = [];
    const inspect = configuration.inspect('jira.customJql');
    if (Array.isArray(inspect.workspaceValue)) {
        const projectKey = Container.config.jira.workingProject ? Container.config.jira.workingProject.key : undefined;
        inspect.workspaceValue.forEach((siteJql: SiteJQLV1) => {
            siteJql.jql.forEach(jqlEntry => {
                const query = projectKey ? jqlEntry.query.replace(WorkingProjectToken, `"${projectKey}"`) : jqlEntry.query.replace(`project = ${WorkingProjectToken}`, '');
                newJql.push({
                    id: jqlEntry.id,
                    enabled: jqlEntry.enabled,
                    monitor: true,
                    name: jqlEntry.name,
                    query: query,
                    siteId: siteJql.siteId
                });
            });

        });
    }

    if (newJql.length > 0) {
        configuration.update(JiraJQLListKey, newJql, ConfigurationTarget.Workspace);
        if (deleteV1) {
            configuration.update('jira.customJql', undefined, ConfigurationTarget.Workspace);
        }
    }
}
