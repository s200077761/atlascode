import { AbstractReactWebview } from './abstractWebview';
import { Action } from '../ipc/messaging';
import { Logger } from '../logger';
import { Container } from '../container';
import { CreateIssueScreen, CreateIssueData } from '../ipc/issueMessaging';
import { WorkingProject } from '../config/model';

const KNOWNFIELDS:string[] = ['summary','description','fixVersions', 'components'];

export class CreateIssueWebview extends AbstractReactWebview<CreateIssueData,Action> {
	
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
        const screens = await this.getScreenFields(project);

        Logger.debug('creating create data...');

        const createData = {
            type:'screenRefresh',
            selectedProject:(project !== undefined)? project : Container.jiraSiteManager.effectiveProject,
            availableProjects:await Container.jiraSiteManager.getProjects(),
            issueTypeScreens:screens
        };

        Logger.debug('posting create data to webview',createData);
        this.postMessage(createData);
    }

    async getScreenFields(project?:WorkingProject): Promise<Map<string,any>> {
        Logger.debug('getting screen fields');
        let client = await Container.clientManager.jirarequest(Container.config.jira.workingSite);
        
        if (client) {

            const projects:string[] = (project !== undefined)? [project.key] : [Container.jiraSiteManager.effectiveProject.key];

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
                default: {
                    break;
                }
            }
        }

        return handled;
    }

    prepareFields(project:JIRA.Schema.CreateMetaProjectBean):Map<string,CreateIssueScreen> {
        let preparedFields:Map<string,CreateIssueScreen> = new Map<string,CreateIssueScreen>();

        project.issuetypes!.forEach(issueType => {
            Logger.debug('processing issueType', issueType);
            let fields:JIRA.Schema.FieldMetaBean[] = [];

            Object.keys(issueType.fields!).forEach(k => {
                Logger.debug('processing issueType field', k);
                const field:JIRA.Schema.FieldMetaBean = issueType.fields![k];

                if(field.required || this.isKnownField(field)) {
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
        return preparedFields;
    }

    isKnownField(field:JIRA.Schema.FieldMetaBean):boolean {
        return (KNOWNFIELDS.indexOf(field.key) > -1 || field.name === 'Epic Link');
    }
}