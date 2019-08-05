import { isArray } from 'util';
import { JiraClient } from './client';
import { Project } from './model/entities';
import { readProjects } from './model/responses';
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
    public async getProjects(query?: string, orderBy?: string): Promise<Project[]> {
        let queryValues: any | undefined = undefined;
        if (query || orderBy) {
            queryValues = {};
            if (query) {
                queryValues.query = query;
            }
            if (orderBy) {
                queryValues.orderBy = orderBy;
            }
        }
        const res = await this.getFromJira('project/search', queryValues);

        if (isArray(res.values)) {
            return readProjects(res.values);
        }
        return [];
    }

    protected authorization(): string {
        return `Bearer ${this._token}`;
    }
}
