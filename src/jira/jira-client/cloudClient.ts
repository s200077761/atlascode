import { JiraClient } from './client';
import { DetailedSiteInfo } from '../../atlclients/authInfo';


export class JiraCloudClient extends JiraClient {
    private _token: string | undefined;

    constructor(token: string, site: DetailedSiteInfo, agent?: any) {
        super(site, agent);
        this._token = token;
    }

    public async assignIssue(issueIdOrKey: string, accountId: string | undefined): Promise<any> {
        const res = await this.putToJira(`issue/${issueIdOrKey}/assignee`, { accountId: accountId });

        return res;
    }

    // Project
    public getProjectSearchPath(): string {
        return 'project/search';
    }

    protected authorization(): string {
        return `Bearer ${this._token}`;
    }
}
