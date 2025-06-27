console.log("➡️ Script loaded");

window.addEventListener("webr-ready", () => {
  console.log("✅ WebR ready event fired");

  const input = document.getElementById("file-input");
  input.addEventListener("change", () => {
    console.log("📂 File input change event!");
    document.getElementById("upload-status").textContent = "📂 File selected!";
  });
});
