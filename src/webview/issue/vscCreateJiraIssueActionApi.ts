import { Project } from '@atlassianlabs/jira-pi-common-models';
import { CreateMetaTransformerResult } from '@atlassianlabs/jira-pi-meta-models';
import { DetailedSiteInfo, emptySiteInfo, ProductJira } from '../../atlclients/authInfo';
import { Container } from '../../container';
import { fetchCreateIssueUI } from '../../jira/fetchIssue';
import { CreateJiraIssueActionApi } from '../../lib/webview/controller/issue/createJiraIssueActionApi';

export class VSCCreateJiraIssueActionImpl implements CreateJiraIssueActionApi {
    async fetchCreateMeta(
        site: DetailedSiteInfo,
        projectKey?: string
    ): Promise<{
        site: DetailedSiteInfo;
        project: Project;
        createMeta: CreateMetaTransformerResult<DetailedSiteInfo>;
    }> {
        let siteDetails = site;
        if (site.id === emptySiteInfo.id) {
            const siteId = Container.config.jira.lastCreateSiteAndProject.siteId ?? '';
            const configSite = Container.siteManager.getSiteForId(ProductJira, siteId);
            siteDetails = configSite || Container.siteManager.getFirstSite(ProductJira.key);
        }

        projectKey = projectKey || Container.config.jira.lastCreateSiteAndProject.projectKey;
        const configProject = await Container.jiraProjectManager.getProjectForKey(siteDetails, projectKey);
        const currentProject = configProject || (await Container.jiraProjectManager.getFirstProject(siteDetails));

        return {
            site: siteDetails,
            project: currentProject,
            createMeta: await fetchCreateIssueUI(siteDetails, currentProject.key),
        };
    }
}
