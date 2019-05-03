import { AbstractReactWebview } from "./abstractWebview";
import { Action, HostErrorMessage } from "../ipc/messaging";

type Emit = HostErrorMessage;

export class CreateIssueProblemsWebview extends AbstractReactWebview<Emit, Action> {

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Create JIRA Issue Problem Report";
    }
    public get id(): string {
        return "atlascodeCreateIssueProblemsScreen";
    }

    public async invalidate() {

        // let res: JIRA.Response<JIRA.Schema.CreateMetaBean> = await client.issue.getCreateIssueMetadata({ projectKeys: [this._currentProject.key], expand: 'projects.issuetypes.fields' });
        // const screenTransformer = new IssueScreenTransformer(Container.jiraSiteManager.effectiveSite, res.data.projects![0]);
        // this._screenData = await screenTransformer.transformIssueScreens();
    }
}