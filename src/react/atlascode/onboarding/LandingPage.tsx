import { JiraIcon } from '@atlassianlabs/guipi-jira-components';
import { Box, Button, darken, Grid, lighten, makeStyles, Theme, Typography } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import React, { useContext } from 'react';
import { ConfigSection, ConfigSubSection } from '../../../lib/ipc/models/config';
import { SiteWithAuthInfo } from '../../../lib/ipc/toUI/config';
import BitbucketIcon from '../icons/BitbucketIcon';
import DemoButton from './DemoButton';
import { OnboardingControllerContext } from './onboardingController';

const useStyles = makeStyles((theme: Theme) => ({
    addSitesButton: {
        width: '100%',
        height: '100%',
        textTransform: 'none',
        backgroundColor:
            theme.palette.type === 'dark'
                ? lighten(theme.palette.background.paper, 0.02)
                : darken(theme.palette.background.paper, 0.02),
    },
    addSitesIcon: {
        fontSize: 50,
        color: theme.palette.type === 'dark' ? 'white' : '#47525c',
        textAlign: 'center',
        width: 'inherit',
        height: 'inherit',
    },
    landingPageTextColor: {
        color: theme.palette.type === 'dark' ? 'white' : '#47525c',
    },
}));

export type LandingPageProps = {
    bitbucketEnabled: boolean;
    bitbucketSites: SiteWithAuthInfo[];
    jiraEnabled: boolean;
    jiraSites: SiteWithAuthInfo[];
};

export const LandingPage: React.FunctionComponent<LandingPageProps> = ({
    bitbucketEnabled,
    bitbucketSites,
    jiraEnabled,
    jiraSites,
}) => {
    const classes = useStyles();
    const controller = useContext(OnboardingControllerContext);

    return (
        <Grid container spacing={3} direction="row" alignItems="center" justify="center">
            <Grid item xs={12}>
                <Typography variant="h1" align="center">
                    You're ready to get started! {<CheckCircleIcon fontSize={'large'} htmlColor={'#07b82b'} />}
                </Typography>
            </Grid>

            <Grid item xs={12}>
                <Typography variant="h3" align="center">
                    With Atlassian for VS Code, you can create and view issues, start work on issues, create pull
                    requests, do code reviews, start builds, get build statuses and more!{' '}
                </Typography>
                <Typography variant="h3" align="center" style={{ marginBottom: '25px' }}>
                    <b>Press the buttons below to try out a common action!</b>
                </Typography>
            </Grid>
            <Grid container xs={12} direction="row" alignItems="center" justify="center" spacing={3}>
                {bitbucketEnabled && bitbucketSites.length > 0 && (
                    <React.Fragment>
                        <Grid item xs={3}>
                            <DemoButton
                                gifLink="https://bitbucket.org/atlassianlabs/atlascode/raw/d0723f3d36d6ca07bcf711268fc5daa5add9a6f5/resources/tutorialGifs/CreatePullRequest.gif"
                                description="Create a pull request"
                                productIcon={
                                    <BitbucketIcon color={'primary'} style={{ float: 'right', color: '#0052CC' }} />
                                }
                                onClick={controller.createPullRequest}
                            />
                        </Grid>
                        <Grid item xs={3}>
                            <DemoButton
                                gifLink="https://bitbucket.org/atlassianlabs/atlascode/raw/d0723f3d36d6ca07bcf711268fc5daa5add9a6f5/resources/tutorialGifs/ReviewAndApprovePullRequest.gif"
                                description="Review a pull request"
                                productIcon={
                                    <BitbucketIcon color={'primary'} style={{ float: 'right', color: '#0052CC' }} />
                                }
                                onClick={controller.viewPullRequest}
                            />
                        </Grid>
                    </React.Fragment>
                )}
                {jiraEnabled && jiraSites.length > 0 && (
                    <React.Fragment>
                        <Grid item xs={3}>
                            <DemoButton
                                gifLink="https://bitbucket.org/atlassianlabs/atlascode/raw/d0723f3d36d6ca07bcf711268fc5daa5add9a6f5/resources/tutorialGifs/CreateJiraIssue.gif"
                                description="Create a Jira issue"
                                productIcon={<JiraIcon style={{ float: 'right', color: '#0052CC' }} />}
                                onClick={controller.createJiraIssue}
                            />
                        </Grid>
                        <Grid item xs={3}>
                            <DemoButton
                                gifLink="https://bitbucket.org/atlassianlabs/atlascode/raw/d0723f3d36d6ca07bcf711268fc5daa5add9a6f5/resources/tutorialGifs/ReviewJiraIssue.gif"
                                description="View a Jira issue"
                                productIcon={<JiraIcon style={{ float: 'right', color: '#0052CC' }} />}
                                onClick={controller.viewJiraIssue}
                            />
                        </Grid>
                    </React.Fragment>
                )}
            </Grid>
            <Grid item xs={12}>
                <Typography variant="h1" align="center" style={{ marginTop: '50px' }}>
                    Need to add more sites?
                </Typography>
            </Grid>
            <Grid item xs={12}>
                <Typography variant="h3" align="center" style={{ marginBottom: '25px' }}>
                    Need to authenticate with multiple sites? We've got you covered.
                </Typography>
            </Grid>
            <Grid container xs={12} direction="row" alignItems="center" justify="center" spacing={2}>
                <Grid item hidden={!jiraEnabled} xs={5} alignItems={'flex-end'}>
                    <Button
                        className={classes.addSitesButton}
                        variant="contained"
                        color="primary"
                        onClick={() => controller.openSettings(ConfigSection.Jira, ConfigSubSection.Auth)}
                    >
                        <Box className={classes.addSitesIcon}>
                            Add Jira Sites {<JiraIcon fontSize={'inherit'} style={{ color: '#0052CC' }} />}
                        </Box>
                    </Button>
                </Grid>
                <Grid item hidden={!bitbucketEnabled} xs={5} alignItems={'flex-end'}>
                    <Button
                        className={classes.addSitesButton}
                        variant="contained"
                        color="primary"
                        onClick={() => controller.openSettings(ConfigSection.Bitbucket, ConfigSubSection.Auth)}
                    >
                        <Box className={classes.addSitesIcon}>
                            Add Bitbucket Sites{' '}
                            {<BitbucketIcon color={'primary'} fontSize={'inherit'} style={{ color: '#0052CC' }} />}
                        </Box>
                    </Button>
                </Grid>
                <Grid item xs={12}>
                    <Typography variant="h1" align="center" style={{ marginTop: '50px' }}>
                        Supercharge your workflow!
                    </Typography>
                </Grid>
                <Grid item xs={12}>
                    <Typography variant="h3" align="center" style={{ marginBottom: '15px' }}>
                        Do you use Slack, Google Sheets, Excel, Teams, or Outlook? Check out our other{' '}
                        {
                            <a href="https://integrations.atlassian.com" style={{ color: '#292cd6' }}>
                                integrations
                            </a>
                        }
                        !
                    </Typography>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default LandingPage;
