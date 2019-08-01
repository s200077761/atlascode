import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { FieldTransformerResult, FieldUI, FieldProblem } from "./model/fieldUI";
import { Container } from "../../container";
import { FieldTransformer, ProjectIdAndKey } from "./fieldTransformer";
import { EditMetaDescriptor } from "./model/fieldMetadata";
import { EditMetaTransformerResult, CommonFields } from "./model/editIssueUI";


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
        const commonResults: CommonFields = {};
        const advancedResults: FieldUI[] = [];
        let problems: FieldProblem[] = [];

        if (descriptorKeys.length > 0) {
            let fieldFilters = [...defaultFieldFilters];

            // if it's an Epic type, we need to filter out the epic link field (epics can't belong to other epics)
            if (descriptorKeys.includes(epicFieldInfo.epicName.id)) {
                fieldFilters.push(epicFieldInfo.epicLink.id);
            }

            const project: ProjectIdAndKey = { id: "", key: "" };

            if (Object.keys(descriptor).includes('project')) {
                project.id = descriptor['project'].id;
                project.key = descriptor['project'].key;
            }

            const fieldResult: FieldTransformerResult = await this._fieldTransformer.transformFields(descriptor, project, commonFields, false, fieldFilters);
            problems = fieldResult.nonRenderableFields;

            fieldResult.fields.forEach(result => {
                if (result.advanced) {
                    advancedResults.push(result);
                } else {
                    commonResults[result.key] = result;
                }
            });
        }

        return {
            problems: problems,
            commonFields: commonResults,
            advancedFields: advancedResults
        };
    }
}
