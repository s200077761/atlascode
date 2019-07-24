import { DetailedSiteInfo } from "../atlclients/authInfo";
import { EpicFieldInfo } from "./jiraModel";
import { TransformerProblems } from "./createIssueMeta";
import { Project } from "./jiraProject";

export class IssueEditMetaTransformer {
    private _site: DetailedSiteInfo;
    private _project: Project;
    private _epicFieldInfo: EpicFieldInfo;
    private _issueLinkTypes: any[] = [];
    private _problems: TransformerProblems = {};

    constructor(site: DetailedSiteInfo, project: Project) {
        this._site = site;
        this._project = project;
    }

    public async transformIssueFields(filterFieldKeys: string[] = defaultFieldFilters): Promise<TransformerResult> {

    }
}