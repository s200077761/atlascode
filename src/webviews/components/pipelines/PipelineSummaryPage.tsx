import * as React from "react";
import { WebviewComponent } from "../WebviewComponent";
import { Action } from "../../../ipc/messaging";
import {
  Pipeline,
  PipelineState,
  PipelineStep,
  PipelineResult,
  statusForState,
  Status
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

const successIcon = (
  <CheckCircleIcon primaryColor={colors.G400} label="build successful" />
);
const inprogressIcon = (
  <RecentIcon primaryColor={colors.B300} label="build in progress" />
);
const errorIcon = (
  <ErrorIcon primaryColor={colors.R400} label="build failure" />
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
    size="large"
    label="build successful"
  />
);
const headerInprogressIcon = (
  <RecentIcon
    primaryColor={colors.N0}
    secondaryColor={colors.B300}
    size="large"
    label="build in progress"
  />
);
const headerErrorIcon = (
  <ErrorIcon
    primaryColor={colors.N0}
    secondaryColor={colors.R400}
    size="large"
    label="build failure"
  />
);
const calendarIcon = <CalendarIcon primaryColor={colors.N0} label="built at" />;
const builtTimeIcon = (
  <RecentIcon primaryColor={colors.N0} label="build in progress" />
);

type Emit = Action;

type Properties = {
  pipeline: Pipeline;
};

type State = {
  pipeline: PipelineData;
  steps: StepData[];
};

const emptyPipeline: PipelineData = {
  type: "",
  build_number: 0,
  uuid: "",
  created_on: "",
  state: { name: "", type: "pipeline_state_in_progress", result: { name: "", type: "" } },
  target: { ref_name: "" }
};

export default class PipelineSummaryPage extends WebviewComponent<Emit, Pipeline, Properties, State> {
  constructor(props: any) {
    super(props);
    this.state = {
      pipeline: emptyPipeline,
      steps: []
    };
  }

  public onMessageReceived(e: any) {

    if (e.type && e.type === "updatePipeline") {
      this.setState({ pipeline: e });
    }
    if (e.type && e.type === "updateSteps") {
      this.setState({ steps: e.steps });
    }
  }

  iconForState(state: PipelineState): any {
    switch (statusForState(state)) {
      case Status.Successful:
        return successIcon;
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

  headerIconForState(state: PipelineState): any {
    switch (state.type) {
      case "pipeline_state_completed":
        return this.headerIconForResult(state.result!);
      case "pipeline_state_in_progress":
      // fall through
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

  commands(step: PipelineStep) {
    return (
      <div>
        <Panel isDefaultExpanded={false} header={panelHeader('Setup', `${step.setup_commands.length} Commands`)}>
          {step.setup_commands.map(c => {
            return <div className="pipeline-command">{c.name}</div>;
          })}
        </Panel>

        <Panel isDefaultExpanded={true} header={panelHeader("Build", `${step.script_commands.length} Commands`)}>
          {step.script_commands.map(c => {
            return <div className="pipeline-command">{c.name}</div>;
          })}
        </Panel>

        <Panel isDefaultExpanded={false} header={panelHeader("Teardown", `${step.teardown_commands.length} Commands`)}>
          {step.teardown_commands.map(c => {
            return <div className="pipeline-command">{c.name}</div>;
          })}
        </Panel>
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
    return (
      <Page>
        <Grid spacing="comfortable" layout="fixed">
          <GridColumn medium={12}>
            <div
              className="pipeline-head"
              style={{
                backgroundColor: this.colorForState(this.state.pipeline.state)
              }}
            >
              <span className="pipeline-head-item">
                {this.headerIconForState(this.state.pipeline.state)}
              </span>
              <span className="pipeline-head-item">
                #{this.state.pipeline.build_number}
              </span>
              <span className="pipeline-head-item">
                {builtTimeIcon}
                {this.stringForSeconds(this.state.pipeline.duration_in_seconds)}
              </span>
              <span className="pipeline-head-item">
                {calendarIcon}
                {moment(this.state.pipeline.completed_on).fromNow()}
              </span>
              <Avatar src={this.state.pipeline.creator_avatar} name={this.state.pipeline.creator_name} />
            </div>
            {this.steps()}
          </GridColumn>
        </Grid>
      </Page>
    );
  }
}
