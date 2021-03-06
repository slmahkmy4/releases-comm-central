/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This class implements nsIBadCertListener.  It's job is to prevent "bad cert"
 * security dialogs from being shown to the user.  We call back to the
 * 'callback' object's method "processCertError" so that it can deal with it as
 * needed (in the case of autoconfig, setting up temporary overrides).
 */
function BadCertHandler(callback) {
  this._init(callback);
}

BadCertHandler.prototype = {
  _init(callback) {
    this._callback = callback;
  },

  // Suppress any certificate errors
  notifyCertProblem(socketInfo, status, targetSite) {
    return this._callback.processCertError(socketInfo, status, targetSite);
  },

  // nsIInterfaceRequestor
  getInterface(iid) {
    return this.QueryInterface(iid);
  },

  // nsISupports
  QueryInterface: ChromeUtils.generateQI([
    "nsIBadCertListener2",
    "nsIInterfaceRequestor",
  ]),
};
