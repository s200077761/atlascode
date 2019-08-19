import { IssueLinkType } from "./entities";

export enum UIType {
    Select = 'select',
    Checkbox = 'checkbox',
    Radio = 'radio',
    Input = 'input',
    Date = 'date',
    DateTime = 'datetime',
    IssueLinks = 'issuelinks',
    IssueLink = 'issuelink',
    Subtasks = 'subtasks',
    Timetracking = 'timetracking',
    Worklog = 'worklog',
    Comments = 'comments',
    Watches = 'watches',
    Votes = 'votes',
    Attachment = 'attachment',
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
    Transition = 'transition', // array of transitions
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
    IssueLink = 'issuelink', // used for subtask parent link
    Component = 'component', // mutli-select, {id, name}
    Worklog = 'worklog',
    Attachment = 'attachment',
}

// Note: Typescript doesn't include reverse mappings for string enums, so we need this method.
// see: https://mariusschulz.com/blog/string-enums-in-typescript#no-reverse-mapping-for-string-valued-enum-members
export function valueTypeForString(s: string): ValueType {
    switch (s) {
        case 'string': return ValueType.String;
        case 'number': return ValueType.Number;
        case 'url': return ValueType.Url;
        case 'datetime': return ValueType.DateTime;
        case 'option': return ValueType.Option;
        case 'option-with-child': return ValueType.OptionWithChild;
        case 'resolution': return ValueType.Resolution;
        case 'priority': return ValueType.Priority;
        case 'user': return ValueType.User;
        case 'status': return ValueType.Status;
        case 'progress': return ValueType.Progress;
        case 'date': return ValueType.Date;
        case 'votes': return ValueType.Votes;
        case 'issuetype': return ValueType.IssueType;
        case 'project': return ValueType.Project;
        case 'watches': return ValueType.Watches;
        case 'timetracking': return ValueType.Timetracking;
        case 'comments-page': return ValueType.CommentsPage;
        case 'version': return ValueType.Version;
        case 'issuelinks': return ValueType.IssueLinks;
        case 'issuelink': return ValueType.IssueLink;
        case 'component': return ValueType.Component;
        case 'worklog': return ValueType.Worklog;
        case 'attachment': return ValueType.Attachment;
        case 'transition': return ValueType.Transition;
        default: return ValueType.String;
    }
}

export interface FieldUI {
    required: boolean;
    name: string;
    key: string;
    uiType: UIType;
    advanced: boolean;
    valueType: ValueType;
    displayOrder: number;
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

export interface CreatableFieldUI extends OptionableFieldUI {
    createUrl: string;
}

export interface SelectFieldUI extends CreatableFieldUI {
    isMulti: boolean;
    isCascading: boolean;
    isCreateable: boolean;
    autoCompleteUrl: string;
    autoCompleteJql: string;
}

export function isSelectFieldUI(f: FieldUI): f is SelectFieldUI {
    return f && (<SelectFieldUI>f).isMulti !== undefined
        && (<SelectFieldUI>f).isCascading !== undefined
        && (<SelectFieldUI>f).isCreateable !== undefined
        && (<SelectFieldUI>f).autoCompleteUrl !== undefined
        && (<SelectFieldUI>f).autoCompleteJql !== undefined;
}

export type FieldUIs = { [key: string]: FieldUI };

export type FieldValues = { [key: string]: any };
export type SelectFieldOptions = { [key: string]: any[] };

export interface FieldTransformerResult {
    fields: FieldUIs;
    fieldValues: FieldValues;
    selectFieldOptions: SelectFieldOptions;
    nonRenderableFields: FieldProblem[];
    hasRequiredNonRenderables: boolean;
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
    , 'subtasks'
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
        , [ValueType.IssueLinks, UIType.IssueLinks]
        , [ValueType.IssueLink, UIType.IssueLink]
        , [ValueType.Component, UIType.Select] // mutli-select, {id, name}
        , [ValueType.Worklog, UIType.Worklog]
        , [ValueType.Attachment, UIType.Attachment]
        , [ValueType.Status, UIType.NonEditable]
        , [ValueType.Transition, UIType.Select]
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

export interface IssueLinkTypeSelectOption extends IssueLinkType {
    name: string;
    type: 'inward' | 'outward';
}

