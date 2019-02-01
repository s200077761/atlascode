import { AbstractIssueTree } from "./abstractIssueTree";
import { IssueNode } from "../nodes/issueNode";
import { JQLEntry } from "src/config/model";

export class CustomJQLTree extends AbstractIssueTree {
  constructor(readonly jqlEntry: JQLEntry) {
    super("", undefined, "No issues match this query");
    this.setJql(this.jqlEntry.query);
  }

  async getChildren(parent?: IssueNode): Promise<IssueNode[]> {
    return super.getChildren(undefined);
  }
}
