/* Copyright (C) 2018 Canonical Ltd. */
'use strict';

const PropTypes = require('prop-types');
const React = require('react');
const shapeup = require('shapeup');

const {BasicTable} = require('@canonical/juju-react-components');
const {ButtonDropdown} = require('@canonical/juju-react-components');
const CredentialAddEdit = require('../../credential-add-edit/credential-add-edit');
const {ExpandingRow} = require('@canonical/juju-react-components');
const {Button} = require('@canonical/juju-react-components');
const ProfileCredentialListDelete = require('./delete/delete');
const Spinner = require('../../spinner/spinner');

require('./_credential-list.scss');

// Define the name of the lxd cloud.
const LOCAL_CLOUD = 'localhost';

class ProfileCredentialList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      credentialMap: new Map(),
      editCredential: null,
      loading: false,
      removeCredential: null,
      showAdd: false
    };
    this.analytics = this.props.analytics.addCategory('Credential List');
  }

  componentDidMount() {
    this._getClouds();
    this.analytics.sendEvent(this.props.analytics.VIEW);
  }

  async _getClouds() {
    const props = this.props;
    // Close the edit credentials form in case it was left open. We don't want
    // it to reopen after the credentials load.
    this.setState({loading: true, editCredential: null});
    try {
      const clouds = await this._listClouds();
      const credentialMap = await this._getCloudCredentialNames(props.username, clouds);
      const credentialToModel = await this._fetchAndFilterModelsByCredential();
      credentialToModel.forEach((modelNames, credentialKey) => {
        if (!credentialMap.has(credentialKey)) {
          // A model was created with a key which no longer exists so we cannot
          // assign the models to that non-existent key.
          return;
        }
        credentialKey = credentialMap.get(credentialKey).models = modelNames;
      });
      this.setState({
        credentialMap,
        loading: false
      });
    } catch (error) {
      this.setState({loading: false});
      const msg = 'Unable to fetch credential data';
      props.addNotification({
        title: msg,
        message: msg,
        level: 'error'
      });
      console.error(msg, error);
    }
  }

  /**
    List the clouds available to the current user.
    @returns {Promise} Resolves to an array of cloud names.
  */
  _listClouds() {
    return new Promise((resolve, reject) => {
      this.props.controllerAPI.listClouds((error, clouds) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(Object.keys(clouds));
      });
    });
  }

  /**
    Requests the cloud names for the supplied clouds
    @param {String} username The username on the controller.
    @param {Array} clouds An array of cloud names to fetch the credentials for.
    @returns {Promise} Resolves to a Map of credential data with the key being
      the credential key.
  */
  _getCloudCredentialNames(username, clouds) {
    return new Promise((resolve, reject) => {
      this.props.controllerAPI.getCloudCredentialNames(
        clouds.map(cloudName => [username, cloudName]),
        (error, namesData) => {
          if (error) {
            reject(error);
            return;
          }
          const credentials = new Map();
          Object.values(namesData).forEach(data => {
            data.names.forEach((name, index) => {
              credentials.set(name, {
                cloud: name.split('_')[0],
                displayName: data.displayNames[index]
              });
            });
          });
          resolve(credentials);
        });
    });
  }

  /**
    List the models that the current user has access to with information.
    @returns {Promise} Resolves to the model data sorted by credential key.
  */
  _fetchAndFilterModelsByCredential() {
    const props = this.props;
    return new Promise((resolve, reject) => {
      props.controllerAPI.listModelsWithInfo((error, modelData) => {
        if (error) {
          reject(error);
          return;
        }
        const sorted = new Map();
        modelData
          .filter(model => model.owner === props.username)
          .forEach(model => {
            const key = model.credential;
            const modelName = model.name;
            sorted.has(key) ?
              sorted.get(key).push(modelName) :
              sorted.set(key, [modelName]);
          });
        resolve(sorted);
      });
    });
  }

  /**
    Show the add credentials form.
  */
  _toggleAdd() {
    if (!this.state.showAdd) {
      this.analytics.addCategory('Add credential').sendEvent(this.props.analytics.CLICK);
    }
    this.setState({showAdd: !this.state.showAdd});
  }

  /**
    Sets the state for editCredential using the supplied credentialId.
    @param {String} credentialId The credential ID to edit.
  */
  _setEditCredential(credentialId = null) {
    if (credentialId) {
      this.analytics.addCategory('Edit credential').sendEvent(this.props.analytics.CLICK);
    }
    this.setState({editCredential: credentialId});
  }

  /**
    Handle deleting a credential.
    @param credential {String} A credential id.
  */
  _setDeleteCredential(credential = null) {
    if (credential) {
      this.analytics.addCategory('Delete credential').sendEvent(this.props.analytics.CLICK);
    }
    this.setState({removeCredential: credential});
  }

  /**
    Generate a form to add credentials.
  */
  _generateAddCredentials() {
    // Only generate the form when we want to display it so that it gets
    // re-rendered and therefore the fields cleared between uses.
    const form = this.state.showAdd ? this._generateCredentialForm() : null;
    return (
      <ExpandingRow
        clickable={false}
        expanded={this.state.showAdd}>
        <div></div>
        <div className="col-12">
          {form}
        </div>
      </ExpandingRow>);
  }

  /**
    Generates the edit credential UI elements.
    @param name {Object} The name of the credential being edited.
    @param id {Object} The id of the credential being edited.
    @return {Array} The elements for the edit credential UI.
  */
  _generateEditCredentials(name, id) {
    if (id !== this.state.editCredential) {
      return null;
    }
    return this._generateCredentialForm({
      credential: name,
      onCancel: this._setEditCredential.bind(this),
      onCredentialUpdated: this._onCredentialEdited.bind(this)
    });
  }

  /**
    Handle a credential having been updated.
    @param credential {String} The name of the updated credential.
  */
  _onCredentialEdited(credential) {
    // Load the credentials again so that the list will contain the updates.
    this._getClouds();
    this._setEditCredential();
  }

  /**
    Handle a credential having been created.
    @param credential {String} The name of the newly created credential.
  */
  _onCredentialAdded(credential) {
    // Load the credentials again so that the list will contain the newly
    // added credential.
    this._getClouds();
    this._toggleAdd();
  }

  /**
    Handle a credential having been created.
    @param credential {String} The name of the newly created credential.
  */
  _onCredentialDeleted(credential) {
    this._getClouds();
    this._setDeleteCredential();
  }

  /**
    Generate the add credentials UI with any supplied overrides depending
    on where it is to be rendered.
    @param {Object} overrides The overrides for the default props.
    @return {Object} React component for DeploymentCredentialAdd
  */
  _generateCredentialForm(overrides={}) {
    const controllerAPI = this.props.controllerAPI;
    const credentials = this.state.credentialMap;
    return (
      <CredentialAddEdit
        acl={this.props.acl}
        addNotification={this.props.addNotification}
        analytics={this.analytics}
        controllerAPI={shapeup.addReshape({
          listClouds: controllerAPI.listClouds.bind(controllerAPI),
          updateCloudCredential: controllerAPI.updateCloudCredential.bind(controllerAPI)
        })}
        controllerIsReady={this.props.controllerIsReady}
        credential={overrides.credential}
        credentials={
          credentials ? Array.from(credentials).map(credential => credential[0]) : []}
        key="deployment-credential-add"
        onCancel={overrides.onCancel || this._toggleAdd.bind(this)}
        onCredentialUpdated={
          overrides.onCredentialUpdated || this._onCredentialAdded.bind(this)}
        username={this.props.username} />);
  }

  /**
    Display a component for deleting a credential.
  */
  _generateDeleteCredential() {
    const credential = this.state.removeCredential;
    if (!credential) {
      return null;
    }
    return (
      <div className="profile-credential-list__delete">
        <ProfileCredentialListDelete
          addNotification={this.props.addNotification}
          credential={credential}
          onCancel={this._setDeleteCredential.bind(this)}
          onCredentialDeleted={this._onCredentialDeleted.bind(this)}
          revokeCloudCredential={this.props.controllerAPI.revokeCloudCredential} />
      </div>);
  }

  /**
    Creates the JSX content for the credential list.
    @return {Object} The credential UI JSX.
  */
  _generateCredentialsList() {
    const state = this.state;
    const credentials = state.credentialMap;
    if (state.loading) {
      return (<Spinner />);
    }
    if (credentials.size === 0) {
      return (<div>No credentials available</div>);
    }
    let rows = [];
    const selectedCredential = this.props.credential;

    credentials.forEach((credential, key) => {
      rows.push({
        classes: key === selectedCredential ? ['profile-credential-list--highlighted'] : null,
        columns: [{
          content: credential.displayName
        }, {
          content: credential.cloud
        }, {
          content: function() {
            const models = credential.models;
            const modelCount = models ? models.length : 0;
            switch(modelCount) {
              case 0:
                return '-';
                break;
              case 1:
                return `${credential.models[0]}`;
                break;
              default:
                return `${modelCount} Models`;
            }
          }()
        }, {
          content: (
            <span className="v1">
              <ButtonDropdown
                icon="contextual-menu-horizontal"
                listItems={[{
                  label: 'Edit',
                  action: this._setEditCredential.bind(this, key)
                }, {
                  label: 'Delete',
                  action: this._setDeleteCredential.bind(this, key)
                }]} />
            </span>),
          classes: ['u-align-text--right']
        }],
        expandedContent: this._generateEditCredentials(credential, key),
        expandedContentExpanded: this.state.editCredential === key,
        key,
        rowClickable: false
      });
    });

    return (
      <div className="profile-credential-list__list">
        <BasicTable
          headers={[{
            content: 'Name'
          }, {
            content: 'Provider'
          }, {
            content: 'Used by'
          }, {
            content: 'Action',
            classes: ['u-align-text--right']
          }]}
          rows={rows} />
      </div>
    );
  }

  render() {
    const clouds = this.state.clouds;
    let addButton = (
      <span className="v1">
        <Button
          action={this._toggleAdd.bind(this)}
          modifier="neutral">
          Add credentials
        </Button>
      </span>);
    if (clouds && clouds[LOCAL_CLOUD]) {
      addButton = null;
    }
    return (
      <div className="profile-credential-list">
        <div className="profile-credential-list__header">
          <h4 className="profile__title">
            Credentials
            <span className="profile__title-count">
              ({this.state.credentialMap.size})
            </span>
          </h4>
          <div className="profile-credential-list__add">{addButton}</div>
        </div>
        {this._generateAddCredentials()}
        {this._generateCredentialsList()}
        {this._generateDeleteCredential()}
      </div>
    );
  }
}

ProfileCredentialList.propTypes = {
  acl: shapeup.shape({
    isReadOnly: PropTypes.func.isRequired
  }).isRequired,
  addNotification: PropTypes.func.isRequired,
  analytics: PropTypes.object.isRequired,
  controllerAPI: shapeup.shape({
    getCloudCredentialNames: PropTypes.func.isRequired,
    listClouds: PropTypes.func.isRequired,
    listModelsWithInfo: PropTypes.func.isRequired,
    revokeCloudCredential: PropTypes.func.isRequired,
    updateCloudCredential: PropTypes.func.isRequired
  }),
  controllerIsReady: PropTypes.func.isRequired,
  credential: PropTypes.string,
  username: PropTypes.string.isRequired
};

module.exports = ProfileCredentialList;
