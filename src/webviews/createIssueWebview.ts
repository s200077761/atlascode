import { AbstractReactWebview } from './abstractWebview';
import { Action, ErrorMessage } from '../ipc/messaging';
import { Logger } from '../logger';
import { Container } from '../container';
import { CreateIssueData, ProjectList, CreatedSomething, IssueCreated, LabelList } from '../ipc/issueMessaging';
import { WorkingProject } from '../config/model';
import { isScreensForProjects, isCreateSomething, isCreateIssue, isOpenIssueAction, isFetchQuery } from '../ipc/issueActions';
import { commands } from 'vscode';
import { Commands } from '../commands';
import { transformIssueScreens } from '../jira/issueCreateScreenTransformer';
import { IssueTypeIdScreens } from '../jira/createIssueMeta';

type Emit = CreateIssueData | ProjectList | CreatedSomething | IssueCreated | ErrorMessage | LabelList;
export class CreateIssueWebview extends AbstractReactWebview<Emit,Action> {
	
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
        await this.invalidate();
    }

    public async invalidate() {
        await this.updateFields();
    }

    async updateFields(project?:WorkingProject) {
        const availableProjects = await Container.jiraSiteManager.getProjects();

        let effProject = project;
        if(!effProject) {
            effProject = await Container.jiraSiteManager.getEffectiveProject();
        }

        const screenData = await this.getScreenFields(effProject);

        Logger.debug('creating create data...');
        const foundProject = (project !== undefined)? project : effProject;
        const createData = {
            type:'screenRefresh',
            selectedProject:foundProject,
            selectedIssueType:screenData.selectedIssueType,
            availableProjects:availableProjects,
            issueTypeScreens:screenData.screens
        };

        Logger.debug('posting create data to webview',createData);
        this.postMessage(createData);
    }

    async getScreenFields(project:WorkingProject):Promise<{selectedIssueType:JIRA.Schema.CreateMetaIssueTypeBean, screens:IssueTypeIdScreens}> {
        Logger.debug('getting screen fields');
        let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);
        
        if (client) {
            const projects:string[] = [project.key];

            return client.issue
            .getCreateIssueMetadata({projectKeys:projects, expand:'projects.issuetypes.fields'})
            .then((res: JIRA.Response<JIRA.Schema.CreateMetaBean>) => {
                let transformation = transformIssueScreens(res.data.projects![0]);
                Logger.debug('getScreenFields returning',transformation);
                return transformation;
            });
        }
        return Promise.reject("oops getScreenFields");
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);

        if(!handled) {
            switch (e.action) {
                case 'fetchProjects': {
                    handled = true;
                    if(isFetchQuery(e)) {
                        Container.jiraSiteManager.getProjects('name',e.query).then(projects => {
                            this.postMessage({type:'projectList', availableProjects:projects});
                        });
                    }
                    break;
                }
                case 'fetchLabels': {
                    handled = true;
                    if(isFetchQuery(e)) {
                        let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);
      
                        if (client) {
                            client.jql.getFieldAutoCompleteSuggestions({
                                fieldName: 'labels',
                                fieldValue: `${e.query}`
                            })
                            .then((res: JIRA.Response<JIRA.Schema.AutoCompleteResultWrapper>) => {
                                const suggestions = res.data.results;
                                let options:any[] = [];

                                if (suggestions && suggestions.length > 0) {
                                    options = suggestions.map((suggestion: any) => {
                                        return suggestion.value;
                                    });
                                }

                                this.postMessage({type:'labelList', labels:options});

                            }).catch(reason => {
                                Logger.debug('error getting labels',reason);
                                this.postMessage({type:'error', reason:reason});
                            });
                        } else {
                            Logger.debug("label autocomplete: client undefined");
                        }
                    }

                    break;
                }
                case 'getScreensForProject': {
                    handled = true;
                    if(isScreensForProjects(e)) {
                        this.updateFields(e.project);
                    }
                    break;
                }
                case 'createOption': {
                    handled = true;
                    if(isCreateSomething(e)) {
                        let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);
                        if(client) {
                            switch(e.createData.fieldKey) {
                                case 'fixVersions': 
                                case 'versions': {
                                    client.version.createVersion({body:{name:e.createData.name, project:e.createData.project}})
                                        .then(resp => {
                                            this.postMessage({type:'optionCreated', createdData:resp.data});
                                        })
                                        .catch(reason => {
                                            Logger.debug('error creating version',reason);
                                            this.postMessage({type:'error', reason:reason});
                                        });
                                    break;
                                }
                                case 'components': {
                                    client.component.createComponent({body:{name:e.createData.name, project:e.createData.project}})
                                        .then(resp => {
                                            this.postMessage({type:'optionCreated', createdData:resp.data});
                                        })
                                        .catch(reason => {
                                            Logger.debug('error creating component',reason);
                                            this.postMessage({type:'error', reason:reason});
                                        });
                                    break;
                                }
                            }
                            
                        }
                    }
                    break;
                }
                case 'createComponent': {
                    handled = true;
                    if(isCreateSomething(e)) {
                        let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);
                        if(client) {
                            client.component.createComponent({body:{name:e.createData.name, project:e.createData.project}})
                                .then(resp => {
                                    this.postMessage({type:'componentCreated', createdData:resp.data});
                                })
                                .catch(reason => {
                                    this.postMessage({type:'componentCreated', createdData:{id:'error', name:'', archived:false, released:false}});
                                    Logger.debug('error creating component',reason);
                                });
                        }
                    }
                    break;
                }
                case 'createIssue': {
                    handled = true;
                    if(isCreateIssue(e)) {
                        let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);
                        if(client) {
                            client.issue.createIssue({body:e.issueData})
                                .then(resp => {
                                    this.postMessage({type:'issueCreated', issueData:resp.data});
                                })
                                .catch(reason => {
                                    this.postMessage({type:'issueCreated', issueData:{id:'error'}});
                                    Logger.debug('error creating issue',reason);
                                });
                        }
                    }
                    break;
                }
                case 'openIssue': {
                    handled = true;
                    if(isOpenIssueAction(e)) {
                        commands.executeCommand(Commands.ShowIssue,e.key);
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