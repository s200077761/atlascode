import { AuthInfo, DetailedSiteInfo, SiteInfo } from '../../../../atlclients/authInfo';
import { ConfigSection, ConfigSubSection, ConfigTarget, FlattenedConfig } from '../../../ipc/models/config';
import { SiteWithAuthInfo } from '../../../ipc/toUI/config';

export interface OnboardingActionApi {
    authenticateServer(site: SiteInfo, authInfo: AuthInfo): Promise<void>;
    authenticateCloud(site: SiteInfo, callback: string): Promise<void>;
    clearAuth(site: DetailedSiteInfo): Promise<void>;
    updateSettings(target: ConfigTarget, changes: { [key: string]: any }, removes?: string[]): Promise<void>;
    getSitesAvailable(): [DetailedSiteInfo[], DetailedSiteInfo[]];
    getIsRemote(): boolean;
    getConfigTarget(): ConfigTarget;
    flattenedConfigForTarget(target: ConfigTarget): FlattenedConfig;
    getSitesWithAuth(): Promise<[SiteWithAuthInfo[], SiteWithAuthInfo[]]>;
    createJiraIssue(): void;
    viewJiraIssue(): void;
    createPullRequest(): void;
    viewPullRequest(): void;
    closePage(): void;
    openSettings(section?: ConfigSection, subsection?: ConfigSubSection): void;
}
