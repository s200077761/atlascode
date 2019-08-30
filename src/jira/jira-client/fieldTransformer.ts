
import { FieldTransformerResult, UIType, multiSelectSchemas, createableSelectSchemas, ValueType, FieldProblem, schemaTypeToUIMap, schemaOptionToUIMap, customSchemaToUIMap, multiLineStringSchemas, valueTypeForString, FieldUI, IssueLinkTypeSelectOption } from "./model/fieldUI";
import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { EpicFieldInfo } from "../jiraCommon";
import { IssueLinkType, readIssueLinkIssues, readMinimalIssueLinks, IssueType, readIssueLinkIssue, readWatches, readVotes } from "./model/entities";
import { FieldOrFieldMeta, isFieldMeta, isField, FieldSchemaMeta } from "./model/fieldMetadata";
import { Container } from "../../container";
import { API_VERSION } from "../jira-client/client";

const sprintIdRegex = /id=(\d*),/;
const sprintNameRegex = /name=([^,]*),/;

interface ProblemCollector {
    problems: FieldProblem[];
    hasRequiredNonRenderables: boolean;
}

interface FieldAndValue {
    field: any;
    value: any;
    renderedValue?: any;
    selectOptions?: any[];
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

    public async transformFields(fields: { [k: string]: FieldOrFieldMeta }, project: ProjectIdAndKey, commonFields: string[], requiredAsCommon: boolean, filterFieldKeys: string[], issueKey?: string, inlineSubtaskTypes: IssueType[] = []): Promise<FieldTransformerResult> {
        const isskey: string = issueKey ? issueKey : "";

        const result: FieldTransformerResult = {
            fields: {},
            fieldValues: {},
            selectFieldOptions: {},
            nonRenderableFields: [],
            hasRequiredNonRenderables: false,
        };

        const problemCollector: ProblemCollector = { problems: [], hasRequiredNonRenderables: false };
        const epicFieldInfo: EpicFieldInfo = await Container.jiraSettingsManager.getEpicFieldsForSite(this._site);
        const issuelinkTypes: IssueLinkType[] = await Container.jiraSettingsManager.getIssueLinkTypes(this._site);
        const ilJQL: string = `project = "${project.key}" AND project in projectsWhereUserHasPermission("Link Issues") AND resolution = Unresolved ORDER BY priority DESC, updated DESC`;
        const defaultIssueLinkAutocomplete: string = `${this._site.baseApiUrl}/api/${API_VERSION}/issue/picker?showSubTaskParent=true&showSubTasks=true&currentIssueKey=${isskey}&currentJQL=${ilJQL}&query=`;

        // if we don't have issueLinkTypes, filter out the issue links
        if (!Array.isArray(issuelinkTypes) || issuelinkTypes.length < 1) {
            filterFieldKeys.push('issuelinks');
        }

        let nextIndex: number = commonFields.length;
        let displayOrder: number = 0;

        // transform the fields
        Object.keys(fields).forEach(k => {
            const field: FieldOrFieldMeta = fields[k];
            if (this.shouldRender(field, filterFieldKeys, problemCollector)) {


                let commonIndex: number = commonFields.indexOf(k);
                if (commonIndex < 0) {
                    displayOrder = nextIndex;
                    nextIndex++;
                } else {
                    displayOrder = commonIndex;
                }

                let fieldAndValue: FieldAndValue = this.transformField(field, displayOrder, project, commonFields, requiredAsCommon, epicFieldInfo, issuelinkTypes, defaultIssueLinkAutocomplete, inlineSubtaskTypes);

                result.fields[field.key] = fieldAndValue.field;
                if (fieldAndValue.value && fieldAndValue.value !== null) {
                    result.fieldValues[field.key] = fieldAndValue.value;
                }
                if (fieldAndValue.renderedValue && fieldAndValue.renderedValue !== null) {
                    if ((fieldAndValue.field as FieldUI).uiType === UIType.Comments) {
                        const comments: any[] = result.fieldValues[field.key].comments;
                        comments.forEach((comment, idx) => {
                            const rcomment = fieldAndValue.renderedValue.comments.find((renderedComment: any) => renderedComment.id === comment.id);
                            result.fieldValues[field.key].comments[idx].renderedBody = rcomment.body;

                        });
                    } else {
                        result.fieldValues[`${field.key}.rendered`] = fieldAndValue.renderedValue;
                    }
                }
                if (fieldAndValue.selectOptions) {
                    result.selectFieldOptions[field.key] = fieldAndValue.selectOptions;
                }
            }
        });

        result.nonRenderableFields = problemCollector.problems;
        result.hasRequiredNonRenderables = problemCollector.hasRequiredNonRenderables;

        return result;
    }

    private transformField(field: FieldOrFieldMeta, displayOrder: number, project: ProjectIdAndKey, commonFields: string[], requiredAsCommon: boolean, epicFieldInfo: EpicFieldInfo, issueLinkTypes: IssueLinkType[], defaultILAutocomplete: string, inlineSubtaskTypes: IssueType[] = []): FieldAndValue {
        const required: boolean = isFieldMeta(field) ? field.required : false;
        let allowedValues: any[] = isFieldMeta(field) && field.allowedValues ? field.allowedValues : [];
        const schema: FieldSchemaMeta = field.schema!;
        const schemaName: string = this.schemaName(field);
        const autoCompleteUrl: string = this.getAutocompleteUrl(field, defaultILAutocomplete, epicFieldInfo);

        const uiType: UIType = this.uiTypeForField(field);
        switch (uiType) {
            case UIType.Input: {
                const isMulti: boolean = multiLineStringSchemas.includes(schemaName);
                const renderedValue = (isMulti && field.renderedValue) ? field.renderedValue : undefined;
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Input,
                        displayOrder: displayOrder,
                        valueType: this.valueTypeForField(field),
                        isMultiline: isMulti,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field), renderedValue: renderedValue
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
                        displayOrder: displayOrder,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field)
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
                        displayOrder: displayOrder,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field)
                };
            }
            case UIType.Date: {
                const renderedValue = (field.renderedValue) ? field.renderedValue : undefined;
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Date,
                        valueType: this.valueTypeForField(field),
                        displayOrder: displayOrder,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field), renderedValue: renderedValue
                };
            }
            case UIType.DateTime: {
                const renderedValue = (field.renderedValue) ? field.renderedValue : undefined;
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.DateTime,
                        valueType: this.valueTypeForField(field),
                        displayOrder: displayOrder,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field), renderedValue: renderedValue
                };
            }
            case UIType.Select: {
                const vt = this.valueTypeForField(field);
                if (vt === ValueType.Version) {
                    let unreleasedOpts = allowedValues.filter(opt => { return !opt.released && !opt.archived; });
                    let releasedOpts = allowedValues.filter(opt => { return opt.released && !opt.archived; });

                    allowedValues = [
                        { label: 'Unreleased Versions', options: unreleasedOpts }
                        , { label: 'Released Versions', options: releasedOpts }
                    ];
                }

                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Select,
                        allowedValues: [],
                        isMulti: multiSelectSchemas.includes(schemaName),
                        isCascading: (schema.custom === 'com.atlassian.jira.plugin.system.customfieldtypes:cascadingselect') ? true : false,
                        isCreateable: createableSelectSchemas.includes(schemaName),
                        autoCompleteUrl: autoCompleteUrl,
                        createUrl: this.createUrlForField(field),
                        valueType: vt,
                        displayOrder: displayOrder,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field), selectOptions: allowedValues
                };
            }
            case UIType.IssueLinks: {
                const linkTypeOptions: IssueLinkTypeSelectOption[] = [];

                issueLinkTypes.forEach(opt => {
                    linkTypeOptions.push({ ...opt, name: opt.inward, type: 'inward' });
                    linkTypeOptions.push({ ...opt, name: opt.outward, type: 'outward' });
                });

                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.IssueLinks,
                        autoCompleteUrl: autoCompleteUrl,
                        createUrl: this.createUrlForField(field),
                        allowedValues: [],
                        isCreateable: createableSelectSchemas.includes(schemaName),
                        isMulti: multiSelectSchemas.includes(schemaName),
                        valueType: this.valueTypeForField(field),
                        displayOrder: displayOrder,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field), selectOptions: linkTypeOptions
                };
            }
            case UIType.Subtasks: {

                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Subtasks,
                        createUrl: this.createUrlForField(field),
                        allowedValues: [],
                        valueType: this.valueTypeForField(field),
                        displayOrder: displayOrder,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field), selectOptions: inlineSubtaskTypes
                };
            }
            case UIType.IssueLink: {
                // Note: this is used for parent links for sub-tasks
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.IssueLink,
                        autoCompleteUrl: "",
                        createUrl: this.createUrlForField(field),
                        allowedValues: [],
                        isCreateable: false,
                        isMulti: false,
                        valueType: this.valueTypeForField(field),
                        displayOrder: displayOrder,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field)
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
                        displayOrder: displayOrder,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field)
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
                        displayOrder: displayOrder,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field)
                };
            }
            case UIType.Comments: {
                const renderedValue = (field.renderedValue) ? field.renderedValue : field.currentValue;
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Comments,
                        valueType: this.valueTypeForField(field),
                        displayOrder: displayOrder,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field), renderedValue: renderedValue
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
                        displayOrder: displayOrder,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field)
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
                        displayOrder: displayOrder,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field)
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
                        displayOrder: displayOrder,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field)
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
                        displayOrder: displayOrder,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field)
                };
            }
            case UIType.Participants: {
                return {
                    field: {
                        required: required,
                        name: field.name,
                        key: field.key,
                        uiType: UIType.Participants,
                        valueType: this.valueTypeForField(field),
                        displayOrder: displayOrder,
                        advanced: this.isAdvanced(field, commonFields, requiredAsCommon)
                    }, value: this.formatCurrentValue(field)
                };
            }
        }
    }

    private getAutocompleteUrl(field: FieldOrFieldMeta, defaultILAutocomplete: string, epicFieldInfo: EpicFieldInfo): string {
        let acUrl = '';

        if (field.schema) {
            let schemaType: string = field.schema.type === 'array' ? field.schema.items! : field.schema.type;

            if (isFieldMeta(field) && field.autoCompleteUrl) {
                acUrl = field.autoCompleteUrl;
            } else if (schemaType === ValueType.IssueLinks) {
                acUrl = defaultILAutocomplete;
            } else if (schemaType === ValueType.Group) {
                // NOTE: this *should be* /groups/picker?query= but that's not OAUth 2 enabled  :(
                acUrl = `${this._site.baseApiUrl}/api/${API_VERSION}/jql/autocompletedata/suggestions?fieldName=${field.name}&fieldValue=`;
            }

            //we need to fix up bad autocomplete urls from jira
            if (acUrl.includes('suggest?') || field.key === epicFieldInfo.epicLink.id || this.schemaName(field) === 'com.pyxis.greenhopper.jira:gh-sprint') {
                acUrl = `${this._site.baseApiUrl}/api/${API_VERSION}/jql/autocompletedata/suggestions?fieldName=${field.name}&fieldValue=`;
            }

            if (acUrl.includes('/1.0/users/picker')) {
                acUrl = `${this._site.baseApiUrl}/api/${API_VERSION}/user/search?query=`;
            }
        }

        return acUrl;
    }

    private formatCurrentValue(field: FieldOrFieldMeta): any {
        if (field.currentValue) {
            const vt = this.valueTypeForField(field);

            switch (vt) {
                case ValueType.IssueLinks: {
                    return (this.schemaName(field) === 'issuelinks') ? readMinimalIssueLinks(field.currentValue, this._site) : readIssueLinkIssues(field.currentValue, this._site);
                }
                case ValueType.IssueLink: {
                    return readIssueLinkIssue(field.currentValue, this._site);
                }
                case ValueType.Watches: {
                    return readWatches(field.currentValue);
                }
                case ValueType.Votes: {
                    return readVotes(field.currentValue);
                }
            }

            if (this.schemaName(field) === 'com.pyxis.greenhopper.jira:gh-sprint') {
                const id = sprintIdRegex.exec(field.currentValue);
                const name = sprintNameRegex.exec(field.currentValue);

                if (id && name) {
                    return {
                        label: name[1],
                        value: id[1],
                    };
                } else {
                    return undefined;
                }
            }

            return field.currentValue;
        }

        return undefined;
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

            if (schemaTypeToUIMap.has(schemaType) || customSchemaToUIMap.has(schemaName) || schemaOptionToUIMap.has(schemaName)) {
                hasKnownType = true;
                if (schemaType === ValueType.Option && !schemaOptionToUIMap.has(schemaName)) {
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
            if (!requiredAsCommon || (requiredAsCommon && (isFieldMeta(field) && !field.required))) {
                advanced = true;
            }
        }

        return advanced;
    }

    private uiTypeForField(field: FieldOrFieldMeta): UIType {
        const schemaName = this.schemaName(field);
        let foundType: UIType | undefined = undefined;

        if (field.schema && field.schema.items && field.schema.items === ValueType.IssueLinks) {
            foundType = (schemaName === 'subtasks') ? UIType.Subtasks : UIType.IssueLinks;
        }

        if (!foundType && schemaName === 'parent') {
            foundType = UIType.IssueLink;
        }

        if (!foundType && isFieldMeta(field)) {

            foundType = customSchemaToUIMap.get(schemaName);

            if (!foundType && (field.schema.type === ValueType.Option || (field.schema.type === 'array' && field.schema.items === ValueType.Option))) {
                foundType = schemaOptionToUIMap.get(schemaName);
            }

            if (!foundType) {
                foundType = schemaTypeToUIMap.get(field.schema.type);
            }

        } else if (!foundType && isField(field)) {
            foundType = UIType.NonEditable;
        } else if (!foundType) {
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

        if (schemaName === 'com.pyxis.greenhopper.jira:gh-sprint') {
            return ValueType.Number;
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
            case 'components': return `${this._site.baseApiUrl}/api/${API_VERSION}/component`;
            case 'fixVersions': return `${this._site.baseApiUrl}/api/${API_VERSION}/version`;
            case 'versions': return `${this._site.baseApiUrl}/api/${API_VERSION}/version`;
            case 'subtasks': return `${this._site.baseApiUrl}/api/${API_VERSION}/issue`;
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