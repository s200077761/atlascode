export class JiraIssue {
    key: string;
    description: string;
    summary: string;
    jiraURL: string;
    issueIcon: string;
    comments: JiraComment[];

    constructor(key: string, description: string, summary: string, jiraURL: string, issueIcon: string, comments: JiraComment[]) {
        this.key = key;
        this.description = description;
        this.summary = summary;
        this.jiraURL = jiraURL;
        this.issueIcon = issueIcon;
        this.comments = comments;
    }

    static readIssue(issueJson: any): JiraIssue {
        const key = issueJson.key;
        const description = issueJson.fields.description;
        const summary = issueJson.fields.summary;
        const issuetypeIcon = issueJson.fields.issuetype.iconUrl;
        const comments = issueJson.fields.comment.comments.map((commentJson: any) => {
          let author = commentJson.author.displayName;
          let body = commentJson.body;
          return new JiraComment(author, body);
        });
        return new JiraIssue(
          key,
          description,
          summary,
          "http://www.example.com/",
          issuetypeIcon,
          comments
        );
      }
}
export class JiraComment {
    author: string;
    comment: string;

    constructor(author: string, comment: string) {
        this.author = author;
        this.comment = comment;
    }
}
