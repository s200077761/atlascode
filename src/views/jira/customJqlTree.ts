import { AbstractIssueTree } from "./abstractIssueTree";
import { IssueNode } from "../nodes/issueNode";
import { CustomJQLRoot } from "./customJqlRoot";

export class CustomJQLTree extends AbstractIssueTree {
  constructor(jql: string, public parent?: CustomJQLRoot) {
    super("", undefined, "No issues match this query");
    this.setJql(jql);
  }

  getJql() {
      return this._jql;
  }

  async getChildren(parent?: IssueNode): Promise<IssueNode[]> {
    return super.getChildren(undefined);
  }
}
