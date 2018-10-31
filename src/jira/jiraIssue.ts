export class JiraIssue {

    static readonly fields = ["summary", "description", "comment", "issuetype", "status", "created", "reporter", "assignee", "labels", "attachment", "status"];

    constructor(readonly key: string, readonly description: string, readonly summary: string, 
        readonly status: JiraStatus, readonly reporter: JiraUser, readonly assignee: JiraUser | undefined, 
        readonly jiraURL: string, readonly issueIcon: string, readonly comments: JiraComment[], 
        readonly labels: string[], readonly attachments: JIRA.Schema.AttachmentBean[]) {}

    static readIssue(issueJson: any): JiraIssue {
        const key = issueJson.key;
        const description = issueJson.fields.description;
        const summary = issueJson.fields.summary;
        const status = new JiraStatus(issueJson.fields.status.name, issueJson.fields.status.statusCategory.colorName);
        const issuetypeIcon = issueJson.fields.issuetype.iconUrl;
        const reporter = JiraUser.readUser(issueJson.fields.reporter);
        const assignee = issueJson.fields.assignee ? JiraUser.readUser(issueJson.fields.assignee) : undefined;
        const comments = issueJson.fields.comment.comments.map((commentJson: any) => {
          let author = JiraUser.readUser(commentJson.author);
          let body = commentJson.body;
          return new JiraComment(author, body);
        });
        const labels = issueJson.fields.labels;
        const attachments = issueJson.fields.attachment;
        return new JiraIssue(
          key,  
          description,
          summary,
          status,
          reporter,
          assignee,
          "http://www.example.com/",
          issuetypeIcon,
          comments,
          labels,
          attachments
        );
      }
}

export class JiraComment {
    constructor(readonly author: JiraUser, readonly comment: string) {
    }
}

export class JiraUser {

    constructor(readonly displayName: string, readonly accountId: string, readonly avatarUrl: string) {
    }

    static readUser(userObject: any): JiraUser {
        return new JiraUser(userObject.displayName,
            userObject.accountId,
            userObject.avatarUrls['48x48']);
    }
}

export class JiraStatus {
    constructor(readonly name:string, readonly colorName: string) {
    }
}
