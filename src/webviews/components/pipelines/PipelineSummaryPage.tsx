import * as React from "react";
import { WebviewComponent } from "../WebviewComponent";
import { Action } from "../../../ipc/messaging";
import {
  Pipeline,
  PipelineState,
  PipelineStep,
  PipelineStage,
  PipelineResult,
  statusForState,
  Status,
  PipelineCommand
} from "../../../pipelines/model";
import Page, { Grid, GridColumn } from "@atlaskit/page";
import Panel from '@atlaskit/panel';
import { PipelineData, StepData } from "../../../ipc/pipelinesMessaging";
import CheckCircleIcon from "@atlaskit/icon/glyph/check-circle";
import RecentIcon from "@atlaskit/icon/glyph/recent";
import ErrorIcon from "@atlaskit/icon/glyph/error";
import CalendarIcon from "@atlaskit/icon/glyph/calendar";
import Avatar from "@atlaskit/avatar";
import { colors } from "@atlaskit/theme";
import * as moment from "moment";
import Offline from "../Offline";
import ErrorBanner from "../ErrorBanner";
import PageHeader from '@atlaskit/page-header';
import { BreadcrumbsStateless, BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import NavItem from "../issue/NavItem";
import { CopyPipelineLinkAction } from "../../../ipc/pipelinesActions";

const successIcon = (
  <CheckCircleIcon primaryColor={colors.G400} label="build successful" />
);
const inprogressIcon = (
  <RecentIcon primaryColor={colors.B300} label="build in progress" />
);
const errorIcon = (
  <ErrorIcon primaryColor={colors.R400} label="build failure" />
);
const pausedPath = (<path d="M8,16 C3.581722,16 0,12.418278 0,8 C0,3.581722 3.581722,0 8,0 C12.418278,0 16,3.581722 16,8 C16,12.418278 12.418278,16 8,16 Z M8,14 C11.3137085,14 14,11.3137085 14,8 C14,4.6862915 11.3137085,2 8,2 C4.6862915,2 2,4.6862915 2,8 C2,11.3137085 4.6862915,14 8,14 Z M8,12 C5.790861,12 4,10.209139 4,8 C4,5.790861 5.790861,4 8,4 C10.209139,4 12,5.790861 12,8 C12,10.209139 10.209139,12 8,12 Z" fill="currentColor" fill-rule="evenodd"></path>);
const pausedIcon = (
  <svg width="24" height="24" viewBox="0 0 16 16" focusable="false" role="presentation" color={colors.G400}>
    {pausedPath}
  </svg>
);

const panelHeader = (heading: string, subheading: string) =>
  <div>
    <h3 className='inlinePanelHeader'>{heading}</h3>
    <p className='inlinePanelSubheading'>{subheading}</p>
  </div>;

const headerSuccessIcon = (
  <CheckCircleIcon
    primaryColor={colors.N0}
    secondaryColor={colors.G400}
    label="build successful"
  />
);
const headerInprogressIcon = (
  <RecentIcon
    primaryColor={colors.N0}
    secondaryColor={colors.B300}
    label="build in progress"
  />
);
const headerPausedIcon = (
  <svg width="24" height="24" viewBox="0 0 16 16" focusable="false" role="presentation">
    {pausedPath}
  </svg>
);
const headerErrorIcon = (
  <ErrorIcon
    primaryColor={colors.N0}
    secondaryColor={colors.R400}
    label="build failure"
  />
);
const calendarIcon = <CalendarIcon primaryColor={colors.N0} label="built at" />;
const builtTimeIcon = (
  <RecentIcon primaryColor={colors.N0} label="build in progress" />
);

type Emit = Action | CopyPipelineLinkAction;

type Properties = {
  pipeline: Pipeline;
};

type State = {
  pipeline: PipelineData;
  steps: StepData[];
  isErrorBannerOpen: boolean;
  isOnline: boolean;
  errorDetails: any;
};

const emptyPipeline: PipelineData = {
  repository: {
    type: ''
  },
  type: "",
  build_number: 0,
  uuid: "",
  created_on: "",
  state: {
    name: "",
    type: "pipeline_state_in_progress",
    result: { name: "", type: "" },
    stage: { name: "PENDING", type: "pipeline_step_state_pending_pending" }
  },
  target: { ref_name: "" }
};

export default class PipelineSummaryPage extends WebviewComponent<Emit, Pipeline, Properties, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      pipeline: emptyPipeline,
      steps: [],
      isErrorBannerOpen: false,
      isOnline: true,
      errorDetails: undefined
    };
  }

  public onMessageReceived(e: any) {
    switch (e.type) {
      case 'error': {
        this.setState({ isErrorBannerOpen: true, errorDetails: e.reason });

        break;
      }
      case 'updatePipeline': {
        this.setState({ pipeline: e });
        break;
      }
      case 'updateSteps': {
        this.setState({ steps: e.steps });
        break;
      }
      case 'onlineStatus': {
        this.setState({ isOnline: e.isOnline });

        if (e.isOnline && this.state.pipeline.uuid === '') {
          this.postMessage({ action: 'refresh' });
        }

        break;
      }
    }
  }

  handleDismissError = () => {
    this.setState({ isErrorBannerOpen: false, errorDetails: undefined });
  }

  iconForState(state?: PipelineState): any {
    if (!state) {
      return Status.Unknown;
    }
    switch (statusForState(state)) {
      case Status.Successful:
        return successIcon;
      case Status.Paused:
        return pausedIcon;
      case Status.Pending:
      case Status.InProgress:
        return inprogressIcon;
      case Status.Stopped:
      case Status.Error:
      case Status.Failed:
        return errorIcon;
      default:
        return errorIcon;
    }
  }

  colorForState(state: PipelineState): string {
    switch (statusForState(state)) {
      case Status.Successful:
      case Status.Paused:
        return colors.G400;
      case Status.Pending:
      case Status.InProgress:
        return colors.B300;
      case Status.Stopped:
        return colors.Y400;
      case Status.Error:
      case Status.Failed:
        return colors.R400;
      default:
        return colors.R400;
    }
  }

  headerIconForResult(result: PipelineResult): any {
    switch (result.type) {
      case "pipeline_state_completed_successful":
        return headerSuccessIcon;
      case "pipeline_state_completed_error":
      // fall through
      case "pipeline_state_completed_failed":

      case "pipeline_state_completed_stopped":
        return headerErrorIcon;
      default:
        return headerErrorIcon;
    }
  }

  headerIconForStage(stage: PipelineStage): any {
    switch (stage.type) {
      case "pipeline_state_in_progress_running":
      case "pipeline_step_in_progress_pending":
      case "pipeline_step_state_pending_pending":
        return headerInprogressIcon;
      case "pipeline_state_in_progress_paused":
      case "pipeline_step_state_pending_paused":
        return headerPausedIcon;
      case "pipeline_step_state_pending_halted":
      case "pipeline_state_in_progress_halted":
        return headerErrorIcon;
      default:
        return headerErrorIcon;
    }
  }

  headerIconForState(state: PipelineState): any {
    switch (state.type) {
      case "pipeline_state_completed":
        return this.headerIconForResult(state.result!);
      case "pipeline_state_in_progress":
        return this.headerIconForStage(state.stage!);
      case "pipeline_state_pending":
        return headerInprogressIcon;
      default:
        return headerErrorIcon;
    }
  }

  stringForSeconds(totalSeconds?: number) {
    if (!totalSeconds) {
      return "";
    }
    const duration = moment.duration(totalSeconds, "seconds");
    const seconds = duration.seconds();
    const minutes = duration.minutes();
    if (minutes) {
      return `${minutes} min ${seconds} sec`;
    }
    return `${seconds} sec`;
  }

  commandSection(commands: PipelineCommand[], title: string, expanded: boolean) {
    return (<Panel isDefaultExpanded={expanded} header={panelHeader(title, `${commands.length} Commands`)}>
      {commands.map(c => {
        return <div className="pipeline-step-panel">
          <Panel isDefaultExpanded={false} header={<div className="pipeline-command">{c.name}</div>}>
            <pre className="pipeline-logs">{c.logs}</pre>
          </Panel>
        </div>;
      })}
    </Panel>
    );
  }

  commands(step: PipelineStep) {
    return (
      <div className="pipeline-command-panels">
        {this.commandSection(step.setup_commands, 'Setup', false)}
        {this.commandSection(step.script_commands, 'Build', true)}
        {this.commandSection(step.teardown_commands, 'Teardown', false)}
      </div>
    );
  }

  nameForStep(step: PipelineStep, count: number) {
    if (step.name) {
      return step.name;
    }

    return `Step ${count}`;
  }

  steps() {
    if (this.state.steps.length === 0) {
      return <div />;
    }
    return (
      <div>
        {this.state.steps.map((step, ix) => {
          return (
            <div>
              <span className="pipeline-step-title">
                {this.iconForState(step.state)}
                <span>
                  <span className="pipeline-step-head">
                    {this.nameForStep(step, ix + 1)}
                  </span>
                  <span className="pipeline-step-subhead">
                    {this.stringForSeconds(step.duration_in_seconds)}
                  </span>
                </span>
              </span>
              {this.commands(step)}
            </div>
          );
        })}
      </div>
    );
  }

  render() {
    if (this.state.pipeline.uuid === '' && !this.state.isErrorBannerOpen && this.state.isOnline) {
      return (<div>waiting for data...</div>);
    }

    return (
      <div>
        {(!this.state.isOnline && this.state.pipeline.uuid === '') &&
          <Offline />
        }
        {this.state.isErrorBannerOpen &&
          <ErrorBanner onDismissError={this.handleDismissError} errorDetails={this.state.errorDetails} />
        }
        <Page>
          <Grid spacing="comfortable" layout="fixed">
            <GridColumn medium={12}>
              <PageHeader
                breadcrumbs={<BreadcrumbsStateless onExpand={() => { }}>
                  <BreadcrumbsItem component={() => <NavItem text={this.state.pipeline.repository!.name!} href={this.state.pipeline.repository!.links!.html!.href} />} />
                  <BreadcrumbsItem component={() => <NavItem text='Pipelines' href={`${this.state.pipeline.repository!.links!.html!.href}/addon/pipelines/home`} />} />
                  <BreadcrumbsItem component={() => <NavItem
                    text={`Pipeline #${this.state.pipeline.build_number}`}
                    href={`${this.state.pipeline.repository!.links!.html!.href}/addon/pipelines/home#!/results/${this.state.pipeline.build_number}`}
                    onCopy={() => this.postMessage({ action: 'copyPipelineLink', href: `${this.state.pipeline.repository!.links!.html!.href}/addon/pipelines/home#!/results/${this.state.pipeline.build_number}` })} />} />
                </BreadcrumbsStateless>}
              >
                <p>Pipeline #{this.state.pipeline.build_number}</p>
              </PageHeader>

              <div
                className="pipeline-head"
                style={{
                  backgroundColor: this.colorForState(this.state.pipeline.state)
                }}
              >
                <span className="pipeline-head-item">
                  {this.headerIconForState(this.state.pipeline.state)}
                  #{this.state.pipeline.build_number}
                </span>
                <span className="pipeline-head-item">
                  {builtTimeIcon}
                  {this.stringForSeconds(this.state.pipeline.duration_in_seconds)}
                </span>
                <span className="pipeline-head-item">
                  {calendarIcon}
                  {moment(this.state.pipeline.completed_on ? this.state.pipeline.completed_on : this.state.pipeline.created_on).fromNow()}
                </span>
                <Avatar src={this.state.pipeline.creator_avatar} name={this.state.pipeline.creator_name} size="small" />
              </div>
              {this.steps()}
            </GridColumn>
          </Grid>
        </Page>
      </div>
    );
  }
}
