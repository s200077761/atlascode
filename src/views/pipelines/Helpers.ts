import { Container } from "../../container";
import { Pipeline, Status, statusForState } from "../../pipelines/model";
import { Resources } from "../../resources";
import { Uri } from "vscode";

/**
 * Determines whether or not a branch name should be displayed according to the filtering
 * preferences of the user.
 * @param branchName The branch name to test.
 */
export function shouldDisplay(branchName: string): boolean {
    if (!Container.config.bitbucket.pipelines.hideFiltered) {
        return true;
    }

    const filters = Container.config.bitbucket.pipelines.branchFilters.filter(f => f.length > 0);
    const reString = filters.map(t => t.replace(/(\W)/g, '\\$1')).join("|");
    const regex = new RegExp(reString);
    return regex.test(branchName);
}

export function descriptionForState(result: Pipeline, excludePipelinePrefix?: boolean): string {
    const descriptionForResult = {
        pipeline_state_completed_successful: "was successful",
        pipeline_state_completed_failed: "has failed",
        pipeline_state_completed_error: "has failed",
        pipeline_state_completed_stopped: "has been stopped"
    };

    var words = "has done something";
    switch (result.state!.type) {
        case "pipeline_state_completed":
        words = descriptionForResult[result.state!.result!.type];
        break;
        case "pipeline_state_in_progress":
        words = "is building";
        break;
        case "pipeline_state_pending":
        words = "is pending";
    }

    const descriptionString = `${generatePipelineTitle(result, excludePipelinePrefix)} ${words}`;
    return descriptionString;
}

export function generatePipelineTitle(pipeline: Pipeline, excludePipelinePrefix?: boolean): string {
    let description = "";
    let pattern = undefined;
    let type = undefined;
    if(pipeline.target.selector){ //Apparently some pipelines may be missing a selector entirely
        pattern = pipeline.target.selector.pattern;
        type = pipeline.target.selector.type;
    }
    const ref_name = pipeline.target.ref_name;
    const triggerType = pipeline.target.triggerName;
    const buildNumber = pipeline.build_number;
    const prefix = excludePipelinePrefix ? "" : "Pipeline ";

    //Make sure every case is covered so that a meaningful message is displayed back
    if(type === "custom") { //This is a custom pipeline
      if(ref_name && pattern) { //Pipeline is on a branch
        description = `${prefix}#${buildNumber} ${pattern}(${type}) on branch ${ref_name}`;
      } else if (pattern) {
        description = `${prefix}#${buildNumber} ${pattern}(${type})`;
      } else {
        description = `${prefix}#${buildNumber}(${type})`;
      }
    } else if(triggerType === "MANUAL") { //Pipeline is not custom but was manually triggered
      if(ref_name && pattern) { //Pipeline on a branch and pipeline is not default
        description = `${prefix}#${buildNumber}(manual) ${pattern} on branch ${ref_name}`;
      } else if(ref_name) { //Pipeline on a branch
        description = `${prefix}#${buildNumber}(manual) on branch ${ref_name}`; 
      } else { 
        description = `${prefix}#${buildNumber}(manual)`;
      }
    } else if(ref_name) { //Pipeline is on a branch
        description = `${prefix}#${buildNumber} on branch ${ref_name}`;
    } else {
        description = `${prefix}#${buildNumber}`; //Fallback case (All pipelines must have build numbers)
    }
    return description;
  }

export function iconUriForPipeline(pipeline: Pipeline): Uri | undefined {
    switch (statusForState(pipeline.state)) {
        case Status.Pending:
            return Resources.icons.get('pending');
        case Status.InProgress:
            return Resources.icons.get('building');
        case Status.Paused:
            return Resources.icons.get('paused');
        case Status.Stopped:
            return Resources.icons.get('stopped');
        case Status.Successful:
            return Resources.icons.get('success');
        case Status.Error:
            return Resources.icons.get('failed');
        case Status.Failed:
            return Resources.icons.get('failed');
        default:
            return undefined;
    }
}

export function statusForPipeline(pipeline: Pipeline): string {
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