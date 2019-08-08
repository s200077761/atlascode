import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { EpicFieldInfo } from "../jiraCommon";
import { MinimalIssue, MinimalIssueLink, Transition, isStatus, isPriority, isIssueType, isTransition, isIssueLinkType, IssueLinkIssue, readIssueLinkIssue } from "./model/entities";
import { emptyStatus, emptyPriority, emptyIssueType, emptyTransition } from "./model/emptyEntities";

export function minimalIssueFromJsonObject(issueJson: any, siteDetails: DetailedSiteInfo, epicFields: EpicFieldInfo): MinimalIssue {

    const subtasks: IssueLinkIssue[] = getSubtasks(issueJson, siteDetails, epicFields);
    const issuelinks: MinimalIssueLink[] = getIssueLinks(issueJson, siteDetails, epicFields);
    const transitions: Transition[] = getTransitions(issueJson);
    let descriptionHtml = issueJson.fields.description;
    if (issueJson.renderedFields && issueJson.renderedFields.description) {
        descriptionHtml = issueJson.renderedFields.description;
    }

    const thisIssue = {
        key: issueJson.key,
        id: issueJson.id,
        self: issueJson.self,
        created: new Date(Date.parse(issueJson.fields.created)),
        updated: new Date(Date.parse(issueJson.fields.updated)),
        summary: issueJson.fields.summary,
        description: issueJson.fields.description,
        descriptionHtml: descriptionHtml,
        transitions: transitions,
        status: isStatus(issueJson.fields.status) ? issueJson.fields.status : emptyStatus,
        priority: isPriority(issueJson.fields.priority) ? issueJson.fields.priority : emptyPriority,
        issuetype: isIssueType(issueJson.fields.issuetype) ? issueJson.fields.issuetype : emptyIssueType,
        parentKey: issueJson.fields.parent ? issueJson.fields.parent.key : undefined,
        subtasks: subtasks,
        issuelinks: issuelinks,
        siteDetails: siteDetails,
        isEpic: (issueJson.fields[epicFields.epicName.id] && issueJson.fields[epicFields.epicName.id] !== ''),
        epicName: issueJson.fields[epicFields.epicName.id],
        epicLink: issueJson.fields[epicFields.epicLink.id],
        epicChildren: []
    };

    return thisIssue;
}

function getTransitions(issueJson: any): Transition[] {
    let transitions: Transition[] = [];
    if (issueJson.transitions) {
        transitions = issueJson.transitions.map((transitionJson: any) => {
            if (isTransition(transitionJson)) { return transitionJson; }

            return emptyTransition;
        });
    }

    return transitions;
}

function getSubtasks(issueJson: any, siteDetails: DetailedSiteInfo, epicFields: EpicFieldInfo): IssueLinkIssue[] {
    let subtasks: MinimalIssue[] = [];
    if (issueJson.fields.subtasks && Array.isArray(issueJson.fields.subtasks)) {
        subtasks = issueJson.fields.subtasks.map((subtaskJson: any) => {
            const subtaskIssue = readIssueLinkIssue(subtaskJson, siteDetails);
            // subtask creation date is not returned in the api response
            //subtaskIssue.created = new Date(Date.parse(issueJson.fields.created));
            return subtaskIssue;
        });
    }

    return subtasks;
}

function getIssueLinks(issueJson: any, siteDetails: DetailedSiteInfo, epicFields: EpicFieldInfo): MinimalIssueLink[] {
    let issuelinks: any[] = [];
    if (issueJson.fields.issuelinks && Array.isArray(issueJson.fields.issuelinks)) {
        issuelinks = issueJson.fields.issuelinks
            .filter((issuelinkJson: any) => isIssueLinkType(issuelinkJson.type) && (issuelinkJson.inwardIssue || issuelinkJson.outwardIssue))
            .map((issuelinkJson: any): any => {
                if (issuelinkJson.inwardIssue) {
                    const linkedIssue = readIssueLinkIssue(issuelinkJson.inwardIssue, siteDetails);
                    linkedIssue.created = new Date(Date.parse(issueJson.fields.created));
                    return {
                        id: issuelinkJson.id,
                        type: issuelinkJson.type,
                        inwardIssue: linkedIssue
                    };
                } else {
                    const linkedIssue = readIssueLinkIssue(issuelinkJson.outwardIssue, siteDetails);
                    linkedIssue.created = new Date(Date.parse(issueJson.fields.created));
                    return {
                        id: issuelinkJson.id,
                        type: issuelinkJson.type,
                        outwardIssue: linkedIssue
                    };
                }
            });
    }

    return issuelinks;
}