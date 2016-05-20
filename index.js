const tabs = require("sdk/tabs");
const { window: { document } } = require('sdk/addon/window');
const { viewFor } = require("sdk/view/core");

// Canvas is used for taking screen shots.
const canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
document.documentElement.appendChild(canvas);

// This add-on uses built-in tracking protection, which doesn't have
// hooks for add-ons to use yet.
const {Cu} = require("chrome");
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
    // TODO close modal
  });
  browserMM.sendAsyncMessage('fs/screenshot', report);
}

let reportPanel = require("sdk/panel").Panel({
  contentURL: require("sdk/self").data.url("report.html")
});

function clearInfobar(win) {
  try {
    viewFor(win).gBrowser.getNotificationBox().removeCurrentNotification();
  } catch(e) {
    // ok if there are is currently no infobar
  }
}

function infobar(win, message) {
  // remove any active infobars for this tab
  clearInfobar(win);

  let notificationBox = viewFor(win).gBrowser.getNotificationBox();
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
      reportPanel.show();
    }
  }];
  let notificationBar = notificationBox.appendNotification(
                          message, "stop-tracking-request", "",
                          notificationBox.PRIORITY_INFO_MEDIUM,
                          buttons);
  notificationBar.persistence = 1;
}

function activateTrackingProtection(win) {
  let normalizedUrl = normalizeUrl(tabs.activeTab.url);

  // TODO is there a more direct way to tell if there are tracking elements
  //      on the current page?
  let elem = viewFor(win).document.getElementById("tracking-blocked");

  if (normalizedUrl.scheme != "https") {
    console.log("tracking protection only works for web URLs");
  } else if (Services.perms.testPermission(normalizedUrl, "trackingprotection")) {
    console.log("tracking protection already disabled for this URL");
  } else if (viewFor(win).getComputedStyle(elem,null).getPropertyValue("display") == "none") {
    console.log("no tracking elements found on this page");
  } else {
    infobar(win, `Tracking Protection active for ${normalizedUrl.host}, how does this page look?`);
  }
}

tabs.on("create", (tab) => {
  clearInfobar(tab.window);
});

tabs.on("ready", (tab) => {
  activateTrackingProtection(tab.window);
});

tabs.on("*", (evt) => {
  console.log("rhelmer debug", evt);
});
