export enum UIType {
    Select = 'select',
    Checkbox = 'checkbox',
    Radio = 'radio',
    Input = 'input',
    Date = 'date',
    DateTime = 'datetime',
    IssueLink = 'issuelink',
    Timetracking = 'timetracking',
    Worklog = 'worklog',
    Comments = 'comments',
    Watches = 'watches',
    Votes = 'votes',
    NonEditable = 'noneditable'
}

export enum ValueType {
    String = 'string',
    Number = 'number',
    Url = 'url',
    DateTime = 'datetime',
    Option = 'option', // as type: single select or radio, as array items: multi-select or checkboxes (also check schema), {id, value}
    OptionWithChild = 'option-with-child', // cascading select, {id, value, children[{id, value}]}
    Resolution = 'resolution', // single select, {id, name}
    Priority = 'priority', // single select, {id, name, iconUrl}
    User = 'user', // single select, {key, accountId, accountType, name, emailAddress, avatarUrls{'48x48'...}, displayName, active, timeZone, locale}
    Status = 'status', // {description, iconUrl, name, id, statusCategory{id, key, colorName, name}}
    Progress = 'progress', //part of time tracking methinks
    Date = 'date',
    Votes = 'votes', // for display: {votes:number, hasVoted:boolean}, not sure yet for edit
    IssueType = 'issuetype', // single select, {id, description, iconUrl, name, subtask:boolean, avatarId}
    Project = 'project', //single select, { id, key, name, projectTypeKey, simplified:boolean, avatarUrls{ '48x48'... }}
    Watches = 'watches', // mutli-user picker for edit, for display: {watchCount:number, isWatching:boolean, self:url } delf contains url to get the user details for watchers
    Timetracking = 'timetracking', //timetracking UI
    CommentsPage = 'comments-page', // textarea, system schema will be 'comment'
    Version = 'version', // multi-select, {id, name, archived:boolean, released:boolean}
    // issuelinks: multi-issue picker {id, type:{id,name,inward,outward}, outwardIssue:{id, key,fields:{summary, status:{}, priority:{}, issueType:{}}}}
    // subtasks (issuelinks type) {id, key,fields:{summary, status:{}, priority:{}, issueType:{}}}
    IssueLinks = 'issuelinks',
    Component = 'component', // mutli-select, {id, name}
    Worklog = 'worklog',
    Attachment = 'attachment',
}

export interface FieldUI {
    required: boolean;
    name: string;
    key: string;
    uiType: UIType;
    advanced: boolean;
    valueType: ValueType;
    initialValue: any;
}

export interface NonEditableFieldUI extends FieldUI {
    isList: boolean;
}

export interface InputFieldUI extends FieldUI {
    isMultiline: boolean;
}

export interface OptionableFieldUI extends FieldUI {
    allowedValues: any[];
}
export interface SelectFieldUI extends OptionableFieldUI {
    isMulti: boolean;
    isCascading: boolean;
    isCreateable: boolean;
    autoCompleteUrl: string;
    autoCompleteJql: string;
}

export interface IssueLinksUI extends SelectFieldUI {
    isSubtasks: boolean;
}

export interface FieldTransformerResult {
    fields: FieldUI[];
    nonRenderableFields: FieldProblem[];
    hasRequireNonRenderables: boolean;
}

export interface FieldProblem {
    key: string;
    name: string;
    required: boolean;
    message: string;
    schema: string;
}

export const multiSelectSchemas: string[] = [
    'components'
    , 'fixVersions'
    , 'labels'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:labels'
    , 'versions'
    , 'issuelinks'
    , 'subtasks'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:multiselect'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:multiuserpicker'
];

export const createableSelectSchemas: string[] = [
    'components'
    , 'fixVersions'
    , 'labels'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:labels'
    , 'versions'
];

export const multiLineStringSchemas: string[] = [
    'description'
    , 'environment'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:textarea'
];

export const schemaTypeToUIMap: Map<string, UIType> = new Map<string, UIType>(
    [[ValueType.DateTime, UIType.DateTime]
        , [ValueType.String, UIType.Input]
        //'option-with-child', // cascading select, {id, value, children[{id, value}]}
        , ['array', UIType.Select]// multi-select, inspect items prop for element type
        , [ValueType.Resolution, UIType.Select] // single select, {id, name}
        , [ValueType.Priority, UIType.Select] // single select, {id, name, iconUrl}
        , [ValueType.Number, UIType.Input]
        , [ValueType.User, UIType.Select]// single select, {key, accountId, accountType, name, emailAddress, avatarUrls{'48x48'...}, displayName, active, timeZone, locale}
        //'progress', //part of time tracking methinks
        , [ValueType.Date, UIType.Date]
        , [ValueType.Votes, UIType.Votes]// for display: {votes:number, hasVoted:boolean}, not sure yet for edit
        , [ValueType.IssueType, UIType.Select]// single select, {id, description, iconUrl, name, subtask:boolean, avatarId}
        , [ValueType.Project, UIType.Select]//single select, { id, key, name, projectTypeKey, simplified:boolean, avatarUrls{ '48x48'... }}
        , [ValueType.Watches, UIType.Watches]// mutli-user picker for edit, for display: {watchCount:number, isWatching:boolean, self:url } delf contains url to get the user details for watchers
        , [ValueType.Timetracking, UIType.Timetracking]//timetracking UI
        , [ValueType.CommentsPage, UIType.Comments] // textarea, system schema will be 'comment'
        // the following are usually array items
        , [ValueType.Version, UIType.Select]// multi-select, {id, name, archived:boolean, released:boolean}
        // issuelinks: multi-issue picker {id, type:{id,name,inward,outward}, outwardIssue:{id, key,fields:{summary, status:{}, priority:{}, issueType:{}}}}
        // subtasks (issuelinks type) {id, key,fields:{summary, status:{}, priority:{}, issueType:{}}}
        , [ValueType.IssueLinks, UIType.IssueLink]
        , [ValueType.Component, UIType.Select] // mutli-select, {id, name}
        , [ValueType.Worklog, UIType.Worklog]
        //,['attachment',]
    ]
);

export const schemaOptionToUIMap: Map<string, UIType> = new Map<string, UIType>(
    [['com.atlassian.jira.plugin.system.customfieldtypes:select', UIType.Select]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:multiselect', UIType.Select]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:multicheckboxes', UIType.Checkbox]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:radiobuttons', UIType.Radio]
    ]
);

export const customSchemaToUIMap: Map<string, UIType> = new Map<string, UIType>(
    [['com.pyxis.greenhopper.jira:gh-epic-link', UIType.Select]
        , ['com.pyxis.greenhopper.jira:gh-epic-label', UIType.Input]
    ]
);

