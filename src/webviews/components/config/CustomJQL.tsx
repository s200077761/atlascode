import React from "react";
import { emptyJQLEntry, JQLEntry } from "../../../config/model";
import Button from "@atlaskit/button";
import { Checkbox } from "@atlaskit/checkbox";
import Tooltip from '@atlaskit/tooltip';
import EditFilledIcon from '@atlaskit/icon/glyph/edit-filled';
import TrashIcon from '@atlaskit/icon/glyph/trash';
import EditJQL from "./EditJQL";
import { v4 } from "uuid";
import { ButtonGroup } from "@atlaskit/button";
import { DetailedSiteInfo } from "../../../atlclients/authInfo";

type changeObject = { [key: string]: any };

export default class CustomJQL extends React.Component<
  {
    sites: DetailedSiteInfo[];
    JqlList: JQLEntry[];
    onConfigChange: (changes: changeObject, removes?: string[]) => void;
    jqlFetcher: (site: DetailedSiteInfo, path: string) => Promise<any>;
  },
  {
    inputValue: string;
    editingEntry: JQLEntry | undefined;
    editingId: string | undefined;
    dragTargetIndex: number | undefined;
    dragSourceIndex: number | undefined;
  }
  > {
  constructor(props: any) {
    super(props);

    this.state = {
      inputValue: "",
      editingEntry: undefined,
      editingId: undefined,
      dragTargetIndex: undefined,
      dragSourceIndex: undefined
    };
  }

  private publishChanges(inputList: JQLEntry[]) {

    const changes = Object.create(null);
    changes["jira.jqlList"] = inputList;

    if (this.props.onConfigChange) {
      this.props.onConfigChange(changes);
    }
  }

  onNewQuery = () => {
    const id = v4();
    this.setState({
      editingId: id,
      editingEntry: { siteId: "", id: id, name: "", query: "", enabled: true, monitor: true }
    });
  }

  onEditQuery = (id: string) => {
    const entry = this.readJqlListFromProps().find((entry: JQLEntry) => {
      return entry.id === id;
    });
    if (entry) {
      this.setState({
        editingId: entry.id,
        editingEntry: Object.assign({}, entry)
      });
    } else {
      // This entry has disappered from under us.
      this.onNewQuery();
    }
  }

  deleteQuery = (id: string) => {
    var jqlList = this.readJqlListFromProps().map((entry: JQLEntry) => {
      return Object.assign({}, entry);
    });
    const index = this.indexForId(jqlList, id);
    if (index >= 0) {
      jqlList.splice(index, 1);
      this.publishChanges(jqlList);
    }
  }

  toggleEnable = (e: any) => {
    const id = e.target.value;
    var jqlList = this.readJqlListFromProps();
    const index = this.indexForId(jqlList, id);

    if (index >= 0) {
      const entry = jqlList[index];
      entry.enabled = e.target.checked;
      this.publishChanges(jqlList);
    }
  }

  toggleMonitor = (e: any) => {
    const id = e.target.value;
    var jqlList = this.readJqlListFromProps();
    const index = this.indexForId(jqlList, id);

    if (index >= 0) {
      const entry = jqlList[index];
      entry.monitor = e.target.checked;
      this.publishChanges(jqlList);
    }
  }

  private readJqlListFromProps(): JQLEntry[] {
    let customJqlList = this.props.JqlList;
    if (!customJqlList) {
      customJqlList = [];
      customJqlList.push(emptyJQLEntry);
    }

    return customJqlList;
  }

  handleCancelEdit = () => {
    this.setState({ editingId: undefined, editingEntry: undefined });
  }

  indexForId(jqlList: JQLEntry[], id: string | undefined) {
    return jqlList.findIndex((entry: JQLEntry) => {
      return entry.id === id;
    });
  }

  handleSaveEdit = (jqlEntry: JQLEntry) => {
    const jqlList = this.readJqlListFromProps();
    const index = this.indexForId(jqlList, this.state.editingId);

    if (index >= 0) {
      jqlList[index] = jqlEntry;
    } else {
      jqlList.push(jqlEntry);
    }

    this.setState({
      editingId: undefined,
      editingEntry: undefined
    });
    this.publishChanges(jqlList);
  }

  handleDragStart = (e: any) => {
    const objIndex = e.target.getAttribute("data-index");
    if (!objIndex) {
      return;
    }
    const index = Number(objIndex);
    e.dataTransfer.dropEffect = "copy";
    this.setState({ dragSourceIndex: index });
  }

  handleDragEnd = (e: any) => {
    this.setState({ dragSourceIndex: undefined, dragTargetIndex: undefined });
  }

  handleDragEnter = (e: any) => {
    const objIndex = e.currentTarget.getAttribute("data-index");
    if (objIndex) {
      const index = Number(objIndex);
      if (index !== undefined) {
        this.setState({ dragTargetIndex: index });
      }
    }
  }

  handleDragOver = (e: any) => {
    e.preventDefault();
  }

  handleDrop = (e: any) => {
    e.preventDefault();

    if (this.state.dragSourceIndex !== undefined &&
      this.state.dragTargetIndex !== undefined &&
      this.state.dragSourceIndex !== this.state.dragTargetIndex) {
      var jql = this.readJqlListFromProps();
      const temp = jql[this.state.dragSourceIndex];
      jql.splice(this.state.dragSourceIndex, 1);
      jql.splice(this.state.dragTargetIndex, 0, temp);
      this.publishChanges(jql);
    }
    this.setState({ dragSourceIndex: undefined, dragTargetIndex: undefined });
  }

  htmlForJQLEntry = (element: JQLEntry, displayIndex: number) => {
    return (
      <div
        data-index={displayIndex}
        id="jql-row"
        data-id={element.id}
        draggable={true}
        onDragStart={this.handleDragStart}
        onDragEnd={this.handleDragEnd}
      >
        <div>
          <Checkbox
            value={element.id}
            isChecked={element.enabled}
            onChange={this.toggleEnable}
          />
        </div>

        <div style={{ flexGrow: 1 }}>{element.name}</div>
        <div>
          <Checkbox
            value={element.id}
            isChecked={element.monitor}
            onChange={this.toggleMonitor}
            label='include in issue notifications'
          />
        </div>

        <ButtonGroup>
          <Tooltip content="Edit">
            <Button
              className="ac-button"
              iconBefore={<EditFilledIcon label="edit" />}
              onClick={() => {
                this.onEditQuery(element.id);
              }}
            />
          </Tooltip>
          <Tooltip content="Delete">
            <Button
              className="ac-button"
              iconBefore={<TrashIcon label="delete" />}
              onClick={() => {
                this.deleteQuery(element.id);
              }}
            />
          </Tooltip>
        </ButtonGroup>
      </div>
    );
  }

  htmlElementAtIndex = (jql: JQLEntry[], index: number) => {
    var element = undefined;

    if (this.state.dragSourceIndex !== undefined && this.state.dragTargetIndex !== undefined) {
      if (index === this.state.dragTargetIndex) {
        element = <div id="empty-jql-row" data-index={index} />;
      } else if ((index < this.state.dragSourceIndex && index < this.state.dragTargetIndex) ||
        (index > this.state.dragSourceIndex && index > this.state.dragTargetIndex)) {
        element = this.htmlForJQLEntry(jql[index], index);
      } else if (this.state.dragSourceIndex < this.state.dragTargetIndex) {
        element = this.htmlForJQLEntry(jql[index + 1], index + 1);
      } else {
        element = this.htmlForJQLEntry(jql[index - 1], index - 1);
      }
    } else {
      element = this.htmlForJQLEntry(jql[index], index);
    }

    return (
      <div
        id="jql-row-container"
        key={index}
        data-index={index}
      >
        <div id="jql-row-drop-overlay"
          data-index={index}
          onDragEnter={this.handleDragEnter}
          onDragOver={this.handleDragOver}
          onDrop={this.handleDrop}
        >
          {element}
        </div>
      </div>
    );
  }

  render() {

    const jql = this.readJqlListFromProps();
    const noJql = jql.length === 0 ? <p><em>No custom jql configured</em></p> : <React.Fragment />;
    const dragTip = <p><strong>Tip:</strong> You can drag/drop JQL entries in the list to change their display order in the explorer tree</p>;

    return (
      <React.Fragment>
        {this.state.editingEntry && (
          <EditJQL
            jqlFetcher={this.props.jqlFetcher}
            sites={this.props.sites}
            jqlEntry={this.state.editingEntry}
            onCancel={this.handleCancelEdit}
            onSave={this.handleSaveEdit}
          />
        )}
        {noJql}
        {dragTip}
        {jql.map((_, index) => {
          return this.htmlElementAtIndex(jql, index);
        })}
        <div style={{ display: 'inline-flex', marginRight: '4px', marginLeft: '4px' }}>
          <Button className="ac-button" onClick={this.onNewQuery}>
            Add Query
        </Button>
        </div>
      </React.Fragment>
    );
  }
}
