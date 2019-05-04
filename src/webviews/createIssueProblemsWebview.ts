import { AbstractReactWebview } from "./abstractWebview";
import { Action, HostErrorMessage } from "../ipc/messaging";
import { Container } from "../container";
import { AccessibleResource } from "../atlclients/authInfo";
import { WorkingProject } from "../config/model";
import { ViewColumn } from "vscode";
import { Logger } from "../logger";
import { IssueScreenTransformer } from "../jira/issueCreateScreenTransformer";
import { IssueProblemsData } from "../ipc/issueMessaging";

type Emit = HostErrorMessage | IssueProblemsData;

export class CreateIssueProblemsWebview extends AbstractReactWebview<Emit, Action> {
    private _site: AccessibleResource | undefined;
    private _project: WorkingProject | undefined;

    constructor(extensionPath: string) {
        super(extensionPath);
    }

    public get title(): string {
        return "Create JIRA Issue Problem Report";
    }
    public get id(): string {
        return "atlascodeCreateIssueProblemsScreen";
    }

    async createOrShow(column?: ViewColumn, site?: AccessibleResource, project?: WorkingProject): Promise<void> {
        await super.createOrShow(column);
        this._site = site;
        this._project = project;
    }

    public async invalidate() {
        if (this.isRefeshing) {
            return;
        }

        this.isRefeshing = true;

        try {
            if (!this._site || !this._project) {
                let err = new Error(`site or project is missing: site: ${this._site}, project: ${this._project}`);
                Logger.error(err);
                this.postMessage({ type: 'error', reason: `site or project is missing: site: ${this._site}, project: ${this._project}` });
                return;
            }

            let client = await Container.clientManager.jirarequest(this._site);

            if (client) {
                let res: JIRA.Response<JIRA.Schema.CreateMetaBean> = await client.issue.getCreateIssueMetadata({ projectKeys: [this._project.key], expand: 'projects.issuetypes.fields' });
                const screenTransformer = new IssueScreenTransformer(Container.jiraSiteManager.effectiveSite, res.data.projects![0]);
                let data = await screenTransformer.transformIssueScreens();

                this.postMessage({ type: 'screenRefresh', problems: data.problems, project: this._project });
            }

        } catch (e) {
            let err = new Error(`error updating issue fields: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: `error updating issue fields: ${e}` });
        } finally {
            this.isRefeshing = false;
        }
    }
}