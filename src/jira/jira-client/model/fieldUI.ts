export enum UIType {
    Select = 'select',
    Checkbox = 'checkbox',
    Radio = 'radio',
    Textarea = 'textarea',
    Input = 'input',
    Date = 'date',
    DateTime = 'datetime',
    User = 'user',
    IssueLink = 'issuelink',
    Timetracking = 'timetracking',
    Worklog = 'worklog'
}

export enum InputValueType {
    String = 'string',
    Number = 'number',
    Url = 'url'
}

export interface FieldUI {
    required: boolean;
    name: string;
    key: string;
    uiType: UIType;
    advanced: boolean;
}

export interface InputFieldUI extends FieldUI {
    valueType: InputValueType;
}

export interface OptionableFieldUI extends FieldUI {
    allowedValues: any[];
}

export interface UserFieldUI extends FieldUI {
    isMulti: boolean;
}

export interface SelectFieldUI extends OptionableFieldUI {
    isMulti: boolean;
    isCascading: boolean;
    isCreateable: boolean;
    autoCompleteUrl: string;
    autoCompleteJql: string;
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

export const defaultFieldFilters: string[] = [];

export const knownSystemSchemas: string[] = [
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
    , 'timetracking'
    , 'worklog'
    , 'environment'
    //,'attachment'
    , 'versions'
    , 'duedate'
    , 'issuelinks'
    , 'assignee'
];

export const knownCustomSchemas: string[] = [
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

export const multiSelectSchemas: string[] = [
    'components'
    , 'fixVersions'
    , 'labels'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:labels'
    , 'versions'
    , 'issuelinks'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:multiselect'
];

export const createableSelectSchemas: string[] = [
    'components'
    , 'fixVersions'
    , 'labels'
    , 'com.atlassian.jira.plugin.system.customfieldtypes:labels'
    , 'versions'
];

export const schemaToUIMap: Map<string, UIType> = new Map<string, UIType>(
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
        , ['timetracking', UIType.Timetracking]
        , ['worklog', UIType.Worklog]
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

export const schemaToInputValueMap: Map<string, InputValueType> = new Map<string, InputValueType>(
    [['summary', InputValueType.String]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:textfield', InputValueType.String]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:float', InputValueType.Number]
        , ['com.atlassian.jira.plugin.system.customfieldtypes:url', InputValueType.Url]
    ]
);



