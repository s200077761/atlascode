import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { IssueTypeIssueCreateMetadata, ProjectIssueCreateMetadata } from "./model/issueCreateMetadata";
import { FieldTransformerResult } from "./model/fieldUI";
import { Container } from "../../container";
import { FieldTransformer } from "./fieldTransformer";
import { IssueType } from "./model/entities";
import { CreateMetaTransformerResult, CreateMetaTransformerProblems, IssueTypeUI, IssueTypeProblem, emptyIssueTypeUI, IssueTypeUIs } from "./model/editIssueUI";
//import { emptyIssueType } from "./model/emptyEntities";


const defaultCommonFields: string[] = [
    'project'
    , 'issuetype'
    , 'summary'
    , 'description'
    , 'fixVersions'
    , 'components'
    , 'labels'
];

const defaultFieldFilters: string[] = ['parent', 'reporter', 'statuscategorychangedate', 'lastViewed'];

export class IssueCreateScreenTransformer {

    private _fieldTransformer: FieldTransformer;
    private _site: DetailedSiteInfo;

    constructor(site: DetailedSiteInfo) {
        this._site = site;
        this._fieldTransformer = new FieldTransformer(site);
    }

    public async transformIssueScreens(project: ProjectIssueCreateMetadata): Promise<CreateMetaTransformerResult> {
        const epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(this._site);
        const commonFields = [epicFieldInfo.epicName.id, ...defaultCommonFields];

        const issueTypeUIList: IssueTypeUIs = {};
        let firstIssueType: IssueType | undefined;
        let problems: CreateMetaTransformerProblems = {};
        const renderableIssueTypes: IssueType[] = [];

        if (project && Array.isArray(project.issuetypes) && project.issuetypes.length > 0) {
            firstIssueType = this.metaIssueTypeToIssueType(project.issuetypes[0]);

            for (let i = 0; i < project.issuetypes.length; i++) {
                const issueTypeMeta: IssueTypeIssueCreateMetadata = project.issuetypes[i];
                const issueType: IssueType = this.metaIssueTypeToIssueType(issueTypeMeta);
                let issueTypeUI: IssueTypeUI = {
                    ...emptyIssueTypeUI,
                    ...{
                        siteDetails: this._site,
                        epicFieldInfo: epicFieldInfo,
                    }
                };

                if (issueTypeMeta.fields && Object.keys(issueTypeMeta.fields).length > 0) {
                    let issueTypeFieldFilters = [...defaultFieldFilters];

                    // if it's an Epic type, we need to filter out the epic link field (epics can't belong to other epics)
                    if (Object.keys(issueTypeMeta.fields!).includes(epicFieldInfo.epicName.id)) {
                        issueTypeFieldFilters.push(epicFieldInfo.epicLink.id);
                    }

                    const fieldResult: FieldTransformerResult = await this._fieldTransformer.transformFields(issueTypeMeta.fields, { id: project.id, key: project.key }, commonFields, true, issueTypeFieldFilters);

                    if (fieldResult.nonRenderableFields.length > 0) {
                        this.addIssueTypeProblem({
                            issueType: issueType,
                            isRenderable: !fieldResult.hasRequiredNonRenderables,
                            nonRenderableFields: fieldResult.nonRenderableFields,
                            message: "Issue Type contains non-renderable fields"
                        }, problems);
                    }

                    if (!fieldResult.hasRequiredNonRenderables && !issueTypeMeta.subtask) {
                        fieldResult.fieldValues['issuetype'] = issueType;
                        issueTypeUI = { ...issueTypeUI, ...fieldResult };
                        renderableIssueTypes.push(issueType);
                        issueTypeUIList[issueTypeMeta.id] = issueTypeUI;
                    }
                } else {
                    this.addIssueTypeProblem({
                        issueType: issueType,
                        isRenderable: false,
                        nonRenderableFields: [],
                        message: "No fields found in issue type"
                    }, problems);
                }
            }
        }

        if (!firstIssueType || firstIssueType.id === 'atlascodeempty' || (!renderableIssueTypes.find(it => it.id === firstIssueType!.id))) {
            if (renderableIssueTypes.length > 0) {
                firstIssueType = renderableIssueTypes[0];
            }
        }

        Object.keys(issueTypeUIList).forEach(key => {
            issueTypeUIList[key].selectFieldOptions['issuetype'] = renderableIssueTypes;
        });

        return { issueTypes: renderableIssueTypes, selectedIssueType: firstIssueType!, issueTypeUIs: issueTypeUIList, problems: problems };
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