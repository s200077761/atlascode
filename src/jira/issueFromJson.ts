import { DetailedSiteInfo } from "../atlclients/authInfo";
import { Issue, isComment, emptyComment, Transition, isTransition, emptyTransition, Attachment, isAttachment, emptyAttachment, IdName, IssueLink, isIssueLinkType, isStatus, emptyStatus, isPriority, emptyPriority, isIssueType, emptyIssueType, isUser, emptyUser } from "./jiraModel";
import { EpicFieldInfo } from "./jiraCommon";
import { TreeViewIssue, TreeViewIssueLink } from "./jiraTreeviewIssue";

export function treeViewissueFromJsonObject(issueJson: any, siteDetails: DetailedSiteInfo, epicFields: EpicFieldInfo): TreeViewIssue {

    let subtasks: Issue[] = [];
    if (issueJson.fields.subtasks && Array.isArray(issueJson.fields.subtasks)) {
        subtasks = issueJson.fields.subtasks.map((subtaskJson: any) => {
            const subtaskIssue = treeViewissueFromJsonObject(subtaskJson, siteDetails, epicFields);
            return subtaskIssue;
        });
    }
    let issuelinks: TreeViewIssueLink[] = [];
    if (issueJson.fields.issuelinks && Array.isArray(issueJson.fields.issuelinks)) {
        issuelinks = issueJson.fields.issuelinks
            .filter((issuelinkJson: any) => isIssueLinkType(issuelinkJson.type) && (issuelinkJson.inwardIssue || issuelinkJson.outwardIssue))
            .map((issuelinkJson: any): TreeViewIssueLink => {
                if (issuelinkJson.inwardIssue) {
                    const linkedIssue = treeViewissueFromJsonObject(issuelinkJson.inwardIssue, siteDetails, epicFields);
                    return {
                        id: issuelinkJson.id,
                        type: issuelinkJson.type,
                        inwardIssue: linkedIssue
                    };
                } else {
                    const linkedIssue = treeViewissueFromJsonObject(issuelinkJson.outwardIssue, siteDetails, epicFields);
                    return {
                        id: issuelinkJson.id,
                        type: issuelinkJson.type,
                        outwardIssue: linkedIssue
                    };
                }
            });
    }

    const thisIssue = {
        key: issueJson.key,
        id: issueJson.id,
        self: issueJson.self,
        summary: issueJson.fields.summary,
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

export function issueFromJsonObject(issueJson: any, siteDetails: DetailedSiteInfo, epicFields: EpicFieldInfo): Issue {
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

    let transitions: Transition[] = [];
    if (issueJson.transitions) {
        transitions = issueJson.transitions.map((transitionJson: any) => {
            if (isTransition(transitionJson)) { return transitionJson; }

            return emptyTransition;
        });
    }

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
    let subtasks: Issue[] = [];
    if (issueJson.fields.subtasks && Array.isArray(issueJson.fields.subtasks)) {
        subtasks = issueJson.fields.subtasks.map((subtaskJson: any) => {
            const subtaskIssue = issueFromJsonObject(subtaskJson, siteDetails, epicFields);
            // subtask creation date is not returned in the api response
            subtaskIssue.created = new Date(Date.parse(issueJson.fields.created));
            return subtaskIssue;
        });
    }
    let issuelinks: IssueLink[] = [];
    if (issueJson.fields.issuelinks && Array.isArray(issueJson.fields.issuelinks)) {
        issuelinks = issueJson.fields.issuelinks
            .filter((issuelinkJson: any) => isIssueLinkType(issuelinkJson.type) && (issuelinkJson.inwardIssue || issuelinkJson.outwardIssue))
            .map((issuelinkJson: any): IssueLink => {
                if (issuelinkJson.inwardIssue) {
                    const linkedIssue = issueFromJsonObject(issuelinkJson.inwardIssue, siteDetails, epicFields);
                    linkedIssue.created = new Date(Date.parse(issueJson.fields.created));
                    return {
                        id: issuelinkJson.id,
                        type: issuelinkJson.type,
                        inwardIssue: linkedIssue
                    };
                } else {
                    const linkedIssue = issueFromJsonObject(issuelinkJson.outwardIssue, siteDetails, epicFields);
                    linkedIssue.created = new Date(Date.parse(issueJson.fields.created));
                    return {
                        id: issuelinkJson.id,
                        type: issuelinkJson.type,
                        outwardIssue: linkedIssue
                    };
                }
            });
    }

    const thisIssue = {
        key: issueJson.key,
        id: issueJson.id,
        self: issueJson.self,
        created: new Date(Date.parse(issueJson.fields.created)),
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