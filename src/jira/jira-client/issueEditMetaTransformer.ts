import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { FieldTransformerResult } from "./model/fieldUI";
import { Container } from "../../container";
import { FieldTransformer, ProjectIdAndKey } from "./fieldTransformer";
import { EditMetaDescriptor } from "./model/fieldMetadata";
import { IssueType } from "./model/entities";
import { IssueCreateMetadata } from "./model/issueCreateMetadata";

const defaultCommonFields: string[] = [
    'summary'
    , 'parent'
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
    , 'transitions'
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
        const descriptorFieldKeys: string[] = Object.keys(descriptor.fields);
        let fieldResult: FieldTransformerResult = {
            fields: {},
            fieldValues: {},
            selectFieldOptions: {},
            hasRequiredNonRenderables: false,
            nonRenderableFields: []
        };

        if (descriptorFieldKeys.length > 0) {
            let fieldFilters = [...defaultFieldFilters];

            // if it's an Epic type, we need to filter out the epic link field (epics can't belong to other epics)
            if (descriptorFieldKeys.includes(epicFieldInfo.epicName.id)) {
                fieldFilters.push(epicFieldInfo.epicLink.id);
            }

            const project: ProjectIdAndKey = { id: "", key: "" };
            const prjField = descriptor.fields['project'];

            if (prjField && prjField.currentValue) {
                project.id = prjField.currentValue.id;
                project.key = prjField.currentValue.key;
            }

            let subtaskTypes: IssueType[] = [];

            if (descriptorFieldKeys.includes('subtasks')) {
                const client = await Container.clientManager.jirarequest(this._site);
                const cMeta: IssueCreateMetadata = await client.getCreateIssueMetadata(project.key);
                subtaskTypes = cMeta.projects[0].issuetypes.filter(it => it.subtask === true);
            }

            fieldResult = await this._fieldTransformer.transformFields(descriptor.fields, project, commonFields, false, fieldFilters, descriptor.issueKey, subtaskTypes);
        }

        return fieldResult;
    }
}
