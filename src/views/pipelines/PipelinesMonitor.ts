import { Disposable, window, commands } from "vscode";
import { PipelineApi } from "../../pipelines/pipelines";
import { Pipeline } from "../../pipelines/model";
import { Repository } from "../../typings/git";
import { Container } from "../../container";


export class PipelinesMonitor extends Disposable {
  private _previousResults: Map<string, Pipeline[]> = new Map();

  constructor(private _repositories: Repository[]) {
    super(() => this.dispose());
  }

  async checkForNewResults() {
    if (!Container.config.bitbucket.pipelines.monitorEnabled) {
      return;
    }
    await Container.clientManager.bbrequest();
    for (var i = 0; i < this._repositories.length; i++) {
      const repo = this._repositories[i];
      const previousResults = this._previousResults[repo.rootUri.path];
      PipelineApi.getRecentActivity(repo).then(newResults => {
        const diffs = this.diffResults(previousResults, newResults);
        if (diffs.length > 0) {
          window.showInformationMessage(
            this.composeMessage(diffs),
            "View Pipeline Explorer"
          ).then((selection) => {
            if (selection) {
              commands.executeCommand("workbench.view.extension.atlascode-drawer");
            }
          });

        }
        this._previousResults[repo.rootUri.path] = newResults;
      });
    }
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
      return `New build statuses for ${newResults[0].target!.ref_name}, ${
        newResults[1].target!.ref_name
        }, and ${newResults[2].target!.ref_name}.`;
    } else if (newResults.length === 4) {
      return `New build statuses for ${newResults[0].target!.ref_name}, ${
        newResults[1].target!.ref_name
        }, ${newResults[2].target!.ref_name} and 1 other build.`;
    } else if (newResults.length > 4) {
      return `New build statuses for ${newResults[0].target!.ref_name}, ${
        newResults[1].target!.ref_name}, ${newResults[2].target!.ref_name} and ${
        newResults.length - 3} other builds.`;
    }
    return "";
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

    return `${result.target!.ref_name} ${words}`;
  }
}
