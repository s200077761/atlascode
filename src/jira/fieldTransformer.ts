import { UIType, multiSelectSchemas, createableSelectSchemas, schemaToUIMap, InputValueType, schemaToInputValueMap, defaultFieldFilters, FieldProblem } from "./commonIssueMeta";
import { DetailedSiteInfo } from "../atlclients/authInfo";
import { Project, EpicFieldInfo } from "./jiraModel";
import { Container } from "../container";
import { IssueLinkType } from "./jiraCommon";

export class FieldTransformer {

    protected _site: DetailedSiteInfo;
    protected _epicFieldInfo: EpicFieldInfo;
    protected _issueLinkTypes: IssueLinkType[] = [];
    protected _commonFields: string[];

    constructor(site: DetailedSiteInfo, project: Project, commonFields: string[]) {
        this._site = site;
        this._project = project;
        this._commonFields = commonFields;
    }

    public async transformFields(filterFieldKeys: string[] = defaultFieldFilters): any {
        if (!this._epicFieldInfo) {
            this._epicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(this._site);
        }
        // grab the issue link types
        const issuelinkTypes = await Container.jiraSettingsManager.getIssueLinkTypes(this._site);
        if (Array.isArray(issuelinkTypes) && issuelinkTypes.length > 0) {
            this._issueLinkTypes = issuelinkTypes;
        } else {
            filterFieldKeys.push('issuelinks');
        }
    }

    private transformField(field: JIRA.Schema.FieldMetaBean): any {
        switch (this.uiTypeForField(field.schema)) {
            case UIType.Input: {
                return {
                    required: field.required,
                    name: field.name,
                    key: field.key,
                    uiType: UIType.Input,
                    valueType: this.inputValueTypeForField(field.schema),
                    advanced: this.isAdvanced(field)
                };
            }
            case UIType.Textarea: {
                return {
                    required: field.required,
                    name: field.name,
                    key: field.key,
                    uiType: UIType.Textarea,
                    advanced: this.isAdvanced(field)
                };
            }
            case UIType.Checkbox: {
                return {
                    required: field.required,
                    name: field.name,
                    key: field.key,
                    uiType: UIType.Checkbox,
                    allowedValues: (field.allowedValues !== undefined) ? field.allowedValues : [],
                    advanced: this.isAdvanced(field)
                };
            }
            case UIType.Radio: {
                return {
                    required: field.required,
                    name: field.name,
                    key: field.key,
                    uiType: UIType.Radio,
                    allowedValues: (field.allowedValues !== undefined) ? field.allowedValues : [],
                    advanced: this.isAdvanced(field)
                };
            }
            case UIType.Date: {
                return {
                    required: field.required,
                    name: field.name,
                    key: field.key,
                    uiType: UIType.Date,
                    advanced: this.isAdvanced(field)
                };
            }
            case UIType.DateTime: {
                return {
                    required: field.required,
                    name: field.name,
                    key: field.key,
                    uiType: UIType.DateTime,
                    advanced: this.isAdvanced(field)
                };
            }
            case UIType.User: {
                return {
                    required: field.required,
                    name: field.name,
                    key: field.key,
                    uiType: UIType.User,
                    isMulti: (field.schema && field.schema.custom === 'com.atlassian.jira.plugin.system.customfieldtypes:multiuserpicker') ? true : false,
                    advanced: this.isAdvanced(field)
                };
            }
            case UIType.Select: {
                let allowedValues = (field.allowedValues !== undefined) ? field.allowedValues : [];
                let autoCompleteJql = '';

                if (field.key === this._epicFieldInfo.epicLink.id) {
                    autoCompleteJql = `project = "${this._project.key}" and cf[${this._epicFieldInfo.epicName.cfid}] != ""  and resolution = EMPTY`;
                }

                return {
                    required: field.required,
                    name: field.name,
                    key: field.key,
                    uiType: UIType.Select,
                    allowedValues: allowedValues,
                    isMulti: this.isMultiSelect(field.schema),
                    isCascading: (field.schema.custom === 'com.atlassian.jira.plugin.system.customfieldtypes:cascadingselect') ? true : false,
                    isCreateable: this.isCreateableSelect(field.schema),
                    autoCompleteUrl: (field.autoCompleteUrl !== undefined) ? field.autoCompleteUrl : '',
                    autoCompleteJql: autoCompleteJql,
                    advanced: this.isAdvanced(field)
                };
            }
            case UIType.IssueLink: {
                return {
                    required: field.required,
                    name: field.name,
                    key: field.key,
                    uiType: UIType.IssueLink,
                    autoCompleteUrl: (field.autoCompleteUrl !== undefined) ? field.autoCompleteUrl : '',
                    allowedValues: this._issueLinkTypes,
                    isCreateable: true,
                    isMulti: this.isMultiSelect(field.schema),
                    advanced: this.isAdvanced(field)
                };
            }
            case UIType.Timetracking: {
                return {
                    required: field.required,
                    name: field.name,
                    key: field.key,
                    uiType: UIType.Timetracking,
                    advanced: this.isAdvanced(field)
                };
            }
            case UIType.Worklog: {
                return {
                    required: field.required,
                    name: field.name,
                    key: field.key,
                    uiType: UIType.Worklog,
                    advanced: this.isAdvanced(field)
                };
            }
        }
    }

    private shouldFilter(itype: JIRA.Schema.CreateMetaIssueTypeBean, field: JIRA.Schema.FieldMetaBean, filters: string[]): boolean {
        if (filters.includes(field.key)) {
            return true;
        }

        if (!field.required && ((field.schema.system !== undefined && !knownSystemSchemas.includes(field.schema.system))
            || (field.schema.custom !== undefined && !knownCustomSchemas.includes(field.schema.custom)))) {
            let schema = field.schema.system !== undefined ? field.schema.system : field.schema.custom;
            if (!schema) {
                schema = "unknown schema";
            }
            this.addFieldProblem(itype, {
                field: field,
                message: "field contains non-renderable schema",
                schema: schema
            });
            return true;
        }

        return false;
    }

    private isAdvanced(field: JIRA.Schema.FieldMetaBean): boolean {
        const commonFields = [...this._commonFields, this._epicFieldInfo.epicName.id];
        return (!commonFields.includes(field.key) && !field.required);
    }

    private isMultiSelect(schema: { type: string, system?: string, custom?: string }): boolean {
        if (
            (schema.system && multiSelectSchemas.includes(schema.system))
            || (schema.custom && multiSelectSchemas.includes(schema.custom))) {
            return true;
        }

        return false;
    }

    private isCreateableSelect(schema: { type: string, system?: string, custom?: string }): boolean {
        if (
            (schema.system && createableSelectSchemas.includes(schema.system))
            || (schema.custom && createableSelectSchemas.includes(schema.custom))) {
            return true;
        }

        return false;
    }

    private uiTypeForField(schema: { type: string, system?: string, custom?: string }): UIType {
        if (schema.system && schemaToUIMap.has(schema.system)) {
            return schemaToUIMap.get(schema.system)!;
        }

        if (schema.custom && schemaToUIMap.has(schema.custom)) {
            return schemaToUIMap.get(schema.custom)!;
        }

        return UIType.Input;
    }

    private inputValueTypeForField(schema: { type: string, system?: string, custom?: string }): InputValueType {
        if (schema.system && schemaToInputValueMap.has(schema.system)) {
            return schemaToInputValueMap.get(schema.system)!;
        }

        if (schema.custom && schemaToInputValueMap.has(schema.custom)) {
            return schemaToInputValueMap.get(schema.custom)!;
        }

        return InputValueType.String;
    }

    private addFieldProblem(problem: FieldProblem) {
        if (!this._problems[issueType.id!]) {
            this._problems[issueType.id!] = {
                issueType: this.jiraTypeToSimpleType(issueType),
                isRenderable: true,
                nonRenderableFields: [],
                message: ""
            };
        }

        let alreadyFound = this._problems[issueType.id!].nonRenderableFields.find(p => p.field.key === problem.field.key);

        if (!alreadyFound) {
            this._problems[issueType.id!].nonRenderableFields.push(problem);
        }
    }
}