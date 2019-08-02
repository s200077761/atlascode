import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { FieldTransformerResult } from "./model/fieldUI";
import { Container } from "../../container";
import { FieldTransformer, ProjectIdAndKey } from "./fieldTransformer";
import { EditMetaDescriptor } from "./model/fieldMetadata";

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

    public async transformDescriptor(descriptor: EditMetaDescriptor): Promise<FieldTransformerResult> {
        const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(this._site);
        const commonFields = [...defaultCommonFields, epicFieldInfo.epicName.id, epicFieldInfo.epicLink.id];
        const descriptorKeys: string[] = Object.keys(descriptor);
        let fieldResult: FieldTransformerResult = {
            fields: {},
            fieldValues: {},
            hasRequiredNonRenderables: false,
            nonRenderableFields: []
        };

        if (descriptorKeys.length > 0) {
            let fieldFilters = [...defaultFieldFilters];

            // if it's an Epic type, we need to filter out the epic link field (epics can't belong to other epics)
            if (descriptorKeys.includes(epicFieldInfo.epicName.id)) {
                fieldFilters.push(epicFieldInfo.epicLink.id);
            }

            const project: ProjectIdAndKey = { id: "", key: "" };

            if (descriptorKeys.includes('project')) {
                project.id = descriptor['project'].id;
                project.key = descriptor['project'].key;
            }

            fieldResult = await this._fieldTransformer.transformFields(descriptor, project, commonFields, false, fieldFilters);
        }

        return fieldResult;
    }
}
