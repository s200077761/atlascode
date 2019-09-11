import { JiraClient } from './client';
import { DetailedSiteInfo } from '../../atlclients/authInfo';

export class JiraServerClient extends JiraClient {
    private _basicAuth: string | undefined;

    constructor(username: string, password: string, site: DetailedSiteInfo, agent?: any) {
        super(site, agent);
        this._basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
    }

    public async assignIssue(issueIdOrKey: string, accountId: string | undefined): Promise<any> {
        const res = await this.putToJira(`issue/${issueIdOrKey}/assignee`, { name: accountId });

        return res;
    }

    // Project
    public getProjectSearchPath(): string {
        return 'project';
    }

    protected authorization(): string {
        return `Basic ${this._basicAuth}`;
    }
}
