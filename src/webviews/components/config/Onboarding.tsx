import Button from '@atlaskit/button';
import Form from '@atlaskit/form';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import Tooltip from '@atlaskit/tooltip';
import * as React from 'react';
import { ConfigData } from 'src/ipc/configMessaging';
import { AuthInfo, DetailedSiteInfo, ProductBitbucket, ProductJira, SiteInfo } from '../../../atlclients/authInfo';
import { LoginAuthAction, LogoutAuthAction, SaveSettingsAction } from '../../../ipc/configActions';
import { Action } from '../../../ipc/messaging';
import ErrorBanner from '../ErrorBanner';
import { WebviewComponent } from '../WebviewComponent';
import ProductEnabler from './ProductEnabler';
import { SiteEditor } from './SiteEditor';

type changeObject = { [key: string]: any };

type ViewState = {
    isRemote: boolean;
    jiraCloudSites: DetailedSiteInfo[];
    jiraServerSites: DetailedSiteInfo[];
    bitbucketCloudSites: DetailedSiteInfo[];
    bitbucketServerSites: DetailedSiteInfo[];
    isErrorBannerOpen: boolean;
    enableJiraConfig: boolean;
    enableBitbucketConfig: boolean;
    errorDetails: any;
};

const emptyViewState = {
    isRemote: false,
    jiraCloudSites: [],
    jiraServerSites: [],
    bitbucketCloudSites: [],
    bitbucketServerSites: [],
    isErrorBannerOpen: false,
    enableJiraConfig: true,
    enableBitbucketConfig: true,
    errorDetails: undefined,
};

type Emit = LoginAuthAction | LogoutAuthAction | SaveSettingsAction | Action;
type Accept = ConfigData;
export default class Onboarding extends WebviewComponent<Emit, Accept, {}, ViewState> {
    constructor(props: any) {
        super(props);
        this.state = emptyViewState;
    }

    public onMessageReceived(e: any): boolean {
        switch (e.type) {
            case 'error': {
                this.setState({ isErrorBannerOpen: true, errorDetails: e.reason });
                break;
            }
            case 'update': {
                this.setState({
                    isRemote: e.isRemote,
                    jiraCloudSites: e.jiraCloudSites,
                    jiraServerSites: e.jiraServerSites,
                    bitbucketCloudSites: e.bitbucketCloudSites,
                    bitbucketServerSites: e.bitbucketServerSites,
                    enableJiraConfig: e.enableJiraConfig,
                    enableBitbucketConfig: e.enableBitbucketConfig,
                });
                break;
            }
            case 'sitesAvailableUpdate': {
                this.setState({
                    jiraCloudSites: e.jiraCloudSites,
                    jiraServerSites: e.jiraServerSites,
                    bitbucketCloudSites: e.bitbucketCloudSites,
                    bitbucketServerSites: e.bitbucketServerSites,
                    isErrorBannerOpen: false,
                    errorDetails: undefined,
                });
                break;
            }
        }

        return true;
    }

    handleLogin = (site: SiteInfo, auth: AuthInfo) => {
        this.postMessage({ action: 'login', siteInfo: site, authInfo: auth });
    };

    handleLogout = (site: DetailedSiteInfo) => {
        this.postMessage({ action: 'logout', detailedSiteInfo: site });
    };

    handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    };

    anythingAuthenticated = () => {
        return (
            this.state.jiraCloudSites.length > 0 ||
            this.state.jiraServerSites.length > 0 ||
            this.state.bitbucketCloudSites.length > 0 ||
            this.state.bitbucketServerSites.length > 0
        );
    };

    onConfigChange = (change: changeObject) => {
        this.postMessage({ action: 'changeEnabled', changes: change });
    };

    public render() {
        return (
            <Page>
                {this.state.isErrorBannerOpen && (
                    <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
                )}
                <Form name="create-bitbucket-issue-form" onSubmit={(e: any) => {}}>
                    {(frmArgs: any) => {
                        return (
                            <form {...frmArgs.formProps}>
                                <Grid spacing="comfortable" layout="fixed">
                                    <GridColumn medium={12}>
                                        <PageHeader>
                                            <p>Atlassian for VS Code</p>
                                        </PageHeader>
                                    </GridColumn>
                                    <GridColumn medium={12}>
                                        <p>
                                            With Atlassian for VS Code, you can create and view issues, start work on
                                            issues, create pull requests, do code reviews, start builds, get build
                                            statuses and more!
                                        </p>
                                        <br></br>
                                        <p>To get started, log in with Jira and/or Bitbucket.</p>
                                    </GridColumn>
                                    <GridColumn medium={12}>
                                        <div style={{ marginTop: '20px' }}>
                                            <ProductEnabler
                                                jiraEnabled={this.state.enableJiraConfig}
                                                bbEnabled={this.state.enableBitbucketConfig}
                                                onConfigChange={this.onConfigChange}
                                            />
                                        </div>
                                    </GridColumn>
                                    <GridColumn medium={10}>
                                        {this.state.enableJiraConfig && (
                                            <div style={{ marginTop: '10px' }}>
                                                <h2>Jira</h2>
                                                <Grid>
                                                    <GridColumn medium={5}>
                                                        <SiteEditor
                                                            sites={this.state.jiraCloudSites.map((s) => {
                                                                return { site: s, auth: undefined };
                                                            })}
                                                            product={ProductJira}
                                                            isRemote={this.state.isRemote}
                                                            handleDeleteSite={this.handleLogout}
                                                            handleSaveSite={this.handleLogin}
                                                            siteExample={'e.g. <company>.atlassian.net'}
                                                            cloudOrServer={'cloud'}
                                                        />
                                                    </GridColumn>
                                                    <GridColumn medium={5}>
                                                        <SiteEditor
                                                            sites={this.state.jiraServerSites.map((s) => {
                                                                return { site: s, auth: undefined };
                                                            })}
                                                            product={ProductJira}
                                                            isRemote={this.state.isRemote}
                                                            handleDeleteSite={this.handleLogout}
                                                            handleSaveSite={this.handleLogin}
                                                            siteExample={'e.g. jira.<company>.com'}
                                                            cloudOrServer={'server'}
                                                        />
                                                    </GridColumn>
                                                </Grid>
                                            </div>
                                        )}
                                    </GridColumn>
                                    <GridColumn medium={10}>
                                        {this.state.enableBitbucketConfig && (
                                            <div style={{ marginTop: this.state.enableJiraConfig ? '30px' : '10px' }}>
                                                <h2>Bitbucket</h2>
                                                <Grid>
                                                    <GridColumn medium={5}>
                                                        <SiteEditor
                                                            sites={this.state.bitbucketCloudSites.map((s) => {
                                                                return { site: s, auth: undefined };
                                                            })}
                                                            product={ProductBitbucket}
                                                            isRemote={this.state.isRemote}
                                                            handleDeleteSite={this.handleLogout}
                                                            handleSaveSite={this.handleLogin}
                                                            siteExample={'e.g. bitbucket.org/<company>'}
                                                            cloudOrServer={'cloud'}
                                                        />
                                                    </GridColumn>
                                                    <GridColumn medium={5}>
                                                        <SiteEditor
                                                            sites={this.state.bitbucketServerSites.map((s) => {
                                                                return { site: s, auth: undefined };
                                                            })}
                                                            product={ProductBitbucket}
                                                            isRemote={this.state.isRemote}
                                                            handleDeleteSite={this.handleLogout}
                                                            handleSaveSite={this.handleLogin}
                                                            siteExample={'e.g. bitbucket.<company>.com'}
                                                            cloudOrServer={'server'}
                                                        />
                                                    </GridColumn>
                                                </Grid>
                                            </div>
                                        )}
                                    </GridColumn>
                                    <GridColumn medium={12}>
                                        {(this.state.enableJiraConfig || this.state.enableBitbucketConfig) && (
                                            <div
                                                style={{
                                                    display: 'inline-block',
                                                    float: 'right',
                                                    marginLeft: '10px',
                                                    marginTop: '150px',
                                                }}
                                            >
                                                <div style={{ marginRight: '5px', display: 'inline-block' }}>
                                                    <Tooltip
                                                        content={
                                                            !this.anythingAuthenticated()
                                                                ? 'Authenticate with Jira or Bitbucket to continue'
                                                                : 'Click to close this page'
                                                        }
                                                    >
                                                        <Button
                                                            className="ac-button"
                                                            onClick={() => {
                                                                this.postMessage({ action: 'closePage' });
                                                            }}
                                                            isDisabled={!this.anythingAuthenticated()}
                                                        >
                                                            Done
                                                        </Button>
                                                    </Tooltip>
                                                </div>
                                                <div style={{ display: 'inline-block' }}>
                                                    <Tooltip content="Click to open additional settings">
                                                        <Button
                                                            className="ac-button"
                                                            onClick={() => {
                                                                this.postMessage({ action: 'openSettings' });
                                                            }}
                                                        >
                                                            More Settings...
                                                        </Button>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        )}
                                    </GridColumn>
                                </Grid>
                            </form>
                        );
                    }}
                </Form>
            </Page>
        );
    }
}
