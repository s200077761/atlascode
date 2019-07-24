import { AbstractReactWebview } from './abstractWebview';
import { Action, HostErrorMessage, onlineStatus } from '../ipc/messaging';
import { Logger } from '../logger';
import { Container } from '../container';
import { CreateIssueData, ProjectList, CreatedSomething, IssueCreated, LabelList, UserList, PreliminaryIssueData, IssueSuggestionsList, JqlOptionsList } from '../ipc/issueMessaging';
import { WorkingProject } from '../config/model';
import { isScreensForProjects, isCreateSomething, isCreateIssue, isFetchQuery, isFetchByProjectQuery, isOpenJiraIssue, isSetIssueType, isFetchOptionsJQL } from '../ipc/issueActions';
import { commands, Uri, ViewColumn, Position } from 'vscode';
import { Commands } from '../commands';
import { IssueCreateScreenTransformer } from '../jira/issueCreateScreenTransformer';
import { issueCreatedEvent } from '../analytics';
import { issuesForJQL } from '../jira/issuesForJql';
import { TransformerResult } from '../jira/createIssueMeta';
import { ProductJira } from '../atlclients/authInfo';
import { BitbucketIssue } from '../bitbucket/model';
import { format } from 'date-fns';

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
type Emit = CreateIssueData | ProjectList | CreatedSomething | IssueCreated | HostErrorMessage | LabelList | UserList | IssueSuggestionsList | JqlOptionsList | PreliminaryIssueData;
export class CreateIssueWebview extends AbstractReactWebview<Emit, Action> {
    private _partialIssue: PartialIssue | undefined;
    private _currentProject: WorkingProject | undefined;
    private _screenData: TransformerResult | undefined;
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
            const availableProjects = await Container.jiraProjectManager.getProjects();
            let projectChanged = false;

            if (project && project !== this._currentProject) {
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
                let client = await Container.clientManager.jirarequest(Container.siteManager.effectiveSite(ProductJira));

                let res: JIRA.Response<JIRA.Schema.CreateMetaBean> = await client.issue.getCreateIssueMetadata({ projectKeys: [this._currentProject.key], expand: 'projects.issuetypes.fields' });
                const screenTransformer = new IssueCreateScreenTransformer(Container.siteManager.effectiveSite(ProductJira), res.data.projects![0]);
                this._screenData = await screenTransformer.transformIssueScreens();
                this._selectedIssueTypeId = this._screenData.selectedIssueType.id!;

            }

            if (this._screenData) {
                const createData: CreateIssueData = {
                    type: 'screenRefresh',
                    selectedProject: this._currentProject,
                    selectedIssueTypeId: this._selectedIssueTypeId,
                    availableProjects: availableProjects,
                    issueTypeScreens: this._screenData.screens,
                    transformerProblems: this._screenData.problems,
                    epicFieldInfo: await Container.jiraSettingsManager.getEpicFieldsForSite(Container.siteManager.effectiveSite(ProductJira))
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
                            let client = await Container.clientManager.jirarequest(Container.siteManager.effectiveSite(ProductJira));

                            if (client) {
                                let res: JIRA.Response<JIRA.Schema.AutoCompleteResultWrapper> = await client.jql.getFieldAutoCompleteSuggestions({
                                    fieldName: 'labels',
                                    fieldValue: `${e.query}`
                                });

                                const suggestions = res.data.results;
                                let options: any[] = [];

                                if (suggestions && suggestions.length > 0) {
                                    options = suggestions.map((suggestion: any) => {
                                        return suggestion.value;
                                    });
                                }

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
                            let client = await Container.clientManager.jirarequest(Container.siteManager.effectiveSite(ProductJira));
                            if (client) {
                                let res: JIRA.Response<JIRA.Schema.User[]> = await client.user.findUsersAssignableToIssues({ project: `${e.project}`, query: `${e.query}` });

                                this.postMessage({ type: 'userList', users: res.data });

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
                            let client = await Container.clientManager.jirarequest(Container.siteManager.effectiveSite(ProductJira));
                            if (client) {
                                let res: JIRA.Response<JIRA.Schema.IssuePickerResult> = await client.issue.getIssuePickerSuggestions({ query: e.query });
                                let suggestions: JIRA.Schema.IssuePickerIssue[] = [];
                                if (Array.isArray(res.data.sections)) {
                                    suggestions = res.data.sections.reduce((prev, curr) => prev.concat(curr.issues), []);
                                }
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
                case 'createOption': {
                    handled = true;
                    if (isCreateSomething(e)) {
                        try {

                            let client = await Container.clientManager.jirarequest(Container.siteManager.effectiveSite(ProductJira));
                            if (client) {
                                switch (e.createData.fieldKey) {
                                    case 'fixVersions':
                                    case 'versions': {
                                        let resp = await client.version.createVersion({ body: { name: e.createData.name, project: e.createData.project } });
                                        this.postMessage({ type: 'optionCreated', createdData: resp.data });

                                        break;
                                    }
                                    case 'components': {
                                        let resp = await client.component.createComponent({ body: { name: e.createData.name, project: e.createData.project } });
                                        this.postMessage({ type: 'optionCreated', createdData: resp.data });

                                        break;
                                    }
                                }
                            }
                        } catch (e) {
                            Logger.error(new Error(`error creating option: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }
                    }
                    break;
                }

                case 'createIssue': {
                    handled = true;
                    if (isCreateIssue(e)) {
                        try {
                            let client = await Container.clientManager.jirarequest(Container.siteManager.effectiveSite(ProductJira));
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

                                const resp = await client.issue.createIssue({ body: { fields: e.issueData, update: worklog } });

                                if (formLinks &&
                                    formLinks.type && formLinks.type.id &&
                                    formLinks.issue && Array.isArray(formLinks.issue) && formLinks.issue.length > 0) {

                                    formLinks.issue.forEach((link: any) => {
                                        issuelinks.push(
                                            {
                                                type: {
                                                    id: formLinks.type.id
                                                },
                                                inwardIssue: formLinks.type.type === 'inward' ? { key: link.key } : { key: resp.data.key },
                                                outwardIssue: formLinks.type.type === 'outward' ? { key: link.key } : { key: resp.data.key }
                                            }
                                        );
                                    });
                                }

                                if (issuelinks.length > 0) {
                                    issuelinks.forEach(async (link: any) => {
                                        if (client) {
                                            await client.issueLink.createIssueLink({ body: link });
                                        }
                                    });
                                }


                                this.postMessage({ type: 'issueCreated', issueData: resp.data });
                                issueCreatedEvent(resp.data.key, Container.siteManager.effectiveSite(ProductJira).id).then(e => { Container.analyticsClient.sendTrackEvent(e); });
                                commands.executeCommand(Commands.RefreshJiraExplorer);
                                this.fireCallback(resp.data.key);
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
                        commands.executeCommand(Commands.ShowIssue, e.issueOrKey);
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
