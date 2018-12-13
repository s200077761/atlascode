import { AbstractReactWebview } from './abstractWebview';
import { Action } from '../ipc/messaging';
import { Logger } from '../logger';
import { Container } from '../container';

export class CreateIssueWebview extends AbstractReactWebview<{},Action> {
	
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
        await this.getScreenFields();
    }

    async getScreenFields(): Promise<JIRA.Schema.CreateMetaBean> {
        Logger.debug('fetch issue is calling jirarequest');
        let client = await Container.clientManager.jirarequest(Container.config.jira.workingSite);
        
        if (client) {

            let project:string[] = ['VSCODE'];

            if(Container.config.jira.workingSite.name === 'hello') {
                project = ['ADM'];
            }

            return client.issue
            .getCreateIssueMetadata({projectKeys:project, expand:'projects.issuetypes.fields'})
            .then((res: JIRA.Response<JIRA.Schema.CreateMetaBean>) => {
                return res.data;
            });
        }
        return Promise.reject("oops");
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
}