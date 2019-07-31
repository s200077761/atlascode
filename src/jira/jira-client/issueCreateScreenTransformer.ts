import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { ProjectIssueCreateMetadata, IssueTypeIssueCreateMetadata, readIssueTypeIssueCreateMetadata } from "./model/issueCreateMetadata";
import { CreateMetaTransformerProblems, CreateMetaTransformerResult, IssueTypeProblem, IssueTypeUI } from "./model/createIssueUI";
import { FieldTransformerResult } from "./model/fieldUI";
import { Container } from "../../container";
import { FieldTransformer } from "./fieldTransformer";
import { IssueType } from "./model/entities";


const defaultCommonFields: string[] = [
    'summary'
    , 'description'
    , 'fixVersions'
    , 'components'
    , 'labels'
];

const defaultFieldFilters: string[] = ['issuetype', 'project', 'reporter', 'statuscategorychangedate', 'lastViewed'];

export class IssueCreateScreenTransformer {

    private _fieldTransformer: FieldTransformer;
    private _site: DetailedSiteInfo;

    constructor(site: DetailedSiteInfo) {
        this._site = site;
        this._fieldTransformer = new FieldTransformer(site);
    }

    public async transformIssueScreens(project: ProjectIssueCreateMetadata): Promise<CreateMetaTransformerResult> {
        const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(this._site);
        const commonFields = [...defaultCommonFields, epicFieldInfo.epicName.id];

        const issueTypeUIList = {};
        let firstIssueType: IssueType | undefined;
        let problems: CreateMetaTransformerProblems = {};
        const renderableIssueTypes: IssueTypeIssueCreateMetadata[] = [];

        if (Array.isArray(project.issueTypes) && project.issueTypes.length > 0) {
            firstIssueType = this.metaIssueTypeToIssueType(project.issueTypes[0]);

            for (let i = 0; i < project.issueTypes.length; i++) {
                const issueType: IssueTypeIssueCreateMetadata = readIssueTypeIssueCreateMetadata(project.issueTypes[i]);

                const issueTypeUI: IssueTypeUI = {
                    name: issueType.name,
                    id: issueType.id,
                    iconUrl: (issueType.iconUrl !== undefined) ? issueType.iconUrl : '',
                    fields: []
                };

                if (issueType.fields && Object.keys(issueType.fields).length > 0) {
                    let issueTypeFieldFilters = [...defaultFieldFilters];

                    // if it's an Epic type, we need to filter out the epic link field (epics can't belong to other epics)
                    if (Object.keys(issueType.fields!).includes(epicFieldInfo.epicName.id)) {
                        issueTypeFieldFilters.push(epicFieldInfo.epicLink.id);
                    }

                    const fieldResult: FieldTransformerResult = await this._fieldTransformer.transformFields(issueType.fields, { id: project.id, key: project.key }, commonFields, true, issueTypeFieldFilters);

                    if (fieldResult.nonRenderableFields.length > 0) {
                        this.addIssueTypeProblem({
                            issueType: this.metaIssueTypeToIssueType(issueType),
                            isRenderable: !fieldResult.hasRequireNonRenderables,
                            nonRenderableFields: fieldResult.nonRenderableFields,
                            message: "Issue Type contains non-renderable fields"
                        }, problems);
                    }

                    if (!fieldResult.hasRequireNonRenderables) {
                        issueTypeUI.fields = fieldResult.fields;
                        renderableIssueTypes.push(issueType);
                        issueTypeUIList[issueType.id] = issueTypeUI;
                    }
                } else {
                    this.addIssueTypeProblem({
                        issueType: this.metaIssueTypeToIssueType(issueType),
                        isRenderable: false,
                        nonRenderableFields: [],
                        message: "No fields found in issue type"
                    }, problems);
                }
            }
        }

        if (!firstIssueType || (!renderableIssueTypes.find(it => it.id === firstIssueType!.id))) {
            firstIssueType = this.metaIssueTypeToIssueType(renderableIssueTypes[0]);
        }

        return { selectedIssueType: firstIssueType, issueTypeUIs: issueTypeUIList, problems: problems };
    }

    private addIssueTypeProblem(problem: IssueTypeProblem, problems: CreateMetaTransformerProblems) {
        if (!problems[problem.issueType.id]) {
            problems[problem.issueType.id] = problem;
        }
    }

    private metaIssueTypeToIssueType(issueType: IssueTypeIssueCreateMetadata): IssueType {
        return {
            description: issueType.description,
            iconUrl: issueType.iconUrl,
            id: issueType.id,
            name: issueType.name,
            subtask: issueType.subtask,
            avatarId: issueType.avatarId,
            self: issueType.self
        };
    }
}