import { Logger } from "../logger";

    const defaultFieldFilters:string[] = ['issuetype','project','reporter'];

    const commonFields:string[] = [
        'summary'
        ,'description'
        ,'fixVersions'
        ,'components'
        ,'labels'
    ];

    const knownSystemSchemas:string[] = [
        'summary'
        ,'issuetype'
        ,'components'
        ,'description'
        ,'project'
        ,'reporter'
        ,'fixVersions'
        ,'priority'
        ,'resolution'
        ,'labels'
        //,'timetracking'
        ,'environment'
        //,'attachment'
        ,'versions'
        ,'duedate'
        ,'issuelinks'
        //,'worklog'
        ,'assignee'
    ];
    
    const knownCustomSchemas:string[] = [
        'com.atlassian.jira.plugin.system.customfieldtypes:cascadingselect'
        ,'com.atlassian.jira.plugin.system.customfieldtypes:multiselect'
        ,'com.atlassian.jira.plugin.system.customfieldtypes:select'
        ,'com.atlassian.jira.plugin.system.customfieldtypes:textarea'
        ,'com.atlassian.jira.plugin.system.customfieldtypes:textfield'
        ,'com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes'
        ,'com.atlassian.jira.plugin.system.customfieldtypes:url'
        ,'com.atlassian.jira.plugin.system.customfieldtypes:datepicker'
        ,'com.atlassian.jira.plugin.system.customfieldtypes:userpicker'
        ,'com.atlassian.jira.plugin.system.customfieldtypes:multiuserpicker'
        ,'com.atlassian.jira.plugin.system.customfieldtypes:datetime'
        ,'com.atlassian.jira.plugin.system.customfieldtypes:labels'
        ,'com.atlassian.jira.plugin.system.customfieldtypes:float'
        ,'com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons'
    ];

    const multiSelectSchemas:string[] = [
        'components'
        ,'fixVersions'
        ,'labels'
        ,'versions'
        ,'issuelinks'
        ,'com.atlassian.jira.plugin.system.customfieldtypes:multiselect'
    ];

    const createableSelectSchemas:string[] = [
        'components'
        ,'fixVersions'
        ,'labels'
        ,'versions'
    ];

    export enum UIType {
        Select = 'select',
        Checkbox = 'checkbox',
        Radio = 'radio',
        Textarea = 'textarea',
        Input = 'input',
        Date = 'date',
        DateTime = 'datetime',
        User = 'user'
    }
    
    export enum InputValueType {
        String = 'string',
        Number = 'number',
        Url = 'url'
    }
    
    const schemaToUIMap:Map<string,UIType> = new Map<string,UIType>(
        [['summary',UIType.Input]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:textfield',UIType.Input]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:float',UIType.Input]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:url',UIType.Input]
        ,['description',UIType.Textarea]
        ,['environment',UIType.Textarea]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:textarea',UIType.Textarea]
        ,['issuetype',UIType.Select]
        ,['components',UIType.Select]
        ,['project',UIType.Select]
        ,['fixVersions',UIType.Select]
        ,['priority',UIType.Select]
        ,['resolution',UIType.Select]
        ,['labels',UIType.Select]
        ,['versions',UIType.Select]
        ,['issuelinks',UIType.Select]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:cascadingselect',UIType.Select]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:multiselect',UIType.Select]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:select',UIType.Select]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:labels',UIType.Select]
        ,['reporter',UIType.User]
        ,['assignee',UIType.User]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:userpicker',UIType.User]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:multiuserpicker',UIType.User]
        ,['duedate',UIType.Date]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:datepicker',UIType.Date]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:datetime',UIType.DateTime]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes',UIType.Checkbox]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons',UIType.Radio]
    ]
    );

    const schemaToInputValueMap:Map<string,InputValueType> = new Map<string,InputValueType>(
        [['summary',InputValueType.String]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:textfield',InputValueType.String]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:float',InputValueType.Number]
        ,['com.atlassian.jira.plugin.system.customfieldtypes:url',InputValueType.Url]
    ]
    );

    export interface ScreenField {
        required:boolean;
        name:string;
        key:string;
        uiType:UIType;
    
    }
    
    export interface InputScreenField extends ScreenField {
        valueType:InputValueType;
    }
    
    export interface OptionableScreenField extends ScreenField {
        allowedValues:any[];
    }

    export interface UserScreenField extends ScreenField {
        isMulti:boolean;
    }
    
    export interface SelectScreenField extends OptionableScreenField {
        isMulti:boolean;
        isCascading:boolean;
        isCreateable:boolean;
        autoCompleteUrl:string;
    }
    
    export interface IssueTypeScreen {
        name:string;
        id:string;
        iconUrl:string;
        fields:ScreenField[];
    }
    
    export type IssueTypeIdScreens = {[k:string]:IssueTypeScreen};

    
    export function transformIssueScreens(project:JIRA.Schema.CreateMetaProjectBean
        ,filterFieldKeys:string[] = defaultFieldFilters
        ,onlyCommonAndRequired:boolean = true):{selectedIssueType:JIRA.Schema.CreateMetaIssueTypeBean, screens:IssueTypeIdScreens} {

        const issueTypeIdScreens = {};
        let firstIssueType = {};

        if(project.issuetypes) {
            firstIssueType = project.issuetypes[0];
            // get rid of issue types we can't render
            const renderableIssueTypes = project.issuetypes.filter(itype => {
                return (itype.fields !== undefined && allFieldsAreRenderable(itype.fields, filterFieldKeys, onlyCommonAndRequired));
            });

            renderableIssueTypes.forEach(issueType => {
                let issueTypeScreen:IssueTypeScreen = {
                    name:issueType.name!,
                    id:issueType.id!,
                    iconUrl:(issueType.iconUrl !== undefined) ? issueType.iconUrl : '',
                    fields:[]
                };

                if(issueType.fields) {
                    Object.keys(issueType.fields!).forEach(k => {
                        const field:JIRA.Schema.FieldMetaBean = issueType.fields![k];
                        if(field && !shouldFilter(field,filterFieldKeys,onlyCommonAndRequired)) {
                            issueTypeScreen.fields.push(transformField(field));
                        }
                    });
                }

                issueTypeIdScreens[issueType.id!] = issueTypeScreen;
            });

            if(!renderableIssueTypes.includes(firstIssueType) && renderableIssueTypes.length > 0) {
                firstIssueType = renderableIssueTypes[0];
            }
        }

        return {selectedIssueType:firstIssueType, screens:issueTypeIdScreens};
    }

    function shouldFilter(field:JIRA.Schema.FieldMetaBean, filters:string[], onlyCommonAndRequired:boolean):boolean {
        if(filters.includes(field.key)) {
            return true;
        }

        if(onlyCommonAndRequired) {
            if(!field.required && !commonFields.includes(field.key)) {
                return true;
            }
        }

        return false;
    }

    function transformField(field:JIRA.Schema.FieldMetaBean):any {
        switch (uiTypeForField(field.schema)) {
            case UIType.Input: {
                return {
                    required:field.required,
                    name:field.name,
                    key:field.key,
                    uiType:UIType.Input,
                    valueType: inputValueTypeForField(field.schema)
                };
            }
            case UIType.Textarea: {
                return {
                    required:field.required,
                    name:field.name,
                    key:field.key,
                    uiType:UIType.Textarea
                };
            }
            case UIType.Checkbox:
            case UIType.Radio: {
                return {
                    required:field.required,
                    name:field.name,
                    key:field.key,
                    uiType:UIType.Input,
                    allowedValues:(field.allowedValues !== undefined) ? field.allowedValues : []
                };
            }
            case UIType.Date: {
                return {
                    required:field.required,
                    name:field.name,
                    key:field.key,
                    uiType:UIType.Date,
                };
            }
            case UIType.DateTime: {
                return {
                    required:field.required,
                    name:field.name,
                    key:field.key,
                    uiType:UIType.DateTime,
                };
            }
            case UIType.User: {
                return {
                    required:field.required,
                    name:field.name,
                    key:field.key,
                    uiType:UIType.User,
                    isMulti:(field.schema && field.schema.custom === 'com.atlassian.jira.plugin.system.customfieldtypes:multiuserpicker') ? true : false
                };
            }
            case UIType.Select: {
                return {
                    required:field.required,
                    name:field.name,
                    key:field.key,
                    uiType:UIType.Select,
                    allowedValues:(field.allowedValues !== undefined) ? field.allowedValues : [],
                    isMulti:isMultiSelect(field.schema),
                    isCascading:(field.schema.custom === 'com.atlassian.jira.plugin.system.customfieldtypes:cascadingselect') ? true : false,
                    isCreateable:(field.schema.system && createableSelectSchemas.includes(field.schema.system)),
                    autoCompleteUrl:(field.autoCompleteUrl !== undefined) ? field.autoCompleteUrl : '',
                };
            }
        }
    }

    function isMultiSelect(schema:{type:string,system?:string,custom?:string}):boolean {
        if(
            (schema.system && multiSelectSchemas.includes(schema.system))
            ||(schema.custom && multiSelectSchemas.includes(schema.custom))) {
            return true;
        }

        return false;
    }

    function uiTypeForField(schema:{type:string,system?:string,custom?:string}):UIType {
        Logger.debug(`looking for ui type`,schema);
        if(schema.system && schemaToUIMap.has(schema.system)) {
            return schemaToUIMap.get(schema.system)!;
        }

        if(schema.custom && schemaToUIMap.has(schema.custom)) {
            return schemaToUIMap.get(schema.custom)!;
        }

        Logger.debug('returning default uiType');
        return UIType.Input;
    }

    function inputValueTypeForField(schema:{type:string,system?:string,custom?:string}):InputValueType {
        if(schema.system && schemaToInputValueMap.has(schema.system)) {
            return schemaToInputValueMap.get(schema.system)!;
        }

        if(schema.custom && schemaToInputValueMap.has(schema.custom)) {
            return schemaToInputValueMap.get(schema.custom)!;
        }

        return InputValueType.String;
    }

    function allFieldsAreRenderable(fields:{[k:string]:JIRA.Schema.FieldMetaBean}, filters:string[], onlyCommonAndRequired:boolean):boolean {
        for(var k in fields) {
            let field = fields[k];
            if( !shouldFilter(field, filters, onlyCommonAndRequired)
                && ((field.schema.system !== undefined && !knownSystemSchemas.includes(field.schema.system))
                ||(field.schema.custom !== undefined && !knownCustomSchemas.includes(field.schema.custom)))
            ){
                Logger.debug('system/custom check: cannot render field', field);
                return false;
            }
        }

        return true;
    }
