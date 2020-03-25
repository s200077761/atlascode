import { RefreshButton } from '@atlassianlabs/guipi-core-components';
import {
    Button,
    CircularProgress,
    Container,
    ExpansionPanel,
    ExpansionPanelDetails,
    ExpansionPanelSummary,
    Grid,
    makeStyles,
    Theme,
    Toolbar
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { distanceInWordsToNow } from 'date-fns';
import React from 'react';
import {
    Pipeline,
    PipelineCommand,
    PipelineLogReference,
    PipelineLogStage,
    PipelineStep,
    Status,
    statusForState
} from '../../../pipelines/model';
import { PipelineSummaryControllerContext, usePipelineSummaryController } from './pipelineSummaryController';

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            title: {
                flexGrow: 0,
                marginRight: theme.spacing(3)
            },
            targetSelectLabel: {
                marginRight: theme.spacing(1)
            },
            grow: {
                flexGrow: 1
            },
            alignRight: {
                align: 'right'
            },
            rightStuff: {
                display: 'none',
                [theme.breakpoints.up('md')]: {
                    display: 'flex'
                }
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

function durationString(totalSeconds?: number): string {
    if (!totalSeconds) {
        return '';
    }
    const seconds = totalSeconds % 60;
    const minutes = Math.trunc(totalSeconds / 60);
    if (minutes > 0) {
        return `${minutes} min ${seconds} sec`;
    }
    return `${seconds} sec`;
}

function timeString(completed_on?: any, created_on?: any): string {
    if (!completed_on && !created_on) {
        return '';
    }
    return `${distanceInWordsToNow(completed_on ?? created_on)} ago`;
}

function statusForPipeline(pipeline: Pipeline): string {
    switch (statusForState(pipeline.state)) {
        case Status.Pending:
            return 'Pending';
        case Status.InProgress:
            return 'Building';
        case Status.Paused:
            return 'Success';
        case Status.Stopped:
            return 'Stopped';
        case Status.Successful:
            return 'Success';
        case Status.Error:
            return 'Error';
        case Status.Failed:
            return 'Failed';
        default:
            return 'Error';
    }
}

function setupAndTeardownSection(
    stepUuid: string,
    stepIndex: number,
    stage: PipelineLogStage,
    logs: string | undefined,
    fetchLogs: (stepUuid: string, logReference: PipelineLogReference) => void
) {
    const title = stage === PipelineLogStage.SETUP ? 'Build setup' : 'Build teardown';
    return (
        <ExpansionPanel
            square={false}
            key={`${title}-${stepUuid}`}
            onChange={(event: React.ChangeEvent<{}>, expanded: boolean) => {
                if (expanded && !logs) {
                    fetchLogs(stepUuid, {
                        stepIndex: stepIndex,
                        stage: stage
                    });
                }
            }}
        >
            <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} id={`${title}-${stepUuid}`}>
                <pre>{title}</pre>
            </ExpansionPanelSummary>
            {logsExpansionPanelDetails(logs)}
        </ExpansionPanel>
    );
}

function logsExpansionPanelDetails(logs?: string): any {
    return (
        <ExpansionPanelDetails>
            {logs ? (
                <pre className="pipeline-logs">{logs}</pre>
            ) : (
                <Grid container justify="center">
                    <CircularProgress />
                </Grid>
            )}
        </ExpansionPanelDetails>
    );
}

function buildSection(
    stepUuid: string,
    stepIndex: number,
    commands: PipelineCommand[],
    fetchLogs: (stepUuid: string, logReference: PipelineLogReference) => void
) {
    return (
        <div>
            {commands.map((command, index) => {
                return (
                    <ExpansionPanel
                        key={`${stepUuid}-${index}`}
                        square={false}
                        onChange={(event: React.ChangeEvent<{}>, expanded: boolean) => {
                            if (expanded && !command.logs) {
                                fetchLogs(stepUuid, {
                                    stepIndex: stepIndex,
                                    stage: PipelineLogStage.BUILD,
                                    commandIndex: index
                                });
                            }
                        }}
                    >
                        <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} id={`${stepUuid}-${index}`}>
                            <pre>{command.name}</pre>
                        </ExpansionPanelSummary>
                        {logsExpansionPanelDetails(command.logs)}
                    </ExpansionPanel>
                );
            })}
        </div>
    );
}

function formatStep(
    classes: any,
    step: PipelineStep,
    index: number,
    fetchLogs: (stepUuid: string, logReference: PipelineLogReference) => void
): any {
    return (
        <div>
            {step.name ?? `Step ${index + 1} `}
            <span className={classes.alignRight}>{durationString(step.duration_in_seconds)}</span>
            {setupAndTeardownSection(step.uuid, index, PipelineLogStage.SETUP, step.setup_logs, fetchLogs)}
            {buildSection(`${step.uuid}`, index, step.script_commands, fetchLogs)}
            {setupAndTeardownSection(step.uuid, index, PipelineLogStage.TEARDOWN, step.teardown_logs, fetchLogs)}
        </div>
    );
}

const PipelineSummaryPage: React.FunctionComponent = () => {
    const classes = useStyles();
    const [state, controller] = usePipelineSummaryController();

    return (
        <PipelineSummaryControllerContext.Provider value={controller}>
            <Container maxWidth="xl">
                <Toolbar>
                    <a
                        href={`${state.pipeline.repository!.url}/addon/pipelines/home#!/results/${
                            state.pipeline.build_number
                        }`}
                    >{`Pipeline #${state.pipeline.build_number}`}</a>
                    {`: ${statusForPipeline(state.pipeline)} - ${durationString(
                        state.pipeline.duration_in_seconds
                    )} - ${timeString(state.pipeline.completed_on)}`}
                    <div className={classes.grow} />
                    <div className={classes.rightStuff}>
                        <Button variant="contained" color="primary" onClick={controller.rerun}>
                            Rerun
                        </Button>
                        <RefreshButton loading={state.isRefreshing} onClick={controller.refresh} />
                    </div>
                </Toolbar>
                {state.steps ? (
                    state.steps.map((step, index) => formatStep(classes, step, index, controller.fetchLogs))
                ) : (
                    <Grid container justify="center">
                        <CircularProgress />
                    </Grid>
                )}
            </Container>
        </PipelineSummaryControllerContext.Provider>
    );
};

export default PipelineSummaryPage;
