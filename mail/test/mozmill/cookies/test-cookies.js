/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Test file to check that cookies are correctly enabled in Thunderbird.
 *
 * XXX: Still need to check remote content in messages.
 */

"use strict";

var { open_content_tab_with_url } = ChromeUtils.import(
  "resource://testing-common/mozmill/ContentTabHelpers.jsm"
);
var { mc } = ChromeUtils.import(
  "resource://testing-common/mozmill/FolderDisplayHelpers.jsm"
);

// RELATIVE_ROOT messes with the collector, so we have to bring the path back
// so we get the right path for the resources.
var url = collector.addHttpResource("../cookies/html", "cookies");

/**
 * Test deleting junk messages with no messages marked as junk.
 */
function test_load_cookie_page() {
  open_content_tab_with_url(url + "cookietest1.html");
}

function test_load_cookie_result_page() {
  open_content_tab_with_url(url + "cookietest2.html");

  if (mc.window.content.document.title != "Cookie Test 2") {
    throw new Error(
      "The cookie test 2 page is not the selected tab or not content-primary"
    );
  }

  let cookie = mc.window.content.wrappedJSObject.theCookie;

  dump("Cookie is: " + cookie + "\n");

  if (!cookie) {
    throw new Error("Document has no cookie :-(");
  }

  if (cookie != "name=CookieTest") {
    throw new Error(
      "Cookie set incorrectly, expected: name=CookieTest, got: " + cookie + "\n"
    );
  }
}
