import { JiraIcon } from '@atlassianlabs/guipi-jira-components';
import { Fade, Grid, makeStyles, Theme, Typography } from '@material-ui/core';
import React, { useCallback, useContext, useState } from 'react';
import BitbucketIcon from '../../icons/BitbucketIcon';
import { DemoDialog } from '../../onboarding/DemoDialog';
import { ConfigControllerContext } from '../configController';
import AltDemoButton from './AltDemoButton';

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            code: {
                backgroundColor: 'rgb(230, 230, 230)', //bright shade of gray
                color: 'rgb(208, 66, 103)', //Slack inline code text color (red)
                borderRadius: 5,
                margin: theme.spacing(0, 1),
                padding: theme.spacing(0, 1),
            },
        } as const)
);

type ExplorePanelProps = {
    visible: boolean;
    config: { [key: string]: any };
};

export const ExplorePanel: React.FunctionComponent<ExplorePanelProps> = ({ visible, config }) => {
    const classes = useStyles();
    const controller = useContext(ConfigControllerContext);
    const [modalVisibility, setModalVisibility] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalGifLink, setModalGifLink] = useState('');
    const [modalDescription, setModalDescription] = useState<React.ReactNode | undefined>();
    const [modalAction, setModalAction] = useState(() => () => {});
    const [modalActionNotAvailable, setModalActionNotAvailable] = useState(false);

    const handleDemoButtonClick = useCallback(
        (gifLink: string, modalTitle: string, description: React.ReactNode, action: () => void, actionNotAvailable) => {
            setModalTitle(modalTitle);
            setModalGifLink(gifLink);
            setModalDescription(description);
            setModalAction(() => action);
            setModalActionNotAvailable(actionNotAvailable);
            setModalVisibility(true);
        },
        []
    );

    const handleModalClose = useCallback(() => {
        setModalVisibility(false);
    }, []);

    const handleModalAction = useCallback(() => {
        modalAction();
    }, [modalAction]);

    return (
        <React.Fragment>
            <DemoDialog
                modalTitle={modalTitle}
                modalGifLink={modalGifLink}
                modalDescription={modalDescription}
                modalVisibility={modalVisibility}
                onClose={handleModalClose}
                action={handleModalAction}
                actionNotAvailable={modalActionNotAvailable}
            />
            <Fade in={visible}>
                <div hidden={!visible} role="tabpanel">
                    <Grid container spacing={3} direction="column">
                        <Grid item>
                            <Typography variant="h2" align="center">
                                Click on the features to see more details!
                            </Typography>
                        </Grid>
                        <Grid item>
                            <AltDemoButton
                                gifLink="https://product-integrations-cdn.atl-paas.net/atlascode/CreateIssueFromTodo.gif"
                                label="Create a Jira issue from a code comment"
                                description={
                                    <p>
                                        Adding a trigger to your code comments will bring up a{' '}
                                        <code className={classes.code}>Create Jira Issue</code> button. Pressing this
                                        button brings up an issue creation screen with the description already filled in
                                        with the contents of the comment. These triggers are configurable in the
                                        extension settings under{' '}
                                        <code className={classes.code}>
                                            Jira > Create Jira Issue Triggers > Comment Triggers
                                        </code>
                                    </p>
                                }
                                productIcon={<JiraIcon style={{ float: 'right', color: '#0052CC' }} />}
                                action={() => () => {}}
                                onClick={handleDemoButtonClick}
                                actionNotAvailable
                            />
                        </Grid>
                        <Grid item>
                            <AltDemoButton
                                gifLink="https://product-integrations-cdn.atl-paas.net/atlascode/StartWorkTutorial.gif"
                                label="Start Work from a Jira issue"
                                description={
                                    <p>
                                        When viewing a Jira issue, pressing{' '}
                                        <code className={classes.code}>Start Work</code> will open the{' '}
                                        <code className={classes.code}>Start Work Screen.</code> From here you can{' '}
                                        <b>
                                            assign the issue to yourself, transition the issue's status, and create (and
                                            checkout) a branch
                                        </b>{' '}
                                        for this issue all in <b>one click!</b> Clicking the{' '}
                                        <code className={classes.code}>Details</code> node will open a WebView with an
                                        overview of the pull request. Clicking the file nodes will show a diff for that
                                        file with inline comments from Bitbucket.
                                    </p>
                                }
                                productIcon={
                                    <React.Fragment>
                                        <BitbucketIcon color={'primary'} style={{ float: 'right', color: '#0052CC' }} />
                                        <JiraIcon style={{ float: 'right', color: '#0052CC' }} />
                                    </React.Fragment>
                                }
                                action={() => () => {}}
                                onClick={handleDemoButtonClick}
                                actionNotAvailable
                            />
                        </Grid>
                        <Grid item>
                            <AltDemoButton
                                gifLink="https://product-integrations-cdn.atl-paas.net/atlascode/CreateJiraIssue.gif"
                                label="Create a Jira issue"
                                description={
                                    <p>
                                        Jira issues can be created by pressing the{' '}
                                        <code className={classes.code}>Create issue...</code> button in the{' '}
                                        <code className={classes.code}>JIRA ISSUES</code>
                                        explorer. This will open a WebView in VS Code that resembles the issue creation
                                        process on the Jira website.
                                    </p>
                                }
                                productIcon={<JiraIcon style={{ float: 'right', color: '#0052CC' }} />}
                                action={controller.createJiraIssue}
                                onClick={handleDemoButtonClick}
                            />
                        </Grid>
                        <Grid item>
                            <AltDemoButton
                                gifLink="https://product-integrations-cdn.atl-paas.net/atlascode/ReviewJiraIssue.gif"
                                label="View a Jira issue"
                                description={
                                    <p>
                                        Jira issues show up in the <code className={classes.code}>JIRA ISSUES</code>{' '}
                                        explorer and are grouped by JQL queries/filters. The issues which show up are
                                        configurable in the extension settings under{' '}
                                        <code className={classes.code}>
                                            Jira > Jira Issues Explorer > Filters and Custom JQL.
                                        </code>
                                        To view an issue, expand a filter and click on the issue.
                                    </p>
                                }
                                productIcon={<JiraIcon style={{ float: 'right', color: '#0052CC' }} />}
                                action={controller.viewJiraIssue}
                                onClick={handleDemoButtonClick}
                            />
                        </Grid>
                        <Grid item>
                            <AltDemoButton
                                gifLink="https://product-integrations-cdn.atl-paas.net/atlascode/CreatePullRequest.gif"
                                label="Create a pull request"
                                description={
                                    <p>
                                        Bitbucket pull requests can be created by pressing the{' '}
                                        <code className={classes.code}>Create pull request...</code>
                                        button in the <code className={classes.code}>BITBUCKET PULL REQUESTS</code>{' '}
                                        explorer. This will open a webview that resembles the pull request creation
                                        process on the Bitbucket website.
                                    </p>
                                }
                                productIcon={
                                    <BitbucketIcon color={'primary'} style={{ float: 'right', color: '#0052CC' }} />
                                }
                                action={controller.createPullRequest}
                                onClick={handleDemoButtonClick}
                            />
                        </Grid>
                        <Grid item>
                            <AltDemoButton
                                gifLink="https://product-integrations-cdn.atl-paas.net/atlascode/ReviewAndApprovePullRequest.gif"
                                label="Review a pull request"
                                description={
                                    <p>
                                        Bitbucket pull request show up in the{' '}
                                        <code className={classes.code}>BITBUCKET PULL REQUESTS</code> explorer and are
                                        grouped by repository. Expanding a pull request will reveal a{' '}
                                        <code className={classes.code}>Details</code> node nodes for each affected file.
                                        Clicking the <code className={classes.code}>Details</code> node will open a
                                        WebView with an overview of the pull request. Clicking the file nodes will show
                                        a diff for that file with inline comments from Bitbucket.
                                    </p>
                                }
                                productIcon={
                                    <BitbucketIcon color={'primary'} style={{ float: 'right', color: '#0052CC' }} />
                                }
                                action={controller.viewPullRequest}
                                onClick={handleDemoButtonClick}
                            />
                        </Grid>
                    </Grid>
                </div>
            </Fade>
        </React.Fragment>
    );
};
