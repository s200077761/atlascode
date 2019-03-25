import { AbstractReactWebview } from './abstractWebview';
import { Action, HostErrorMessage, onlineStatus } from '../ipc/messaging';
import { Logger } from '../logger';
import { Container } from '../container';
import { CreateIssueData, ProjectList, CreatedSomething, IssueCreated, LabelList, UserList, PreliminaryIssueData } from '../ipc/issueMessaging';
import { WorkingProject } from '../config/model';
import { isScreensForProjects, isCreateSomething, isCreateIssue, isFetchQuery, isFetchUsersQuery, isOpenJiraIssue } from '../ipc/issueActions';
import { commands } from 'vscode';
import { Commands } from '../commands';
import { transformIssueScreens } from '../jira/issueCreateScreenTransformer';
import { IssueTypeIdScreens } from '../jira/createIssueMeta';
import { issueCreatedEvent } from '../analytics';

export interface PartialIssue {
    summary?: string;
    description?: string;
}

type Emit = CreateIssueData | ProjectList | CreatedSomething | IssueCreated | HostErrorMessage | LabelList | UserList | PreliminaryIssueData;
export class CreateIssueWebview extends AbstractReactWebview<Emit, Action> {

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Create JIRA Issue";
    }
    public get id(): string {
        return "atlascodeCreateIssueScreen";
    }

    async createOrShow(data?: PartialIssue): Promise<void> {
        await super.createOrShow();
        if (data) {
            const pd: PreliminaryIssueData = { type: 'preliminaryIssueData', summary: data.summary, description: data.description };
            this.postMessage(pd);
        }
    }

    public async invalidate() {
        if (Container.onlineDetector.isOnline()) {
            await this.updateFields();
        } else {
            this.postMessage(onlineStatus(false));
        }
    }

    async updateFields(project?: WorkingProject) {
        try {
            const availableProjects = await Container.jiraSiteManager.getProjects();

            let effProject = project;
            if (!effProject) {
                effProject = await Container.jiraSiteManager.getEffectiveProject();
            }

            const screenData = await this.getScreenFields(effProject);

            const foundProject = (project !== undefined) ? project : effProject;
            const createData: CreateIssueData = {
                type: 'screenRefresh',
                selectedProject: foundProject,
                selectedIssueTypeId: screenData.selectedIssueType.id,
                availableProjects: availableProjects,
                issueTypeScreens: screenData.screens
            };


            this.postMessage(createData);
        } catch (e) {
            Logger.error(new Error(`error updating issue fields issue: ${e}`));
            this.postMessage({ type: 'error', reason: e });
        }


    }

    async getScreenFields(project: WorkingProject): Promise<{ selectedIssueType: JIRA.Schema.CreateMetaIssueTypeBean, screens: IssueTypeIdScreens }> {
        let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);

        if (client) {
            const projects: string[] = [project.key];

            let res: JIRA.Response<JIRA.Schema.CreateMetaBean> = await client.issue.getCreateIssueMetadata({ projectKeys: projects, expand: 'projects.issuetypes.fields' });
            let transformation = transformIssueScreens(res.data.projects![0], undefined, false);
            return transformation;
        }
        return Promise.reject("unable to get a jira client");
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
                    if (isFetchUsersQuery(e)) {
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
                                let resp = await client.issue.createIssue({ body: { fields: e.issueData } });
                                this.postMessage({ type: 'issueCreated', issueData: resp.data });
                                issueCreatedEvent(resp.data.key, Container.jiraSiteManager.effectiveSite.id).then(e => { Container.analyticsClient.sendTrackEvent(e); });

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