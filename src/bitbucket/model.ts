import { Repository, Remote } from "../typings/git";
import * as Bitbucket from 'bitbucket';

export interface PullRequestDecorated {
    repository: Repository;
    remote: Remote;
    data: Bitbucket.Schema.Pullrequest;
}