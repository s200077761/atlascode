import { CreatedIssue, Project } from '@atlassianlabs/jira-pi-common-models';
import { CreateMetaTransformerResult, FieldValues } from '@atlassianlabs/jira-pi-meta-models';
import { format } from 'date-fns';
import { DetailedSiteInfo, emptySiteInfo, ProductJira } from '../../atlclients/authInfo';
import { configuration } from '../../config/configuration';
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
        projectKey = projectKey ?? Container.config.jira.lastCreateSiteAndProject.projectKey ?? '';
        let siteDetails = site;
        if (site.id === emptySiteInfo.id) {
            const siteId = Container.config.jira.lastCreateSiteAndProject.siteId ?? '';
            const configSite = Container.siteManager.getSiteForId(ProductJira, siteId);
            siteDetails = configSite || Container.siteManager.getFirstSite(ProductJira.key);
        } else {
            configuration.setLastCreateSiteAndProject({ siteId: site.id, projectKey: projectKey });
        }

        const configProject = await Container.jiraProjectManager.getProjectForKey(siteDetails, projectKey);
        const currentProject = configProject || (await Container.jiraProjectManager.getFirstProject(siteDetails));

        return {
            site: siteDetails,
            project: currentProject,
            createMeta: await fetchCreateIssueUI(siteDetails, currentProject.key),
        };
    }

    async create(site: DetailedSiteInfo, issueData: FieldValues): Promise<CreatedIssue> {
        const client = await Container.clientManager.jiraClient(site);
        const [fields] = this.formatCreatePayload(issueData);
        return await client.createIssue({ fields: fields });
    }

    private formatCreatePayload(payload: FieldValues): [any, any, any, any] {
        let issuelinks: any = undefined;
        let attachments: any = undefined;
        let worklog: any = undefined;

        if (payload['issuelinks']) {
            issuelinks = payload['issuelinks'];
            delete payload['issuelinks'];
        }

        if (payload['attachment']) {
            attachments = payload['attachment'];
            delete payload['attachment'];
        }

        if (payload['worklog'] && payload['worklog'].enabled) {
            worklog = {
                worklog: [
                    {
                        add: {
                            ...payload['worklog'],
                            adjustEstimate: 'new',
                            started: payload['worklog'].started
                                ? format(payload['worklog'].started, 'YYYY-MM-DDTHH:mm:ss.SSSZZ')
                                : undefined,
                        },
                    },
                ],
            };
            delete payload['worklog'];
        }

        return [payload, worklog, issuelinks, attachments];
    }
}
