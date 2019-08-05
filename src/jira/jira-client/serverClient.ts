import { isArray } from 'util';
import { JiraClient } from './client';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { readProjects } from './model/responses';
import { Project } from './model/entities';


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
        const res = await this.getFromJira('project', queryValues);

        if (isArray(res)) {
            return readProjects(res);
        }
        return [];
    }

    protected authorization(): string {
        return `Basic ${this._basicAuth}`;
    }
}
