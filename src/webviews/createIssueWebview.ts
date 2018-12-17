import { AbstractReactWebview } from './abstractWebview';
import { Action } from '../ipc/messaging';
import { Logger } from '../logger';
import { Container } from '../container';
import { CreateIssueScreen, CreateIssueData, ProjectList } from '../ipc/issueMessaging';
import { WorkingProject } from '../config/model';
import { isFetchProjects, isScreensForProjects } from '../ipc/issueActions';

const KNOWNFIELDS:string[] = ['summary','description','fixVersions', 'components'];

type Emit = CreateIssueData | ProjectList;
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

    async getScreenFields(project:WorkingProject):Promise<{selectedIssueType:JIRA.Schema.CreateMetaIssueTypeBean, screens: {[k:string]:CreateIssueScreen}}> {
        Logger.debug('getting screen fields');
        let client = await Container.clientManager.jirarequest(Container.jiraSiteManager.effectiveSite);
        
        if (client) {
            const projects:string[] = [project.key];

            return client.issue
            .getCreateIssueMetadata({projectKeys:projects, expand:'projects.issuetypes.fields'})
            .then((res: JIRA.Response<JIRA.Schema.CreateMetaBean>) => {
                return this.prepareFields(res.data.projects![0]);
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
                    if(isFetchProjects(e)) {

                        Container.jiraSiteManager.getProjects('name',e.query).then(projects => {
                            this.postMessage({type:'projectList', availableProjects:projects});
                        });
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
                default: {
                    break;
                }
            }
        }

        return handled;
    }

    prepareFields(project:JIRA.Schema.CreateMetaProjectBean):{selectedIssueType:JIRA.Schema.CreateMetaIssueTypeBean, screens: {[k:string]:CreateIssueScreen}} {
        let preparedFields = {};

        project.issuetypes!.forEach(issueType => {
            Logger.debug('processing issueType', issueType);
            let fields:JIRA.Schema.FieldMetaBean[] = [];

            Object.keys(issueType.fields!).forEach(k => {
                Logger.debug('processing issueType field', k);
                const field:JIRA.Schema.FieldMetaBean = issueType.fields![k];

                if(!this.shouldFilterField(field) && (field.required || this.isKnownField(field))) {
                    fields.push(field);
                }

            });

            let issueTypeScreen = {
                name:issueType.name!,
                id:issueType.id!,
                iconUrl:issueType.iconUrl,
                fields:fields
            };

            Logger.debug(`setting ${issueType.id} to `, issueTypeScreen);
            preparedFields[issueType.id!] = issueTypeScreen;
        });

        Logger.debug('prepared fields', preparedFields);
        return {selectedIssueType:project.issuetypes![0], screens:preparedFields};
    }

    isKnownField(field:JIRA.Schema.FieldMetaBean):boolean {
        return (KNOWNFIELDS.indexOf(field.key) > -1 || field.name === 'Epic Link');
    }

    shouldFilterField(field:JIRA.Schema.FieldMetaBean):boolean {
        return field.key === 'issuetype' 
            || field.key === 'project'
            || field.key === 'reporter';
    }
}