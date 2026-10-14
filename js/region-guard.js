(function () {
  var SELECT_REGION_PAGE = "index.html";

  try {
    var hasRegion = !!localStorage.getItem("gmSelectedArea");
    if (!hasRegion) {
      window.location.replace(SELECT_REGION_PAGE);
    }
  } catch (e) {
    console.warn("region-guard: localStorage unavailable", e);
  }
})();