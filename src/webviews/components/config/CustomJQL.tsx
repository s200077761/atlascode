import React from "react";
import { JQLAutocompleteInput } from "./JQLAutocompleteInput";
import fetch, { Request } from "node-fetch";

export default class CustomJQL extends React.Component<{
  inputId: string;
  cloudId: string;
  jiraAccessToken: string;
}> {
  constructor(props: any) {
    super(props);
  }

  async fetchByFetch(url: string): Promise<any> {
    const r = new Request(url, {
      headers: {
        Authorization: `Bearer ${this.props.jiraAccessToken}`,
        "Content-Type": "application/json"
      }
    });

    const res = await fetch(r);
    return Promise.resolve(res.json());
  }

  getSuggestionsRequest = async (fieldName: string) => {
    return this.fetchByFetch(
      `https://api.atlassian.com/ex/jira/${
        this.props.cloudId
      }/rest/api/2/jql/autocompletedata/suggestions?fieldName=${fieldName}`
    );
  }

  validationRequest = async (jql: string) => {
    return  this.fetchByFetch(
      `https://api.atlassian.com/ex/jira/${this.props.cloudId}/rest/api/2/search?startAt=0&maxResults=1&validateQuery=strict&fields=summary&jql=${jql}`
    );
  }

  getAutocompleteDataRequest = () => {
    return this.fetchByFetch(
      `https://api.atlassian.com/ex/jira/${
        this.props.cloudId
      }/rest/api/2/jql/autocompletedata`
    );
  }

  onJQLChange = (event: any) => {
    this.setState({
      inputValue: event.target.value
    });
  }

  render() {
    if(!this.props.cloudId && !this.props.jiraAccessToken) {
      return(<div />);
    }
    return (
      <JQLAutocompleteInput
        getAutocompleteDataRequest={this.getAutocompleteDataRequest}
        getSuggestionsRequest={this.getSuggestionsRequest}
        initialValue={""}
        inputId={"1"}
        label={"JQL"}
        onChange={this.onJQLChange}
        //        setValue={this.props.setValue}
        validationRequest={this.validationRequest}
      />
    );
  }
}
