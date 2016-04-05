const { ToggleButton } = require("sdk/ui/button/toggle");
const panels = require("sdk/panel");
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
const {Cu} = require("chrome");
Cu.import("resource://gre/modules/Services.jsm");

// Enable tracking protection globally when add-on is installed.
Services.prefs.setBoolPref("privacy.trackingprotection.enabled", true);

let trackingEnabledIcons = {
  "18": "./tracking-protection.svg",
  "32": "./tracking-protection.svg",
  "64": "./tracking-protection.svg",
}

let trackingDisabledIcons = {
  "18": "./tracking-protection-disabled.svg",
  "32": "./tracking-protection-disabled.svg",
  "64": "./tracking-protection-disabled.svg",
}


let button = ToggleButton({
  id: "tracking-button",
  label: "Tracking Protection",
  icon: trackingEnabledIcons,
  onChange: (state) => {
    if (state.checked) {
      panel.show({
        position: button
      });
    }
  }
});

let panel = panels.Panel({
  width: 480,
  height: 380,
  contentURL: data.url("panel.html"),
  contentScriptFile: data.url("panel.js"),
  onHide: () => {
    button.state("window", {checked: false});
  }
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

function enableControls() {
  let normalizedUrl = normalizeUrl(tabs.activeTab.url);
  if (normalizedUrl.scheme != "https") {
    console.log("tracking protection only works for web URLs");
    panel.port.emit("changeurl");
    button.icon = trackingDisabledIcons;
    return;
  }
  if (Services.perms.testPermission(normalizedUrl, "trackingprotection")) {
    console.log("tracking protection *not* already active for:", normalizedUrl.spec);
    panel.port.emit("disabled");
    button.icon = trackingDisabledIcons;
  } else {
    console.log("tracking protection already active for:", normalizedUrl.spec);
    panel.port.emit("enabled");
    button.icon = trackingEnabledIcons;
  }
  panel.port.emit("changeurl", normalizedUrl.host);
}

// a new tab has been selected, reset the add-on controls
tabs.on("activate", () => {
  panel.port.emit("reset");
  enableControls();
});

// DOM has loaded but page isn't finished, reset the add-on controls
tabs.on("ready", (tab) => {
  panel.port.emit("reset");
  enableControls();
});

// Page is retrieved from back/forward cache.
// This also fires when regular pages are done loading.
tabs.on("pageshow", (tab) => {
  enableControls();
});

// report and disable + reload
panel.port.on("toggle", (addonMessage) => {
  console.log("debug", addonMessage);
  let activeTab = tabs.activeTab;
  let normalizedUrl = normalizeUrl(activeTab.url);

  if (Services.perms.testPermission(normalizedUrl, "trackingprotection")) {
    Services.perms.remove(normalizedUrl, "trackingprotection");
  } else {
    Services.perms.add(normalizedUrl,
      "trackingprotection", Services.perms.ALLOW_ACTION);
  }

  if (addonMessage == "Disable and report") {
    let report = {
      "reason": "disable",
    };
    attachScreenshot(report);
  }
  activeTab.reload();
});

// report only, do not disable and reload
panel.port.on("report", (addonMessage) => {
  let report = {
    "reason": "disable",
  };
  attachScreenshot(report);
});

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

enableControls();
