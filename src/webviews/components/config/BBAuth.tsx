import React from "react";
import Button from "@atlaskit/button";
import Tooltip from '@atlaskit/tooltip';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import { ButtonGroup } from "@atlaskit/button";
import { DetailedSiteInfo, SiteInfo, AuthInfo, ProductBitbucket } from "../../../atlclients/authInfo";
import AuthForm from "./AuthForm";

export default class BitbucketAuth extends React.Component<
    {
        sites: DetailedSiteInfo[];
        handleDeleteSite: (site: DetailedSiteInfo) => void;
        handleSaveSite: (site: SiteInfo, auth: AuthInfo) => void;
    },
    {
        sites: DetailedSiteInfo[];
        addingSite: boolean;
    }
    > {
    constructor(props: any) {
        super(props);
        this.state = {
            sites: props.sites,
            addingSite: false,
        };
    }

    componentWillReceiveProps = (nextProps: any) => {
        if (nextProps.sites) {
            this.setState({ sites: nextProps.sites });
        }
    }

    onNewSite = () => {
        this.setState({ addingSite: true });
    }

    handleCancel = () => {
        this.setState({ addingSite: false });
    }

    handleSave = (site: SiteInfo, auth: AuthInfo) => {
        this.props.handleSaveSite(site, auth);
        this.setState({ addingSite: false });
    }

    htmlForSite = (element: DetailedSiteInfo) => {
        return (
            <div id="multi-option-row">
                <div style={{ flexGrow: 1, marginLeft: "3pt", marginRight: "3pt" }}>{element.name}</div>

                <ButtonGroup>
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
                {this.state.addingSite && (
                    <AuthForm
                        onCancel={this.handleCancel}
                        onSave={this.handleSave}
                        product={ProductBitbucket} />
                )}
                {this.state.sites.map((site) => {
                    return this.htmlForSite(site);
                })}
                <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
                    <Button className="ac-button" onClick={this.onNewSite}>Add Site</Button>
                </div>
            </React.Fragment>
        );
    }
}
