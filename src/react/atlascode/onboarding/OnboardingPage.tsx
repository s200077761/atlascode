import { JiraIcon } from '@atlassianlabs/guipi-jira-components';
import {
    Box,
    Button,
    Container,
    darken,
    Grid,
    lighten,
    makeStyles,
    Step,
    StepLabel,
    Stepper,
    Theme,
    Typography,
} from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import React, { useCallback, useEffect, useState } from 'react';
import { ConfigSection, ConfigSubSection } from '../../../lib/ipc/models/config';
import { AuthDialog } from '../config/auth/AuthDialog';
import { AuthDialogControllerContext, useAuthDialog } from '../config/auth/useAuthDialog';
import BitbucketIcon from '../icons/BitbucketIcon';
import DemoButton from './DemoButton';
import { OnboardingControllerContext, useOnboardingController } from './onboardingController';
import ProductSelector from './ProductSelector';
import { SimpleSiteAuthenticator } from './SimpleSiteAuthenticator';

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        width: '100%',
        marginTop: theme.spacing(3),
    },
    button: {
        marginRight: theme.spacing(1),
    },
    pageContent: {
        marginTop: theme.spacing(5),
        marginBottom: theme.spacing(4),
    },
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
        color: 'white',
        textAlign: 'center',
        width: 'inherit',
        height: 'inherit',
    },
}));

function getSteps() {
    return ['Select Products', 'Authenticate', 'Explore'];
}

export const OnboardingPage: React.FunctionComponent = () => {
    const classes = useStyles();
    const [changes, setChanges] = useState<{ [key: string]: any }>({});
    const [state, controller] = useOnboardingController();
    const { authDialogController, authDialogOpen, authDialogProduct, authDialogEntry } = useAuthDialog();

    const [activeStep, setActiveStep] = React.useState(0);
    const steps = getSteps();

    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };

    const handleBack = () => {
        if (activeStep === 2) {
            setActiveStep((prevActiveStep) => prevActiveStep - 2);
        } else {
            setActiveStep((prevActiveStep) => prevActiveStep - 1);
        }
    };

    const handleReset = () => {
        setActiveStep(0);
    };

    const handleJiraToggle = useCallback((enabled: boolean): void => {
        const changes = Object.create(null);
        changes['jira.enabled'] = enabled;
        setChanges(changes);
    }, []);

    const handleBitbucketToggle = useCallback((enabled: boolean): void => {
        const changes = Object.create(null);
        changes['bitbucket.enabled'] = enabled;
        setChanges(changes);
    }, []);

    useEffect(() => {
        if (Object.keys(changes).length > 0) {
            controller.updateConfig(changes);
            setChanges({});
        }
    }, [changes, controller]);

    const getStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <ProductSelector
                        bitbucketToggleHandler={handleBitbucketToggle}
                        jiraToggleHandler={handleJiraToggle}
                        jiraEnabled={state.config['jira.enabled']}
                        bitbucketEnabled={state.config['bitbucket.enabled']}
                    />
                );
            case 1:
                return (
                    <SimpleSiteAuthenticator
                        enableBitbucket={state.config['bitbucket.enabled']}
                        enableJira={state.config['jira.enabled']}
                        bitbucketSites={state.bitbucketSites}
                        jiraSites={state.jiraSites}
                        onFinished={handleNext}
                    />
                );
            case 2:
                return (
                    <Grid container spacing={3} direction="row" alignItems="center" justify="center">
                        <Grid item xs={12}>
                            <Typography variant="h1" align="center">
                                You're ready to get started!{' '}
                                {<CheckCircleIcon fontSize={'large'} htmlColor={'#07b82b'} />}
                            </Typography>
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="h3" align="center">
                                With Atlassian for VS Code, you can create and view issues, start work on issues, create
                                pull requests, do code reviews, start builds, get build statuses and more!{' '}
                            </Typography>
                            <Typography variant="h3" align="center" style={{ marginBottom: '25px' }}>
                                <b>Press the buttons below to try out a common action!</b>
                            </Typography>
                        </Grid>
                        <Grid container xs={12} direction="row" alignItems="center" justify="center" spacing={3}>
                            {state.config['bitbucket.enabled'] && state.bitbucketSites.length > 0 && (
                                <React.Fragment>
                                    <Grid item xs={3}>
                                        <DemoButton
                                            gifLink="https://bitbucket.org/atlassianlabs/atlascode/raw/d0723f3d36d6ca07bcf711268fc5daa5add9a6f5/resources/tutorialGifs/CreatePullRequest.gif"
                                            description="Create a pull request"
                                            productIcon={
                                                <BitbucketIcon
                                                    color={'primary'}
                                                    style={{ float: 'right', color: '#0052CC' }}
                                                />
                                            }
                                            onClick={controller.createPullRequest}
                                        />
                                    </Grid>
                                    <Grid item xs={3}>
                                        <DemoButton
                                            gifLink="https://bitbucket.org/atlassianlabs/atlascode/raw/d0723f3d36d6ca07bcf711268fc5daa5add9a6f5/resources/tutorialGifs/ReviewAndApprovePullRequest.gif"
                                            description="Review a pull request"
                                            productIcon={
                                                <BitbucketIcon
                                                    color={'primary'}
                                                    style={{ float: 'right', color: '#0052CC' }}
                                                />
                                            }
                                            onClick={controller.viewPullRequest}
                                        />
                                    </Grid>
                                </React.Fragment>
                            )}
                            {state.config['jira.enabled'] && state.jiraSites.length > 0 && (
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
                            {state.config['jira.enabled'] && (
                                <Grid item xs={5} alignItems={'flex-end'}>
                                    <Button
                                        className={classes.addSitesButton}
                                        variant="contained"
                                        color="primary"
                                        onClick={() =>
                                            controller.openSettings(ConfigSection.Jira, ConfigSubSection.Auth)
                                        }
                                    >
                                        <Box className={classes.addSitesIcon}>
                                            Add Jira Sites{' '}
                                            {<JiraIcon fontSize={'inherit'} style={{ color: '#0052CC' }} />}
                                        </Box>
                                    </Button>
                                </Grid>
                            )}
                            {state.config['bitbucket.enabled'] && (
                                <Grid item xs={5} alignItems={'flex-end'}>
                                    <Button
                                        className={classes.addSitesButton}
                                        variant="contained"
                                        color="primary"
                                        onClick={() =>
                                            controller.openSettings(ConfigSection.Bitbucket, ConfigSubSection.Auth)
                                        }
                                    >
                                        <Box className={classes.addSitesIcon}>
                                            Add Bitbucket Sites{' '}
                                            {
                                                <BitbucketIcon
                                                    color={'primary'}
                                                    fontSize={'inherit'}
                                                    style={{ color: '#0052CC' }}
                                                />
                                            }
                                        </Box>
                                    </Button>
                                </Grid>
                            )}
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
            default:
                return 'Unknown step';
        }
    };

    return (
        <OnboardingControllerContext.Provider value={controller}>
            <AuthDialogControllerContext.Provider value={authDialogController}>
                <Container maxWidth="xl">
                    <div className={classes.root}>
                        <Stepper activeStep={activeStep}>
                            {steps.map((label, index) => {
                                const stepProps = {};
                                const labelProps = {};
                                return (
                                    <Step key={label} {...stepProps}>
                                        <StepLabel {...labelProps}>{label}</StepLabel>
                                    </Step>
                                );
                            })}
                        </Stepper>
                        <div>
                            {activeStep === steps.length ? (
                                <div>
                                    <Typography className={classes.pageContent}>
                                        All steps completed - you&apos;re finished
                                    </Typography>
                                    <Button onClick={handleReset} className={classes.button}>
                                        Reset
                                    </Button>
                                </div>
                            ) : (
                                <div>
                                    <div className={classes.pageContent}>{getStepContent(activeStep)}</div>
                                    <div style={{ float: 'right', marginBottom: '30px' }}>
                                        <Button
                                            disabled={activeStep === 0}
                                            onClick={handleBack}
                                            className={classes.button}
                                        >
                                            Back
                                        </Button>
                                        {activeStep !== 2 && (
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                onClick={handleNext}
                                                className={classes.button}
                                                disabled={
                                                    !state.config['bitbucket.enabled'] && !state.config['jira.enabled']
                                                }
                                            >
                                                {activeStep === 1 ? 'Skip' : 'Next'}
                                            </Button>
                                        )}
                                        {activeStep === 2 && (
                                            <React.Fragment>
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    onClick={() => controller.openSettings()}
                                                    className={classes.button}
                                                >
                                                    Open Extension Settings
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    color="primary"
                                                    onClick={controller.closePage}
                                                    className={classes.button}
                                                >
                                                    Finish
                                                </Button>
                                            </React.Fragment>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Container>
                <AuthDialog
                    product={authDialogProduct}
                    doClose={authDialogController.close}
                    authEntry={authDialogEntry}
                    open={authDialogOpen}
                    save={controller.login}
                    onExited={authDialogController.onExited}
                />
            </AuthDialogControllerContext.Provider>
        </OnboardingControllerContext.Provider>
    );
};

export default OnboardingPage;
