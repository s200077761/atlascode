import { JiraIcon } from '@atlassianlabs/guipi-jira-components';
import { Button, Container, Grid, makeStyles, Step, StepLabel, Stepper, Theme, Typography } from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import React, { useCallback, useEffect, useState } from 'react';
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
                                The Atlassian sidebar provides quick access to most of our features. Be sure to check it
                                out by pressing the Atlassian logo in the extension sidebar!
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="h3" align="center">
                                Try out some common actions by pressing on the buttons below!
                            </Typography>
                        </Grid>
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
                                    />
                                </Grid>
                                <Grid item xs={3}>
                                    <DemoButton
                                        gifLink="https://bitbucket.org/atlassianlabs/atlascode/raw/d0723f3d36d6ca07bcf711268fc5daa5add9a6f5/resources/tutorialGifs/ReviewJiraIssue.gif"
                                        description="View a Jira issue"
                                        productIcon={<JiraIcon style={{ float: 'right', color: '#0052CC' }} />}
                                    />
                                </Grid>
                            </React.Fragment>
                        )}
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
                                    <div>
                                        <Button
                                            disabled={activeStep === 0}
                                            onClick={handleBack}
                                            className={classes.button}
                                        >
                                            Back
                                        </Button>
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
