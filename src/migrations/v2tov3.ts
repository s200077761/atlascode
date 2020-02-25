import { version } from 'vscode';
import { SiteManager } from '../siteManager';
import { CredentialManager } from '../atlclients/authStore';
import { AuthInfo, ProductJira, ProductBitbucket } from '../atlclients/authInfo';

const keychainServiceNameV2 = version.endsWith('-insider') ? 'atlascode-insiders-authinfoV2' : 'atlascode-authinfoV2';

export class V2toV3Migrator {
    constructor(
        private _siteManager: SiteManager,
        private _credentialManager: CredentialManager,
        private _deletePreviousVersion: boolean
    ) {}

    public async convertLegacyAuthInfo() {
        const jiraSites = this._siteManager.getSitesAvailable(ProductJira);
        const bitbucketSites = this._siteManager.getSitesAvailable(ProductBitbucket);
        const productKeys: Set<string> = new Set();

        for (const site of [...jiraSites, ...bitbucketSites]) {
            const authInfo = await this.getV2CredentialsFromKeychain(site.product.key, site.credentialId);
            if (authInfo) {
                productKeys.add(site.product.key);
                const credentialId = CredentialManager.generateCredentialId(site.id, authInfo.user.id);
                const updatedSite = { ...site, credentialId: credentialId };
                await this._credentialManager.saveAuthInfo(updatedSite, authInfo);
                this._siteManager.updateSite(site, updatedSite);
            }
        }

        if (this._deletePreviousVersion) {
            for (let productKey of productKeys) {
                this._credentialManager.deleteKeychainItem(keychainServiceNameV2, productKey);
            }
        }
    }

    private async getV2CredentialsFromKeychain(
        productKey: string,
        credentialId: string
    ): Promise<AuthInfo | undefined> {
        const infoDict: { [k: string]: AuthInfo } | undefined = await this._credentialManager.getRawKeychainItem(
            keychainServiceNameV2,
            productKey
        );
        if (infoDict) {
            return infoDict[credentialId];
        }
        return undefined;
    }
}
