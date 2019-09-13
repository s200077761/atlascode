import { Disposable, ConfigurationChangeEvent } from "vscode";

import { Container } from "../container";
import { ProductJira, DetailedSiteInfo } from "../atlclients/authInfo";
import { Logger } from "../logger";
import { configuration } from "../config/configuration";
import { EpicFieldInfo, epicsDisabled } from "./jiraCommon";
import { JiraDefaultSiteConfigurationKey } from "../constants";
import { IssueLinkType } from "./jira-client/model/entities";
import { readField, Fields } from "./jira-client/model/fieldMetadata";


export const detailedIssueFields: string[] = ["summary", "description", "comment", "issuetype", "parent", "subtasks", "issuelinks", "status", "created", "reporter", "assignee", "labels", "attachment", "status", "priority", "components", "fixVersions"];
export const minimalDefaultIssueFields: string[] = ["summary", "issuetype", "status", "priority", "description", "created", "updated", "parent", "subtasks", "issuelinks"];

export class JiraSettingsManager extends Disposable {
    private _disposable: Disposable;
    private _epicStore: Map<string, EpicFieldInfo> = new Map<string, EpicFieldInfo>();
    private _fieldStore: Map<string, Fields> = new Map<string, Fields>();
    private _issueLinkTypesStore: Map<string, IssueLinkType[]> = new Map<string, IssueLinkType[]>();

    constructor() {
        super(() => this.dispose());

        this._disposable = Disposable.from(
            configuration.onDidChange(this.onConfigurationChanged, this)
        );

    }

    dispose() {
        this._disposable.dispose();
    }

    private async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, JiraDefaultSiteConfigurationKey)) {
            const newSite = await Container.siteManager.effectiveSite(ProductJira);
            this.getEpicFieldsForSite(newSite);
        }
    }

    public async getIssueLinkTypes(site: DetailedSiteInfo): Promise<IssueLinkType[]> {
        if (!this._issueLinkTypesStore.has(site.id)) {
            let ilts: IssueLinkType[] = [];
            try {
                const client = await Container.clientManager.jiraClient(site);
                const issuelinkTypes = await client.getIssueLinkTypes();

                if (Array.isArray(issuelinkTypes)) {
                    ilts = issuelinkTypes;
                }
            } catch (err) {
                // TODO: [VSCODE-549] use /configuration to get settings
                // for now we need to catch 404 and set an empty array.
                Logger.error(err, 'issue links not enabled');
            } finally {
                this._issueLinkTypesStore.set(site.id, ilts);
            }
        }

        return this._issueLinkTypesStore.get(site.id)!;
    }

    public async getMinimalIssueFieldIdsForSite(site: DetailedSiteInfo): Promise<string[]> {
        let fields = Array.from(minimalDefaultIssueFields);
        let epicFields = await this.getEpicFieldsForSite(site);

        if (epicFields.epicsEnabled) {
            fields.push(epicFields.epicLink.id, epicFields.epicName.id);
        }

        return fields;
    }

    public async getDetailedIssueFieldIdsForSite(site: DetailedSiteInfo): Promise<string[]> {
        let fields = Array.from(detailedIssueFields);
        let epicFields = await this.getEpicFieldsForSite(site);

        if (epicFields.epicsEnabled) {
            fields.push(epicFields.epicLink.id, epicFields.epicName.id);
        }

        return fields;
    }

    public async getEpicFieldsForSite(site: DetailedSiteInfo): Promise<EpicFieldInfo> {
        if (!this._epicStore.has(site.id)) {
            let fields = await this.fetchEpicFieldsForSite(site);
            this._epicStore.set(site.id, fields);
        }

        return this._epicStore.get(site.id)!;
    }

    private async fetchEpicFieldsForSite(site: DetailedSiteInfo): Promise<EpicFieldInfo> {
        let allFields: Fields = await this.getAllFieldsForSite(site);

        let epicFields = epicsDisabled;

        if (Object.keys(allFields).length > 0) {
            let epicName = undefined;
            let epicLink = undefined;

            Object.values(allFields).filter(field => {
                if (field.schema && field.schema.custom && (field.schema.custom === 'com.pyxis.greenhopper.jira:gh-epic-label'
                    || field.schema.custom === 'com.pyxis.greenhopper.jira:gh-epic-link')) {
                    return field;
                }
                return undefined;
            }).forEach(field => {
                // cfid example: customfield_10013
                if (field.schema && field.schema.custom === 'com.pyxis.greenhopper.jira:gh-epic-label') {
                    epicName = { name: field.name, id: field.id, cfid: parseInt(field.id.substr(12)) };
                } else if (field.schema && field.schema.custom === 'com.pyxis.greenhopper.jira:gh-epic-link') {
                    epicLink = { name: field.name, id: field.id, cfid: parseInt(field.id.substr(12)) };
                }
            });

            if (epicName && epicLink) {
                epicFields = {
                    epicName: epicName,
                    epicLink: epicLink,
                    epicsEnabled: true
                };
            }

        }

        return epicFields;
    }

    public async getAllFieldsForSite(site: DetailedSiteInfo): Promise<Fields> {
        if (!this._fieldStore.has(site.id)) {
            let fields = await this.fetchAllFieldsForSite(site);
            this._fieldStore.set(site.id, fields);
        }

        return this._fieldStore.get(site.id)!;
    }

    private async fetchAllFieldsForSite(site: DetailedSiteInfo): Promise<Fields> {
        let fields: Fields = {};
        const client = await Container.clientManager.jiraClient(site);
        let allFields = await client.getFields();
        if (allFields) {
            allFields.forEach(field => {
                fields[field.key] = readField(field);
            });
        }

        return fields;
    }
}
