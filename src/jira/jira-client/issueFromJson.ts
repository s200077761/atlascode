import { DetailedSiteInfo } from "../../atlclients/authInfo";
import { EpicFieldInfo } from "../jiraCommon";
import { MinimalIssue, MinimalIssueLink, Transition, isStatus, isPriority, isIssueType, isTransition, isIssueLinkType } from "./model/entities";
import { emptyStatus, emptyPriority, emptyIssueType, emptyUser, emptyTransition } from "./model/emptyEntities";
import { DetailedIssue, isComment, emptyComment, Attachment, isAttachment, emptyAttachment, IdName, isUser } from "./model/detailedJiraIssue";

export function minimalIssueFromJsonObject(issueJson: any, siteDetails: DetailedSiteInfo, epicFields: EpicFieldInfo): MinimalIssue {

    const subtasks: MinimalIssue[] = getSubtasks(issueJson, siteDetails, epicFields);
    const issuelinks: MinimalIssueLink[] = getIssueLinks(issueJson, siteDetails, epicFields, minimalIssueFromJsonObject);
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
        issueType: isIssueType(issueJson.fields.issuetype) ? issueJson.fields.issuetype : emptyIssueType,
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

export function issueFromJsonObject(issueJson: any, siteDetails: DetailedSiteInfo, epicFields: EpicFieldInfo): DetailedIssue {
    let jsonComments: any[] = [];

    if (issueJson.renderedFields && issueJson.renderedFields.comment && issueJson.renderedFields.comment.comments) {
        jsonComments = issueJson.renderedFields.comment.comments;
    }
    else if (issueJson.fields.comment && issueJson.fields.comment.comments) {
        jsonComments = issueJson.fields.comment.comments;
    }
    const comments = jsonComments.map((commentJson: any) => {
        if (isComment(commentJson)) { return commentJson; }

        return emptyComment;
    });

    let attachments: Attachment[] = [];
    if (issueJson.fields.attachments) {
        attachments = issueJson.fields.attachments.map((attachmentJson: any) => {
            if (isAttachment(attachmentJson)) { return attachmentJson; }

            return emptyAttachment;
        });
    }

    let labels: string[] = [];
    if (issueJson.fields.labels && Array.isArray(issueJson.fields.labels)) {
        labels = issueJson.fields.labels;
    }
    let components: IdName[] = [];
    if (issueJson.fields.components) {
        components = issueJson.fields.components.map((componentJson: any) => { return { id: componentJson.id, name: componentJson.name }; });
    }

    let fixVersions: IdName[] = [];
    if (issueJson.fields.fixVersions) {
        fixVersions = issueJson.fields.fixVersions.map((fixVersion: any) => { return { id: fixVersion.id, name: fixVersion.name }; });
    }

    let descriptionHtml = issueJson.fields.description;
    if (issueJson.renderedFields && issueJson.renderedFields.description) {
        descriptionHtml = issueJson.renderedFields.description;
    }
    const transitions: Transition[] = getTransitions(issueJson);
    const subtasks: MinimalIssue[] = getSubtasks(issueJson, siteDetails, epicFields);
    const issuelinks: MinimalIssueLink[] = getIssueLinks(issueJson, siteDetails, epicFields, minimalIssueFromJsonObject);

    const thisIssue = {
        key: issueJson.key,
        id: issueJson.id,
        self: issueJson.self,
        created: new Date(Date.parse(issueJson.fields.created)),
        updated: new Date(Date.parse(issueJson.fields.updated)),
        description: issueJson.fields.description,
        descriptionHtml: descriptionHtml,
        summary: issueJson.fields.summary,
        status: isStatus(issueJson.fields.status) ? issueJson.fields.status : emptyStatus,
        priority: isPriority(issueJson.fields.priority) ? issueJson.fields.priority : emptyPriority,
        issueType: isIssueType(issueJson.fields.issuetype) ? issueJson.fields.issuetype : emptyIssueType,
        reporter: isUser(issueJson.fields.reporter) ? issueJson.fields.reporter : emptyUser,
        assignee: isUser(issueJson.fields.assignee) ? issueJson.fields.assignee : emptyUser,
        parentKey: issueJson.fields.parent ? issueJson.fields.parent.key : undefined,
        subtasks: subtasks,
        issuelinks: issuelinks,
        comments: comments,
        labels: labels,
        attachments: attachments,
        transitions: transitions,
        components: components,
        fixVersions: fixVersions,
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

function getSubtasks(issueJson: any, siteDetails: DetailedSiteInfo, epicFields: EpicFieldInfo): MinimalIssue[] {
    let subtasks: MinimalIssue[] = [];
    if (issueJson.fields.subtasks && Array.isArray(issueJson.fields.subtasks)) {
        subtasks = issueJson.fields.subtasks.map((subtaskJson: any) => {
            const subtaskIssue = minimalIssueFromJsonObject(subtaskJson, siteDetails, epicFields);
            // subtask creation date is not returned in the api response
            subtaskIssue.created = new Date(Date.parse(issueJson.fields.created));
            return subtaskIssue;
        });
    }

    return subtasks;
}

function getIssueLinks(issueJson: any, siteDetails: DetailedSiteInfo, epicFields: EpicFieldInfo, factory: (issueJson: any, siteDetails: DetailedSiteInfo, epicFields: EpicFieldInfo) => MinimalIssue): MinimalIssueLink[] {
    let issuelinks: any[] = [];
    if (issueJson.fields.issuelinks && Array.isArray(issueJson.fields.issuelinks)) {
        issuelinks = issueJson.fields.issuelinks
            .filter((issuelinkJson: any) => isIssueLinkType(issuelinkJson.type) && (issuelinkJson.inwardIssue || issuelinkJson.outwardIssue))
            .map((issuelinkJson: any): any => {
                if (issuelinkJson.inwardIssue) {
                    const linkedIssue = factory(issuelinkJson.inwardIssue, siteDetails, epicFields);
                    linkedIssue.created = new Date(Date.parse(issueJson.fields.created));
                    return {
                        id: issuelinkJson.id,
                        type: issuelinkJson.type,
                        inwardIssue: linkedIssue
                    };
                } else {
                    const linkedIssue = factory(issuelinkJson.outwardIssue, siteDetails, epicFields);
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