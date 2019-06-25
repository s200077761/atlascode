import { Disposable, ConfigurationChangeEvent } from "vscode";

import { Container } from "../container";
import { ProductJira, DetailedSiteInfo } from "../atlclients/authInfo";
import { Logger } from "../logger";
import { configuration } from "../config/configuration";
import { EpicFieldInfo, epicsDisabled } from "./jiraIssue";
import { JiraDefaultSiteConfigurationKey } from "../constants";


export const defaultIssueFields: string[] = ["summary", "description", "comment", "issuetype", "parent", "subtasks", "issuelinks", "status", "created", "reporter", "assignee", "labels", "attachment", "status", "priority", "components", "fixVersions"];

export class JiraFieldManager extends Disposable {
    private _disposable: Disposable;
    private _epicStore: Map<string, EpicFieldInfo> = new Map<string, EpicFieldInfo>();

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

    public async getIssueFieldsForSite(site: DetailedSiteInfo): Promise<string[]> {
        let fields = Array.from(defaultIssueFields);
        let epicFields = await this.getEpicFieldsForSite(site);

        if (epicFields.epicsEnabled) {
            fields.push(epicFields.epicLink.id, epicFields.epicName.id);
        }

        return fields;
    }

    public async getEpicFieldsForSite(site: DetailedSiteInfo): Promise<EpicFieldInfo> {
        if (!this._epicStore.has(site.id)) {
            let fields = await this.epicFieldsForSite(site);
            this._epicStore.set(site.id, fields);
        }

        return this._epicStore.get(site.id)!;
    }

    private async epicFieldsForSite(site: DetailedSiteInfo): Promise<EpicFieldInfo> {
        const client = await Container.clientManager.jirarequest(site);
        let epicFields = epicsDisabled;
        try {
            let allFields = await client.field.getFields({});
            if (allFields) {
                let epicName = undefined;
                let epicLink = undefined;

                allFields.data.filter(field => {
                    if (field.schema && field.schema.custom && (field.schema.custom === 'com.pyxis.greenhopper.jira:gh-epic-label'
                        || field.schema.custom === 'com.pyxis.greenhopper.jira:gh-epic-link')) {
                        return field;
                    }
                    return undefined;
                }).forEach(field => {
                    // cfid example: customfield_10013
                    if (field.schema!.custom! === 'com.pyxis.greenhopper.jira:gh-epic-label') {
                        epicName = { name: field.name, id: field.id, cfid: parseInt(field.id!.substr(12)) };
                    } else if (field.schema!.custom! === 'com.pyxis.greenhopper.jira:gh-epic-link') {
                        epicLink = { name: field.name, id: field.id, cfid: parseInt(field.id!.substr(12)) };
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

        } catch (e) {
            Logger.error(e);
        }
        return epicFields;
    }
}
