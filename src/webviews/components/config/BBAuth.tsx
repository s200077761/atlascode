import React from "react";
import Button from "@atlaskit/button";
import Tooltip from '@atlaskit/tooltip';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import { ButtonGroup } from "@atlaskit/button";
import { DetailedSiteInfo } from "../../../atlclients/authInfo";

export default class BitbucketAuth extends React.Component<
    {
        sites: DetailedSiteInfo[];
        handleDeleteSite: (site: DetailedSiteInfo) => void;
    },
    {
        sites: DetailedSiteInfo[];
        editingEntry: boolean;
    }
    > {
    constructor(props: any) {
        super(props);

        this.state = {
            sites: props.sites,
            editingEntry: false,
        };
    }

    componentWillReceiveProps = (nextProps: any) => {

        if (nextProps.sites) {
            this.setState(nextProps.sites);
        }

    }

    handleCancelEdit = () => {
        this.setState({ editingEntry: false });
    }

    htmlForSite = (element: DetailedSiteInfo) => {
        return (
            <div id="multi-option-row">
                <div style={{ flexGrow: 1 }}>{element.name}</div>

                <ButtonGroup>
                    {/* <Tooltip content="Edit">
                        <Button
                            className="ac-button"
                            iconBefore={<EditFilledIcon label="edit" />}
                            onClick={() => {
                                this.onEditQuery(element.id);
                            }}
                        />
                    </Tooltip> */}
                    <Tooltip content="Delete">
                        <Button
                            className="ac-button"
                            iconBefore={<TrashIcon label="delete" />}
                            onClick={() => {
                                this.props.handleDeleteSite(element);
                            }}
                        />
                    </Tooltip>
                </ButtonGroup>
            </div>
        );
    }

    render() {
        if (!this.state.sites || this.state.sites.length < 1) {
            return <div />;
        }

        return (
            <React.Fragment>
                {this.state.editingEntry && (
                    <div />
                    // <EditJQL
                    //     jiraAccessToken={this.props.jiraAccessToken}
                    //     defaultSite={this.props.defaultSite}
                    //     workingProject={this.props.workingProject}
                    //     sites={this.props.sites}
                    //     jqlEntry={this.state.editingEntry}
                    //     onCancel={this.handleCancelEdit}
                    //     onSave={this.handleSaveEdit}
                    // />
                )}
                {this.state.sites.map((site) => {
                    return this.htmlForSite(site);
                })}
                <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
                    <Button className="ac-button">Add Query</Button>
                </div>
            </React.Fragment>
        );
    }
}
