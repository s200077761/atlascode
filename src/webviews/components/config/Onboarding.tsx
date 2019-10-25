import * as React from 'react';
import { WebviewComponent } from '../WebviewComponent';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import { Action } from '../../../ipc/messaging';
import { ProductJira, DetailedSiteInfo, AuthInfo, SiteInfo, ProductBitbucket } from '../../../atlclients/authInfo';
import { LoginAuthAction, SaveSettingsAction } from '../../../ipc/configActions';
import { ConfigData } from 'src/ipc/configMessaging';
import Button from '@atlaskit/button';
import Tooltip from '@atlaskit/tooltip';
import Form from '@atlaskit/form';
import { SiteEditor } from './SiteEditor';
import ErrorBanner from '../ErrorBanner';

type ViewState = {
    isRemote: boolean;
    jiraCloudSites: DetailedSiteInfo[];
    jiraServerSites: DetailedSiteInfo[];
    bitbucketCloudSites: DetailedSiteInfo[];
    bitbucketServerSites: DetailedSiteInfo[];
    isErrorBannerOpen: boolean;
    errorDetails: any;
};

const emptyViewState = {
    isRemote: false,
    jiraCloudSites: [],
    jiraServerSites: [],
    bitbucketCloudSites: [],
    bitbucketServerSites: [],
    isErrorBannerOpen: false,
    errorDetails: undefined
};

type Emit = LoginAuthAction | SaveSettingsAction | Action;
type Accept = ConfigData;
export default class Onboarding extends WebviewComponent<Emit, Accept, {}, ViewState> {
    constructor(props: any) {
        super(props);
        this.state = emptyViewState;
    };

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
                    bitbucketServerSites: e.bitbucketServerSites
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
                    errorDetails: undefined
                });
                break;
            }
        }

        return true;
    };

    handleLogin = (site: SiteInfo, auth: AuthInfo) => {
        this.postMessage({ action: 'login', siteInfo: site, authInfo: auth });
    };

    handleLogout = (site: DetailedSiteInfo) => {
        this.postMessage({ action: 'logout', siteInfo: site });
    };

    handleDismissError = () => {
        this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
    };

    anythingAuthenticated = () => {
        return this.state.jiraCloudSites.length > 0 || this.state.jiraServerSites.length > 0 || this.state.bitbucketCloudSites.length > 0 || this.state.bitbucketServerSites.length > 0;
    };

    public render() {
        return (
            <Page>
                {this.state.isErrorBannerOpen &&
                    <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
                }
                <Form
                    name="create-bitbucket-issue-form"
                    onSubmit={(e:any) => {}}
                >
                    {(frmArgs: any) => {
                        return (<form {...frmArgs.formProps}>
                            <Grid spacing='comfortable' layout='fixed'>
                                <GridColumn medium={12}>
                                    <PageHeader><p>Atlassian for VS Code</p></PageHeader>
                                </GridColumn>
                                <GridColumn medium={12}>
                                    <p>
                                        With Atlassian for VS Code, you can create and view issues, start work on issues, create pull requests, do code reviews, start builds, get build statuses and more!
                                    </p>
                                    <br></br>
                                    <p>To get started, log in with Jira and/or Bitbucket.</p>
                                </GridColumn>
                                <GridColumn medium={10}>
                                    <div style={{ marginTop: '30px' }}>
                                        <h2>Jira</h2>
                                        <Grid>
                                            <GridColumn medium={5}>
                                                <SiteEditor
                                                    sites={this.state.jiraCloudSites}
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
                                                    sites={this.state.jiraServerSites}
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
                                </GridColumn>
                                <GridColumn medium={10}>
                                    <div style={{ marginTop: '30px' }}>
                                        <h2>Bitbucket</h2>
                                        <Grid>
                                            <GridColumn medium={5}>
                                                <SiteEditor
                                                    sites={this.state.bitbucketCloudSites}
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
                                                    sites={this.state.bitbucketServerSites}
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
                                </GridColumn>
                                <GridColumn medium={12}>
                                    <div style={{ display: 'inline-block', float: 'right', marginLeft: '10px', marginTop: '150px' }}>
                                        <div style={{ marginRight: '5px', display: 'inline-block' }}>
                                            <Tooltip content={!this.anythingAuthenticated() ? "Please authenticate with a site" : "Click to close this page"}>
                                                <Button className='ac-button' onClick={() => { this.postMessage({ action: 'closePage' }); }} isDisabled={!this.anythingAuthenticated()}>Done</Button>
                                            </Tooltip>
                                        </div>
                                        <div style={{ display: 'inline-block' }}>
                                            <Tooltip content="Click to open additional settings">
                                                <Button className='ac-button' onClick={() => { this.postMessage({ action: 'openSettings' }); }}>More Settings...</Button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </GridColumn>
                            </Grid>
                        </form>);
                    }}
                </Form>
            </Page>
        );
    }
}
