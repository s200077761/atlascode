import * as React from "react";
import Select, { components } from '@atlaskit/select';
import Lozenge from "@atlaskit/lozenge";
import { Transition, Status } from "../../../jira/jira-client/model/entities";
import { colorToLozengeAppearanceMap } from "../colors";

const { Option } = components;

const StatusOption = (props: any) => (
  <Option {...props}>
    <Lozenge appearance={colorToLozengeAppearanceMap[props.data.to.statusCategory.colorName]}>
      {props.data.to.name}
    </Lozenge>
  </Option>
);

const StatusValue = (props: any) => (
  <components.SingleValue {...props}>
    <Lozenge appearance={colorToLozengeAppearanceMap[props.data.to.statusCategory.colorName]}>
      {props.data.to.name}
    </Lozenge>
  </components.SingleValue>

);

type Props = {
  transitions: Transition[];
  currentStatus: Status;
  isStatusButtonLoading: boolean;
  onStatusChange: (item: Transition) => void;
};

type State = {
  selectedTransition: Transition | undefined;
};

export class TransitionMenu extends React.Component<Props, State> {

  constructor(props: any) {
    super(props);
    const selectedTransition = props.transitions.find((transition: Transition) => transition.to.id === props.currentStatus.id);
    this.state = { selectedTransition: selectedTransition };
  }

  componentWillReceiveProps(nextProps: any) {
    const selectedTransition = nextProps.transitions.find((transition: Transition) => transition.to.id === nextProps.currentStatus.id);
    this.setState({ selectedTransition: selectedTransition });
  }

  handleStatusChange = (item: Transition) => {
    this.props.onStatusChange(item);
  }

  render() {
    if (!Array.isArray(this.props.transitions) || this.props.transitions.length < 1) {
      return <div />;
    }

    return (
      <Select
        name="status"
        id="status"
        className="ac-select-container"
        classNamePrefix="ac-select"
        options={this.props.transitions}
        value={this.state.selectedTransition}
        components={{ Option: StatusOption, SingleValue: StatusValue }}
        getOptionLabel={(option: any) => option.to.name}
        getOptionValue={(option: any) => option.id}
        isDisabled={this.props.isStatusButtonLoading}
        isLoading={this.props.isStatusButtonLoading}
        onChange={this.handleStatusChange}
      />
    );
  }
}
