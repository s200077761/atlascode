import { ProductJira, isBasicAuthInfo } from "../atlclients/authInfo";
import { SiteManager } from "../siteManager";
import { CredentialManager } from "../atlclients/authStore";

export class V2JiraServerUserIdFixer {

    constructor(
        private credentialManager: CredentialManager,
        private siteManager: SiteManager) {
    }

    public async fix() {
        const jiraServerSites = this.siteManager.getSitesAvailable(ProductJira).filter(site => !site.isCloud);

        for (const oldSiteDetails of jiraServerSites) {
            const authInfo = await this.credentialManager.getAuthInfo(oldSiteDetails);
            if (authInfo && isBasicAuthInfo(authInfo) && authInfo.user.id === undefined) {
                const newSiteDetails = { ...oldSiteDetails, userId: authInfo.username };
                const newAuthInfo = { ...authInfo, user: { ...authInfo.user, id: authInfo.username } };

                this.siteManager.updateSite(oldSiteDetails, newSiteDetails);
                this.credentialManager.saveAuthInfo(newSiteDetails, newAuthInfo);
            }
        }
    }
}