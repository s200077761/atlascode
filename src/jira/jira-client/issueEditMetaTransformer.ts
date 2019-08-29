import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { FieldTransformerResult } from "./model/fieldUI";
import { Container } from "../../container";
import { FieldTransformer, ProjectIdAndKey } from "./fieldTransformer";
import { EditMetaDescriptor } from "./model/fieldMetadata";
import { IssueType, isMinimalIssue } from "./model/entities";
import { IssueCreateMetadata } from "./model/issueCreateMetadata";
import { getCachedIssue } from "../fetchIssue";

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
    , 'created'
    , 'updated'
    , 'worklog'
    , 'watches'
    , 'votes'
];

const defaultFieldFilters: string[] = ['creator', 'project', 'statuscategorychangedate', 'lastViewed'];

export class IssueEditMetaTransformer {

    private _fieldTransformer: FieldTransformer;
    private _site: DetailedSiteInfo;

    constructor(site: DetailedSiteInfo) {
        this._site = site;
        this._fieldTransformer = new FieldTransformer(site);
    }

    public async transformDescriptor(descriptor: EditMetaDescriptor): Promise<FieldTransformerResult> {
        const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(this._site);
        const commonFields = [...defaultCommonFields];
        let fieldResult: FieldTransformerResult = {
            fields: {},
            fieldValues: {},
            selectFieldOptions: {},
            hasRequiredNonRenderables: false,
            nonRenderableFields: []
        };


        let fieldFilters = [...defaultFieldFilters];

        // if it's an Epic type (or sub-task), we need to filter out the epic link field (epics can't belong to other epics)
        if (descriptor.isSubtask || descriptor.isEpic) {
            fieldFilters.push(epicFieldInfo.epicLink.id);
        }

        const project: ProjectIdAndKey = { id: "", key: "" };
        const prjField = descriptor.fields['project'];

        if (prjField && prjField.currentValue) {
            project.id = prjField.currentValue.id;
            project.key = prjField.currentValue.key;
        }

        const epicLinkField = descriptor.fields[epicFieldInfo.epicLink.id];
        if (epicLinkField) {
            const linkKey = epicLinkField.currentValue;
            let newValue = { label: linkKey, value: linkKey };

            if (linkKey && linkKey.trim() !== '') {
                const foundEpic = await getCachedIssue(linkKey);
                if (isMinimalIssue(foundEpic)) {
                    newValue = { label: `${foundEpic.epicName} - (${linkKey})`, value: linkKey };
                }
            }
            descriptor.fields[epicFieldInfo.epicLink.id].currentValue = newValue;
        }

        let subtaskTypes: IssueType[] = [];

        if (Object.keys(descriptor.fields).includes('subtasks')) {
            const client = await Container.clientManager.jirarequest(this._site);
            const cMeta: IssueCreateMetadata = await client.getCreateIssueMetadata(project.key);
            subtaskTypes = cMeta.projects[0].issuetypes.filter(it => it.subtask === true);
        }

        fieldResult = await this._fieldTransformer.transformFields(descriptor.fields, project, commonFields, false, fieldFilters, descriptor.issueKey, subtaskTypes);


        return fieldResult;
    }
}
