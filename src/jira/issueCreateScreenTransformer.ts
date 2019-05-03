import { UIType, InputValueType, IssueTypeIdScreens, IssueTypeScreen } from "./createIssueMeta";
import { AccessibleResource } from "../atlclients/authInfo";
import { Container } from "../container";
import { EpicFieldInfo } from "./jiraIssue";

const defaultFieldFilters: string[] = ['issuetype', 'project', 'reporter'];

const defaultCommonFields: string[] = [
    'summary'
    , 'description'
    , 'fixVersions'
    , 'components'
    , 'labels'
];

const knownSystemSchemas: string[] = [
    'summary'
    , 'issuetype'
    , 'components'
    , 'description'
    , 'project'
    , 'reporter'
    , 'fixVersions'
    , 'priority'
    , 'resolution'
    , 'labels'
    //,'timetracking'
    , 'environment'
    //,'attachment'
    , 'versions'
    , 'duedate'
    , 'issuelinks'
    //,'worklog'
    , 'assignee'
];

const knownCustomSchemas: string[] = [
    'com.atlassian.jira.plugin.system.customfieldtypes:multiselect'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:select'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:textarea'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:textfield'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:url'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:datepicker'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:userpicker'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:multiuserpicker'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:datetime'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:labels'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:float'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons'
    , 'com.pyxis.greenhopper.jira:gh-epic-label'
    , 'com.pyxis.greenhopper.jira:gh-epic-link'
    //,'com.atlassian.jira.plugin.system.customfieldtypes:cascadingselect' // TODO: handle cascading selects in UI
];

const multiSelectSchemas: string[] = [
    'components'
    , 'fixVersions'
    , 'labels'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:labels'
    , 'versions'
    , 'issuelinks'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:multiselect'
];

const createableSelectSchemas: string[] = [
    'components'
    , 'fixVersions'
    , 'labels'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:labels'
    , 'versions'
];

const schemaToUIMap: Map<string, UIType> = new Map<string, UIType>(
    [['summary', UIType.Input]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:textfield', UIType.Input]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:float', UIType.Input]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:url', UIType.Input]
        , ['description', UIType.Textarea]
        , ['environment', UIType.Textarea]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:textarea', UIType.Textarea]
        , ['issuetype', UIType.Select]
        , ['components', UIType.Select]
        , ['project', UIType.Select]
        , ['fixVersions', UIType.Select]
        , ['priority', UIType.Select]
        , ['resolution', UIType.Select]
        , ['labels', UIType.Select]
        , ['versions', UIType.Select]
        , ['issuelinks', UIType.IssueLink]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:cascadingselect', UIType.Select]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:multiselect', UIType.Select]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:select', UIType.Select]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:labels', UIType.Select]
        , ['reporter', UIType.User]
        , ['assignee', UIType.User]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:userpicker', UIType.User]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:multiuserpicker', UIType.User]
        , ['duedate', UIType.Date]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:datepicker', UIType.Date]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:datetime', UIType.DateTime]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes', UIType.Checkbox]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons', UIType.Radio]
        , ['com.pyxis.greenhopper.jira:gh-epic-link', UIType.Select]
        , ['com.pyxis.greenhopper.jira:gh-epic-label', UIType.Input]
    ]
);

const schemaToInputValueMap: Map<string, InputValueType> = new Map<string, InputValueType>(
    [['summary', InputValueType.String]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:textfield', InputValueType.String]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:float', InputValueType.Number]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:url', InputValueType.Url]
    ]
);

export interface TransformerResult {
    selectedIssueType: JIRA.Schema.CreateMetaIssueTypeBean;
    screens: IssueTypeIdScreens;
}

export class IssueScreenTransformer {

    private _site: AccessibleResource;
    private _project: JIRA.Schema.CreateMetaProjectBean;
    private _epicFieldInfo: EpicFieldInfo;
    private _issueLinkTypes: any[] = [];

    constructor(site: AccessibleResource, project: JIRA.Schema.CreateMetaProjectBean) {
        this._site = site;
        this._project = project;
    }

    public async transformIssueScreens(filterFieldKeys: string[] = defaultFieldFilters
        , onlyCommonAndRequired: boolean = true): Promise<TransformerResult> {

        const issueTypeIdScreens = {};
        let firstIssueType = {};

        if (!this._epicFieldInfo) {
            this._epicFieldInfo = await Container.jiraFieldManager.getEpicFieldsForSite(this._site);
        }

        let client = await Container.clientManager.jirarequest(this._site);

        if (client) {
            // grab the issue link types
            const issuelinkTypesResponse = await client.issueLinkType.getIssueLinkTypes({});
            if (Array.isArray(issuelinkTypesResponse.data.issueLinkTypes) && issuelinkTypesResponse.data.issueLinkTypes.length > 0) {
                this._issueLinkTypes = issuelinkTypesResponse.data.issueLinkTypes!;
            } else {
                filterFieldKeys.push('issuelinks');
            }
        }

        if (this._project.issuetypes) {
            firstIssueType = this._project.issuetypes[0];
            // get rid of issue types we can't render
            const renderableIssueTypes = this._project.issuetypes.filter(itype => {
                return (itype.fields !== undefined && this.allFieldsAreRenderable(itype.fields, filterFieldKeys, onlyCommonAndRequired));
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
                        if (field && !this.shouldFilter(field, issueTypeFieldFilters, onlyCommonAndRequired)) {
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

        return { selectedIssueType: firstIssueType, screens: issueTypeIdScreens };
    }

    private shouldFilter(field: JIRA.Schema.FieldMetaBean, filters: string[], onlyCommonAndRequired: boolean): boolean {
        if (filters.includes(field.key)) {
            return true;
        }

        const commonFields = [...defaultCommonFields, this._epicFieldInfo.epicName.id];
        if (onlyCommonAndRequired) {
            if (!field.required && !commonFields.includes(field.key)) {
                return true;
            }
        } else {
            if (!field.required && ((field.schema.system !== undefined && !knownSystemSchemas.includes(field.schema.system))
                || (field.schema.custom !== undefined && !knownCustomSchemas.includes(field.schema.custom)))) {
                return true;
            }
        }

        return false;
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
                    autoCompleteJql = `project = "${this._project.key}" and cf[${this._epicFieldInfo.epicName.cfid}] != ""  and resolution = Unresolved and statusCategory != Done`;
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
        }
    }

    private isAdvanced(field: JIRA.Schema.FieldMetaBean): boolean {
        const commonFields = [...defaultCommonFields, this._epicFieldInfo.epicName.id];
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

    private allFieldsAreRenderable(fields: { [k: string]: JIRA.Schema.FieldMetaBean }, filters: string[], onlyCommonAndRequired: boolean): boolean {
        for (var k in fields) {
            let field = fields[k];
            if (!this.shouldFilter(field, filters, onlyCommonAndRequired)
                && ((field.schema.system !== undefined && !knownSystemSchemas.includes(field.schema.system))
                    || (field.schema.custom !== undefined && !knownCustomSchemas.includes(field.schema.custom)))
            ) {
                return false;
            }
        }

        return true;
    }
}