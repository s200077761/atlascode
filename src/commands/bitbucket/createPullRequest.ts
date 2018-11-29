import { commands, workspace, Uri } from "vscode";
import { BitbucketContext } from "../../bitbucket/context";
import { PullRequestApi, GitUrlParse } from "../../bitbucket/pullRequests";

export async function createPullRequest(context: BitbucketContext): Promise<void> {
    const root = workspace.rootPath;
    
    const repository = context.getRepository(Uri.file(root!))!;
    let branchName = repository.state.HEAD!.name;
    let remote = PullRequestApi.getBitbucketRemotes(repository)[0];
    const url = remote.fetchUrl || remote.pushUrl;
    let parsed = GitUrlParse(url!);
    let prUrl = `https://${parsed.resource}/${parsed.owner}/${parsed.name}/pull-requests/new?source=${branchName}&t=1`;
    const uri = Uri.parse(prUrl);
    commands.executeCommand('vscode.open', uri);
}