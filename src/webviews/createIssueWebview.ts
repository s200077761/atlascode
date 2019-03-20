import { AbstractReactWebview } from './abstractWebview';
import { Action, HostErrorMessage, onlineStatus } from '../ipc/messaging';
import { Logger } from '../logger';
import { Container } from '../container';
import { CreateIssueData, ProjectList, CreatedSomething, IssueCreated, LabelList, UserList } from '../ipc/issueMessaging';
import { WorkingProject } from '../config/model';
import { isScreensForProjects, isCreateSomething, isCreateIssue, isFetchQuery, isFetchUsersQuery, isOpenJiraIssue } from '../ipc/issueActions';
import { commands } from 'vscode';
import { Commands } from '../commands';
import { transformIssueScreens } from '../jira/issueCreateScreenTransformer';
import { IssueTypeIdScreens } from '../jira/createIssueMeta';
import { issueCreatedEvent } from '../analytics';

type Emit = CreateIssueData | ProjectList | CreatedSomething | IssueCreated | HostErrorMessage | LabelList | UserList;
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

    async createOrShow(): Promise<void> {
        await super.createOrShow();
    }

    public async invalidate() {
        if (Container.onlineDetector.isOnline()) {
            await this.updateFields();
        } else {
            this.postMessage(onlineStatus(false));
        }
    }

    async updateFields(project?: WorkingProject) {
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

    }

    async getScreenFields(project: WorkingProject): Promise<{ selectedIssueType: JIRA.Schema.CreateMetaIssueTypeBean, screens: IssueTypeIdScreens }> {
        let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);

        if (client) {
            const projects: string[] = [project.key];

            return client.issue
                .getCreateIssueMetadata({ projectKeys: projects, expand: 'projects.issuetypes.fields' })
                .then((res: JIRA.Response<JIRA.Schema.CreateMetaBean>) => {
                    let transformation = transformIssueScreens(res.data.projects![0], undefined, false);
                    return transformation;
                });
        }
        return Promise.reject("oops getScreenFields");
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
                        Container.jiraSiteManager.getProjects('name', e.query).then(projects => {
                            this.postMessage({ type: 'projectList', availableProjects: projects });
                        });
                    }
                    break;
                }
                case 'fetchLabels': {
                    handled = true;
                    if (isFetchQuery(e)) {
                        let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);

                        if (client) {
                            client.jql.getFieldAutoCompleteSuggestions({
                                fieldName: 'labels',
                                fieldValue: `${e.query}`
                            })
                                .then((res: JIRA.Response<JIRA.Schema.AutoCompleteResultWrapper>) => {
                                    const suggestions = res.data.results;
                                    let options: any[] = [];

                                    if (suggestions && suggestions.length > 0) {
                                        options = suggestions.map((suggestion: any) => {
                                            return suggestion.value;
                                        });
                                    }

                                    this.postMessage({ type: 'labelList', labels: options });

                                }).catch(reason => {
                                    Logger.debug('error getting labels', reason);
                                    this.postMessage({ type: 'error', reason: reason });
                                });
                        } else {
                            this.postMessage({ type: 'error', reason: "jira client undefined" });
                        }
                    }

                    break;
                }
                case 'fetchUsers': {
                    handled = true;
                    if (isFetchUsersQuery(e)) {
                        let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);
                        if (client) {
                            client.user.findUsersAssignableToIssues({ project: `${e.project}`, query: `${e.query}` })
                                .then((res: JIRA.Response<JIRA.Schema.User[]>) => {
                                    this.postMessage({ type: 'userList', users: res.data });
                                }).catch(reason => {
                                    Logger.debug('error getting users', reason);
                                    this.postMessage({ type: 'error', reason: reason });
                                });
                        } else {
                            this.postMessage({ type: 'error', reason: "jira client undefined" });
                        }
                    }
                    break;
                }
                case 'getScreensForProject': {
                    handled = true;
                    if (isScreensForProjects(e)) {
                        this.updateFields(e.project);
                    }
                    break;
                }
                case 'createOption': {
                    handled = true;
                    if (isCreateSomething(e)) {
                        let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);
                        if (client) {
                            switch (e.createData.fieldKey) {
                                case 'fixVersions':
                                case 'versions': {
                                    client.version.createVersion({ body: { name: e.createData.name, project: e.createData.project } })
                                        .then(resp => {
                                            this.postMessage({ type: 'optionCreated', createdData: resp.data });
                                        })
                                        .catch(reason => {
                                            Logger.debug('error creating version', reason);
                                            this.postMessage({ type: 'error', reason: reason });
                                        });
                                    break;
                                }
                                case 'components': {
                                    client.component.createComponent({ body: { name: e.createData.name, project: e.createData.project } })
                                        .then(resp => {
                                            this.postMessage({ type: 'optionCreated', createdData: resp.data });
                                        })
                                        .catch(reason => {
                                            Logger.debug('error creating component', reason);
                                            this.postMessage({ type: 'error', reason: reason });
                                        });
                                    break;
                                }
                            }

                        } else {
                            this.postMessage({ type: 'error', reason: "jira client undefined" });
                        }
                    }
                    break;
                }
                case 'createIssue': {
                    handled = true;
                    if (isCreateIssue(e)) {
                        let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);
                        if (client) {
                            client.issue.createIssue({ body: { fields: e.issueData } })
                                .then(resp => {
                                    this.postMessage({ type: 'issueCreated', issueData: resp.data });
                                    issueCreatedEvent(resp.data.key, Container.jiraSiteManager.effectiveSite.id).then(e => { Container.analyticsClient.sendTrackEvent(e); });
                                })
                                .catch(reason => {
                                    this.postMessage({ type: 'error', reason: reason });
                                    Logger.debug('error creating issue', reason);
                                });
                        } else {
                            this.postMessage({ type: 'error', reason: "jira client undefined" });
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