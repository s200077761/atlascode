import { AbstractReactWebview } from './abstractWebview';
import { Action, onlineStatus } from '../ipc/messaging';
import { Logger } from '../logger';
import { Container } from '../container';
import { CreateIssueData, PreliminaryIssueData } from '../ipc/issueMessaging';
import { WorkingProject } from '../config/model';
import { isScreensForProjects, isCreateIssue, isFetchQuery, isFetchByProjectQuery, isOpenJiraIssue, isSetIssueType, isFetchOptionsJQL } from '../ipc/issueActions';
import { commands, Uri, ViewColumn, Position } from 'vscode';
import { Commands } from '../commands';
import { issueCreatedEvent } from '../analytics';
import { issuesForJQL } from '../jira/issuesForJql';
import { ProductJira, DetailedSiteInfo } from '../atlclients/authInfo';
import { BitbucketIssue } from '../bitbucket/model';
import { format } from 'date-fns';
import { AutoCompleteSuggestion } from '../jira/jira-client/client';
import { User } from '../jira/jira-client/model/entities';
import { IssuePickerIssue } from '../jira/jira-client/model/responses';
import { CreateMetaTransformerResult } from '../jira/jira-client/model/createIssueUI';
import { fetchCreateIssueUI } from '../jira/fetchIssue';
import { showIssue } from '../commands/jira/showIssue';

export interface PartialIssue {
    uri?: Uri;
    position?: Position;
    onCreated?: (data: CommentData | BBData) => void;
    summary?: string;
    description?: string;
    bbIssue?: BitbucketIssue;
}

export interface CommentData {
    uri: Uri;
    position: Position;
    issueKey: string;
}

export interface BBData {
    bbIssue: BitbucketIssue;
    issueKey: string;
}

export class CreateIssueWebview extends AbstractReactWebview {
    private _partialIssue: PartialIssue | undefined;
    private _currentProject: WorkingProject | undefined;
    private _screenData: CreateMetaTransformerResult | undefined;
    private _selectedIssueTypeId: string;
    private _relatedBBIssue: BitbucketIssue | undefined;

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Create JIRA Issue";
    }
    public get id(): string {
        return "atlascodeCreateIssueScreen";
    }

    async createOrShow(column?: ViewColumn, data?: PartialIssue): Promise<void> {
        await super.createOrShow(column);
        this._partialIssue = data;

        if (data) {
            const pd: PreliminaryIssueData = { type: 'preliminaryIssueData', summary: data.summary, description: data.description };

            if (data.bbIssue) {
                this._relatedBBIssue = data.bbIssue;
            }

            this.postMessage(pd);
        }
    }

    public async invalidate() {
        if (Container.onlineDetector.isOnline()) {
            await this.updateFields();
        } else {
            this.postMessage(onlineStatus(false));
        }

        Container.pmfStats.touchActivity();
    }

    async updateFields(project?: WorkingProject) {
        if (this.isRefeshing) {
            return;
        }

        this.isRefeshing = true;
        try {

            let effProject = project;

            if (!effProject) {
                effProject = await Container.jiraProjectManager.getEffectiveProject();
            }

            const site: DetailedSiteInfo = Container.siteManager.effectiveSite(ProductJira);

            const availableProjects = await Container.jiraProjectManager.getProjects();
            let projectChanged = false;

            if (effProject !== this._currentProject) {
                projectChanged = true;
                this._currentProject = project;
            }

            if (!this._currentProject) {
                this._currentProject = await Container.jiraProjectManager.getEffectiveProject();
                projectChanged = true;
            }

            if (projectChanged) {
                this._selectedIssueTypeId = '';
                this._screenData = undefined;
                this._screenData = await fetchCreateIssueUI(site, this._currentProject.key);
                this._selectedIssueTypeId = this._screenData.selectedIssueType.id;

            }

            if (this._screenData) {
                const createData: CreateIssueData = {
                    type: 'screenRefresh',
                    selectedProject: this._currentProject,
                    selectedIssueTypeId: this._selectedIssueTypeId,
                    availableProjects: availableProjects,
                    issueTypeScreens: this._screenData.issueTypeUIs,
                    transformerProblems: this._screenData.problems,
                    epicFieldInfo: await Container.jiraSettingsManager.getEpicFieldsForSite(site)
                };


                this.postMessage(createData);
            }

        } catch (e) {
            let err = new Error(`error updating issue fields: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: `error updating issue fields: ${e}` });
        } finally {
            this.isRefeshing = false;
        }
    }

    fireCallback(issueKey: string) {
        if (this._partialIssue && this._partialIssue.uri && this._partialIssue.position && this._partialIssue.onCreated) {
            this._partialIssue.onCreated({ uri: this._partialIssue.uri, position: this._partialIssue.position, issueKey: issueKey });
            this.hide();
        } else if (this._relatedBBIssue && this._partialIssue && this._partialIssue.onCreated) {
            this._partialIssue.onCreated({ bbIssue: this._relatedBBIssue, issueKey: issueKey });
            this.hide();
        }
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);

        if (!handled) {
            switch (e.action) {
                case 'refresh': {
                    handled = true;
                    this.invalidate();
                    break;
                }

                case 'setIssueType': {
                    handled = true;
                    if (isSetIssueType(e)) {
                        this._selectedIssueTypeId = e.id;
                    }
                    break;
                }

                case 'fetchProjects': {
                    handled = true;
                    if (isFetchQuery(e)) {
                        try {
                            let projects = await Container.jiraProjectManager.getProjects('name', e.query);
                            this.postMessage({ type: 'projectList', availableProjects: projects });
                        } catch (e) {
                            Logger.error(new Error(`error fetching projects: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }

                    }
                    break;
                }
                case 'fetchLabels': {
                    handled = true;
                    if (isFetchQuery(e)) {
                        try {
                            let client = await Container.clientManager.jiraClient(Container.siteManager.effectiveSite(ProductJira));

                            if (client) {
                                let suggestions: AutoCompleteSuggestion[] = await client.getFieldAutoCompleteSuggestions('labels', e.query);

                                const options = suggestions.map(suggestion => suggestion.value);

                                this.postMessage({ type: 'labelList', labels: options });


                            } else {
                                this.postMessage({ type: 'error', reason: "jira client undefined" });
                            }
                        } catch (e) {
                            Logger.error(new Error(`error fetching labels: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }

                    }

                    break;
                }
                case 'fetchUsers': {
                    handled = true;
                    if (isFetchByProjectQuery(e)) {
                        try {
                            let client = await Container.clientManager.jiraClient(Container.siteManager.effectiveSite(ProductJira));
                            if (client) {
                                let res: User[] = await client.findUsersAssignableToProject(e.project, e.query);

                                this.postMessage({ type: 'userList', users: res });

                            } else {
                                this.postMessage({ type: 'error', reason: "jira client undefined" });
                            }
                        } catch (e) {
                            Logger.error(new Error(`error fetching users: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }
                    }
                    break;
                }
                case 'fetchIssues': {
                    handled = true;
                    if (isFetchQuery(e)) {
                        try {
                            let client = await Container.clientManager.jiraClient(Container.siteManager.effectiveSite(ProductJira));
                            if (client) {
                                const suggestions: IssuePickerIssue[] = await client.getIssuePickerSuggestions(e.query);
                                this.postMessage({ type: 'issueSuggestionsList', issues: suggestions });

                            } else {
                                this.postMessage({ type: 'error', reason: "jira client undefined" });
                            }
                        } catch (e) {
                            Logger.error(new Error(`error fetching issues: ${e}`));
                            this.postMessage({ type: 'error', reason: `error fetching issues: ${e}` });
                        }
                    }
                    break;
                }
                case 'fetchOptionsJql': {
                    handled = true;
                    if (isFetchOptionsJQL(e)) {
                        try {
                            let options: any[] = [];
                            let issues = await issuesForJQL(e.jql);
                            if (issues && Array.isArray(issues)) {
                                issues.forEach(issue => {
                                    let title = issue.isEpic ? issue.epicName : issue.summary;
                                    options.push({ name: `${issue.key} - ${title}`, id: issue.key });
                                });
                            }

                            this.postMessage({ type: 'jqlOptionsList', options: options, fieldId: e.fieldId });
                        } catch (e) {
                            Logger.error(new Error(`error fetching issues: ${e}`));
                            this.postMessage({ type: 'error', reason: `error fetching issues: ${e}` });
                        }
                    }
                    break;
                }
                case 'getScreensForProject': {
                    handled = true;
                    if (isScreensForProjects(e)) {
                        await this.updateFields(e.project);
                    }
                    break;
                }
                // case 'createOption': {
                //     handled = true;
                //     if (isCreateSelectOption(e)) {
                //         try {

                //             let client = await Container.clientManager.jiraClient(Container.siteManager.effectiveSite(ProductJira));
                //             if (client) {
                //                 switch (e.createData.fieldKey) {
                //                     case 'fixVersions':
                //                     case 'versions': {
                //                         let resp = await client.createVersion({ body: { name: e.createData.name, project: e.createData.project } });
                //                         this.postMessage({ type: 'optionCreated', createdData: resp });

                //                         break;
                //                     }
                //                     case 'components': {
                //                         let resp = await client.createComponent({ body: { name: e.createData.name, project: e.createData.project } });
                //                         this.postMessage({ type: 'optionCreated', createdData: resp });

                //                         break;
                //                     }
                //                 }
                //             }
                //         } catch (e) {
                //             Logger.error(new Error(`error creating option: ${e}`));
                //             this.postMessage({ type: 'error', reason: e });
                //         }
                //     }
                //     break;
                // }

                case 'createIssue': {
                    handled = true;
                    if (isCreateIssue(e)) {
                        try {
                            const site = Container.siteManager.effectiveSite(ProductJira);
                            let client = await Container.clientManager.jiraClient(site);
                            if (client) {
                                const issuelinks: any[] = [];
                                const formLinks = e.issueData.issuelinks;
                                delete e.issueData.issuelinks;

                                let worklog: any = undefined;
                                if (e.issueData.worklog && e.issueData.worklog.enabled) {
                                    delete e.issueData.worklog.enabled;
                                    worklog = {
                                        worklog: [
                                            {
                                                add: {
                                                    ...e.issueData.worklog,
                                                    adjustEstimate: 'new',
                                                    started: e.issueData.worklog.started
                                                        ? format(e.issueData.worklog.started, 'YYYY-MM-DDTHH:mm:ss.SSSZZ')
                                                        : undefined
                                                }
                                            }
                                        ]
                                    };
                                    delete e.issueData.worklog;
                                }

                                const resp = await client.createIssue({ fields: e.issueData, update: worklog });

                                if (formLinks &&
                                    formLinks.type && formLinks.type.id &&
                                    formLinks.issue && Array.isArray(formLinks.issue) && formLinks.issue.length > 0) {

                                    formLinks.issue.forEach((link: any) => {
                                        issuelinks.push(
                                            {
                                                type: {
                                                    id: formLinks.type.id
                                                },
                                                inwardIssue: formLinks.type.type === 'inward' ? { key: link.key } : { key: resp.key },
                                                outwardIssue: formLinks.type.type === 'outward' ? { key: link.key } : { key: resp.key }
                                            }
                                        );
                                    });
                                }

                                if (issuelinks.length > 0) {
                                    issuelinks.forEach(async (link: any) => {
                                        if (client) {
                                            await client.createIssueLink('', { body: link });
                                        }
                                    });
                                }

                                this.postMessage({ type: 'issueCreated', issueData: { ...resp, site: site, token: await Container.clientManager.getValidAccessToken(Container.siteManager.effectiveSite(ProductJira)) } });
                                issueCreatedEvent(resp.key, Container.siteManager.effectiveSite(ProductJira).id).then(e => { Container.analyticsClient.sendTrackEvent(e); });
                                commands.executeCommand(Commands.RefreshJiraExplorer);
                                this.fireCallback(resp.key);
                            } else {
                                this.postMessage({ type: 'error', reason: "jira client undefined" });
                            }
                        } catch (e) {
                            Logger.error(new Error(`error creating issue: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }

                    }
                    break;
                }
                case 'openJiraIssue': {
                    handled = true;
                    if (isOpenJiraIssue(e)) {
                        showIssue(e.issueOrKey);
                    }
                    break;
                }
                case 'openProblemReport': {
                    handled = true;
                    Container.createIssueProblemsWebview.createOrShow(undefined, Container.siteManager.effectiveSite(ProductJira), this._currentProject);
                }
                default: {
                    break;
                }
            }
        }

        return handled;
    }
}
