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
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import ArrowUpwardIcon from '@material-ui/icons/ArrowUpward';
import BlockIcon from '@material-ui/icons/Block';
import BugReportIcon from '@material-ui/icons/BugReport';
import CheckBoxOutlinedIcon from '@material-ui/icons/CheckBoxOutlined';
import EmojiObjectsIcon from '@material-ui/icons/EmojiObjects';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import RadioButtonUncheckedIcon from '@material-ui/icons/RadioButtonUnchecked';
import RemoveRedEyeOutlinedIcon from '@material-ui/icons/RemoveRedEyeOutlined';
import StarBorder from '@material-ui/icons/StarBorder';
import { makeStyles } from '@material-ui/styles';
import { format } from 'date-fns';
import React, { useCallback } from 'react';
import CommentForm from '../common/CommentForm';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { PMFDisplay } from '../common/pmf/PMFDisplay';
import { BitbucketIssueControllerContext, useBitbucketIssueController } from './bitbucketIssueController';
import InlinedRenderedTextEditor from './InlineRenderedTextEditor';
import StatusMenu from './StatusMenu';

const priorityIcon = {
    trivial: <RadioButtonUncheckedIcon />,
    minor: <ArrowDownwardIcon />,
    major: <KeyboardArrowUpIcon />,
    critical: <ArrowUpwardIcon />,
    blocker: <BlockIcon />
};

const typeIcon = {
    bug: <BugReportIcon />,
    enhancement: <ArrowUpwardIcon />,
    proposal: <EmojiObjectsIcon />,
    task: <CheckBoxOutlinedIcon />
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

    const handleStatusChange = useCallback(
        async (newStatus: string) => {
            const status = await controller.updateStatus(newStatus);
            controller.applyChange({ issue: { state: status } });
        },
        [controller]
    );

    const handleSaveComment = useCallback(
        async (content: string) => {
            const comment = await controller.postComment(content);
            controller.applyChange({ comments: [comment] });
        },
        [controller]
    );

    return (
        <BitbucketIssueControllerContext.Provider value={controller}>
            <Container maxWidth="xl" hidden={state.issue.data.id === ''}>
                <AppBar position="relative">
                    <Toolbar>
                        <Typography variant="h3" className={classes.title}>
                            <Link href={state.issue.data.links?.html?.href}>#{state.issue.data.id}</Link>{' '}
                            {state.issue.data.title}
                        </Typography>
                        <Box className={classes.grow} />
                        <Tooltip title="Create a branch and assign issue to me">
                            <Button variant="contained" color="primary" startIcon={<PlayArrowIcon />}>
                                Start work
                            </Button>
                        </Tooltip>
                        <RefreshButton loading={state.isSomethingLoading} onClick={controller.refresh} />
                    </Toolbar>
                </AppBar>
                <Grid container spacing={1}>
                    <Grid item xs={12} md={9} lg={10} xl={10}>
                        <Paper className={classes.paper100}>
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
                                                <Grid item key={c.id}>
                                                    <Grid container spacing={1} alignItems="flex-start">
                                                        <Grid item>
                                                            <Avatar src={c.user.avatarUrl} alt={c.user.displayName} />
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
                                    <Grid item>
                                        <CommentForm currentUser={state.currentUser} onSave={handleSaveComment} />
                                    </Grid>
                                </Grid>
                            </Box>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} md={3} lg={2} xl={2}>
                        <Paper className={classes.paperOverflow}>
                            <Box margin={2}>
                                <Grid container spacing={1} direction="column">
                                    <Grid item>
                                        <Grid container spacing={1} direction="row" alignItems="center">
                                            <Grid item>
                                                <Tooltip title="Watches">
                                                    <Button
                                                        variant="contained"
                                                        startIcon={<RemoveRedEyeOutlinedIcon />}
                                                    >
                                                        {state.issue.data.watches || 0}
                                                    </Button>
                                                </Tooltip>
                                            </Grid>
                                            <Grid item>
                                                <Tooltip title="Votes">
                                                    <Button variant="contained" startIcon={<StarBorder />}>
                                                        {state.issue.data.votes || 0}
                                                    </Button>
                                                </Tooltip>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                    <Grid item>
                                        <Typography variant="h6">
                                            <strong>Status</strong>
                                        </Typography>
                                        <StatusMenu status={state.issue.data.state} onChange={handleStatusChange} />
                                    </Grid>
                                    <Grid item>
                                        <Grid item>
                                            <Typography variant="h6">
                                                <strong>Kind</strong>
                                            </Typography>
                                        </Grid>
                                        <Grid container spacing={1} direction="row">
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
                                            <Tooltip title={state.issue.data.created_on || 'unknown'}>
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
