import * as React from "react";
import DropdownMenu, {
  DropdownItemGroup,
  DropdownItem
} from "@atlaskit/dropdown-menu";
import Lozenge from "@atlaskit/lozenge";
import styled from "styled-components";
import { Issue } from "../../../jira/jiraIssue";
import Arrow from "@atlaskit/icon/glyph/arrow-right";

const statusColors: Map<string, string> = new Map<string, string>([
    ["new", "default"],
    ["indeterminate", "inprogress"],
    ["done", "success"]
  ]);
  
export class TransitionMenu extends React.Component<{
  issue: Issue;
  isStatusButtonLoading: boolean;
  onHandleStatusChange: (item: any) => void;
}> {
  handleStatusChange = (item: any) => {
    this.props.onHandleStatusChange(item);
  }

  render() {
    const JiraItem = styled.div`
      align-items: center;
      display: flex;
    `;
    const issue = this.props.issue;
    if (!issue) {
      return <div />;
    }

    let statusItems: any[] = [];

    issue.transitions.forEach(transition => {
      if (issue.status.id !== transition.to.id) {
        statusItems.push(
          <DropdownItem
            className="ak-dropdown-item"
            id={transition.name}
            data-transition-id={transition.id}
            onClick={(item: any) => this.handleStatusChange(item)}
            elemAfter={
              <JiraItem>
                <Arrow label="" size="small" />
                <Lozenge
                  appearance={statusColors.get(
                    transition.to.statusCategory.key
                  )}
                >
                  {transition.to.name}
                </Lozenge>
              </JiraItem>
            }
          >
            {transition.name}
          </DropdownItem>
        );
      }
    });

    return (
      <DropdownMenu
        triggerType="button"
        trigger={issue.status.name}
        triggerButtonProps={{
          className: "ak-button",
          isLoading: this.props.isStatusButtonLoading
        }}
      >
        <DropdownItemGroup>{statusItems}</DropdownItemGroup>
      </DropdownMenu>
    );
  }
}
