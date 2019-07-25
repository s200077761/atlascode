import { TransformerProblems, IssueTypeProblem, FieldProblem, TransformerResult, SimpleIssueType, IssueTypeScreen } from "./createIssueMeta";
import { DetailedSiteInfo } from "../atlclients/authInfo";
import { Container } from "../container";
import { EpicFieldInfo } from "./jiraCommon";
import { defaultFieldFilters, knownSystemSchemas, knownCustomSchemas } from "./commonIssueMeta";
import { FieldTransformer } from "./fieldTransformer";
import { Project } from "./jiraProject";

const defaultCommonFields: string[] = [
    'summary'
    , 'description'
    , 'fixVersions'
    , 'components'
    , 'labels'
];

const defaultFieldFilters: string[] = ['issuetype', 'project', 'reporter'];

export class IssueCreateScreenTransformer {

    private _fieldTransformer: FieldTransformer;
    private _problems: TransformerProblems = {};

    constructor(site: DetailedSiteInfo, project: Project) {
        this._fieldTransformer = new FieldTransformer(site, project, defaultCommonFields);
    }

    public async transformIssueScreens(filterFieldKeys: string[] = defaultFieldFilters): Promise<TransformerResult> {

        const issueTypeIdScreens = {};
        let firstIssueType = {};
        this._problems = {};




        if (this._project.issuetypes) {
            firstIssueType = this._project.issuetypes[0];
            // get rid of issue types we can't render
            const renderableIssueTypes = this._project.issuetypes.filter(itype => {
                return (itype.fields !== undefined && this.isRenderableIssueType(itype, filterFieldKeys));
            });

            renderableIssueTypes.forEach(issueType => {
                let issueTypeScreen: IssueTypeScreen = {
                    name: issueType.name!,
                    id: issueType.id!,
                    iconUrl: (issueType.iconUrl !== undefined) ? issueType.iconUrl : '',
                    fields: []
                };

                if (issueType.fields) {
                    let issueTypeFieldFilters = [...filterFieldKeys];

                    // if it's an Epic type, we need to filter out the epic link field (epics can't belong to other epics)
                    if (Object.keys(issueType.fields!).includes(this._epicFieldInfo.epicName.id)) {
                        issueTypeFieldFilters.push(this._epicFieldInfo.epicLink.id);
                    }

                    Object.keys(issueType.fields!).forEach(k => {
                        const field: JIRA.Schema.FieldMetaBean = issueType.fields![k];
                        if (field && !this.shouldFilter(issueType, field, issueTypeFieldFilters)) {
                            issueTypeScreen.fields.push(this.transformField(field));
                        }
                    });
                }

                issueTypeIdScreens[issueType.id!] = issueTypeScreen;
            });

            if (!renderableIssueTypes.includes(firstIssueType) && renderableIssueTypes.length > 0) {
                firstIssueType = renderableIssueTypes[0];
            }
        }

        return { selectedIssueType: firstIssueType, screens: issueTypeIdScreens, problems: this._problems };
    }



    private isRenderableIssueType(itype: JIRA.Schema.CreateMetaIssueTypeBean, filters: string[]): boolean {
        const fields: { [k: string]: JIRA.Schema.FieldMetaBean } | undefined = itype.fields;

        if (!fields) {
            this.addIssueTypeProblem({
                issueType: this.jiraTypeToSimpleType(itype),
                isRenderable: false,
                nonRenderableFields: [],
                message: "No fields found in issue type"
            });

            return false;
        }

        let allRenderable: boolean = true;

        for (var k in fields) {
            let field = fields[k];
            if (
                !this.shouldFilter(itype, field, filters)
                && ((field.schema.system !== undefined && !knownSystemSchemas.includes(field.schema.system))
                    || (field.schema.custom !== undefined && !knownCustomSchemas.includes(field.schema.custom)))
            ) {
                let schema = field.schema.system !== undefined ? field.schema.system : field.schema.custom;
                if (!schema) {
                    schema = "unknown schema";
                }

                this.addFieldProblem(itype, {
                    field: field,
                    message: "required field contains non-renderable schema",
                    schema: schema
                });
                allRenderable = false;
            }
        }

        if (this._problems[itype.id!]) {
            this._problems[itype.id!].isRenderable = allRenderable;

            if (!allRenderable) {
                this._problems[itype.id!].message = "issue type contains required non-renderable fields";
            }
        }

        return allRenderable;
    }

    private addIssueTypeProblem(problem: IssueTypeProblem) {
        if (!this._problems[problem.issueType.id!]) {
            this._problems[problem.issueType.id!] = problem;
        }
    }



    private jiraTypeToSimpleType(issueType: JIRA.Schema.CreateMetaIssueTypeBean): SimpleIssueType {
        return {
            description: issueType.description!,
            iconUrl: issueType.iconUrl!,
            id: issueType.id!,
            name: issueType.name!,
            subtask: issueType.subtask!
        };
    }
}