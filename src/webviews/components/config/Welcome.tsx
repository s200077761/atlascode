import * as React from 'react';
import { WebviewComponent } from '../WebviewComponent';
import Page, { Grid, GridColumn } from '@atlaskit/page';
import PageHeader from '@atlaskit/page-header';
import Button, { ButtonGroup } from '@atlaskit/button';
import { colors } from '@atlaskit/theme';
import DisplayFeedback from './DisplayFeedback';
import { Action } from '../../../ipc/messaging';
import { FeedbackData, SubmitFeedbackAction } from '../../../ipc/configActions';
import BitbucketIcon from '@atlaskit/logo/dist/esm/BitbucketLogo/Icon';
// import JiraIcon from '@atlaskit/logo/dist/esm/JiraLogo/Icon';
// import PreferencesIcon from '@atlaskit/icon/glyph/preferences';
// import IssuesIcon from '@atlaskit/icon/glyph/issues';
// import ArrowUpCircleIcon from '@atlaskit/icon/glyph/arrow-up-circle';

type Emit = SubmitFeedbackAction | Action;
export default class WelcomePage extends WebviewComponent<Emit, {}, {}, {}> {
    constructor(props: any) {
        super(props);
    }

    public onMessageReceived(e: any) {

    }

    handleConfigure = () => {
        this.postMessage({ action: 'showConfigPage' });
    }

    handleSourceLink = () => {
        this.postMessage({ action: 'sourceLink' });
    }

    handleIssueLink = () => {
        this.postMessage({ action: 'issueLink' });
    }

    handleFeedback = (feedback: FeedbackData) => {
        this.postMessage({ action: 'submitFeedback', feedback: feedback });
    }

    public render() {
        const bbicon = <BitbucketIcon size="small" iconColor={colors.B200} iconGradientStart={colors.B400} iconGradientStop={colors.B200} />;

        return (
            <Page>
                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn>
                        <PageHeader><p>Welcome To Atlassian for VSCode!</p></PageHeader>
                        <ButtonGroup>
                            <Button className='ac-button' onClick={this.handleConfigure}>Configure Atlassian Settings</Button>
                            <DisplayFeedback onFeedback={this.handleFeedback} />
                            <Button className='ac-link-button' appearance="link" iconBefore={bbicon} onClick={this.handleSourceLink}>Source Code</Button>
                            <Button className='ac-link-button' appearance="link" iconBefore={bbicon} onClick={this.handleIssueLink}>Got Issues?</Button>
                        </ButtonGroup>
                    </GridColumn>
                </Grid>

                <Grid spacing='comfortable' layout='fixed'>
                    <GridColumn medium={9}>
                        <h2>🎉 First Time Here? 🎉</h2>
                        <section>
                            <p>To get started, you'll need to authenticate with Jira and/or Bitbucket.</p>
                            <p>Use the 'Configure Atlassian Settings' button above to authenticate.</p>
                            <p>The configuration screen can also be used to completely customize the extension to fit your own workflow.</p>
                            <p>You can always get to the configuration screen by opening the command palette and typing 'Atlassian: Open Settings'</p>
                        </section>
                        <section>
                            <h2>What's New</h2>
                            <p>In future releases, you'll find out what's new and hot here.</p>
                            <p>For this initial release, *everything* is new! (and 🔥) </p>
                        </section>
                        <section>
                            <h2>Feedback</h2>
                            <p>We can only make this extension better with your help!</p>
                            <p>Make sure to let us know how we're doing by using the feedback buttons available on this screen and the configuration screen.</p>
                        </section>
                    </GridColumn>
                </Grid>
            </Page>
        );
    }
}
