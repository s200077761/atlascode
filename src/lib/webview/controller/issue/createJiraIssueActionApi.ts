import { CreatedIssue, Project } from '@atlassianlabs/jira-pi-common-models';
import { CreateMetaTransformerResult, FieldValues } from '@atlassianlabs/jira-pi-meta-models';
import { DetailedSiteInfo } from '../../../../atlclients/authInfo';

export interface CreateJiraIssueActionApi {
    fetchCreateMeta(
        site: DetailedSiteInfo,
        projectKey?: string
    ): Promise<{
        site: DetailedSiteInfo;
        project: Project;
        createMeta: CreateMetaTransformerResult<DetailedSiteInfo>;
    }>;
    create(site: DetailedSiteInfo, issueData: FieldValues): Promise<CreatedIssue>;
}
