import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { IssueTypeIssueCreateMetadata, readIssueTypeIssueCreateMetadata } from "./model/issueCreateMetadata";
import { CreateMetaTransformerProblems, IssueTypeProblem, IssueTypeUI } from "./model/createIssueUI";
import { FieldTransformerResult } from "./model/fieldUI";
import { Container } from "../../container";
import { FieldTransformer } from "./fieldTransformer";
import { IssueType } from "./model/entities";
import { EditMetaDescriptor } from "./model/fieldMetadata";
import { EditMetaTransformerResult } from "./model/editIssueUI";


const defaultCommonFields: string[] = [
    'summary'
    , 'description'
    , 'fixVersions'
    , 'components'
    , 'labels'
    , 'assignee'
    , 'reporter'
    , 'issuelinks'
    , 'subtasks'
    , 'priority'
    , 'status'
    , 'issuetype'
    , 'attachment'
    , 'comment'
    , 'environment'
];

const defaultFieldFilters: string[] = ['votes', 'creator', 'project', 'statuscategorychangedate', 'lastViewed'];

export class IssueEditMetaTransformer {

    private _fieldTransformer: FieldTransformer;
    private _site: DetailedSiteInfo;

    constructor(site: DetailedSiteInfo) {
        this._site = site;
        this._fieldTransformer = new FieldTransformer(site);
    }

    public async transformDescriptor(descriptor: EditMetaDescriptor): Promise<EditMetaTransformerResult> {
        const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(this._site);
        const commonFields = [...defaultCommonFields, epicFieldInfo.epicName.id, epicFieldInfo.epicLink.id];
        const descriptorKeys: string[] = Object.keys(descriptor);

        if (descriptorKeys.length > 0) {
            let fieldFilters = [...defaultFieldFilters];

            // if it's an Epic type, we need to filter out the epic link field (epics can't belong to other epics)
            if (descriptorKeys.includes(epicFieldInfo.epicName.id)) {
                fieldFilters.push(epicFieldInfo.epicLink.id);
            }

            const fieldResult: FieldTransformerResult = await this._fieldTransformer.transformFields(issueType.fields, project.key, issueTypeFieldFilters, commonFields);

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