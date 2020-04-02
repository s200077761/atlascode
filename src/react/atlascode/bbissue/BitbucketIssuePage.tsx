import Bug16Icon from '@atlaskit/icon-object/glyph/bug/16';
import Improvement16Icon from '@atlaskit/icon-object/glyph/improvement/16';
import PriorityBlockerIcon from '@atlaskit/icon-priority/glyph/priority-blocker';
import PriorityCriticalIcon from '@atlaskit/icon-priority/glyph/priority-critical';
import PriorityMajorIcon from '@atlaskit/icon-priority/glyph/priority-major';
import PriorityMinorIcon from '@atlaskit/icon-priority/glyph/priority-minor';
import PriorityTrivialIcon from '@atlaskit/icon-priority/glyph/priority-trivial';
import LightbulbFilledIcon from '@atlaskit/icon/glyph/lightbulb-filled';
import StarIcon from '@atlaskit/icon/glyph/star';
import TaskIcon from '@atlaskit/icon/glyph/task';
import VidPlayIcon from '@atlaskit/icon/glyph/vid-play';
import WatchIcon from '@atlaskit/icon/glyph/watch';
import { RefreshButton } from '@atlassianlabs/guipi-core-components';
import {
    AppBar,
    Avatar,
    Box,
    Button,
    Container,
    Grid,
    Link,
    Paper,
    Theme,
    Toolbar,
    Tooltip,
    Typography
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import { format } from 'date-fns';
import React from 'react';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { PMFDisplay } from '../common/pmf/PMFDisplay';
import { BitbucketIssueControllerContext, useBitbucketIssueController } from './bitbucketIssueController';
import InlinedRenderedTextEditor from './InlineRenderedTextEditor';

const priorityIcon = {
    trivial: <PriorityTrivialIcon label="trivial" />,
    minor: <PriorityMinorIcon label="minor" />,
    major: <PriorityMajorIcon label="major" />,
    critical: <PriorityCriticalIcon label="critical" />,
    blocker: <PriorityBlockerIcon label="blocker" />
};

const typeIcon = {
    bug: <Bug16Icon label="bug" />,
    enhancement: <Improvement16Icon label="enhancement" />,
    proposal: <LightbulbFilledIcon label="proposal" primaryColor="0xFFAB00" />,
    task: <TaskIcon label="task" primaryColor="0x2684FF" />
};

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            title: {
                flexGrow: 0,
                marginRight: theme.spacing(3),
                marginLeft: theme.spacing(1)
            },
            targetSelectLabel: {
                marginRight: theme.spacing(1)
            },
            grow: {
                flexGrow: 1
            },
            paper100: {
                overflow: 'hidden',
                height: '100%'
            },
            paperOverflow: {
                overflow: 'hidden'
            }
        } as const)
);

const BitbucketIssuePage: React.FunctionComponent = () => {
    const classes = useStyles();
    const [state, controller] = useBitbucketIssueController();

    return (
        <BitbucketIssueControllerContext.Provider value={controller}>
            <Container maxWidth="xl" hidden={state.issue.data.id === ''}>
                <AppBar position="relative">
                    <Toolbar>
                        <Link href={state.issue.data.links?.html?.href} variant="h3">
                            #{state.issue.data.id}
                        </Link>
                        <Typography variant="h3" className={classes.title}>
                            {state.issue.data.title}
                        </Typography>
                        <div className={classes.grow} />
                        <Tooltip title="Create a branch and assign issue to me">
                            <Button variant="contained" color="primary" startIcon={<VidPlayIcon label="Start work" />}>
                                Start work
                            </Button>
                        </Tooltip>
                        <RefreshButton loading={state.isSomethingLoading} onClick={controller.refresh} />
                    </Toolbar>
                </AppBar>
                <Grid container spacing={1}>
                    <Grid item xs={12} md={9} lg={9} xl={9}>
                        <Box margin={2}>
                            <ErrorDisplay />
                            <PMFDisplay postMessageFunc={controller.postMessage} />
                            <Grid container spacing={2} direction="column">
                                <Grid item>
                                    <Box />
                                </Grid>
                                <Grid item>
                                    <Typography variant="h4">
                                        <Box fontWeight="fontWeightBold">Summary</Box>
                                    </Typography>
                                </Grid>
                                <Grid item>
                                    <InlinedRenderedTextEditor
                                        fullWidth
                                        defaultValue={state.issue.data.content.raw}
                                        renderedHtml={state.issue.data.content.html}
                                        onSave={() => {}}
                                    />
                                </Grid>
                                <Grid item>
                                    <Typography variant="h4">
                                        <Box fontWeight="fontWeightBold">Comments</Box>
                                    </Typography>
                                </Grid>
                                <Grid item>
                                    <Grid container spacing={2} direction="column">
                                        {state.comments.map(c => (
                                            <Grid item>
                                                <Grid container spacing={1} alignItems="flex-start">
                                                    <Grid item>
                                                        <Avatar src={c.user.avatarUrl} />
                                                    </Grid>
                                                    <Grid item>
                                                        <Typography variant="subtitle2">
                                                            {c.user.displayName}
                                                            {'  '}
                                                            {format(c.ts, 'YYYY-MM-DD h:mm A')}
                                                        </Typography>
                                                        <Typography
                                                            dangerouslySetInnerHTML={{ __html: c.htmlContent }}
                                                        />
                                                    </Grid>
                                                </Grid>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={3} lg={3} xl={3}>
                        <Paper>
                            <Box margin={2}>
                                <Grid container spacing={1} direction="column">
                                    <Grid item>
                                        <Grid container spacing={1} direction="row" alignItems="center">
                                            <Grid item>
                                                <Tooltip title="Watches">
                                                    <Button
                                                        variant="contained"
                                                        startIcon={<WatchIcon label="Watches" />}
                                                    >
                                                        {state.issue.data.watches}
                                                    </Button>
                                                </Tooltip>
                                            </Grid>
                                            <Grid item>
                                                <Tooltip title="Votes">
                                                    <Button variant="contained" startIcon={<StarIcon label="Votes" />}>
                                                        {state.issue.data.votes}
                                                    </Button>
                                                </Tooltip>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                    <Grid item>
                                        <Typography variant="h6">
                                            <strong>Status</strong>
                                        </Typography>
                                        <Typography>{state.issue.data.state}</Typography>
                                    </Grid>
                                    <Grid item>
                                        <Grid item>
                                            <Typography variant="h6">
                                                <strong>Kind</strong>
                                            </Typography>
                                        </Grid>
                                        <Grid container spacing={1} direction="row" alignItems="baseline">
                                            <Grid item>{typeIcon[state.issue.data.kind]}</Grid>
                                            <Grid item>
                                                <Typography>{state.issue.data.kind}</Typography>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                    <Grid item>
                                        <Grid item>
                                            <Typography variant="h6">
                                                <strong>Priority</strong>
                                            </Typography>
                                        </Grid>
                                        <Grid container spacing={1} direction="row">
                                            <Grid item>{priorityIcon[state.issue.data.priority]}</Grid>
                                            <Grid item>
                                                <Typography>{state.issue.data.priority}</Typography>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                    <Grid item>
                                        <Grid item>
                                            <Typography variant="h6">
                                                <strong>Assignee</strong>
                                            </Typography>
                                        </Grid>
                                        <Grid container spacing={1} direction="row" alignItems="center">
                                            <Grid item>
                                                <Avatar src={state.issue.data?.assignee?.links?.avatar?.href} />
                                            </Grid>
                                            <Grid item>
                                                <Typography>
                                                    {state.issue.data?.assignee?.display_name || 'Unassigned'}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                    <Grid item>
                                        <Grid item>
                                            <Typography variant="h6">
                                                <strong>Reporter</strong>
                                            </Typography>
                                        </Grid>
                                        <Grid container spacing={1} direction="row" alignItems="center">
                                            <Grid item>
                                                <Avatar src={state.issue.data?.reporter?.links?.avatar?.href} />
                                            </Grid>
                                            <Grid item>
                                                <Typography>{state.issue.data?.reporter?.display_name}</Typography>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                    <Grid item>
                                        <Grid item>
                                            <Typography variant="h6">
                                                <strong>Created</strong>
                                            </Typography>
                                        </Grid>
                                        <Grid item>
                                            <Tooltip title={state.issue.data.created_on}>
                                                <Typography>
                                                    {format(state.issue.data.created_on, 'YYYY-MM-DD h:mm A')}
                                                </Typography>
                                            </Tooltip>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </BitbucketIssueControllerContext.Provider>
    );
};

export default BitbucketIssuePage;
