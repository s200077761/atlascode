import { isArray } from "util";
import { MinimalIssue } from "../minimalJiraIssue";
import { EpicFieldInfo } from "../jiraCommon";
import { minimalIssueFromJsonObject } from "../issueFromJson";
import { DetailedSiteInfo } from "../../atlclients/authInfo";

export interface SearchResults {
    readonly issues: MinimalIssue[];
    readonly maxResults: number;
    readonly startAt: number;
    readonly total: number;
}

export async function readSearchResults(params: any, site: DetailedSiteInfo, epicFieldInfo: EpicFieldInfo): Promise<SearchResults> {

    return {
        maxResults: params.maxResults,
        startAt: params.startAt,
        total: params.total,
        issues: isArray(params.issues) ? params.issues.map((i: any) => minimalIssueFromJsonObject(i, site, epicFieldInfo)) : []
    };
}
