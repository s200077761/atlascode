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
    Toolbar,
    Typography,
} from '@material-ui/core';
import AccessTimeIcon from '@material-ui/icons/AccessTime';
import CalendarTodayIcon from '@material-ui/icons/CalendarToday';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { distanceInWordsToNow } from 'date-fns';
import React, { useCallback, useMemo } from 'react';
import { emptyPipeline } from '../../../lib/ipc/models/pipelineSummary';
import {
    Pipeline,
    PipelineCommand,
    PipelineLogRange,
    PipelineLogReference,
    PipelineLogStage,
    PipelineState,
    PipelineStep,
    Status,
    statusForState,
} from '../../../pipelines/model';
import FailedIcon from '../icons/FailedIcon';
import InProgressIcon from '../icons/InProgressIcon';
import NotRunIcon from '../icons/NotRunIcon';
import PausedIcon from '../icons/PausedIcon';
import StoppedIcon from '../icons/StoppedIcon';
import SuccessIcon from '../icons/SuccessIcon';
import { PipelineSummaryControllerContext, usePipelineSummaryController } from './pipelineSummaryController';

const failureRed = 'rgb(255, 86, 48)';

const useStyles = makeStyles(
    (theme: Theme) =>
        ({
            title: {
                flexGrow: 0,
                marginRight: theme.spacing(3),
            },
            targetSelectLabel: {
                marginRight: theme.spacing(1),
            },
            floatLeft: {
                float: 'left',
            },
            floatRight: {
                float: 'right',
            },
            loadingIndicator: {
                marginTop: '20px',
            },
            logs: {
                whiteSpace: 'pre-wrap',
                fontFamily: 'Monaco, Courier New, Courier, monospace',
                fontSize: '1.2em',
            },
            paper100: {
                overflow: 'hidden',
                height: '100%',
            },
            paperOverflow: {
                overflow: 'hidden',
            },
            greenHeader: {
                backgroundColor: 'rgb(54, 178, 126)',
                color: 'rgb(255,255,255)',
            },
            greenHeaderButton: {
                backgroundColor: 'rgba(9, 30, 66, 0.08)',
                color: 'rgb(255,255,255)',
            },
            blueHeader: {
                backgroundColor: 'rgb(0, 101, 255)',
                color: 'rgb(255,255,255)',
            },
            blueHeaderButton: {
                backgroundColor: 'rgba(9, 30, 66, 0.133)',
                color: 'rgb(255,255,255)',
            },
            orangeHeader: {
                backgroundColor: 'rgb(255, 171, 0)',
                color: 'rgb(0,0,0)',
            },
            orangeHeaderButton: {
                backgroundColor: 'rgba(9, 30, 66, 0.176)',
                color: 'rgb(0,0,0)',
            },
            redHeader: {
                backgroundColor: failureRed,
                color: 'rgb(255, 255, 255)',
            },
            redHeaderButton: {
                backgroundColor: 'rgba(9, 30, 66, 0.08)',
                color: 'rgb(255, 255, 255)',
            },
            grayHeader: {
                backgroundColor: 'rgb(192, 192, 192)',
                color: 'rgb(0, 0, 0)',
            },
            grayHeaderButton: {
                backgroundColor: 'rgba(9, 30, 66, 0.133)',
                color: 'rgb(0, 0, 0)',
            },
            pipelineHeader: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
            },
            stepHeader: {
                paddingRight: '24px',
                paddingLeft: '24px',
                paddingTop: '9px',
                paddingBottom: '9px',
                marginTop: '9px',
                border: '1px solid black',
                borderRadius: '5px 5px 0 0',
            },
            loglessStepHeader: {
                paddingRight: '24px',
                paddingLeft: '24px',
                paddingTop: '9px',
                paddingBottom: '9px',
                marginTop: '9px',
                border: '1px solid black',
                borderRadius: '5px 5px 5px 5px',
            },
            stepHeaderContent: {
                display: 'flex',
                justifyContent: 'space-between',
            },
            small: {
                width: theme.spacing(3),
                height: theme.spacing(3),
            },
            icon: {
                marginLeft: '15px',
                marginRight: '5px',
                verticalAlign: 'text-bottom',
            },
            statusIcon: {
                marginRight: '5px',
                verticalAlign: 'text-bottom',
            },
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

function isPaused(step: PipelineStep) {
    return step.state?.stage?.name === 'PAUSED';
}

function stepFailed(step: PipelineStep) {
    return step.state?.result?.name === 'FAILED';
}

function isStoppable(pipeline: Pipeline): boolean {
    const status = statusForState(pipeline.state);
    return status === Status.Pending || status === Status.InProgress;
}

type LogSectionProps = {
    aKey: string;
    name: string;
    logs: string | undefined;
    logRange: PipelineLogRange | undefined;
    onChange: (event: React.ChangeEvent<{}>, expanded: boolean) => void;
};

type StatusIconProps = {
    pipelineState: PipelineState;
};

const PipelineSummaryPage: React.FunctionComponent = () => {
    const classes = useStyles();
    const [state, controller] = usePipelineSummaryController();

    function colorsForPipeline(pipeline: Pipeline): string[] {
        switch (statusForState(pipeline.state)) {
            case Status.Pending:
                return [classes.blueHeader, classes.blueHeaderButton];
            case Status.InProgress:
                return [classes.blueHeader, classes.blueHeaderButton];
            case Status.Paused:
                return [classes.greenHeader, classes.greenHeaderButton];
            case Status.Stopped:
                return [classes.orangeHeader, classes.orangeHeaderButton];
            case Status.Successful:
                return [classes.greenHeader, classes.greenHeaderButton];
            case Status.Error:
                return [classes.redHeader, classes.redHeaderButton];
            case Status.Failed:
                return [classes.redHeader, classes.redHeaderButton];
            default:
                return [classes.grayHeader, classes.grayHeaderButton];
        }
    }

    function logsExpansionPanelDetails(logs?: string): any {
        return (
            <ExpansionPanelDetails>
                {logs ? (
                    <pre className={classes.logs}>{logs}</pre>
                ) : (
                    <Grid container justify="center">
                        <CircularProgress />
                    </Grid>
                )}
            </ExpansionPanelDetails>
        );
    }

    function LogSection({ aKey, name, logs, logRange, onChange }: LogSectionProps): any {
        return (
            <ExpansionPanel
                key={aKey}
                square={false}
                onChange={onChange}
                disabled={logRange === undefined || logRange.lastByte < 0}
            >
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} id={aKey}>
                    <div className={classes.logs}>{name}</div>
                </ExpansionPanelSummary>
                {logsExpansionPanelDetails(logs)}
            </ExpansionPanel>
        );
    }

    function IconForPipelineState({ pipelineState }: StatusIconProps): any {
        if (!pipelineState) {
            return Status.Unknown;
        }
        switch (statusForState(pipelineState)) {
            case Status.Successful:
                return <SuccessIcon className={classes.statusIcon} titleAccess="Success" />;
            case Status.Paused:
                return <PausedIcon className={classes.statusIcon} titleAccess="Paused" />;
            case Status.Pending:
                return <InProgressIcon className={classes.statusIcon} titleAccess="Pending" />;
            case Status.InProgress:
                return <InProgressIcon className={classes.statusIcon} titleAccess="Building" />;
            case Status.Stopped:
                return <StoppedIcon className={classes.statusIcon} titleAccess="Stopped" />;
            case Status.Error:
                return <FailedIcon className={classes.statusIcon} titleAccess="Error" />;
            case Status.Failed:
                return <FailedIcon className={classes.statusIcon} titleAccess="Failed" />;
            case Status.NotRun:
                return <NotRunIcon className={classes.statusIcon} titleAccess="Not Run" />;
            default:
                return <FailedIcon className={classes.statusIcon} titleAccess="Failed" />;
        }
    }

    function setupAndTeardownSection(
        stepUuid: string,
        stepIndex: number,
        stage: PipelineLogStage,
        logs: string | undefined,
        logRange: PipelineLogRange | undefined,
        fetchLogs: (stepUuid: string, logReference: PipelineLogReference) => void
    ) {
        const title = stage === PipelineLogStage.SETUP ? 'Build setup' : 'Build teardown';
        return (
            <LogSection
                aKey={`${title}-${stepUuid}`}
                name={title}
                logs={logs}
                logRange={logRange}
                onChange={(event: React.ChangeEvent<{}>, expanded: boolean) => {
                    if (expanded && !logs) {
                        fetchLogs(stepUuid, {
                            stepIndex: stepIndex,
                            stage: stage,
                        });
                    }
                }}
                key={`${title}-${stepUuid}`}
            />
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
                        <LogSection
                            aKey={`${stepUuid}-${index}`}
                            name={command.name}
                            logs={command.logs}
                            logRange={command.log_range}
                            onChange={(event: React.ChangeEvent<{}>, expanded: boolean) => {
                                if (expanded && !command.logs) {
                                    fetchLogs(stepUuid, {
                                        stepIndex: stepIndex,
                                        stage: PipelineLogStage.BUILD,
                                        commandIndex: index,
                                    });
                                }
                            }}
                            key={`${stepUuid}-${index}`}
                        />
                    );
                })}
            </div>
        );
    }

    const stepHeader = useCallback(
        (step: PipelineStep, className: string, style: any, index: number) => {
            return (
                <div className={className} style={style}>
                    <Typography variant="h4">
                        <div className={classes.stepHeaderContent}>
                            <div>
                                {step.state ? <IconForPipelineState pipelineState={step.state} /> : ''}
                                <span>{step.name ?? `Step ${index + 1} `}</span>
                            </div>
                            <span>{isPaused(step) ? '' : durationString(step.duration_in_seconds)}</span>
                        </div>
                    </Typography>
                </div>
            );
        },
        [classes.stepHeaderContent]
    );

    const pipelineStepItem = useCallback(
        (step: PipelineStep, index: number) => {
            const key = `${step.uuid}-${index}`;

            if (step.state?.result?.name === 'NOT_RUN') {
                return <div key={key}>{stepHeader(step, classes.loglessStepHeader, {}, index)}</div>;
            }
            const style = stepFailed(step)
                ? {
                      color: 'White',
                      backgroundColor: failureRed,
                  }
                : {};
            return (
                <div key={key}>
                    {stepHeader(step, classes.stepHeader, style, index)}
                    <div>
                        {setupAndTeardownSection(
                            step.uuid,
                            index,
                            PipelineLogStage.SETUP,
                            step.setup_logs,
                            step.setup_log_range,
                            controller.fetchLogs
                        )}
                        {buildSection(step.uuid, index, step.script_commands, controller.fetchLogs)}
                        {setupAndTeardownSection(
                            step.uuid,
                            index,
                            PipelineLogStage.TEARDOWN,
                            step.teardown_logs,
                            step.teardown_log_range,
                            controller.fetchLogs
                        )}
                    </div>
                </div>
            );
        },
        [classes.loglessStepHeader, classes.stepHeader, controller.fetchLogs, stepHeader]
    );

    const renderPipelineStep = useCallback(
        (step: PipelineStep, index: number) => {
            return pipelineStepItem(step, index);
        },
        [pipelineStepItem]
    );

    const pipelineSteps = useMemo(() => {
        return state.steps ? (
            state.steps.map((step, index) => renderPipelineStep(step, index))
        ) : (
            <Grid container justify="center">
                <CircularProgress className={classes.loadingIndicator} />
            </Grid>
        );
    }, [renderPipelineStep, state.steps, classes.loadingIndicator]);

    const [headerClass, buttonClass] = colorsForPipeline(state.pipeline);

    return (
        <PipelineSummaryControllerContext.Provider value={controller}>
            <Container maxWidth="xl">
                <Toolbar className={headerClass}>
                    {state.pipeline === emptyPipeline ? (
                        <div />
                    ) : (
                        <div className={classes.pipelineHeader}>
                            <Typography variant="h3" style={{ verticalAlign: 'middle' }}>
                                <IconForPipelineState pipelineState={state.pipeline.state} />
                                <a
                                    className={headerClass}
                                    href={`${state.pipeline.repository!.url}/addon/pipelines/home#!/results/${
                                        state.pipeline.build_number
                                    }`}
                                >{`Pipeline #${state.pipeline.build_number}`}</a>
                                {state.pipeline.duration_in_seconds ? <AccessTimeIcon className={classes.icon} /> : ''}
                                {`${durationString(state.pipeline.duration_in_seconds)}`}
                                {state.pipeline.completed_on ? <CalendarTodayIcon className={classes.icon} /> : ''}
                                {`${timeString(state.pipeline.completed_on)}`}
                            </Typography>
                            <div>
                                {isStoppable(state.pipeline) ? (
                                    ''
                                ) : (
                                    <Button variant="contained" className={buttonClass} onClick={controller.rerun}>
                                        Rerun
                                    </Button>
                                )}
                                <RefreshButton loading={state.isRefreshing} onClick={controller.refresh} />
                            </div>
                        </div>
                    )}
                </Toolbar>
                {pipelineSteps}
            </Container>
        </PipelineSummaryControllerContext.Provider>
    );
};

export default PipelineSummaryPage;
