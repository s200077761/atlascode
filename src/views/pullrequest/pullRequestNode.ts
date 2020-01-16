import distanceInWordsToNow from "date-fns/distance_in_words_to_now";
import * as path from "path";
import * as vscode from "vscode";
import { clientForSite } from "../../bitbucket/bbUtils";
import {
  BitbucketSite,
  Comment,
  Commit,
  FileChange,
  FileStatus,
  PaginatedComments,
  PaginatedPullRequests,
  PullRequest,
  User
} from "../../bitbucket/model";
import { Commands } from "../../commands";
import { configuration } from "../../config/configuration";
import { Logger } from "../../logger";
import { Resources } from "../../resources";
import { AbstractBaseNode } from "../nodes/abstractBaseNode";
import { RelatedBitbucketIssuesNode } from "../nodes/relatedBitbucketIssuesNode";
import { RelatedIssuesNode } from "../nodes/relatedIssuesNode";
import { SimpleNode } from "../nodes/simpleNode";
import { DiffViewArgs, getArgsForDiffView } from "./diffViewHelper";
import { PullRequestCommentController } from "./prCommentController";

export const PullRequestContextValue = "pullrequest";

export interface FileDiffQueryParams {
  lhs: boolean;
  repoUri: string;
  branchName: string;
  commitHash: string;
  path: string;
}

export interface PRFileDiffQueryParams extends FileDiffQueryParams {
  site: BitbucketSite;
  repoHref: string;
  prHref: string;
  prId: string;
  participants: User[];
  commentThreads: Comment[][];
  addedLines: number[];
  deletedLines: number[];
  lineContextMap: Object;
}

export class PullRequestTitlesNode extends AbstractBaseNode {
  private treeItem: vscode.TreeItem;
  public prHref: string;

  constructor(
    private pr: PullRequest,
    private commentController: PullRequestCommentController
  ) {
    super();
    this.treeItem = this.createTreeItem();
    this.prHref = pr.data!.url;
  }

  private createTreeItem(): vscode.TreeItem {
    const approvalText = this.pr.data.participants
      .filter(p => p.status === "APPROVED")
      .map(approver => `Approved-by: ${approver.displayName}`)
      .join("\n");

    let item = new vscode.TreeItem(
      `#${this.pr.data.id!} ${this.pr.data.title!}`,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    item.tooltip = `#${this.pr.data.id!} ${this.pr.data.title!}${
      approvalText.length > 0 ? `\n\n${approvalText}` : ""
    }`;
    item.iconPath = vscode.Uri.parse(this.pr.data!.author!.avatarUrl);
    item.contextValue = PullRequestContextValue;
    item.resourceUri = vscode.Uri.parse(this.pr.data.url);
    item.description = `updated ${distanceInWordsToNow(this.pr.data.updatedTs, {
      addSuffix: true
    })}`;

    return item;
  }

  getTreeItem(): vscode.TreeItem {
    return this.treeItem;
  }

  async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
    if (!element) {
      if (!this.pr) {
        return [];
      }

      this.pr = await this.hydratePullRequest(this.pr);

      const bbApi = await clientForSite(this.pr.site);
      let promises = Promise.all([
        bbApi.pullrequests.getChangedFiles(this.pr),
        bbApi.pullrequests.getCommits(this.pr),
        bbApi.pullrequests.getComments(this.pr)
      ]);

      return promises.then(
        async result => {
          let [fileChanges, commits, allComments] = result;

          const children: AbstractBaseNode[] = [new DescriptionNode(this.pr)];
          children.push(
            ...(await this.createRelatedJiraIssueNode(commits, allComments))
          );
          children.push(
            ...(await this.createRelatedBitbucketIssueNode(
              commits,
              allComments
            ))
          );
          children.push(
            ...(await this.createFileChangesNodes(allComments, fileChanges))
          );
          return children;
        },
        reason => {
          Logger.debug("error fetching pull request details", reason);
          return [
            new SimpleNode("⚠️ Error: fetching pull request details failed")
          ];
        }
      );
    } else {
      return element.getChildren();
    }
  }

  // hydratePullRequest fetches the specific pullrequest by id to fill in the missing details.
  // This is needed because when a repo's pullrequests list is fetched, the response may not have all fields populated.
  private async hydratePullRequest(pr: PullRequest): Promise<PullRequest> {
    const bbApi = await clientForSite(this.pr.site);
    return await bbApi.pullrequests.get(pr.site, pr.data.id, pr.workspaceRepo);
  }

  private async createRelatedJiraIssueNode(
    commits: Commit[],
    allComments: PaginatedComments
  ): Promise<AbstractBaseNode[]> {
    const result: AbstractBaseNode[] = [];
    const relatedIssuesNode = await RelatedIssuesNode.create(
      this.pr,
      commits,
      allComments.data
    );
    if (relatedIssuesNode) {
      result.push(relatedIssuesNode);
    }
    return result;
  }

  private async createRelatedBitbucketIssueNode(
    commits: Commit[],
    allComments: PaginatedComments
  ): Promise<AbstractBaseNode[]> {
    const result: AbstractBaseNode[] = [];
    const relatedIssuesNode = await RelatedBitbucketIssuesNode.create(
      this.pr,
      commits,
      allComments.data
    );
    if (relatedIssuesNode) {
      result.push(relatedIssuesNode);
    }
    return result;
  }

  private createdNestedFileStructure(
    diffViewData: DiffViewArgs,
    directory: PRDirectory
  ) {
    const baseName = path.basename(
      diffViewData.fileDisplayData.fileDisplayName
    );
    const dirName = path.dirname(diffViewData.fileDisplayData.fileDisplayName);
    //If we just have a file, the dirName will be '.', but we don't want to tuck that in the '.' directory, so there's a ternary operation to deal with that
    const splitFileName = [
      ...(dirName === "." ? [] : dirName.split("/")),
      baseName
    ];
    let currentDirectory = directory;
    for (let i = 0; i < splitFileName.length; i++) {
      if (i === splitFileName.length - 1) {
        currentDirectory.diffViewArgs.push(diffViewData); //The last name in the path is the name of the file, so we've reached the end of the file tree
      } else {
        const tempDirectory = currentDirectory.members.get(splitFileName[i]);

        //Traverse the file tree, and if a folder doesn't exist, add it
        if (tempDirectory) {
          currentDirectory = tempDirectory;
        } else {
          currentDirectory.members.set(splitFileName[i], {
            name: splitFileName[i],
            diffViewArgs: [],
            members: new Map<string, PRDirectory>()
          });
          currentDirectory = currentDirectory.members.get(splitFileName[i])!;
        }
      }
    }
  }

  //Directories that contain only one child which is also a directory should be flattened. E.g A > B > C > D.txt => A/B/C/D.txt
  private flattenFileStructure(directory: PRDirectory) {
    //Keep flattening until there's nothing left to flatten, and only then move on to children
    while (
      directory.members.size === 1 &&
      directory.diffViewArgs.length === 0
    ) {
      const currentFolderName: string = directory.name;
      const childDirectory = directory.members.values().next().value;
      directory.name = `${currentFolderName}/${
        childDirectory.name ? childDirectory.name : ""
      }`;
      directory.members = childDirectory.members;
      directory.diffViewArgs = childDirectory.diffViewArgs;
    }
    for (let [, value] of directory.members) {
      this.flattenFileStructure(value);
    }
  }

  private async createFileChangesNodes(
    allComments: PaginatedComments,
    fileChanges: FileChange[]
  ): Promise<AbstractBaseNode[]> {
    const allDiffData = await Promise.all(
      fileChanges.map(async fileChange => {
        return await getArgsForDiffView(
          allComments,
          fileChange,
          this.pr,
          this.commentController
        );
      })
    );

    if (configuration.get<boolean>("bitbucket.explorer.nestFilesEnabled")) {
      //Create a directory data structure to represent the files
      let directoryStructure: PRDirectory = {
        name: "",
        diffViewArgs: [],
        members: new Map<string, PRDirectory>()
      };
      allDiffData.forEach(diffData =>
        this.createdNestedFileStructure(diffData, directoryStructure)
      );
      this.flattenFileStructure(directoryStructure);

      //While creating the directory, we actually put all the files/folders inside of a root directory. We now want to go one level in.
      let nestedDirectories: PRDirectory[] = [];
      for (let [, value] of directoryStructure.members) {
        nestedDirectories.push(value);
      }
      let directoryNodes: DirectoryNode[] = nestedDirectories.map(
        directory => new DirectoryNode(directory)
      );
      let childNodes: AbstractBaseNode[] = directoryStructure.diffViewArgs.map(
        diffViewArg => new PullRequestFilesNode(diffViewArg)
      );
      return childNodes.concat(directoryNodes);
    }

    const result: AbstractBaseNode[] = [];
    result.push(
      ...allDiffData.map(diffData => new PullRequestFilesNode(diffData))
    );
    if (allComments.next) {
      result.push(
        new SimpleNode(
          "⚠️ All file comments are not shown. This PR has more comments than what is supported by this extension."
        )
      );
    }
    return result;
  }
}

interface PRDirectory {
  name: string;
  diffViewArgs: DiffViewArgs[];
  members: Map<string, PRDirectory>;
}

class DirectoryNode extends AbstractBaseNode {
  constructor(private directoryData: PRDirectory) {
    super();
  }

  async getTreeItem(): Promise<vscode.TreeItem> {
    const item = new vscode.TreeItem(
      this.directoryData.name,
      vscode.TreeItemCollapsibleState.Expanded
    );
    item.tooltip = this.directoryData.name;
    item.iconPath = vscode.ThemeIcon.Folder;
    return item;
  }

  async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
    let nestedDirectories: PRDirectory[] = [];
    for (let [, value] of this.directoryData.members) {
      nestedDirectories.push(value);
    }
    let directoryNodes: DirectoryNode[] = nestedDirectories.map(
      directory => new DirectoryNode(directory)
    );
    let childNodes: AbstractBaseNode[] = this.directoryData.diffViewArgs.map(
      diffViewArg => new PullRequestFilesNode(diffViewArg)
    );
    return childNodes.concat(directoryNodes);
  }
}

class PullRequestFilesNode extends AbstractBaseNode {
  constructor(private diffViewData: DiffViewArgs) {
    super();
  }

  async getTreeItem(): Promise<vscode.TreeItem> {
    let itemData = this.diffViewData.fileDisplayData;
    let fileDisplayString = itemData.fileDisplayName;
    if (configuration.get<boolean>("bitbucket.explorer.nestFilesEnabled")) {
      fileDisplayString = path.basename(itemData.fileDisplayName);
    }
    let item = new vscode.TreeItem(
      `${itemData.numberOfComments > 0 ? "💬 " : ""}${fileDisplayString}`,
      vscode.TreeItemCollapsibleState.None
    );
    item.tooltip = itemData.fileDisplayName;
    item.command = {
      command: Commands.ViewDiff,
      title: "Diff file",
      arguments: this.diffViewData.diffArgs
    };

    item.contextValue = PullRequestContextValue;
    item.resourceUri = vscode.Uri.parse(
      `${itemData.prUrl}#chg-${itemData.fileDisplayName}`
    );
    switch (itemData.fileChangeStatus) {
      case FileStatus.ADDED:
        item.iconPath = Resources.icons.get("add-circle");
        break;
      case FileStatus.DELETED:
        item.iconPath = Resources.icons.get("delete");
        break;
      //@ts-ignore
      case FileStatus.CONFLICT:
        item.iconPath = Resources.icons.get("warning");
        break;
      default:
        item.iconPath = Resources.icons.get("edit");
        break;
    }

    return item;
  }

  async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
    return [];
  }
}

class DescriptionNode extends AbstractBaseNode {
  constructor(private pr: PullRequest) {
    super();
  }

  getTreeItem(): vscode.TreeItem {
    let item = new vscode.TreeItem(
      "Details",
      vscode.TreeItemCollapsibleState.None
    );
    item.tooltip = "Open pull request details";
    item.iconPath = Resources.icons.get("detail");

    item.command = {
      command: Commands.BitbucketShowPullRequestDetails,
      title: "Open pull request details",
      arguments: [this.pr]
    };

    item.contextValue = PullRequestContextValue;
    item.resourceUri = vscode.Uri.parse(this.pr.data.url);

    return item;
  }

  async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
    return [];
  }
}

export class NextPageNode extends AbstractBaseNode {
  constructor(private prs: PaginatedPullRequests) {
    super();
  }

  getTreeItem(): vscode.TreeItem {
    let item = new vscode.TreeItem(
      "Load next page",
      vscode.TreeItemCollapsibleState.None
    );
    item.iconPath = Resources.icons.get("more");

    item.command = {
      command: Commands.BitbucketPullRequestsNextPage,
      title: "Load pull requests next page",
      arguments: [this.prs]
    };

    return item;
  }

  async getChildren(element?: AbstractBaseNode): Promise<AbstractBaseNode[]> {
    return [];
  }
}
