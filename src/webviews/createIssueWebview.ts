import { InitializingWebview } from './abstractWebview';
import { Action, onlineStatus } from '../ipc/messaging';
import { Logger } from '../logger';
import { Container } from '../container';
import { CreateIssueData } from '../ipc/issueMessaging';
import { WorkingProject } from '../config/model';
import { isScreensForProjects, isCreateIssue, isFetchQueryAndSite, isSetIssueType } from '../ipc/issueActions';
import { commands, Uri, ViewColumn, Position } from 'vscode';
import { Commands } from '../commands';
import { issueCreatedEvent } from '../analytics';
import { ProductJira, DetailedSiteInfo, emptySiteInfo } from '../atlclients/authInfo';
import { BitbucketIssue } from '../bitbucket/model';
import { format } from 'date-fns';
import { fetchCreateIssueUI } from '../jira/fetchIssue';
import { AbstractIssueEditorWebview } from './abstractIssueEditorWebview';
import { ValueType } from '../jira/jira-client/model/fieldUI';
import { CreateMetaTransformerResult, emptyCreateMetaResult, IssueTypeUI } from '../jira/jira-client/model/editIssueUI';

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

export class CreateIssueWebview extends AbstractIssueEditorWebview implements InitializingWebview<PartialIssue | undefined> {
    private _partialIssue: PartialIssue | undefined;
    private _currentProject: WorkingProject | undefined;
    private _screenData: CreateMetaTransformerResult;
    private _selectedIssueTypeId: string;
    private _relatedBBIssue: BitbucketIssue | undefined;
    private _prefill: boolean;
    private _siteDetails: DetailedSiteInfo;

    constructor(extensionPath: string) {
        super(extensionPath);
        this._screenData = emptyCreateMetaResult;
        this._prefill = false;
        this._siteDetails = emptySiteInfo;
    }

    public get title(): string {
        return "Create JIRA Issue";
    }
    public get id(): string {
        return "atlascodeCreateIssueScreen";
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
            this._prefill = true;
            if (data.bbIssue) {
                this._relatedBBIssue = data.bbIssue;
            }
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

    async updateFields(project?: WorkingProject) {
        if (this.isRefeshing) {
            return;
        }

        this.isRefeshing = true;
        try {

            let effProject = project;

            if (!effProject) {
                effProject = await Container.jiraProjectManager.getEffectiveProject();
            }

            const availableProjects = await Container.jiraProjectManager.getProjects();
            let projectChanged = false;

            if (effProject !== this._currentProject) {
                projectChanged = true;
                this._currentProject = project;
            }

            if (!this._currentProject) {
                this._currentProject = await Container.jiraProjectManager.getEffectiveProject();
                projectChanged = true;
            }

            if (projectChanged) {
                this._selectedIssueTypeId = '';
                this._screenData = await fetchCreateIssueUI(this._siteDetails, this._currentProject.key);
                this._selectedIssueTypeId = this._screenData.selectedIssueType.id;

                this._screenData.issueTypeUIs[this._selectedIssueTypeId].fieldValues['issuetype'] = this._screenData.selectedIssueType;
                this._screenData.issueTypeUIs[this._selectedIssueTypeId].selectFieldOptions['issuetype'] = this._screenData.issueTypes;
                this._screenData.issueTypeUIs[this._selectedIssueTypeId].fieldValues['project'] = this._currentProject;
                this._screenData.issueTypeUIs[this._selectedIssueTypeId].selectFieldOptions['project'] = availableProjects;

                if (this._partialIssue && this._prefill) {
                    const currentVals = this._screenData.issueTypeUIs[this._selectedIssueTypeId].fieldValues;
                    const partialvals = { 'summary': this._partialIssue.summary, 'description': this._partialIssue.description };

                    this._screenData.issueTypeUIs[this._selectedIssueTypeId].fieldValues = { ...currentVals, ...partialvals };
                }

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

    fireCallback(issueKey: string) {
        if (this._partialIssue && this._partialIssue.uri && this._partialIssue.position && this._partialIssue.onCreated) {
            this._partialIssue.onCreated({ uri: this._partialIssue.uri, position: this._partialIssue.position, issueKey: issueKey });
            this.hide();
        } else if (this._relatedBBIssue && this._partialIssue && this._partialIssue.onCreated) {
            this._partialIssue.onCreated({ bbIssue: this._relatedBBIssue, issueKey: issueKey });
            this.hide();
        }
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

                // TODO: check this
                case 'setIssueType': {
                    handled = true;
                    if (isSetIssueType(e)) {
                        this._selectedIssueTypeId = e.id;
                    }
                    break;
                }

                case 'fetchProjects': {
                    handled = true;
                    if (isFetchQueryAndSite(e)) {
                        try {
                            let projects = await Container.jiraProjectManager.getProjects('name', e.query);
                            this.postMessage({ type: 'projectList', availableProjects: projects });
                        } catch (e) {
                            Logger.error(new Error(`error fetching projects: ${e}`));
                            this.postMessage({ type: 'error', reason: this.formatErrorReason(e, 'Error fetching projects') });
                        }
                    }
                    break;
                }

                case 'getScreensForProject': {
                    handled = true;
                    if (isScreensForProjects(e)) {
                        await this.updateFields(e.project);
                    }
                    break;
                }

                //TODO: refactor this
                case 'createIssue': {
                    handled = true;
                    if (isCreateIssue(e)) {
                        try {
                            const site = Container.siteManager.effectiveSite(ProductJira);
                            let client = await Container.clientManager.jiraClient(site);
                            if (client) {
                                const issuelinks: any[] = [];
                                const formLinks = e.issueData.issuelinks;
                                delete e.issueData.issuelinks;

                                let worklog: any = undefined;
                                if (e.issueData.worklog && e.issueData.worklog.enabled) {
                                    delete e.issueData.worklog.enabled;
                                    worklog = {
                                        worklog: [
                                            {
                                                add: {
                                                    ...e.issueData.worklog,
                                                    adjustEstimate: 'new',
                                                    started: e.issueData.worklog.started
                                                        ? format(e.issueData.worklog.started, 'YYYY-MM-DDTHH:mm:ss.SSSZZ')
                                                        : undefined
                                                }
                                            }
                                        ]
                                    };
                                    delete e.issueData.worklog;
                                }

                                const resp = await client.createIssue({ fields: e.issueData, update: worklog });

                                if (formLinks &&
                                    formLinks.type && formLinks.type.id &&
                                    formLinks.issue && Array.isArray(formLinks.issue) && formLinks.issue.length > 0) {

                                    formLinks.issue.forEach((link: any) => {
                                        issuelinks.push(
                                            {
                                                type: {
                                                    id: formLinks.type.id
                                                },
                                                inwardIssue: formLinks.type.type === 'inward' ? { key: link.key } : { key: resp.key },
                                                outwardIssue: formLinks.type.type === 'outward' ? { key: link.key } : { key: resp.key }
                                            }
                                        );
                                    });
                                }

                                if (issuelinks.length > 0) {
                                    issuelinks.forEach(async (link: any) => {
                                        if (client) {
                                            await client.createIssueLink('', { body: link });
                                        }
                                    });
                                }

                                this.postMessage({ type: 'issueCreated', issueData: { ...resp, site: site, token: await Container.clientManager.getValidAccessToken(Container.siteManager.effectiveSite(ProductJira)) } });
                                issueCreatedEvent(resp.key, Container.siteManager.effectiveSite(ProductJira).id).then(e => { Container.analyticsClient.sendTrackEvent(e); });
                                commands.executeCommand(Commands.RefreshJiraExplorer);
                                this.fireCallback(resp.key);
                            } else {
                                this.postMessage({ type: 'error', reason: "jira client undefined" });
                            }
                        } catch (e) {
                            Logger.error(new Error(`error creating issue: ${e}`));
                            this.postMessage({ type: 'error', reason: e });
                        }

                    }
                    break;
                }
                case 'openProblemReport': {
                    handled = true;
                    Container.createIssueProblemsWebview.createOrShow(undefined, Container.siteManager.effectiveSite(ProductJira), this._currentProject);
                }
                default: {
                    break;
                }
            }
        }

        return handled;
    }
}
