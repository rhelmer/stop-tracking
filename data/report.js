/*
 * Socorro-collector compatible JS reporting library.
 *
 * NOTE - this file purposely does not use ES6, to be more web-compatible.
 */
var reportsServer = "http://localhost:5000/upload";
var productName = "TrackingProtection";
var version = "0.1";

function submitReport(comments, reason, url, screenshot) {
    var serverURL = reportsServer;
    var xhr = new XMLHttpRequest();

    var form = {
        "ProductName": productName,
        "Version": version,
        "Comments": comments,
        "Reason": reason,
        "URL": url,
    };
    if (screenshot && document.getElementById("screenshot").checked) {
        form["screenshot"] = screenshot;
    }

    xhr.open("POST", serverURL, true);
    var boundary=Math.random().toString().substr(2);
    xhr.setRequestHeader("content-type",
        "multipart/form-data; charset=utf-8; boundary=" + boundary);

    var multipart = "";
    for (var key in form) {
        multipart += "--" + boundary +
            "\r\nContent-Disposition: form-data; name=\"" + key + "\"" +
            "\r\nContent-type: text/plain" +
            "\r\n\r\n" + form[key] + "\r\n";
    }
    multipart += "--" + boundary + "--\r\n";

    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          var status = document.getElementById("status");
          if (xhr.status == 200) {
            console.log("report id:", xhr.responseText);
            status.textContent = "report sent, thanks!";
            var textarea = document.getElementById("report-content");
            textarea.value = "";
          } else {
            status.textContent = "error submitting report, please try again.";
          }
        }
    };
    xhr.send(multipart);
    document.getElementById("status").textContent = "sending report...";
}

/**
  * panel.js
  */
window.addEventListener("click", (event) => {
  let t = event.target;
  if (t.id == "toggle") {
    self.port.emit("toggle", t.textContent);
  } else if (t.id == "report") {
    self.port.emit("report");
  }
}, false);

self.port.on("report", (report) => {
  console.log("report");
  let comments = document.getElementById("report-content").value;
  let url = document.getElementById("url").textContent;
  submitReport(comments, report["reason"], url, report["screenshot"]);
});

self.port.on("reset", () => {
  console.log("reset");
  document.getElementById("toggle").disabled = true;
  document.getElementById("report").disabled = true;
  var textarea = document.getElementById("report-content");
  textarea.disabled = true;
  document.getElementById("screenshot").disabled = true;
});

self.port.on("enabled", () => {
  console.log("enabled");
  document.getElementById("toggle").textContent = "Disable and report";
  document.getElementById("toggle").disabled = false;
  document.getElementById("report").disabled = false;
  document.getElementById("report-content").disabled = false;
  document.getElementById("screenshot").disabled = false;
});

self.port.on("disabled", () => {
  console.log("disabled");
  document.getElementById("toggle").textContent = "Enable";
  document.getElementById("toggle").disabled = false;
  document.getElementById("report").disabled = false;
  document.getElementById("report-content").disabled = false;
  document.getElementById("screenshot").disabled = false;
});

self.port.on("changeurl", (url) => {
  if (url) {
    if (document.getElementById("url").textContent == url) {
      console.log("url already set");
      return;
    }
    document.getElementById("url").textContent = url;
  } else {
    document.getElementById("url").textContent = "disabled for this address.";
  }
  document.getElementById("status").textContent = "";
});
