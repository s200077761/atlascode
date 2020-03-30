import { RefreshButton } from '@atlassianlabs/guipi-core-components';
import { AppBar, Container, Grid, Paper, Toolbar, Typography } from '@material-ui/core';
import React from 'react';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { PMFDisplay } from '../common/pmf/PMFDisplay';
import { BitbucketIssueControllerContext, useBitbucketIssueController } from './bitbucketIssueController';

const BitbucketIssuePage: React.FunctionComponent = () => {
    const [state, controller] = useBitbucketIssueController();

    return (
        <BitbucketIssueControllerContext.Provider value={controller}>
            <Container maxWidth="xl">
                <AppBar position="relative">
                    <Toolbar>
                        <Typography variant="h3">Bitbucket issue</Typography>
                        <RefreshButton loading={state.isSomethingLoading} onClick={controller.refresh} />
                    </Toolbar>
                </AppBar>
                <Grid container spacing={1}>
                    <Grid item xs={12} md={9} lg={10} xl={10}>
                        <Paper>
                            <ErrorDisplay />
                            <PMFDisplay postMessageFunc={controller.postMessage} />
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </BitbucketIssueControllerContext.Provider>
    );
};

export default BitbucketIssuePage;
