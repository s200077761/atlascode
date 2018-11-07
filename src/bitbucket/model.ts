import { Repository, Remote } from "../typings/git";
import * as Bitbucket from 'bitbucket';

export interface PullRequest {
    repository: Repository;
    remote: Remote;
    data: Bitbucket.Schema.Pullrequest;
}

export interface PaginatedPullRequests {
    data: PullRequest[];
    next?: string;
}