import React, { PureComponent } from "react";
import Modal, { ModalTransition } from "@atlaskit/modal-dialog";
import { JQLAutocompleteInput } from "./JQLAutocompleteInput";
import { JQLEntry } from "src/config/model";
import TextField from "@atlaskit/field-text";

export default class EditJQL extends PureComponent<{
  cloudId: string;
  jiraAccessToken: string;
  jqlEntry: JQLEntry;
  onCancel: () => void;
  onSave: (jqlEntry: JQLEntry) => void;
}, {
  nameValue: string;
  inputValue: string;
  openComplete: boolean;
}> {
  state={
    nameValue: this.props.jqlEntry.name,
    inputValue: this.props.jqlEntry.query,
    openComplete: false
  };

  async fetchEndpoint(endpoint: string): Promise<any> {
    const fullUrl = `https://api.atlassian.com/ex/jira/${
      this.props.cloudId
    }/rest/api/2/${endpoint}`;
    const r = new Request(fullUrl, {
      headers: {
        Authorization: `Bearer ${this.props.jiraAccessToken}`,
        "Content-Type": "application/json"
      }
    });
    console.log(`Fetch ${fullUrl}`);
    return fetch(r).then((res: Response) => {
      return res.json();
    });
  }

  getSuggestionsRequest = async (fieldName: string, fieldValue:string) => {
    return this.fetchEndpoint(
      `jql/autocompletedata/suggestions?fieldName=${fieldName}&fieldValue=${fieldValue}`
    );
  }

  validationRequest = async (jql: string) => {
    return this.fetchEndpoint(
      `/search?startAt=0&maxResults=1&validateQuery=strict&fields=summary&jql=${jql}`
    );
  }

  getAutocompleteDataRequest = () => {
    return this.fetchEndpoint("/jql/autocompletedata");
  }

  onJQLChange = (e: any) => {
    this.setState({
      inputValue: e.target.value
    });
  }

  onNameChange = (e: any) => {
    this.setState({
      nameValue: e.target.value
    });
  }

  onSave = () => {
      var entry = this.props.jqlEntry;

      this.props.onSave(Object.assign({}, entry, {name: this.state.nameValue, query: this.state.inputValue}));
  }

  onOpenComplete = () => {
    this.setState({openComplete: true});
  }

  render() {
    const actions = [
      { text: "Cancel", onClick: this.props.onCancel },
      { text: "Save", onClick: this.onSave }
    ];

    return (
        <ModalTransition>
          <Modal
            actions={actions}
            onClose={this.props.onCancel}
            heading="Edit JQL"
            onOpenComplete={this.onOpenComplete}
            shouldCloseOnEscapePress={false}
          >
            <TextField
              style={{ width: "100%"}}
              type="text"
              label="Name"
              id="jql-name-input"
              value={this.state.nameValue}
              onChange={this.onNameChange}
              required
            />
            {this.state.openComplete &&
            <JQLAutocompleteInput
              getAutocompleteDataRequest={this.getAutocompleteDataRequest}
              getSuggestionsRequest={this.getSuggestionsRequest}
              initialValue={this.state.inputValue}
              inputId={"jql-automplete-input"}
              label={"Query"}
              onChange={this.onJQLChange}
              validationRequest={this.validationRequest}
            />
            }
          </Modal>
        </ModalTransition>
    );
  }
}
