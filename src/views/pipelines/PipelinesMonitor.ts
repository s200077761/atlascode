import { window, commands } from "vscode";
import { Pipeline, PipelineTarget } from "../../pipelines/model";
import { Repository } from "../../typings/git";
import { Container } from "../../container";
import { shouldDisplay } from "./Helpers";
import { Commands } from "../../commands";
import { clientForRemote, firstBitbucketRemote } from "../../bitbucket/bbUtils";

export class PipelinesMonitor implements BitbucketActivityMonitor {
  private _previousResults: Map<string, Pipeline[]> = new Map();

  constructor(private _repositories: Repository[]) {
  }

  async checkForNewActivity() {
    if (!Container.config.bitbucket.pipelines.monitorEnabled) {
      return;
    }
    for (var i = 0; i < this._repositories.length; i++) {
      const repo = this._repositories[i];
      const previousResults = this._previousResults[repo.rootUri.path];

      const remote = firstBitbucketRemote(repo);
      const bbApi = await clientForRemote(remote);

      bbApi.pipelines!.getRecentActivity(repo).then(newResults => {
        var diffs = this.diffResults(previousResults, newResults);
        diffs = diffs.filter(p => this.shouldDisplayTarget(p.target));
        const buttonText = diffs.length === 1 ? "View" : "View Pipeline Explorer";
        if (diffs.length > 0) {
          window.showInformationMessage(
            this.composeMessage(diffs),
            buttonText
          ).then((selection) => {
            if (selection) {
              if (diffs.length === 1) {
                commands.executeCommand(Commands.ShowPipeline, { pipelineUuid: diffs[0].uuid, repo: repo, remote: remote });
              } else {
                commands.executeCommand("workbench.view.extension.atlascode-drawer");
              }
            }
          });
        }
        this._previousResults[repo.rootUri.path] = newResults;
      });
    }
  }

  private shouldDisplayTarget(target: PipelineTarget): boolean {
    //If there's no branch associated with this pipe, don't filter it
    return !target.ref_name || shouldDisplay(target.ref_name);
  }

  private diffResults(oldResults: Pipeline[],
    newResults: Pipeline[]
  ): Pipeline[] {
    if (!oldResults) {
      return [];
    }
    const changes: Pipeline[] = [];
    const previousLength = oldResults.length;
    const newLength = newResults.length;
    var i = 0;
    var j = 0;
    while (true) {
      if (i === previousLength || j === newLength) {
        return changes;
      }
      const oldItem = oldResults[i];
      const newItem = newResults[j];
      if (oldItem.build_number === newItem.build_number) {
        if (oldItem.state!.name !== newItem.state!.name) {
          changes.push(newItem);
        }
        i++;
        j++;
      } else {
        changes.push(newItem);
        j++;
      }
    }
  }

  private composeMessage(newResults: Pipeline[]): string {
    if (newResults.length === 1) {
      const result = newResults[0];
      return `${this.descriptionForState(result)}.`;
    } else if (newResults.length === 2) {
      return `${this.descriptionForState(newResults[0])} and ${this.descriptionForState(newResults[1])}.`;
    } else if (newResults.length === 3) {
      return `New build statuses for ${this.generatePipelineTitle(newResults[0])}, ${
        this.generatePipelineTitle(newResults[1])
      }, and 1 other build.`;
    } else if (newResults.length > 3) {
      return `New build statuses for ${this.generatePipelineTitle(newResults[0])}, ${
        this.generatePipelineTitle(newResults[1])
      }, and ${newResults.length - 2} other builds.`;
    }
    return "";
  }

  private generatePipelineTitle(pipeline: Pipeline): string {
    let description = "";
    const pattern = pipeline.target.selector.pattern;
    const type = pipeline.target.selector.type;
    const ref_name = pipeline.target.ref_name;
    const triggerType = pipeline.target.triggerName;
    const buildNumber = pipeline.build_number;

    //Make sure every case is covered so that a meaningful message is displayed back
    if(type === "custom"){
      if(ref_name){
        description = `Pipeline ${pattern}(${type}) on branch ${ref_name}`;
      } else {
        description = `Pipeline ${pattern}(${type})`;
      }
    } else if(triggerType === "MANUAL"){
      if(ref_name && pattern){
        description = `Pipeline ${pattern}(manual) on branch ${ref_name}`;
      } else if(ref_name && buildNumber){
        description = `Pipeline #${buildNumber}(manual) on branch ${ref_name}`;
      } else if(buildNumber){
        description = `Pipeline #${buildNumber}(manual)`;
      } else {
        description = `Pipeline(manual)`;
      }
    } else if(ref_name) {
      description = `Pipeline on branch ${ref_name}`;
    } else if(buildNumber) {
      description = `Pipeline #${buildNumber}`; 
    } else {
      description = "Unknown Pipeline";
    }
    return description;
  }

  private descriptionForState(result: Pipeline): string {
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

    const descriptionString = `${this.generatePipelineTitle(result)} ${words}`;
    return descriptionString;
  }
}
