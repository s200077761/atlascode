import React from "react";
import { JQLEntry } from "../../../config/model";
import Button from "@atlaskit/button";
import { Checkbox } from "@atlaskit/checkbox";
import Tooltip from '@atlaskit/tooltip';
import EditFilledIcon from '@atlaskit/icon/glyph/edit-filled';
import EditJQL from "./EditJQL";
import { ButtonGroup } from "@atlaskit/button";
import { DetailedSiteInfo } from "../../../atlclients/authInfo";

type changeObject = { [key: string]: any };

export default class NonCustomJQL extends React.Component<
    {
        defaultSiteId: string;
        workingProject: string;
        sites: DetailedSiteInfo[];
        yourIssuesJql: string;
        yourIssuesIsEnabled: boolean;
        openIssuesJql: string;
        openIssuesIsEnabled: boolean;
        onConfigChange: (changes: changeObject, removes?: string[]) => void;
        jqlFetcher: (site: DetailedSiteInfo, path: string) => Promise<any>;
    },
    {
        inputValue: string;
        editingEntry: JQLEntry | undefined;
        editingId: string | undefined;
    }
    > {
    constructor(props: any) {
        super(props);

        this.state = {
            inputValue: "",
            editingEntry: undefined,
            editingId: undefined
        };
    }

    private publishChanges(id: string, value: any) {
        const changes = Object.create(null);
        const removes: string[] = [];
        if (value !== undefined) {
            changes[id] = value;
        } else {
            removes.push(id);
        }
        if (this.props.onConfigChange) {
            this.props.onConfigChange(changes, removes);
        }
    }

    onEditQuery = (id: string) => {
        const entry = this.readJqlListFromProps().find((entry: JQLEntry) => {
            return entry.id === id;
        });
        if (entry) {
            this.setState({
                editingId: entry.id,
                editingEntry: Object.assign({}, entry)
            });
        }
    }

    toggleEnable = (e: any) => {
        switch (e.target.value) {
            case "YOURS":
                this.publishChanges("jira.explorer.showAssignedIssues", e.target.checked);
                break;
            case "OPEN":
                this.publishChanges("jira.explorer.showOpenIssues", e.target.checked);
                break;
        }
    }

    private readJqlListFromProps(): JQLEntry[] {
        const yours = {
            id: "YOURS",
            enabled: this.props.yourIssuesIsEnabled,
            name: "Your Issues",
            query: this.props.yourIssuesJql
        };
        const open = {
            id: "OPEN",
            enabled: this.props.openIssuesIsEnabled,
            name: "Open Issues",
            query: this.props.openIssuesJql
        };
        return [yours, open];
    }

    handleCancelEdit = () => {
        this.setState({ editingId: undefined, editingEntry: undefined });
    }

    indexForId(jqlList: JQLEntry[], id: string | undefined) {
        return jqlList.findIndex((entry: JQLEntry) => {
            return entry.id === id;
        });
    }

    handleSaveEdit = (siteId: string, jqlEntry: JQLEntry) => {
        switch (jqlEntry.id) {
            case "YOURS":
                this.publishChanges("jira.explorer.assignedIssueJql", jqlEntry.query);
                break;
            case "OPEN":
                this.publishChanges("jira.explorer.openIssueJql", jqlEntry.query);
                break;
        }

        this.setState({
            editingId: undefined,
            editingEntry: undefined
        });
    }

    restoreDefault = (jqlEntry: JQLEntry) => {

        switch (jqlEntry.id) {
            case "YOURS":
                this.publishChanges("jira.explorer.assignedIssueJql", undefined);
                break;
            case "OPEN":
                this.publishChanges("jira.explorer.openIssueJql", undefined);
                break;
        }

        this.setState({
            editingId: undefined,
            editingEntry: undefined
        });
    }

    htmlForJQLEntry = (element: JQLEntry, displayIndex: number) => {
        return (
            <div
                data-index={displayIndex}
                id="jql-row"
                data-id={element.id}
            >
                <div>
                    <Checkbox
                        value={element.id}
                        isChecked={element.enabled}
                        onChange={this.toggleEnable}
                    />
                </div>

                <div style={{ flexGrow: 1 }}>{element.name}</div>

                <ButtonGroup>
                    <Tooltip content="Edit">
                        <Button
                            className="ac-button"
                            iconBefore={<EditFilledIcon label="edit" />}
                            onClick={() => {
                                this.onEditQuery(element.id);
                            }}
                        />
                    </Tooltip>
                </ButtonGroup>
            </div>
        );
    }

    htmlElementAtIndex = (jql: JQLEntry[], index: number) => {
        var element = undefined;

        element = this.htmlForJQLEntry(jql[index], index);

        return (
            <div
                id="jql-row-container"
                data-index={index}
            >
                <div id="jql-row-drop-overlay"
                    data-index={index}
                >
                    {element}
                </div>
            </div>
        );
    }

    render() {
        if (!this.props.defaultSiteId) {
            return <div />;
        }

        const jql = this.readJqlListFromProps();

        return (
            <React.Fragment>
                {this.state.editingEntry && (
                    <EditJQL
                        jqlFetcher={this.props.jqlFetcher}
                        defaultSiteId={this.props.defaultSiteId}
                        workingProject={this.props.workingProject}
                        sites={[]}
                        jqlEntry={this.state.editingEntry}
                        nameEditable={false}
                        onCancel={this.handleCancelEdit}
                        onRestoreDefault={this.restoreDefault}
                        onSave={this.handleSaveEdit}
                    />
                )}
                {jql.map((_, index) => {
                    return this.htmlElementAtIndex(jql, index);
                })}
            </React.Fragment>
        );
    }
}
