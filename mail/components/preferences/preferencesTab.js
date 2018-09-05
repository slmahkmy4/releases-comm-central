/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// mail/base/content/specialTabs.js
/* globals contentTabBaseType, DOMLinkHandler */

ChromeUtils.import("resource://gre/modules/Services.jsm");
ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.import("resource:///modules/errUtils.js");

var gPrefTab = null;

/**
 * A tab to show Preferences.
 */
var preferencesTabType = {
  __proto__: contentTabBaseType,
  name: "preferencesTab",
  perTabPanel: "vbox",
  lastBrowserId: 0,
  bundle: Services.strings.createBundle(
    "chrome://messenger/locale/messenger.properties"),
  protoSvc: Cc["@mozilla.org/uriloader/external-protocol-service;1"]
              .getService(Ci.nsIExternalProtocolService),

  get loadingTabString() {
    delete this.loadingTabString;
    return this.loadingTabString = document.getElementById("bundle_messenger")
                                           .getString("loadingTab");
  },

  modes: {
    preferencesTab: {
      type: "preferencesTab",
    },
  },

  initialize() {
    let tabmail = document.getElementById("tabmail");
    tabmail.registerTabType(this);
  },

  shouldSwitchTo: function shouldSwitchTo(aArgs) {
    if (!gPrefTab) {
      return -1;
    }
    let prefWindow = gPrefTab.browser.contentDocument.getElementById("MailPreferences");
    gPrefTab.browser.contentWindow.selectPaneAndTab(prefWindow, aArgs.paneID, aArgs.tabID, aArgs.otherArgs);
    return document.getElementById("tabmail").tabInfo.indexOf(gPrefTab);
  },

  closeTab(aTab) {
    gPrefTab = null;
  },

  openTab: function onTabOpened(aTab, aArgs) {
    if (!("contentPage" in aArgs)) {
      throw ("contentPage must be specified");
    }

    // First clone the page and set up the basics.
    let clone = document.getElementById("preferencesTab").firstChild
                        .cloneNode(true);

    clone.setAttribute("id", "preferencesTab" + this.lastBrowserId);
    clone.setAttribute("collapsed", false);

    aTab.panel.appendChild(clone);

    // Start setting up the browser.
    aTab.browser = aTab.panel.querySelector("browser");

    aTab.browser.setAttribute("id", "preferencesTabBrowser" + this.lastBrowserId);

    aTab.browser.addEventListener("DOMLinkAdded", DOMLinkHandler);

    // Default to reload being disabled.
    aTab.reloadEnabled = false;

    aTab.url = aArgs.contentPage;
    aTab.paneID = aArgs.paneID;
    aTab.tabID = aArgs.tabID;
    aTab.otherArgs = aArgs.otherArgs;

    // Now set up the listeners.
    this._setUpTitleListener(aTab);
    this._setUpCloseWindowListener(aTab);

    // Wait for full loading of the tab and the automatic selecting of last tab.
    // Then run the given onload code.
    aTab.browser.addEventListener("paneSelected",
      function _contentTab_onLoad(event) {
        aTab.pageLoading = false;
        aTab.pageLoaded = true;

        if ("onLoad" in aArgs) {
          // Let selection of the initial pane complete before selecting another.
          // Otherwise we can end up with two panes selected at once.
          setTimeout(() => {
            aArgs.onLoad(event, aTab.browser);
          }, 0);
        }
      }, { once: true }
    );


    // Initialize our unit testing variables.
    aTab.pageLoading = true;
    aTab.pageLoaded = false;

    // Now start loading the content.
    aTab.title = this.loadingTabString;

    aTab.browser.loadURI(aArgs.contentPage, { postData: aArgs.postData || null });

    gPrefTab = aTab;
    this.lastBrowserId++;
  },

  persistTab: function onPersistTab(aTab) {
    if (aTab.browser.currentURI.spec == "about:blank")
      return null;

    return {
      tabURI: aTab.url,
      paneID: aTab.paneID,
      tabID: aTab.tabID,
      otherArgs: aTab.otherArgs,
    };
  },

  restoreTab: function onRestoreTab(aTabmail, aPersistedState) {
    aTabmail.openTab("preferencesTab", {
      contentPage: aPersistedState.tabURI,
      paneID: aPersistedState.paneID,
      tabID: aPersistedState.tabID,
      otherArgs: aPersistedState.otherArgs,
    });
  },
};
