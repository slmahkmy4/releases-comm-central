/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests iteratorUtils with items pulled from content into chrome.
 */

var { open_content_tab_with_url } = ChromeUtils.import(
  "resource://testing-common/mozmill/ContentTabHelpers.jsm"
);
var { assert_equals, close_tab } = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);

var iteratorUtils = ChromeUtils.import("resource:///modules/iteratorUtils.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var kWhatsNewPref = "mailnews.start_page.override_url";

var gUrl = collector.addHttpResource("../utils/html", "");
var gCollectionsUrl = gUrl + "collections.html";
var gOriginalWhatsNew, gTab;

function setupModule(module) {
  gOriginalWhatsNew = Services.prefs.getCharPref(kWhatsNewPref);
  Services.prefs.setCharPref(kWhatsNewPref, gCollectionsUrl);
}

function teardownModule(module) {
  Services.prefs.setCharPref(kWhatsNewPref, gOriginalWhatsNew);
}

function setupTest() {
  gTab = open_content_tab_with_url(gCollectionsUrl);
}

function teardownTest() {
  close_tab(gTab);
}

/**
 * Tests that we can use iteratorUtils.toArray on an Iterator created
 * and pulled in from content.
 */
function test_toArray_builtin_content_iterator() {
  // kExpected matches our expectations for the contents of gIterator
  // defined collections.html.
  const kExpected = [1, 2, 3, 4, 5];

  // Yank the iterator out from content
  let iter = gTab.browser.contentWindow.wrappedJSObject.gIterator;
  let iterArray = iteratorUtils.toArray(iter);

  assert_equals(kExpected.length, iterArray.length);

  kExpected.forEach((val, i) => {
    assert_equals(val, iterArray[i]);
  });
}

/**
 * Tests that we can use iteratorUtils.toArray on a custom iterator created
 * and pulled in from content.
 */
function test_toArray_custom_content_iterator() {
  // kExpected matches our expectations for the contents of gCustomIterator
  // defined in collections.html.
  const kExpected = [6, 7, 8, 9];

  // Yank the iterator out from content
  let iter = gTab.browser.contentWindow.wrappedJSObject.gCustomIterator;
  let iterArray = iteratorUtils.toArray(iter);

  assert_equals(kExpected.length, iterArray.length);

  for (let [i, val] of kExpected.entries()) {
    assert_equals(val, iterArray[i]);
  }
}
