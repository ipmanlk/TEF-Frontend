/*-------------------------------------------------------------------------------------------------------
                                            General
-------------------------------------------------------------------------------------------------------*/

async function loadModule(permissionStr) {
  // create an array from permission string
  const permission = permissionStr.split("").map((p) => parseInt(p));

  // load main table
  const dataBuilderFunction = (responseData) => {
    // parse resposne data and return in data table frendly format
    return responseData.map(entry => {
      return {
        "Code": entry.material.code,
        "Name": entry.material.name,
        "Qty. (All Time)": entry.qty,
        "Avaiable Qty.": entry.availableQty,
        "Status": entry.materialInventoryStatus.name
      }
    });
  }

  window.mainTable = new DataTable("mainTableHolder", "/api/material_inventory", permission, dataBuilderFunction, "Material Inventory");

  // catch promise rejections
  $(window).on("unhandledrejection", (event) => {
    console.error("Unhandled rejection (promise: ", event.promise, ", reason: ", event.reason, ").");
  });
}