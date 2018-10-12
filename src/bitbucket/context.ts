import { Repository } from "../typings/git";

interface IBitbucketContext {
    repository: Repository;
}

// BitbucketContext stores the context (hosts, auth, current repo etc.)
// for all Bitbucket related actions.
export class BitbucketContext implements IBitbucketContext {
    repository: Repository;
    constructor(r: Repository) {
        this.repository = r;
    }
}