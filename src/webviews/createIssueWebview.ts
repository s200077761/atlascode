import { InitializingWebview } from './abstractWebview';
import { Action, onlineStatus } from '../ipc/messaging';
import { Logger } from '../logger';
import { Container } from '../container';
import { CreateIssueData } from '../ipc/issueMessaging';
import { isScreensForProjects, isCreateIssue, isSetIssueType, CreateIssueAction } from '../ipc/issueActions';
import { commands, Uri, ViewColumn, Position } from 'vscode';
import { Commands } from '../commands';
import { issueCreatedEvent } from '../analytics';
import { ProductJira, DetailedSiteInfo, emptySiteInfo } from '../atlclients/authInfo';
import { BitbucketIssue } from '../bitbucket/model';
import { format } from 'date-fns';
import { fetchCreateIssueUI } from '../jira/fetchIssue';
import { AbstractIssueEditorWebview } from './abstractIssueEditorWebview';
import { ValueType, FieldValues, FieldUIs } from '../jira/jira-client/model/fieldUI';
import { CreateMetaTransformerResult, emptyCreateMetaResult, IssueTypeUI } from '../jira/jira-client/model/editIssueUI';
import { IssueType, Project } from '../jira/jira-client/model/entities';

export interface PartialIssue {
    uri?: Uri;
    position?: Position;
    onCreated?: (data: CommentData | BBData) => void;
    summary?: string;
    description?: string;
    bbIssue?: BitbucketIssue;
}

export interface CommentData {
    uri: Uri;
    position: Position;
    issueKey: string;
}

export interface BBData {
    bbIssue: BitbucketIssue;
    issueKey: string;
}

const createdFromAtlascodeFooter = `\n\n_~Created from~_ [_~Atlassian for VS Code~_|https://marketplace.visualstudio.com/items?itemName=Atlassian.atlascode]`;

export class CreateIssueWebview extends AbstractIssueEditorWebview implements InitializingWebview<PartialIssue | undefined> {
    private _partialIssue: PartialIssue | undefined;
    private _currentProject: Project | undefined;
    private _screenData: CreateMetaTransformerResult;
    private _selectedIssueTypeId: string;
    private _relatedBBIssue: BitbucketIssue | undefined;
    private _siteDetails: DetailedSiteInfo;

    constructor(extensionPath: string) {
        super(extensionPath);
        this._screenData = emptyCreateMetaResult;
        this._siteDetails = emptySiteInfo;
    }

    public get title(): string {
        return "Create JIRA Issue";
    }
    public get id(): string {
        return "atlascodeCreateIssueScreen";
    }

    public get siteOrUndefined(): DetailedSiteInfo | undefined {
        return this._siteDetails;
    }

    protected onPanelDisposed() {
        this.reset();
        super.onPanelDisposed();
    }

    private reset() {
        this._screenData = emptyCreateMetaResult;
        this._siteDetails = emptySiteInfo;
    }

    async createOrShow(column?: ViewColumn, data?: PartialIssue): Promise<void> {
        await super.createOrShow(column);

        this.initialize(data);
    }

    async initialize(data?: PartialIssue) {
        this._partialIssue = data;
        this._siteDetails = Container.siteManager.effectiveSite(ProductJira);

        if (!Container.onlineDetector.isOnline()) {
            this.postMessage(onlineStatus(false));
            return;
        }

        if (data) {
            this._screenData = emptyCreateMetaResult;
            if (data.bbIssue) {
                this._relatedBBIssue = data.bbIssue;
            }
        } else {
            this._partialIssue = {};
        }

        this.invalidate();
    }

    public async invalidate() {
        if (Container.onlineDetector.isOnline()) {
            await this.updateFields();
        } else {
            this.postMessage(onlineStatus(false));
        }

        Container.pmfStats.touchActivity();
    }

    async handleSelectOptionCreated(fieldKey: string, newValue: any): Promise<void> {
        const issueTypeUI: IssueTypeUI = this._screenData.issueTypeUIs[this._selectedIssueTypeId];

        if (!Array.isArray(issueTypeUI.fieldValues[fieldKey])) {
            issueTypeUI.fieldValues[fieldKey] = [];
        }

        if (!Array.isArray(issueTypeUI.selectFieldOptions[fieldKey])) {
            issueTypeUI.selectFieldOptions[fieldKey] = [];
        }

        if (issueTypeUI.fields[fieldKey].valueType === ValueType.Version) {
            if (issueTypeUI.selectFieldOptions[fieldKey][0].options) {
                issueTypeUI.selectFieldOptions[fieldKey][0].options.push(newValue);
            }
        } else {
            issueTypeUI.selectFieldOptions[fieldKey].push(newValue);
            issueTypeUI.selectFieldOptions[fieldKey] = issueTypeUI.selectFieldOptions[fieldKey].sort();
        }

        issueTypeUI.fieldValues[fieldKey].push(newValue);

        this._screenData.issueTypeUIs[this._selectedIssueTypeId] = issueTypeUI;

        let optionMessage = {
            type: 'optionCreated',
            fieldValues: { [fieldKey]: issueTypeUI.fieldValues[fieldKey] },
            selectFieldOptions: { [fieldKey]: issueTypeUI.selectFieldOptions[fieldKey] },
            fieldKey: fieldKey
        };

        this.postMessage(optionMessage);
    }

    async updateFields() {
        // only update if we don't have data.
        // e.g. the user may have started editing.
        if (Object.keys(this._screenData.issueTypeUIs).length < 1) {
            this.forceUpdateFields();
        }
    }

    async forceUpdateFields(project?: Project, fieldValues?: FieldValues) {
        if (this.isRefeshing) {
            return;
        }

        this.isRefeshing = true;
        try {

            let effProject = project;

            if (!effProject) {
                effProject = await Container.jiraProjectManager.getEffectiveProject(this._siteDetails);
            }

            const availableProjects = await Container.jiraProjectManager.getProjects();

            if (effProject && effProject !== this._currentProject) {
                this._currentProject = effProject;
            }

            this._selectedIssueTypeId = '';
            this._screenData = await fetchCreateIssueUI(this._siteDetails, this._currentProject!.key);
            this._selectedIssueTypeId = this._screenData.selectedIssueType.id;

            if (fieldValues) {
                const overrides = this.getValuesForExisitngKeys(this._screenData.issueTypeUIs[this._selectedIssueTypeId].fields, fieldValues);
                this._screenData.issueTypeUIs[this._selectedIssueTypeId].fieldValues = { ...this._screenData.issueTypeUIs[this._selectedIssueTypeId].fieldValues, ...overrides };
            }

            this._screenData.issueTypeUIs[this._selectedIssueTypeId].fieldValues['project'] = this._currentProject;
            this._screenData.issueTypeUIs[this._selectedIssueTypeId].selectFieldOptions['project'] = availableProjects;

            if (this._partialIssue) {
                const currentVals = this._screenData.issueTypeUIs[this._selectedIssueTypeId].fieldValues;
                const desc = this._partialIssue.description ? this._partialIssue.description + createdFromAtlascodeFooter : createdFromAtlascodeFooter;
                const partialvals = { 'summary': this._partialIssue.summary, 'description': desc };

                this._screenData.issueTypeUIs[this._selectedIssueTypeId].fieldValues = { ...currentVals, ...partialvals };
            }


            if (this._screenData) {
                const createData: CreateIssueData = this._screenData.issueTypeUIs[this._selectedIssueTypeId] as CreateIssueData;
                createData.type = 'update';
                createData.transformerProblems = this._screenData.problems;
                this.postMessage(createData);
            }

        } catch (e) {
            let err = new Error(`error updating issue fields: ${e}`);
            Logger.error(err);
            this.postMessage({ type: 'error', reason: `error updating issue fields: ${e}` });
        } finally {
            this.isRefeshing = false;
        }
    }

    updateIssueType(issueType: IssueType, fieldValues: FieldValues) {
        const fieldOverrides = this.getValuesForExisitngKeys(this._screenData.issueTypeUIs[issueType.id].fields, fieldValues);
        this._screenData.issueTypeUIs[issueType.id].fieldValues = { ...this._screenData.issueTypeUIs[issueType.id].fieldValues, ...fieldOverrides };

        const selectOverrides = this.getValuesForExisitngKeys(this._screenData.issueTypeUIs[issueType.id].fields, this._screenData.issueTypeUIs[this._selectedIssueTypeId].selectFieldOptions);
        this._screenData.issueTypeUIs[issueType.id].selectFieldOptions = { ...this._screenData.issueTypeUIs[issueType.id].selectFieldOptions, ...selectOverrides };

        this._screenData.issueTypeUIs[issueType.id].fieldValues['issuetype'] = issueType;
        this._selectedIssueTypeId = issueType.id;

        const createData: CreateIssueData = this._screenData.issueTypeUIs[this._selectedIssueTypeId] as CreateIssueData;
        createData.type = 'update';
        createData.transformerProblems = this._screenData.problems;
        this.postMessage(createData);
    }

    getValuesForExisitngKeys(fields: FieldUIs, values: FieldValues): any {
        const foundVals: FieldValues = {};

        Object.keys(fields).forEach(key => {
            if (values[key]) {
                foundVals[key] = values[key];
            }
        });

        return foundVals;
    }

    fireCallback(issueKey: string) {
        if (this._partialIssue && this._partialIssue.uri && this._partialIssue.position && this._partialIssue.onCreated) {
            this._partialIssue.onCreated({ uri: this._partialIssue.uri, position: this._partialIssue.position, issueKey: issueKey });
            this.hide();
        } else if (this._relatedBBIssue && this._partialIssue && this._partialIssue.onCreated) {
            this._partialIssue.onCreated({ bbIssue: this._relatedBBIssue, issueKey: issueKey });
            this.hide();
        }
    }

    formatIssueLinks(key: string, linkdata: any): any[] {
        const issuelinks: any[] = [];

        linkdata.issue.forEach((link: any) => {
            issuelinks.push(
                {
                    type: {
                        id: linkdata.type.id
                    },
                    inwardIssue: linkdata.type.type === 'inward' ? { key: link.key } : { key: key },
                    outwardIssue: linkdata.type.type === 'outward' ? { key: link.key } : { key: key }
                }
            );
        });

        return issuelinks;
    }

    formatCreatePayload(a: CreateIssueAction): [any, any, any, any] {
        let payload: any = { ...a.issueData };
        let issuelinks: any = undefined;
        let attachments: any = undefined;
        let worklog: any = undefined;

        if (payload['issuelinks']) {

            issuelinks = payload['issuelinks'];
            delete payload['issuelinks'];
        }

        if (payload['attachment']) {
            attachments = payload['attachment'];
            delete payload['attachment'];
        }

        if (payload['worklog'] && payload['worklog'].enabled) {
            worklog = {
                worklog: [
                    {
                        add: {
                            ...payload['worklog'],
                            adjustEstimate: 'new',
                            started: payload['worklog'].started
                                ? format(payload['worklog'].started, 'YYYY-MM-DDTHH:mm:ss.SSSZZ')
                                : undefined
                        }
                    }
                ]
            };
            delete payload['worklog'];
        }

        return [payload, worklog, issuelinks, attachments];
    }

    protected async onMessageReceived(e: Action): Promise<boolean> {
        let handled = await super.onMessageReceived(e);

        if (!handled) {
            switch (e.action) {
                case 'refresh': {
                    handled = true;
                    this.invalidate();
                    break;
                }

                case 'setIssueType': {
                    handled = true;
                    if (isSetIssueType(e)) {
                        this.updateIssueType(e.issueType, e.fieldValues);
                    }
                    break;
                }

                case 'getScreensForProject': {
                    handled = true;
                    if (isScreensForProjects(e)) {
                        await this.forceUpdateFields(e.project, e.fieldValues);
                    }
                    break;
                }

                //TODO: refactor this
                case 'createIssue': {
                    handled = true;
                    if (isCreateIssue(e)) {
                        try {
                            const [payload, worklog, issuelinks, attachments] = this.formatCreatePayload(e);

                            let client = await Container.clientManager.jiraClient(e.site);
                            const resp = await client.createIssue({ fields: payload, update: worklog });

                            issueCreatedEvent(e.site, resp.key).then(e => { Container.analyticsClient.sendTrackEvent(e); });

                            if (issuelinks) {
                                this.formatIssueLinks(resp.key, issuelinks).forEach(async (link: any) => {
                                    await client.createIssueLink(resp.key, link);
                                });
                            }

                            if (attachments) {
                                await client.addAttachments(resp.key, attachments);
                            }
                            // TODO: [VSCODE-601] add a new analytic event for issue updates
                            commands.executeCommand(Commands.RefreshJiraExplorer);

                            this.postMessage({ type: 'issueCreated', issueData: { ...resp, siteDetails: e.site } });

                            commands.executeCommand(Commands.RefreshJiraExplorer);
                            this.fireCallback(resp.key);

                        } catch (e) {
                            Logger.error(new Error(`error creating comment: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error creating issue') });
                        }

                    }
                    break;
                }
                default: {
                    break;
                }
            }
        }

        return handled;
    }
}
