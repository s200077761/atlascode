import { AbstractReactWebview } from './abstractWebview';
import { Action, HostErrorMessage, onlineStatus } from '../ipc/messaging';
import { Logger } from '../logger';
import { Container } from '../container';
import { CreateIssueData, ProjectList, CreatedSomething, IssueCreated, LabelList, UserList, PreliminaryIssueData, IssueSuggestionsList } from '../ipc/issueMessaging';
import { WorkingProject } from '../config/model';
import { isScreensForProjects, isCreateSomething, isCreateIssue, isFetchQuery, isFetchByProjectQuery, isOpenJiraIssue } from '../ipc/issueActions';
import { commands, Uri, ViewColumn, Position } from 'vscode';
import { Commands } from '../commands';
import { IssueScreenTransformer } from '../jira/issueCreateScreenTransformer';
import { issueCreatedEvent } from '../analytics';

export interface PartialIssue {
    uri?: Uri;
    position?: Position;
    onCreated?: (uri: Uri, position: Position, issueKey: string) => void;
    summary?: string;
    description?: string;
}

type Emit = CreateIssueData | ProjectList | CreatedSomething | IssueCreated | HostErrorMessage | LabelList | UserList | IssueSuggestionsList | PreliminaryIssueData;
export class CreateIssueWebview extends AbstractReactWebview<Emit, Action> {
    private _partialIssue: PartialIssue | undefined;
    private _currentProject: WorkingProject;
    private _screenTransformer: IssueScreenTransformer;
    private _isRefeshing: boolean = false;

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
        console.log('createOrShow');
        this._partialIssue = data;
        if (data) {
            const pd: PreliminaryIssueData = { type: 'preliminaryIssueData', summary: data.summary, description: data.description };
            this.postMessage(pd);
        }
    }

    public async invalidate() {
        console.log('invalidate');
        if (Container.onlineDetector.isOnline()) {
            await this.updateFields();
        } else {
            this.postMessage(onlineStatus(false));
        }
    }

    async updateFields(project?: WorkingProject) {
        if (this._isRefeshing) {
            return;
        }

        this._isRefeshing = true;
        console.log('updateFields', this._screenTransformer);
        try {
            const availableProjects = await Container.jiraSiteManager.getProjects();

            let effProject = project;
            if (!effProject) {
                effProject = await Container.jiraSiteManager.getEffectiveProject();
            }

            if (effProject !== this._currentProject) {
                this._currentProject = effProject;

                let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);

                if (client) {
                    let res: JIRA.Response<JIRA.Schema.CreateMetaBean> = await client.issue.getCreateIssueMetadata({ projectKeys: [this._currentProject.key], expand: 'projects.issuetypes.fields' });
                    this._screenTransformer = new IssueScreenTransformer(Container.jiraSiteManager.effectiveSite, res.data.projects![0]);
                } else {
                    throw (new Error("unable to get a jira client"));
                }
            }

            const screenData = await this._screenTransformer.transformIssueScreens(undefined, false);

            const createData: CreateIssueData = {
                type: 'screenRefresh',
                selectedProject: this._currentProject,
                selectedIssueTypeId: screenData.selectedIssueType.id,
                availableProjects: availableProjects,
                issueTypeScreens: screenData.screens
            };


            this.postMessage(createData);
        } catch (e) {
            let err = new Error(`error updating issue fields issue: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: `error updating issue fields issue: ${e}` });
        } finally {
            this._isRefeshing = false;
        }
    }

    // TODO: [VSCODE-438] Move issuelinks transformations into the IssueCreateScreenTransformer
    // async addIssuelinksFieldData(client: JIRA, screens: IssueTypeIdScreens): Promise<IssueTypeIdScreens> {
    //     const issuelinksKey = 'issuelinks';
    //     try {
    //         const issuelinkTypes = await client.issueLinkType.getIssueLinkTypes({});
    //         if (Array.isArray(issuelinkTypes.data.issueLinkTypes) && issuelinkTypes.data.issueLinkTypes.length > 0) {
    //             Object.values(screens).forEach(screen => {
    //                 screen.fields.filter(screen => screen.key === issuelinksKey).forEach(issuelinksfield => {
    //                     (issuelinksfield as SelectScreenField).allowedValues = issuelinkTypes.data.issueLinkTypes!;
    //                 });
    //             });
    //         } else {
    //             Object.values(screens).forEach(screen => {
    //                 screen.fields.filter(field => field.key === issuelinksKey).forEach(issuelinksfield => issuelinksfield.uiType = UIType.NOT_RENDERED);
    //             });
    //         }
    //         return screens;
    //     } catch (e) {
    //         Object.values(screens).forEach(screen => {
    //             screen.fields.filter(field => field.key === issuelinksKey).forEach(issuelinksfield => issuelinksfield.uiType = UIType.NOT_RENDERED);
    //         });
    //         Logger.debug(new Error(`error getting issuelinks field data: ${e}`));
    //         return screens;
    //     }
    // }

    finalizeTodoIssueCreation(issueKey: string) {
        if (this._partialIssue && this._partialIssue.uri && this._partialIssue.position && this._partialIssue.onCreated) {
            this._partialIssue.onCreated(this._partialIssue.uri, this._partialIssue.position, issueKey);
            this.hide();
        }
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);

        if (!handled) {
            switch (e.action) {
                case 'refresh': {
                    console.log('got refresh from view');
                    handled = true;
                    this.invalidate();
                    break;
                }

                case 'fetchProjects': {
                    handled = true;
                    if (isFetchQuery(e)) {
                        try {
                            let projects = await Container.jiraSiteManager.getProjects('name', e.query);
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
                            let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);

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
                            let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);
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
                            let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);
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

                            let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);
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
                            let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);
                            if (client) {
                                const issuelinks: any[] = [];
                                const formLinks = e.issueData.issuelinks;
                                delete e.issueData.issuelinks;

                                let resp = await client.issue.createIssue({ body: { fields: e.issueData } });

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
                                issueCreatedEvent(resp.data.key, Container.jiraSiteManager.effectiveSite.id).then(e => { Container.analyticsClient.sendTrackEvent(e); });
                                commands.executeCommand(Commands.RefreshJiraExplorer);
                                this.finalizeTodoIssueCreation(resp.data.key);
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
                default: {
                    break;
                }
            }
        }

        return handled;
    }
}