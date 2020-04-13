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
    Typography
} from '@material-ui/core';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import React, { useCallback, useEffect, useState } from 'react';
import { ProductBitbucket, ProductJira } from '../../../atlclients/authInfo';
import { SiteAuthenticator } from '../config/auth/SiteAuthenticator';
import BitbucketIcon from '../icons/BitbucketIcon';
import DemoButton from './DemoButton';
import { OnboardingControllerContext, useOnboardingController } from './onboardingController';
import ProductSelector from './ProductSelector';

const useStyles = makeStyles((theme: Theme) => ({
    root: {
        width: '100%',
        marginTop: theme.spacing(3)
    },
    button: {
        marginRight: theme.spacing(1)
    },
    pageContent: {
        marginTop: theme.spacing(5),
        marginBottom: theme.spacing(4)
    },
    authContainer: {
        padding: theme.spacing(3),
        paddingBottom: theme.spacing(8),
        width: '100%',
        backgroundColor:
            theme.palette.type === 'dark'
                ? lighten(theme.palette.background.paper, 0.02)
                : darken(theme.palette.background.paper, 0.02)
    }
}));

function getSteps() {
    return ['Select Products', 'Authenticate', 'Explore'];
}

export const OnboardingPage: React.FunctionComponent = () => {
    const classes = useStyles();
    const [changes, setChanges] = useState<{ [key: string]: any }>({});
    const [state, controller] = useOnboardingController();

    const [activeStep, setActiveStep] = React.useState(0);
    const steps = getSteps();

    const handleNext = () => {
        setActiveStep(prevActiveStep => prevActiveStep + 1);
    };

    const handleBack = () => {
        setActiveStep(prevActiveStep => prevActiveStep - 1);
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
                    <React.Fragment>
                        <Grid container spacing={3} direction="row" alignItems="center" justify="center">
                            <Grid item xs={12}>
                                <Typography variant="h1" align="center">
                                    Authenticate with the selected products
                                </Typography>
                            </Grid>
                            {state.config['jira.enabled'] && (
                                <Grid item xs={7}>
                                    <Box className={classes.authContainer}>
                                        <SiteAuthenticator
                                            product={ProductJira}
                                            isRemote={state.isRemote}
                                            sites={state.jiraSites}
                                        />
                                    </Box>
                                </Grid>
                            )}
                            {state.config['bitbucket.enabled'] && (
                                <Grid item xs={7}>
                                    <Box className={classes.authContainer}>
                                        <SiteAuthenticator
                                            product={ProductBitbucket}
                                            isRemote={state.isRemote}
                                            sites={state.bitbucketSites}
                                        />
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    </React.Fragment>
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
                        {state.config['jira.enabled'] && (
                            <React.Fragment>
                                <Grid item xs={3}>
                                    <DemoButton
                                        gifLink="https://bitbucket.org/atlassianlabs/atlascode/raw/b174e2b360854b526aec766fa5b5a3b34c49b148/resources/tutorialGifs/StartWorkTutorial.gif"
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
                                        gifLink="https://bitbucket.org/atlassianlabs/atlascode/raw/b174e2b360854b526aec766fa5b5a3b34c49b148/resources/tutorialGifs/StartWorkTutorial.gif"
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
                        {state.config['bitbucket.enabled'] && (
                            <React.Fragment>
                                <Grid item xs={3}>
                                    <DemoButton
                                        gifLink="https://bitbucket.org/atlassianlabs/atlascode/raw/b174e2b360854b526aec766fa5b5a3b34c49b148/resources/tutorialGifs/StartWorkTutorial.gif"
                                        description="Create a Jira issue"
                                        productIcon={<JiraIcon style={{ float: 'right', color: '#0052CC' }} />}
                                    />
                                </Grid>
                                <Grid item xs={3}>
                                    <DemoButton
                                        gifLink="https://bitbucket.org/atlassianlabs/atlascode/raw/b174e2b360854b526aec766fa5b5a3b34c49b148/resources/tutorialGifs/StartWorkTutorial.gif"
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
                                    <Button disabled={activeStep === 0} onClick={handleBack} className={classes.button}>
                                        Back
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        onClick={handleNext}
                                        className={classes.button}
                                        disabled={!state.config['bitbucket.enabled'] && !state.config['jira.enabled']}
                                    >
                                        {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Container>
        </OnboardingControllerContext.Provider>
    );
};

export default OnboardingPage;
