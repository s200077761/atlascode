import React, { PureComponent } from "react";
import Modal, { ModalTransition } from "@atlaskit/modal-dialog";
import { JQLAutocompleteInput } from "./JQLAutocompleteInput";
import { JQLEntry } from "src/config/model";
import { Field, ErrorMessage } from '@atlaskit/form';
import { FieldValidators, chain } from "../fieldValidators";
import Button from '@atlaskit/button';
import SectionMessage from '@atlaskit/section-message';

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
  jqlError: string | null;
  isEditing: boolean;
}> {
  state = {
    nameValue: this.props.jqlEntry.name,
    inputValue: this.props.jqlEntry.query,
    openComplete: false,
    jqlError: null,
    isEditing: false
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

  getSuggestionsRequest = async (fieldName: string, fieldValue: string) => {
    return this.fetchEndpoint(
      `jql/autocompletedata/suggestions?fieldName=${fieldName}&fieldValue=${fieldValue}`
    );
  }

  validationRequest = async (jql: string) => {
    this.fetchEndpoint(
      `/search?startAt=0&maxResults=1&validateQuery=strict&fields=summary&jql=${jql}`
    ).then((res: any) => {
      if (res.errorMessages && res.errorMessages.length > 0) {
        this.setState({
          jqlError: JSON.stringify(res.errorMessages[0])
        });
      } else {
        this.setState({ jqlError: null });
      }
    });
  }

  getAutocompleteDataRequest = () => {
    return this.fetchEndpoint("/jql/autocompletedata");
  }

  onJQLChange = (e: any) => {
    this.setState({
      inputValue: e.target.value
    });
  }

  onJQLOpenChange = (isOpen: boolean) => {
    this.setState({
      isEditing: isOpen
    });
  }

  onNameChange = (e: any) => {
    this.setState({
      nameValue: e.target.value
    });
  }

  onSave = () => {
    var entry = this.props.jqlEntry;

    this.props.onSave(Object.assign({}, entry, { name: this.state.nameValue, query: this.state.inputValue }));
  }

  onOpenComplete = () => {
    this.setState({ openComplete: true });
  }

  render() {

    return (
      <ModalTransition>
        <Modal
          onClose={this.props.onCancel}
          heading="Edit JQL"
          onOpenComplete={this.onOpenComplete}
          shouldCloseOnEscapePress={false}
        >
          <Field label='Name'
            isRequired={true}
            id='jql-name-input'
            name='jql-name-input'
            defaultValue={this.state.nameValue}
            validate={FieldValidators.validateString}>
            {
              (fieldArgs: any) => {
                let errDiv = <span />;
                if (fieldArgs.error === 'EMPTY') {
                  errDiv = <ErrorMessage>Name is required</ErrorMessage>;
                }
                return (
                  <div>
                    <input {...fieldArgs.fieldProps}
                      style={{ width: '100%', display: 'block' }}
                      className='ac-inputField'
                      onChange={chain(fieldArgs.fieldProps.onChange, this.onNameChange)} />
                    {errDiv}
                  </div>
                );
              }
            }
          </Field>

          {this.state.jqlError && !this.state.isEditing &&
            <div style={{ marginTop: '24px' }}>
              <SectionMessage appearance="error" title="JQL Error">
                <div>{this.state.jqlError}</div>
              </SectionMessage>
            </div>
          }


          {this.state.openComplete &&
            <JQLAutocompleteInput
              getAutocompleteDataRequest={this.getAutocompleteDataRequest}
              getSuggestionsRequest={this.getSuggestionsRequest}
              initialValue={this.state.inputValue}
              inputId={"jql-automplete-input"}
              label={"Query"}
              onChange={this.onJQLChange}
              onEditorOpenChange={this.onJQLOpenChange}
              validationRequest={this.validationRequest}
              jqlError={this.state.jqlError}
            />
          }
          <div style={{
            marginTop: '24px',
            display: 'flex',
            justifyContent: 'flex-end'
          }}>
            <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
              <Button
                className='ac-button'
                isDisabled={(this.state.nameValue.trim().length < 1 || this.state.inputValue.trim().length < 1 || this.state.jqlError !== null)}
                onClick={this.onSave}
              >
                Save
            </Button>
            </div>
            <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px;' }}>
              <Button
                className='ac-button'
                onClick={this.props.onCancel}
              >
                Cancel
            </Button>
            </div>
          </div>
        </Modal>
      </ModalTransition>
    );
  }
}
