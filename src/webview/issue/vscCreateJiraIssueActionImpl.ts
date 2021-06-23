import { CreatedIssue, Project } from '@atlassianlabs/jira-pi-common-models';
import { CreateMetaTransformerResult, FieldValues } from '@atlassianlabs/jira-pi-meta-models';
import { format } from 'date-fns';
import { DetailedSiteInfo, emptySiteInfo, ProductJira } from '../../atlclients/authInfo';
import { configuration } from '../../config/configuration';
import { Container } from '../../container';
import { fetchCreateIssueUI } from '../../jira/fetchIssue';
import { CreateJiraIssueActionApi } from '../../lib/webview/controller/issue/createJiraIssueActionApi';
import { Logger } from '../../logger';

export class VSCCreateJiraIssueActionImpl implements CreateJiraIssueActionApi {
    async fetchCreateMeta(
        site: DetailedSiteInfo,
        projectKey?: string
    ): Promise<{
        site: DetailedSiteInfo;
        project: Project;
        createMeta: CreateMetaTransformerResult<DetailedSiteInfo>;
    }> {
        if (!projectKey) {
            projectKey = Container.config.jira.lastCreateSiteAndProject.projectKey ?? '';
        }
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

    formatIssuelink(key: string, linkdata: any): any {
        return {
            type: {
                id: linkdata.linktype.id,
            },
            inwardIssue: linkdata.linktype.type === 'inward' ? { key: linkdata.issues.key } : { key: key },
            outwardIssue: linkdata.linktype.type === 'outward' ? { key: linkdata.issues.key } : { key: key },
        };
    }

    async create(site: DetailedSiteInfo, issueData: FieldValues): Promise<CreatedIssue> {
        const client = await Container.clientManager.jiraClient(site);
        const [fields, , issuelinks] = this.formatCreatePayload(issueData);
        Logger.debug(`Creating Jira issue with fields: ${JSON.stringify(fields)}`);
        const response = await client.createIssue({ fields: fields });
        if (issuelinks) {
            const formattedIssuelinks = this.formatIssuelink(response.key, issuelinks);
            await client.createIssueLink(response.key, formattedIssuelinks);
        }
        return response;
    }

    async performAutoComplete(site: DetailedSiteInfo, autoCompleteQuery: string, url: string): Promise<any> {
        const client = await Container.clientManager.jiraClient(site);
        return await client.getAutocompleteDataFromUrl(url + autoCompleteQuery);
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
                                ? format(payload['worklog'].started, "yyyy-MM-dd'T'HH:mm:ss.SSSXX")
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
