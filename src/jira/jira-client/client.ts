import axios, { AxiosInstance } from 'axios';
import { URLSearchParams } from 'url';
import { Field, readField } from './model/fieldMetadata';
import { CreatedIssue, readCreatedIssue, IssuePickerResult, IssuePickerIssue, readProjects } from './model/responses';
import { Project, Version, readVersion, Component, readComponent, IssueLinkType, User, readWatches, Watches, readVotes, Votes, readMinimalIssueLinks, MinimalIssueLink, readProject } from './model/entities';
import { DetailedSiteInfo } from '../../atlclients/authInfo';
import { IssueCreateMetadata, readIssueCreateMetadata } from './model/issueCreateMetadata';
import FormData from 'form-data';
import * as fs from "fs";
import { Time } from '../../util/time';

const issueExpand = "transitions,renderedFields,transitions.fields";
export const API_VERSION = 2;

// JiraClient provides methods to invoke Jira REST API endpoints
//
// NOTE: Ensure there are not transitive dependencies to 'vscode' as that will
// prevent importing this file from webviews
export abstract class JiraClient {
    readonly baseUrl: string;
    readonly site: DetailedSiteInfo;
    readonly agent: any | undefined;
    readonly transport: AxiosInstance;

    constructor(site: DetailedSiteInfo, agent?: any) {
        this.site = site;
        this.baseUrl = site.baseApiUrl;
        this.agent = agent;

        // Note: analytics-node-client adds axios-retry to the global axios instance.
        // Unfortunately, there's a bug that causes axios to infinitely retry when it gets
        // 500 errors.  Lesson  learned: ALWAYS use a custom instance of axios and config it yourself.
        // see: https://github.com/softonic/axios-retry/issues/59
        this.transport = axios.create({
            timeout: 30 * Time.SECONDS,
            headers: {
                'X-Atlassian-Token': 'no-check',
                'x-atlassian-force-account-id': 'true',
            }
        });
    }

    // Issue
    public async createIssue(params: any): Promise<CreatedIssue> {
        const result = await this.postToJira('issue', params);

        return readCreatedIssue(result);
    }

    public async getIssue(issueIdOrKey: string, fields: string[], expand: string = issueExpand): Promise<any> {
        const res = await this.getFromJira(`issue/${issueIdOrKey}`, { expand: expand, fields: fields });
        return res;
    }

    public abstract async assignIssue(issueIdOrKey: string, accountId: string | undefined): Promise<any>;

    public async editIssue(issueIdOrKey: string, fields: any): Promise<any> {
        const res = await this.putToJira(`issue/${issueIdOrKey}`, { fields: fields });

        return res;
    }

    public async addComment(issueIdOrKey: string, comment: string): Promise<any> {
        const res = await this.postToJira(`issue/${issueIdOrKey}/comment`, { body: comment }, { expand: 'renderedBody' });

        return res;
    }

    public async transitionIssue(issueIdOrKey: string, transitionId: string): Promise<any> {
        const res = await this.postToJira(`issue/${issueIdOrKey}/transitions`, { transition: { id: transitionId } });

        return res;
    }

    public async getEditIssueMetadata(issueIdOrKey: string): Promise<IssueUpdateMetadata> {
        const res = await this.getFromJira(`issue/${issueIdOrKey}/editmeta`);

        return new IssueUpdateMetadata(res);
    }

    public async getCreateIssueMetadata(projectKey: string): Promise<IssueCreateMetadata> {
        const res = await this.getFromJira(`issue/createmeta`, {
            projectKeys: [projectKey],
            expand: 'projects.issuetypes.fields'
        });

        return readIssueCreateMetadata(res);
    }

    public async getAutocompleteDataFromUrl(url: string): Promise<any> {
        const res = await this.transport(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.authorization()
            },
            httpsAgent: this.agent
        });

        return res.data;
    }

    public async getJqlDataFromPath(path: string): Promise<any> {
        const url = `${this.baseUrl}/api/${API_VERSION}/${path}`;

        const res = await this.transport(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.authorization()
            },
            httpsAgent: this.agent
        });

        return res.data;
    }

    public async postCreateUrl(url: string, data: any): Promise<any> {
        const res = await this.transport(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.authorization()
            },
            data: JSON.stringify(data),
            httpsAgent: this.agent
        });

        return res.data;
    }

    public async getIssuePickerSuggestions(query: string): Promise<IssuePickerIssue[]> {
        const res = await this.getFromJira('issue/picker', { query: query });

        const result: IssuePickerResult = res as IssuePickerResult;

        let suggestions: IssuePickerIssue[] = [];
        if (Array.isArray(result.sections)) {
            suggestions = result.sections.reduce((prev, curr) => prev.concat(curr.issues), [] as IssuePickerIssue[]);
        }

        return suggestions;
    }

    // Project
    public abstract getProjectSearchPath(): string;

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
        const res = await this.getFromJira(this.getProjectSearchPath(), queryValues);

        if (Array.isArray(res.values)) {
            return readProjects(res.values);
        }
        return [];
    }

    public async getProject(projectIdOrKey: string): Promise<Project> {

        const res = await this.getFromJira(`project/${projectIdOrKey}`);

        return readProject(res);
    }

    // User
    public async findUsersAssignableToIssue(issueKey: string, query: string): Promise<User[]> {
        const res = await this.getFromJira('user/assignable/search', { issueKey: issueKey, query: query });
        return res;
    }

    public async findUsersAssignableToProject(project: string, query: string): Promise<User[]> {
        const res = await this.getFromJira('user/assignable/search', { project: project, query: query });
        return res;
    }

    // JQL
    public async getFieldAutoCompleteSuggestions(fieldName: string, fieldValue: string): Promise<AutoCompleteSuggestion[]> {
        const res = await this.getFromJira('jql/autocompletedata/suggestions', { fieldName: fieldName, fieldValue: fieldValue });

        if (Array.isArray(res)) {
            return res.map((s: any) => readAutoCompleteSuggestion(s));
        }

        return [];
    }

    // Search
    public async searchForIssuesUsingJqlGet(jql: string, fields: string[]): Promise<any> {
        const res = await this.getFromJira('search', { jql: jql, fields: fields, expand: issueExpand });

        return res;
    }

    // These create things haven't been tested and maybe params should be typed.
    // Version
    public async createVersion(params: any): Promise<Version> {
        //{ body: { name: e.createData.name, project: this.state.key.split('-')[0] } }

        const result = await this.postToJira('version', params);

        return readVersion(result);
    }

    // Component
    public async createComponent(params: any): Promise<Component> {
        const result = await this.postToJira('component', params);

        return readComponent(result);
    }

    // IssueLink
    public async createIssueLink(parentIssueKey: string, linkData: any): Promise<MinimalIssueLink[]> {
        await this.postToJira('issueLink', linkData);
        const resp = await this.getFromJira(`issue/${parentIssueKey}`, { fields: 'issuelinks' });

        return readMinimalIssueLinks(resp.fields['issuelinks'], this.site);
    }

    // Worklog
    public async addWorklog(issuekey: string, params: any): Promise<any> {
        const result = await this.postToJira(`issue/${issuekey}/worklog`, params);

        return result;
    }

    // Watchers
    public async getWatchers(issueIdOrKey: string): Promise<Watches> {
        const res = await this.getFromJira(`issue/${issueIdOrKey}/watchers`);

        return readWatches(res);
    }

    public async addWatcher(issuekey: string, accountId: string): Promise<any> {
        const result = await this.postToJira(`issue/${issuekey}/watchers`, accountId);

        return result;
    }

    public async removeWatcher(issuekey: string, accountId: string): Promise<any> {
        const result = await this.deleteToJira(`issue/${issuekey}/watchers`, { accountId: accountId });

        return result;
    }

    // Votes
    public async getVotes(issueIdOrKey: string): Promise<Votes> {
        const res = await this.getFromJira(`issue/${issueIdOrKey}/votes`);

        return readVotes(res);
    }

    public async addVote(issuekey: string): Promise<any> {
        const result = await this.postToJira(`issue/${issuekey}/votes`);

        return result;
    }

    public async removeVote(issuekey: string): Promise<any> {
        const result = await this.deleteToJira(`issue/${issuekey}/votes`);

        return result;
    }

    public async getIssueLinkTypes(): Promise<IssueLinkType[]> {
        const res = await this.getFromJira('issueLinkType');
        return (res.issueLinkTypes) ? res.issueLinkTypes : [];
    }

    // Field
    public async getFields(): Promise<Field[]> {
        const res = await this.getFromJira('field');
        if (Array.isArray(res)) {
            return res.map(f => readField(f));
        }

        return [];
    }

    // Myself
    public async getCurrentUser(): Promise<User> {
        const res = await this.getFromJira('myself');

        return res;
    }

    // Attachment
    public async addAttachments(issuekey: string, files: any[]): Promise<any> {
        let formData = new FormData();
        files.forEach((file: any) => {
            formData.append('file'
                , fs.createReadStream(file.path)
                , {
                    filename: file.name,
                    contentType: file.type,
                }
            );
        });

        const res = await this.multipartToJira(`issue/${issuekey}/attachments`, formData);

        return res;
    }

    public async deleteAttachment(attachmentId: string): Promise<any> {
        const result = await this.deleteToJira(`attachment/${attachmentId}`);

        return result;
    }

    public async deleteIssuelink(linkId: string): Promise<any> {
        const result = await this.deleteToJira(`issuelink/${linkId}`);

        return result;
    }

    protected abstract authorization(): string;

    protected async getFromJira(url: string, queryParams?: any): Promise<any> {
        url = `${this.baseUrl}/api/${API_VERSION}/${url}`;
        if (queryParams) {
            const sp = new URLSearchParams();
            for (const [k, v] of Object.entries(queryParams)) {
                sp.append(k, `${v}`);
            }
            url = `${url}?${sp.toString()}`;
        }

        const res = await this.transport(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.authorization()
            },
            httpsAgent: this.agent
        });

        return res.data;
    }

    protected async postToJira(url: string, params?: any, queryParams?: any): Promise<any> {
        url = `${this.baseUrl}/api/${API_VERSION}/${url}`;
        if (queryParams) {
            const sp = new URLSearchParams();
            for (const [k, v] of Object.entries(queryParams)) {
                sp.append(k, `${v}`);
            }
            url = `${url}?${sp.toString()}`;
        }

        // yup, jira's silly and accepts post with no data
        let data = {};
        if (params) {
            data = { data: JSON.stringify(params) };
        }

        const res = await this.transport(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.authorization()
            },
            httpsAgent: this.agent,
            ...data
        });

        return res.data;

    }

    protected async multipartToJira(url: string, formData: FormData, queryParams?: any): Promise<any> {
        url = `${this.baseUrl}/api/${API_VERSION}/${url}`;
        if (queryParams) {
            const sp = new URLSearchParams();
            for (const [k, v] of Object.entries(queryParams)) {
                sp.append(k, `${v}`);
            }
            url = `${url}?${sp.toString()}`;
        }

        const res = await this.transport.post(url, formData, {
            headers: {
                Authorization: this.authorization(),
                'Content-Type': formData.getHeaders()['content-type'],
            },
            httpsAgent: this.agent,
        });

        return res.data;

    }

    protected async putToJira(url: string, params: any): Promise<any> {
        url = `${this.baseUrl}/api/${API_VERSION}/${url}`;

        const res = await this.transport(url, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.authorization()
            },
            data: JSON.stringify(params),
            httpsAgent: this.agent
        });

        return res.data;
    }

    protected async deleteToJira(url: string, queryParams?: any): Promise<any> {
        url = `${this.baseUrl}/api/${API_VERSION}/${url}`;
        if (queryParams) {
            const sp = new URLSearchParams();
            for (const [k, v] of Object.entries(queryParams)) {
                sp.append(k, `${v}`);
            }
            url = `${url}?${sp.toString()}`;
        }
        const res = await this.transport(url, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: this.authorization()
            },
            httpsAgent: this.agent
        });

        return res.data;
    }
}

// Classes
export interface AutoCompleteSuggestion {
    readonly value: string;
    readonly displayName: string;
}

export function readAutoCompleteSuggestion(params: any): AutoCompleteSuggestion {
    return {
        value: params.value,
        displayName: params.displayName
    };
}

// jiraIssueWebview, ca line 160
// res.fields['components'].allowedValues
export class IssueUpdateMetadata {
    public readonly fields: any;

    constructor(value: any) {
        this.fields = value.fields;
    }
}
