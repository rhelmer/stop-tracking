const { ToggleButton } = require("sdk/ui/button/toggle");
const tabs = require("sdk/tabs");
const self = require("sdk/self");
const data = require("sdk/self").data;
const { window: { document } } = require('sdk/addon/window');
const { getTabContentWindow, getActiveTab } = require('sdk/tabs/utils');
const { getMostRecentBrowserWindow } = require('sdk/window/utils');

// Canvas is used for taking screen shots.
const canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
document.documentElement.appendChild(canvas);

// This add-on uses built-in tracking protection, which doesn't have
// hooks for add-ons to use yet.
const {Cc, Ci, Cu} = require("chrome");
Cu.import("resource://gre/modules/Services.jsm");

// Enable tracking protection globally when add-on is enabled.
Services.prefs.setBoolPref("privacy.trackingprotection.enabled", true);
// Disable tracking protection globally when add-on is disabled.
require("sdk/system/unload").when(function(reason) {
  Services.prefs.setBoolPref("privacy.trackingprotection.enabled", false);
});

function normalizeUrl(url) {
  // NOTE below is from:
  // https://dxr.mozilla.org/mozilla-central/rev/be593a64d7c6a826260514fe758ef32a6ee580f7/browser/base/content/browser-trackingprotection.js
  // Convert document URI into the format used by
  // nsChannelClassifier::ShouldEnableTrackingProtection.
  // Any scheme turned into https is correct.
  // TODO would be nice to make this easier for add-ons to extend

  // FIXME there must be a way to get at the nsIURI in activeTab...
  // what we really want is hostPort
  let hostPort = url.replace(/^http:\/\//, "https://");
  return Services.io.newURI(hostPort, null, null);
}

// take a screen shot of visible area in current active tab
// this must be done in a frame script to work multi-process
function attachScreenshot(report) {
  const tab = tabs.activeTab;
  const xulTab = require("sdk/view/core").viewFor(tab);
  const xulBrowser = require("sdk/tabs/utils").getBrowserForTab(xulTab);

  var browserMM = xulBrowser.messageManager;
  browserMM.loadFrameScript(
    require("sdk/self").data.url("frame-scripts/screenshot.js"), false);
  browserMM.addMessageListener("screenshot-finished", function (payload) {
    let report = payload.data;
    panel.port.emit("report", report);
  });
  browserMM.sendAsyncMessage('fs/screenshot', report);
}

function infobar(message) {
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"]
           .getService(Ci.nsIWindowMediator);
  let mainWindow = wm.getMostRecentWindow("navigator:browser");
  try {
    mainWindow.gBrowser.getNotificationBox().removeCurrentNotification();
  } catch(e) {
    // ok if there are is currently no infobar
  }
  let notificationBox = mainWindow.gBrowser.getNotificationBox();
  let buttons = [{
    label: "Disable",
    callback: function () {
      console.log("disable tracking protection");
      let normalizedUrl = normalizeUrl(tabs.activeTab.url);
      Services.perms.add(normalizedUrl, "trackingprotection",
                         Services.perms.ALLOW_ACTION);
      tabs.activeTab.reload();
    }
  }, {
    label: "Report",
    callback: function () {
      console.log("report a problem");
    }
  }];
  let notificationBar = notificationBox.appendNotification(
                          message, "stop-tracking-request", "",
                          notificationBox.PRIORITY_INFO_MEDIUM,
                          buttons);
  notificationBar.persistence = 1;
}

function activateTrackingProtection() {
  let normalizedUrl = normalizeUrl(tabs.activeTab.url);
  if (normalizedUrl.scheme != "https") {
    console.log("tracking protection only works for web URLs");
  } else if (Services.perms.testPermission(normalizedUrl, "trackingprotection")) {
    console.log("tracking protection already disabled for this URL");
  } else {
    // FIXME detect if there are any tracking elements blocked
    infobar(`Tracking Protection active for ${normalizedUrl.host}, how does this page look?`);
  }
}

tabs.on("ready", () => {
  activateTrackingProtection();
});
