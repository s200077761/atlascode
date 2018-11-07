import { Repository, Remote } from "../typings/git";
import * as Bitbucket from 'bitbucket';

export interface PullRequest {
    repository: Repository;
    remote: Remote;
    data: Bitbucket.Schema.Pullrequest;
}

export interface PaginatedPullRequests {
    // Repeating repository and remote fields although they are available from
    // individual pull requests for 1) convenience and 2) handle case when `data` is empty.
    repository: Repository;
    remote: Remote;
    data: PullRequest[];
    next?: string;
}