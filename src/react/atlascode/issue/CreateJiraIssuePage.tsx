import MomentUtils from '@date-io/moment';
import {
    AppBar,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Container,
    Divider,
    Grid,
    LinearProgress,
    makeStyles,
    MenuItem,
    Paper,
    TextField,
    Theme,
    Toolbar,
    Typography,
    useTheme,
} from '@material-ui/core';
import { MuiPickersUtilsProvider } from '@material-ui/pickers';
import React, { useCallback, useMemo, useState } from 'react';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { PMFDisplay } from '../common/pmf/PMFDisplay';
import { CreateJiraIssueControllerContext, useCreateJiraIssuePageController } from './createJiraIssuePageController';

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            title: {
                flexGrow: 0,
                marginRight: theme.spacing(3),
                marginLeft: theme.spacing(1),
            },
            targetSelectLabel: {
                marginRight: theme.spacing(1),
            },
            grow: {
                flexGrow: 1,
            },
            paper100: {
                overflow: 'hidden',
                height: '100%',
            },
            paperOverflow: {
                overflow: 'hidden',
            },
        } as const)
);

const CreateJiraIssuePage: React.FunctionComponent = () => {
    const theme = useTheme<Theme>();
    const classes = useStyles();
    const [state, controller] = useCreateJiraIssuePageController();

    const [createInProgress, setCreateInProgress] = useState(false);

    const handleCreate = useCallback(async () => {
        setCreateInProgress(true);
        try {
            await controller.createIssue();
        } finally {
            setCreateInProgress(false);
        }
    }, [controller]);

    const handleSiteSelection = useCallback(
        async (event: React.ChangeEvent<{ name?: string | undefined; value: any }>) => {
            await controller.selectSite(event.target.value);
        },
        [controller]
    );

    const jiraFields = useMemo(() => {
        return (
            <div>
                {controller.createIssueUIHelper &&
                    controller.createIssueUIHelper.getCommonFieldMarkup().map((item) => <Grid item>{item}</Grid>)}
                <Grid item>
                    <Divider />
                </Grid>
                {controller.createIssueUIHelper &&
                    controller.createIssueUIHelper.getAdvancedFieldMarkup().map((item) => <Grid item>{item}</Grid>)}
                <Grid item>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleCreate}
                        disabled={createInProgress}
                        endIcon={
                            createInProgress ? (
                                <CircularProgress color="inherit" size={theme.typography.fontSize} />
                            ) : null
                        }
                    >
                        Create
                    </Button>
                </Grid>
            </div>
        );
    }, [controller.createIssueUIHelper, createInProgress, handleCreate, theme.typography.fontSize]);

    return (
        <MuiPickersUtilsProvider utils={MomentUtils}>
            <CreateJiraIssueControllerContext.Provider value={controller}>
                <Container maxWidth="xl">
                    <AppBar position="relative">
                        <Toolbar>
                            <Typography variant="h3" className={classes.title}>
                                Create issue
                            </Typography>
                            <Box className={classes.grow} />
                        </Toolbar>
                    </AppBar>
                    <Grid container spacing={1}>
                        <Grid item xs={12} zeroMinWidth>
                            <Paper className={classes.paper100}>
                                <Box margin={2}>
                                    <ErrorDisplay />
                                    <PMFDisplay postMessageFunc={controller.postMessage} />
                                    <Grid container spacing={2} direction="column">
                                        <Grid item>
                                            <TextField
                                                select
                                                size="small"
                                                margin="dense"
                                                value={state.site.id || ''}
                                                onChange={handleSiteSelection}
                                                id={'site'}
                                                key={'site'}
                                                name={'Site'}
                                                label={'Site'}
                                            >
                                                {state.sitesAvailable.map((site) => (
                                                    <MenuItem key={site.id} value={site.id}>
                                                        <Grid container spacing={1} direction="row" alignItems="center">
                                                            <Grid item>
                                                                <Avatar
                                                                    style={{ height: '1em', width: '1em' }}
                                                                    variant="square"
                                                                    src={site.avatarUrl}
                                                                />
                                                            </Grid>
                                                            <Grid item>
                                                                <Typography>{site.name}</Typography>
                                                            </Grid>
                                                        </Grid>
                                                    </MenuItem>
                                                ))}
                                            </TextField>
                                        </Grid>

                                        {state.isSomethingLoading ? <LinearProgress /> : jiraFields}
                                    </Grid>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </Container>
            </CreateJiraIssueControllerContext.Provider>
        </MuiPickersUtilsProvider>
    );
};

export default CreateJiraIssuePage;
