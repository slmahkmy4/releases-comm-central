/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, you can obtain one at http://mozilla.org/MPL/2.0/. */

// This tests importing an ICS file. Rather than using the UI to trigger the
// import, loadEventsFromFile is called directly, so that we can be sure it
// has finished by waiting on the returned Promise.

const { MockFilePicker } = ChromeUtils.import("resource://specialpowers/MockFilePicker.jsm");
const ChromeRegistry = Cc["@mozilla.org/chrome/chrome-registry;1"].getService(Ci.nsIChromeRegistry);

add_task(async () => {
  let chromeUrl = Services.io.newURI(getRootDirectory(gTestPath) + "data/import.ics");
  let fileUrl = ChromeRegistry.convertChromeURL(chromeUrl);
  let file = fileUrl.QueryInterface(Ci.nsIFileURL).file;

  MockFilePicker.init(content);
  MockFilePicker.setFiles([file]);
  MockFilePicker.returnValue = MockFilePicker.returnOK;

  await loadEventsFromFile();

  let calendar = cal.getCalendarManager().getCalendars({})[0];
  let promiseCalendar = cal.async.promisifyCalendar(calendar);
  let result = await promiseCalendar.getItems(
    Ci.calICalendar.ITEM_FILTER_ALL_ITEMS,
    0,
    cal.createDateTime("20190101T000000"),
    cal.createDateTime("20190102T000000")
  );
  is(result.length, 4);

  for (let item of result) {
    await promiseCalendar.deleteItem(item);
  }

  MockFilePicker.cleanup();
});
