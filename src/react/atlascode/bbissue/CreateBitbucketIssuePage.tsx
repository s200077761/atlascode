import { RefreshButton } from '@atlassianlabs/guipi-core-components';
import {
    AppBar,
    Box,
    Button,
    Container,
    Grid,
    makeStyles,
    MenuItem,
    Paper,
    TextField,
    Theme,
    Toolbar,
    Typography,
    IconButton,
    Tooltip,
    CircularProgress,
    useTheme,
} from '@material-ui/core';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import BlockIcon from '@material-ui/icons/Block';
import BugReportIcon from '@material-ui/icons/BugReport';
import CheckBoxOutlinedIcon from '@material-ui/icons/CheckBoxOutlined';
import EmojiObjectsIcon from '@material-ui/icons/EmojiObjects';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import LaunchIcon from '@material-ui/icons/Launch';
import RadioButtonUncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import React, { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { emptyBitbucketSite } from '../../../bitbucket/model';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { PMFDisplay } from '../common/pmf/PMFDisplay';
import {
    CreateBitbucketIssueControllerContext,
    useCreateBitbucketIssueController,
} from './createBitbucketIssueController';

const priorityIcon = {
    trivial: <RadioButtonUncheckedIcon />,
    minor: <ArrowDownwardIcon />,
    major: <KeyboardArrowUpIcon />,
    critical: <ArrowUpwardIcon />,
    blocker: <BlockIcon />,
};

const typeIcon = {
    bug: <BugReportIcon />,
    enhancement: <ArrowUpwardIcon />,
    proposal: <EmojiObjectsIcon />,
    task: <CheckBoxOutlinedIcon />,
};

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

interface FormData {
    title: string;
    description: string;
    kind: string;
    priority: string;
}

const defaultFormData = {
    title: '',
    description: '',
    kind: 'enhancement',
    priority: 'minor',
};

const CreateBitbucketIssuePage: React.FunctionComponent = () => {
    const theme = useTheme<Theme>();
    const classes = useStyles();
    const [state, controller] = useCreateBitbucketIssueController();

    const { control, handleSubmit, errors } = useForm<FormData>({ defaultValues: defaultFormData, mode: 'onBlur' });
    const [submitState, setSubmitState] = useState<'initial' | 'submitting'>('initial');

    const submitForm = useCallback(
        async (formData: FormData) => {
            console.log(formData);
            try {
                setSubmitState('submitting');
                await controller.submit({
                    site: state.site,
                    ...formData,
                });
            } finally {
                // Resetting back to inital state both in error and success case
                // (ok to do this for success case as the webview is hidden automatically if the request succeeds)
                setSubmitState('initial');
            }
        },
        [controller, state.site]
    );

    return (
        <CreateBitbucketIssueControllerContext.Provider value={controller}>
            <Container maxWidth="lg" hidden={state.site === emptyBitbucketSite}>
                <AppBar position="relative">
                    <Toolbar>
                        <Typography variant="h3" className={classes.title}>
                            Create issue - {state.site.ownerSlug}/{state.site.repoSlug}
                        </Typography>
                        <Box className={classes.grow} />
                        <Tooltip title="Create in browser...">
                            <IconButton
                                href={`https://bitbucket.org/${state.site.ownerSlug}/${state.site.repoSlug}/issues/new`}
                            >
                                <LaunchIcon />
                            </IconButton>
                        </Tooltip>
                        <RefreshButton loading={state.isSomethingLoading} onClick={controller.refresh} />
                    </Toolbar>
                </AppBar>
                <Grid container spacing={1}>
                    <Grid item xs={12}>
                        <Paper className={classes.paper100}>
                            <Box margin={2}>
                                <ErrorDisplay />
                                <PMFDisplay postMessageFunc={controller.postMessage} />
                                <form onSubmit={handleSubmit(submitForm)}>
                                    <Grid container spacing={1} direction="column">
                                        <Grid item xs={12}>
                                            <Controller
                                                as={
                                                    <TextField
                                                        required
                                                        fullWidth
                                                        size="small"
                                                        error={!!errors.title}
                                                        helperText={errors.title?.message}
                                                    />
                                                }
                                                label="Title"
                                                name="title"
                                                control={control}
                                                rules={{
                                                    required: { message: 'Title is required', value: true },
                                                    minLength: 1,
                                                }}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Controller
                                                as={<TextField fullWidth multiline size="small" rows={4} />}
                                                label="Description"
                                                name="description"
                                                control={control}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Controller
                                                as={
                                                    <TextField select size="small">
                                                        {Object.getOwnPropertyNames(typeIcon).map((name) => (
                                                            <MenuItem key={name} value={name}>
                                                                <Grid container spacing={1} direction="row">
                                                                    <Grid item>{typeIcon[name]}</Grid>
                                                                    <Grid item>
                                                                        <Typography>{name}</Typography>
                                                                    </Grid>
                                                                </Grid>
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>
                                                }
                                                label="Kind"
                                                name="kind"
                                                control={control}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Controller
                                                as={
                                                    <TextField select size="small">
                                                        {Object.getOwnPropertyNames(priorityIcon).map((name) => (
                                                            <MenuItem key={name} value={name}>
                                                                <Grid container spacing={1} direction="row">
                                                                    <Grid item>{priorityIcon[name]}</Grid>
                                                                    <Grid item>
                                                                        <Typography>{name}</Typography>
                                                                    </Grid>
                                                                </Grid>
                                                            </MenuItem>
                                                        ))}
                                                    </TextField>
                                                }
                                                label="Priority"
                                                name="priority"
                                                control={control}
                                            />
                                        </Grid>
                                        <Grid item xs={12}>
                                            <Button
                                                variant="contained"
                                                color="primary"
                                                type="submit"
                                                endIcon={
                                                    submitState === 'submitting' ? (
                                                        <CircularProgress
                                                            color="inherit"
                                                            size={theme.typography.fontSize}
                                                        />
                                                    ) : null
                                                }
                                            >
                                                Submit
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </form>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </CreateBitbucketIssueControllerContext.Provider>
    );
};

export default CreateBitbucketIssuePage;
