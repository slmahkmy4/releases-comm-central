/*
 * Test that junk actions work even when the bayes filtering of incoming
 *  messages is disabled, as fixed in bug 487610. Test developed by Kent
 *  James using test_nsMsgDBView.js as a base.
 */

/* import-globals-from ../../../test/resources/logHelper.js */
/* import-globals-from ../../../test/resources/asyncTestUtils.js */
load("../../../resources/logHelper.js");
load("../../../resources/asyncTestUtils.js");

/* import-globals-from ../../../test/resources/messageGenerator.js */
/* import-globals-from ../../../test/resources/messageModifier.js */
/* import-globals-from ../../../test/resources/messageInjection.js */
load("../../../resources/messageGenerator.js");
load("../../../resources/messageModifier.js");
load("../../../resources/messageInjection.js");

const { JSTreeSelection } = ChromeUtils.import(
  "resource:///modules/jsTreeSelection.js"
);

var { MailServices } = ChromeUtils.import(
  "resource:///modules/MailServices.jsm"
);

var nsIMFNService = Ci.nsIMsgFolderNotificationService;

// fake objects needed to get nsMsgDBView to operate on selected messages.
// Warning: these are partial implementations. If someone adds additional
// calls to these objects in nsMsgDBView and friends, it will also
// be necessary to add fake versions of those calls here.

var gFakeSelection = new JSTreeSelection(null);

// Items used to add messages to the folder

var gMessageGenerator = new MessageGenerator();

var gLocalInboxFolder;
var gListener;

function setup_globals(aNextFunc) {
  // build up a message
  let messages = [];
  let msg1 = gMessageGenerator.makeMessage();
  messages = messages.concat([msg1]);
  let msgSet = new SyntheticMessageSet(messages);

  return add_sets_to_folders(gLocalInboxFolder, [msgSet]);
}

var gCommandUpdater = {
  updateCommandStatus() {
    // the back end is smart and is only telling us to update command status
    // when the # of items in the selection has actually changed.
  },

  displayMessageChanged(aFolder, aSubject, aKeywords) {},

  updateNextMessageAfterDelete() {},
  summarizeSelection() {
    return false;
  },
};

var gDBView;
var gTreeView;

var SortType = Ci.nsMsgViewSortType;
var SortOrder = Ci.nsMsgViewSortOrder;
var ViewFlags = Ci.nsMsgViewFlagsType;

function setup_view(aViewType, aViewFlags) {
  let dbviewContractId = "@mozilla.org/messenger/msgdbview;1?type=" + aViewType;

  // always start out fully expanded
  aViewFlags |= ViewFlags.kExpandAll;

  gDBView = Cc[dbviewContractId].createInstance(Ci.nsIMsgDBView);
  gDBView.init(null, null, gCommandUpdater);
  var outCount = {};
  gDBView.open(
    gLocalInboxFolder,
    SortType.byDate,
    SortOrder.ascending,
    aViewFlags,
    outCount
  );
  dump("  View Out Count: " + outCount.value + "\n");

  gTreeView = gDBView.QueryInterface(Ci.nsITreeView);
  gTreeView.selection = gFakeSelection;
  gFakeSelection.view = gTreeView;
}

var tests_for_all_views = [
  // In the proposed fix for bug 487610, the first call to junk messages
  //  only creates the junk folder, it does not actually successfully move
  //  messages. So we junk messages twice so we can really see a move. But
  //  if that gets fixed and the messages actually move on the first call,
  //  I want this test to succeed as well. So I don't actually count how
  //  many messages get moved, just that some do on the second move.
  junkMessages,
  addMessages,
  junkMessages,
];

function addMessages() {
  // add another message in case the first one moved
  let messages = [];
  let msg1 = gMessageGenerator.makeMessage();
  messages = messages.concat([msg1]);
  let msgSet = new SyntheticMessageSet(messages);
  return add_sets_to_folders(gLocalInboxFolder, [msgSet]);
}

function* junkMessages() {
  // select and junk all messages
  gDBView.doCommand(Ci.nsMsgViewCommandType.selectAll);
  gDBView.doCommand(Ci.nsMsgViewCommandType.junk);
  yield false;
}

// Our listener, which captures events and does the real tests.
function gMFListener() {}
gMFListener.prototype = {
  msgsMoveCopyCompleted(aMove, aSrcMsgs, aDestFolder, aDestMsgs) {
    Assert.ok(aDestFolder.getFlag(Ci.nsMsgFolderFlags.Junk));
    // I tried to test this by counting messages in the folder, didn't work.
    //  Maybe all updates are not completed yet. Anyway I do it by just
    //  making sure there is something in the destination array.
    Assert.ok(aDestMsgs.length > 0);
    async_driver();
  },

  folderAdded(aFolder) {
    // this should be a junk folder
    Assert.ok(aFolder.getFlag(Ci.nsMsgFolderFlags.Junk));
    async_driver();
  },
};

function run_test() {
  gLocalInboxFolder = configure_message_injection({ mode: "local" });

  // Set option so that when messages are marked as junk, they move to the junk folder
  Services.prefs.setBoolPref("mail.spam.manualMark", true);

  // 0 == "move to junk folder", 1 == "delete"
  Services.prefs.setIntPref("mail.spam.manualMarkMode", 0);

  // Disable bayes filtering on the local account. That's the whole point of this test,
  //  to make sure that the junk move happens anyway.
  gLocalInboxFolder.server.spamSettings.level = 0;

  do_test_pending();

  // Add folder listeners that will capture async events
  let flags = nsIMFNService.msgsMoveCopyCompleted | nsIMFNService.folderAdded;
  gListener = new gMFListener();
  MailServices.mfn.addListener(gListener, flags);

  async_run({ func: actually_run_test });
}

var view_types = [["threaded", ViewFlags.kThreadedDisplay]];

function* actually_run_test() {
  yield async_run({ func: setup_globals });
  dump(
    "Num Messages: " +
      gLocalInboxFolder.msgDatabase.dBFolderInfo.numMessages +
      "\n"
  );

  // for each view type...
  for (let view_type_and_flags of view_types) {
    let [view_type, view_flags] = view_type_and_flags;

    // ... run each test
    setup_view(view_type, view_flags);

    for (let testFunc of tests_for_all_views) {
      dump("=== Running generic test: " + testFunc.name + "\n");
      yield async_run({ func: testFunc });
    }
  }
  MailServices.mfn.removeListener(gListener);

  // Delete view reference to avoid a cycle leak.
  gFakeSelection.view = null;

  do_test_finished();
}
