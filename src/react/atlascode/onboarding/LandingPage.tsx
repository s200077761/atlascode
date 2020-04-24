import { JiraIcon } from '@atlassianlabs/guipi-jira-components';
import { Box, Button, darken, Grid, lighten, makeStyles, Theme, Typography } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import WhatshotIcon from '@material-ui/icons/Whatshot';
import React, { useContext } from 'react';
import { KnownLinkID } from '../../../lib/ipc/models/common';
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
    falseLink: {
        textTransform: 'none',
        backgroundColor:
            theme.palette.type === 'dark'
                ? lighten(theme.palette.background.paper, 0.02)
                : darken(theme.palette.background.paper, 0.02),
        width: '100%',
        height: '100%',
        marginBottom: '15px',
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
        <Grid container spacing={3} direction="row" justify="center">
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
            <Grid container xs={12} direction="row" justify="center" spacing={3}>
                <Grid
                    hidden={!(jiraEnabled && jiraSites.length > 0)}
                    item
                    lg={3}
                    md={5}
                    sm={6}
                    xs={12}
                    alignItems={'flex-end'}
                >
                    <DemoButton
                        gifLink="https://product-integrations-cdn.atl-paas.net/atlascode/CreateJiraIssue.gif"
                        description="Create a Jira issue"
                        productIcon={<JiraIcon style={{ float: 'right', color: '#0052CC' }} />}
                        onClick={controller.createJiraIssue}
                    />
                </Grid>
                <Grid
                    hidden={!(jiraEnabled && jiraSites.length > 0)}
                    item
                    lg={3}
                    md={5}
                    sm={6}
                    xs={12}
                    alignItems={'flex-end'}
                >
                    <DemoButton
                        gifLink="https://product-integrations-cdn.atl-paas.net/atlascode/ReviewJiraIssue.gif"
                        description="View a Jira issue"
                        productIcon={<JiraIcon style={{ float: 'right', color: '#0052CC' }} />}
                        onClick={controller.viewJiraIssue}
                    />
                </Grid>
                <Grid
                    hidden={!(bitbucketEnabled && bitbucketSites.length > 0)}
                    item
                    lg={3}
                    md={5}
                    sm={6}
                    xs={12}
                    alignItems={'flex-end'}
                >
                    <DemoButton
                        gifLink="https://product-integrations-cdn.atl-paas.net/atlascode/CreatePullRequest.gif"
                        description="Create a pull request"
                        productIcon={<BitbucketIcon color={'primary'} style={{ float: 'right', color: '#0052CC' }} />}
                        onClick={controller.createPullRequest}
                    />
                </Grid>
                <Grid
                    hidden={!(bitbucketEnabled && bitbucketSites.length > 0)}
                    item
                    lg={3}
                    md={5}
                    sm={6}
                    xs={12}
                    alignItems={'flex-end'}
                >
                    <DemoButton
                        gifLink="https://product-integrations-cdn.atl-paas.net/atlascode/ReviewAndApprovePullRequest.gif"
                        description="Review a pull request"
                        productIcon={<BitbucketIcon color={'primary'} style={{ float: 'right', color: '#0052CC' }} />}
                        onClick={controller.viewPullRequest}
                    />
                </Grid>
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
            <Grid container xs={12} direction="row" justify="center" spacing={2}>
                <Grid item hidden={!jiraEnabled} lg={5} md={8} sm={12} xs={12} alignItems={'flex-end'}>
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
                <Grid item hidden={!bitbucketEnabled} lg={5} md={8} sm={12} xs={12} alignItems={'flex-end'}>
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
                    <Typography variant="h3" align="center" style={{ marginBottom: '25px' }}>
                        Do you use Slack, Google Sheets, Excel, Teams, or Outlook? Check out our other Integrations!
                    </Typography>
                </Grid>
                <Grid container xs={12} direction="row" alignItems="center" justify="center">
                    <Grid item lg={5} md={8} sm={12} xs={12}>
                        <Button
                            onClick={() => controller.openLink(KnownLinkID.Integrations)}
                            className={classes.falseLink}
                        >
                            <Box className={classes.addSitesIcon}>
                                More Integrations{' '}
                                {<WhatshotIcon color={'primary'} fontSize={'inherit'} style={{ color: '#0052CC' }} />}
                            </Box>
                        </Button>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default LandingPage;
