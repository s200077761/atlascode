
import { FieldTransformerResult, UIType, multiSelectSchemas, createableSelectSchemas, ValueType, FieldProblem, schemaTypeToUIMap, schemaOptionToUIMap, customSchemaToUIMap, multiLineStringSchemas, valueTypeForString } from "./model/fieldUI";
import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { EpicFieldInfo } from "../jiraCommon";
import { IssueLinkType } from "./model/entities";
import { FieldOrFieldMeta, isFieldMeta, isField, FieldSchemaMeta } from "./model/fieldMetadata";
import { Container } from "../../container";

interface ProblemCollector {
    problems: FieldProblem[];
    hasRequiredNonRenderables: boolean;
}

interface FieldAndValue {
    field: any;
    value: any;
}

export interface ProjectIdAndKey {
    id: string;
    key: string;
}

export class FieldTransformer {
    readonly _site: DetailedSiteInfo;

    constructor(site: DetailedSiteInfo) {
        this._site = site;
    }

    public async transformFields(fields: { [k: string]: FieldOrFieldMeta }, project: ProjectIdAndKey, commonFields: string[], requiredAsCommon: boolean, filterFieldKeys: string[] = [], issueKey?: string): Promise<FieldTransformerResult> {
        const isskey: string = issueKey ? issueKey : "";

        const result: FieldTransformerResult = {
            fields: {},
            fieldValues: {},
            nonRenderableFields: [],
            hasRequiredNonRenderables: false,
        };

        const problemCollector: ProblemCollector = { problems: [], hasRequiredNonRenderables: false };
        const epicFieldInfo: EpicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(this._site);
        const issueLinkTypes: IssueLinkType[] = [];
        const issuelinkTypes = await Container.jiraSettingsManager.getIssueLinkTypes(this._site);
        const defaultIssueLinkAutocomplete: string = `${this._site.baseApiUrl}/issue/picker?currentProjectId=${project.id}&showSubTaskParent=true&showSubTasks=true&currentIssueKey=${isskey}&query=`;

        // if we don't have issueLinkTypes, filter out the issue links
        if (!Array.isArray(issuelinkTypes) || issuelinkTypes.length < 1) {
            filterFieldKeys.push('issuelinks');
        }

        // transform the fields
        Object.keys(fields).forEach(k => {
            const field: FieldOrFieldMeta = fields[k];
            if (this.shouldRender(field, filterFieldKeys, problemCollector)) {
                let fieldAndValue: FieldAndValue = this.transformField(field, project, commonFields, requiredAsCommon, epicFieldInfo, issueLinkTypes, defaultIssueLinkAutocomplete);

                result.fields[field.key] = fieldAndValue.field;
                if (fieldAndValue.value && fieldAndValue.value !== null) {
                    result.fieldValues[field.key] = fieldAndValue.value;
                }
            }
        });

        result.nonRenderableFields = problemCollector.problems;
        result.hasRequiredNonRenderables = problemCollector.hasRequiredNonRenderables;

        return result;
    }

    private transformField(field: FieldOrFieldMeta, project: ProjectIdAndKey, commonFields: string[], requiredAsCommon: boolean, epicFieldInfo: EpicFieldInfo, issueLinkTypes: IssueLinkType[], defaultILAutocomplete: string): FieldAndValue {
        // when updating for FeildORFieldMeta, check items and if it's issuelinks, always return an editable UI.
        const required: boolean = isFieldMeta(field) ? field.required : false;
        const allowedValues: any[] = isFieldMeta(field) && field.allowedValues ? field.allowedValues : [];
        const schema: FieldSchemaMeta = field.schema!;
        const schemaName: string = this.schemaName(field);
        let autoCompleteUrl: string = '';

        if (isFieldMeta(field)) {
            if (field.autoCompleteUrl) {
                autoCompleteUrl = field.autoCompleteUrl;
            }
            // if this is an issuelinks field we always want it to be editable no matter what
        } else if (schema.items && schema.items === 'issuelinks') {
            autoCompleteUrl = defaultILAutocomplete;
        }

        switch (this.uiTypeForField(field)) {
            case UIType.Input: {
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Input,
                        initialValue: field.currentValue,
                        valueType: this.valueTypeForField(field),
                        isMultiline: multiLineStringSchemas.includes(schemaName),
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: field.currentValue
                };
            }
            case UIType.Checkbox: {
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Checkbox,
                        allowedValues: allowedValues,
                        valueType: this.valueTypeForField(field),
                        initialValue: field.currentValue,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: field.currentValue
                };
            }
            case UIType.Radio: {
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Radio,
                        allowedValues: allowedValues,
                        valueType: this.valueTypeForField(field),
                        initialValue: field.currentValue,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: field.currentValue
                };
            }
            case UIType.Date: {
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Date,
                        valueType: this.valueTypeForField(field),
                        initialValue: field.currentValue,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: field.currentValue
                };
            }
            case UIType.DateTime: {
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.DateTime,
                        valueType: this.valueTypeForField(field),
                        initialValue: field.currentValue,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: field.currentValue
                };
            }
            case UIType.Select: {
                let autoCompleteJql = '';

                if (field.key === epicFieldInfo.epicLink.id) {
                    autoCompleteJql = `project = "${project.key}" and cf[${epicFieldInfo.epicName.cfid}] != ""  and resolution = EMPTY`;
                }

                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Select,
                        allowedValues: allowedValues,
                        isMulti: multiSelectSchemas.includes(schemaName),
                        isCascading: (schema.custom === 'com.atlassian.jira.plugin.system.customfieldtypes:cascadingselect') ? true : false,
                        isCreateable: createableSelectSchemas.includes(schemaName),
                        autoCompleteUrl: autoCompleteUrl,
                        autoCompleteJql: autoCompleteJql,
                        createUrl: this.createUrlForField(field),
                        valueType: this.valueTypeForField(field),
                        initialValue: field.currentValue,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: field.currentValue
                };
            }
            case UIType.IssueLink: {
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.IssueLink,
                        autoCompleteUrl: autoCompleteUrl,
                        autoCompleteJql: "",
                        createUrl: this.createUrlForField(field),
                        allowedValues: issueLinkTypes,
                        isCreateable: createableSelectSchemas.includes(schemaName),
                        isSubtasks: (schemaName === 'subtasks'),
                        isMulti: multiSelectSchemas.includes(schemaName),
                        valueType: this.valueTypeForField(field),
                        initialValue: field.currentValue,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: field.currentValue
                };
            }
            case UIType.Timetracking: {
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Timetracking,
                        valueType: this.valueTypeForField(field),
                        initialValue: field.currentValue,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: field.currentValue
                };
            }
            case UIType.Worklog: {
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Worklog,
                        valueType: this.valueTypeForField(field),
                        initialValue: field.currentValue,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: field.currentValue
                };
            }
            case UIType.Comments: {
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Comments,
                        valueType: this.valueTypeForField(field),
                        initialValue: field.currentValue,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: field.currentValue
                };
            }
            case UIType.Watches: {
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Worklog,
                        valueType: this.valueTypeForField(field),
                        initialValue: field.currentValue,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: field.currentValue
                };
            }
            case UIType.Votes: {
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Worklog,
                        valueType: this.valueTypeForField(field),
                        initialValue: field.currentValue,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: field.currentValue
                };
            }
            case UIType.NonEditable: {
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.NonEditable,
                        valueType: this.valueTypeForField(field),
                        initialValue: field.currentValue,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: field.currentValue
                };
            }
            case UIType.Attachment: {
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Attachment,
                        valueType: this.valueTypeForField(field),
                        initialValue: field.currentValue,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: field.currentValue
                };
            }
        }
    }

    private shouldRender(field: FieldOrFieldMeta, filters: string[], collector: ProblemCollector): boolean {
        if (filters.includes(field.key)) {
            return false;
        }

        return this.hasKnownUIMapping(field, collector);
    }

    private hasKnownUIMapping(field: FieldOrFieldMeta, collector: ProblemCollector): boolean {
        let hasKnownType: boolean = false;
        const required: boolean = isFieldMeta(field) && field.required;
        const errMsg = required ? "required field contains non-renderable schema" : "field contains non-renderable schema";
        const schemaName = this.schemaName(field);

        if (field.schema) {
            let schemaType: string = field.schema.type === 'array' ? field.schema.items! : field.schema.type;

            if (schemaTypeToUIMap.has(schemaType) || customSchemaToUIMap.has(schemaName)) {
                hasKnownType = true;
                if (schemaType === 'option' && !schemaOptionToUIMap.has(schemaName)) {
                    hasKnownType = false;
                }

            } else {
                this.addFieldProblem({
                    key: field.key,
                    name: field.name,
                    required: required,
                    message: errMsg,
                    schema: schemaName
                }, collector);
            }
        } else {
            this.addFieldProblem({
                key: field.key,
                name: field.name,
                required: required,
                message: errMsg,
                schema: schemaName
            }, collector);
        }

        return hasKnownType;
    }

    private isAdvanced(field: FieldOrFieldMeta, commonFields: string[], requiredAsCommon: boolean): boolean {
        let advanced: boolean = false;
        if (!commonFields.includes(field.key)) {
            if (requiredAsCommon && (isFieldMeta(field) && !field.required)) {
                advanced = true;
            }
        }

        return advanced;
    }

    private uiTypeForField(field: FieldOrFieldMeta): UIType {
        const schemaName = this.schemaName(field);
        let foundType: UIType | undefined = undefined;

        if (isFieldMeta(field)) {
            foundType = schemaTypeToUIMap.get(field.schema.type);

            if (!foundType && field.schema.type === 'option') {
                foundType = schemaOptionToUIMap.get(schemaName);
            }

            if (!foundType) {
                foundType = customSchemaToUIMap.get(schemaName);
            }

        } else if (isField(field)) {
            foundType = UIType.NonEditable;
        } else {
            foundType = UIType.Input;
        }

        return foundType!;
    }

    private schemaName(field: FieldOrFieldMeta): string {
        let schemaName = 'unknown schema';

        if (field.schema) {
            if (field.schema.system) {
                schemaName = field.schema.system;
            }

            if (field.schema.custom) {
                schemaName = field.schema.custom;
            }
        }

        return schemaName;
    }

    private valueTypeForField(field: FieldOrFieldMeta): ValueType {
        const schemaName: string = this.schemaName(field);

        if (schemaName === 'com.atlassian.jira.plugin.system.customfieldtypes:url') {
            return ValueType.Url;
        }

        if (field.schema) {
            const schemaType: string = field.schema.type !== 'array' ? field.schema.type : field.schema.items!;
            return valueTypeForString(schemaType);
        }

        return ValueType.String;
    }

    private createUrlForField(field: FieldOrFieldMeta): string {
        const schemaName: string = this.schemaName(field);

        switch (schemaName) {
            case 'components': return `${this._site.baseApiUrl}/component`;
            case 'fixVersions': return `${this._site.baseApiUrl}/version`;
            case 'versions': return `${this._site.baseApiUrl}/version`;
            case 'subtasks': return `${this._site.baseApiUrl}/issue`;
            default: return "";
        }

    }

    private addFieldProblem(problem: FieldProblem, collector: ProblemCollector) {

        let alreadyFound = collector.problems.find(p => p.key === problem.key);

        if (!alreadyFound) {
            collector.problems.push(problem);
            if (problem.required) {
                collector.hasRequiredNonRenderables = true;
            }
        }
    }
}